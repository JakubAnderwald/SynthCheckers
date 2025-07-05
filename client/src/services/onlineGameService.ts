import { 
  doc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { GameRecord, BoardStateSnapshot, GameMove, COLLECTIONS } from '@/types/firestore';
import { convertToFirestoreBoard, convertMoveToFirestore, validateGameState } from '@/lib/gameState';
import { Piece, PieceColor } from '@/lib/checkers/types';
import { makeMove, checkForWinner } from '@/lib/checkers/rules';

class OnlineGameService {
  private gameListeners: Map<string, () => void> = new Map();
  
  /**
   * Set up real-time listener for a specific game
   */
  async onGameChange(gameId: string, callback: (game: GameRecord | null) => void): Promise<() => void> {
    console.log('Setting up game listener for:', gameId);
    
    try {
      const firebaseDb = await getFirebaseDb();
      const gameRef = doc(firebaseDb, COLLECTIONS.GAMES, gameId);
      
      const unsubscribe = onSnapshot(gameRef, (doc) => {
        if (doc.exists()) {
          const gameData = doc.data() as GameRecord;
          console.log('Game data updated:', gameData);
          callback(gameData);
        } else {
          console.log('Game not found:', gameId);
          callback(null);
        }
      }, (error) => {
        console.error('Error listening to game changes:', error);
        callback(null);
      });
      
      // Store the unsubscribe function
      this.gameListeners.set(gameId, unsubscribe);
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up game listener:', error);
      throw error;
    }
  }
  
  /**
   * Stop listening to a specific game
   */
  stopGameListener(gameId: string): void {
    const unsubscribe = this.gameListeners.get(gameId);
    if (unsubscribe) {
      unsubscribe();
      this.gameListeners.delete(gameId);
      console.log('Stopped listening to game:', gameId);
    }
  }
  
  /**
   * Make a move in an online game
   */
  async makeMove(
    gameId: string, 
    move: { from: { row: number; col: number }; to: { row: number; col: number } },
    currentUserId: string
  ): Promise<boolean> {
    console.log('Attempting to make move:', { gameId, move, currentUserId });
    
    try {
      const firebaseDb = await getFirebaseDb();
      const gameRef = doc(firebaseDb, COLLECTIONS.GAMES, gameId);
      
      // Use a transaction to ensure atomic updates
      const success = await runTransaction(firebaseDb, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        
        if (!gameDoc.exists()) {
          throw new Error('Game not found');
        }
        
        const gameData = gameDoc.data() as GameRecord;
        
        // Validate the move is allowed
        if (gameData.status !== 'active') {
          throw new Error('Game is not active');
        }
        
        // Check if it's the current user's turn
        const userColor = gameData.playerRed.uid === currentUserId ? 'red' : 'blue';
        if (gameData.currentTurn !== userColor) {
          throw new Error('Not your turn');
        }
        
        // Convert Firestore board to local format for validation
        const localPieces = gameData.boardState.pieces.map(p => ({
          id: p.id,
          color: p.color,
          type: p.type,
          position: { row: p.position[0], col: p.position[1] },
          isSelected: false
        }));
        
        // Find the piece to move
        const pieceToMove = localPieces.find(p => 
          p.position.row === move.from.row && p.position.col === move.from.col
        );
        
        if (!pieceToMove) {
          throw new Error('No piece at source position');
        }
        
        if (pieceToMove.color !== userColor) {
          throw new Error('Cannot move opponent\'s piece');
        }
        
        // Validate and execute the move using game rules
        const moveResult = makeMove(localPieces, pieceToMove, move.to);
        
        if (!moveResult) {
          throw new Error('Invalid move');
        }
        
        const updatedPieces = moveResult.newPieces;
        
        // Create new board state
        const newBoardState = convertToFirestoreBoard(updatedPieces, userColor === 'red' ? 'blue' : 'red');
        
        // Create move record
        const moveRecord: Omit<GameMove, 'timestamp'> = convertMoveToFirestore(
          { from: move.from, to: move.to, capturedPiece: moveResult.capturedPiece },
          userColor,
          gameData.moveHistory.length + 1,
          1000, // Placeholder time spent
          newBoardState
        );
        
        // Check for game end conditions
        const winner = checkForWinner(updatedPieces);
        const isGameComplete = winner !== null;
        
        // Update game document
        const updateData: Partial<GameRecord> = {
          boardState: newBoardState,
          currentTurn: userColor === 'red' ? 'blue' : 'red',
          moveHistory: [...gameData.moveHistory, { ...moveRecord, timestamp: serverTimestamp() as Timestamp }],
          lastMoveAt: serverTimestamp() as Timestamp,
          totalMoves: gameData.totalMoves + 1
        };
        
        if (isGameComplete) {
          updateData.status = 'completed';
          updateData.winner = winner === 'red' ? 'red' : winner === 'blue' ? 'blue' : 'draw';
          updateData.completedAt = serverTimestamp() as Timestamp;
          updateData.endReason = 'checkmate'; // Could be expanded to handle different end reasons
        }
        
        transaction.update(gameRef, updateData);
        
        return true;
      });
      
      console.log('Move completed successfully');
      return success;
    } catch (error) {
      console.error('Error making move:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific game by ID
   */
  async getGame(gameId: string): Promise<GameRecord | null> {
    try {
      const firebaseDb = await getFirebaseDb();
      const gameRef = doc(firebaseDb, COLLECTIONS.GAMES, gameId);
      const gameDoc = await getDoc(gameRef);
      
      if (gameDoc.exists()) {
        return gameDoc.data() as GameRecord;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting game:', error);
      throw error;
    }
  }
  
  /**
   * Resign from a game
   */
  async resignGame(gameId: string, currentUserId: string): Promise<void> {
    console.log('Resigning from game:', { gameId, currentUserId });
    
    try {
      const firebaseDb = await getFirebaseDb();
      const gameRef = doc(firebaseDb, COLLECTIONS.GAMES, gameId);
      
      await runTransaction(firebaseDb, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        
        if (!gameDoc.exists()) {
          throw new Error('Game not found');
        }
        
        const gameData = gameDoc.data() as GameRecord;
        
        if (gameData.status !== 'active') {
          throw new Error('Game is not active');
        }
        
        // Determine the resigning player and winner
        const resigningColor = gameData.playerRed.uid === currentUserId ? 'red' : 'blue';
        const winner = resigningColor === 'red' ? 'blue' : 'red';
        
        transaction.update(gameRef, {
          status: 'completed',
          winner,
          endReason: 'resignation',
          completedAt: serverTimestamp(),
          [`player${resigningColor === 'red' ? 'Red' : 'Blue'}.hasResigned`]: true
        });
      });
      
      console.log('Game resignation completed');
    } catch (error) {
      console.error('Error resigning game:', error);
      throw error;
    }
  }
  
  /**
   * Handle player disconnection timeout
   */
  async handlePlayerTimeout(gameId: string, timedOutUserId: string): Promise<void> {
    console.log('Handling player timeout:', { gameId, timedOutUserId });
    
    try {
      const firebaseDb = await getFirebaseDb();
      const gameRef = doc(firebaseDb, COLLECTIONS.GAMES, gameId);
      
      await runTransaction(firebaseDb, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        
        if (!gameDoc.exists()) {
          throw new Error('Game not found');
        }
        
        const gameData = gameDoc.data() as GameRecord;
        
        if (gameData.status !== 'active') {
          return; // Game already ended
        }
        
        // Determine the timed out player and winner
        const timedOutColor = gameData.playerRed.uid === timedOutUserId ? 'red' : 'blue';
        const winner = timedOutColor === 'red' ? 'blue' : 'red';
        
        transaction.update(gameRef, {
          status: 'completed',
          winner,
          endReason: 'timeout',
          completedAt: serverTimestamp()
        });
      });
      
      console.log('Player timeout handled');
    } catch (error) {
      console.error('Error handling player timeout:', error);
      throw error;
    }
  }
  
  /**
   * Clean up all listeners
   */
  cleanup(): void {
    console.log('Cleaning up game listeners');
    this.gameListeners.forEach((unsubscribe, gameId) => {
      unsubscribe();
    });
    this.gameListeners.clear();
  }
}

export const onlineGameService = new OnlineGameService();