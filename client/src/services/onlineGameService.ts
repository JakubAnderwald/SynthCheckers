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
import { convertToFirestoreBoard, convertMoveToFirestore, validateGameState, hasValidMoves, countPieces, determineWinner, generateMoveNotation } from '@/lib/gameState';
import { Piece, PieceColor, Position } from '@/lib/checkers/types';
import { makeMove, checkForWinner, getValidMoves, getAllValidMovesForPlayer, getCapturePositions } from '@/lib/checkers/rules';
import { eloService, GameCompletionData } from '@/services/eloService';

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
   * Validate a move before execution
   */
  private validateMoveRequest(
    gameData: GameRecord,
    move: { from: Position; to: Position },
    currentUserId: string
  ): {
    isValid: boolean;
    userColor: PieceColor;
    pieceToMove: Piece | null;
    localPieces: Piece[];
    error?: string;
  } {
    // Basic game state validation
    if (gameData.status !== 'active') {
      return { isValid: false, userColor: 'red', pieceToMove: null, localPieces: [], error: 'Game is not active' };
    }
    
    // Validate board state integrity
    if (!validateGameState(gameData.boardState)) {
      return { isValid: false, userColor: 'red', pieceToMove: null, localPieces: [], error: 'Invalid board state' };
    }
    
    // Determine user color and validate turn
    const userColor = gameData.playerRed.uid === currentUserId ? 'red' : 'blue';
    if (gameData.currentTurn !== userColor) {
      return { isValid: false, userColor, pieceToMove: null, localPieces: [], error: 'Not your turn' };
    }
    
    // Convert board state to local format
    const localPieces = gameData.boardState.pieces.map(p => ({
      id: p.id,
      color: p.color as PieceColor,
      type: p.type,
      position: { row: p.position[0], col: p.position[1] },
      isSelected: false
    }));
    
    // Validate position boundaries
    if (move.from.row < 0 || move.from.row >= 8 || move.from.col < 0 || move.from.col >= 8 ||
        move.to.row < 0 || move.to.row >= 8 || move.to.col < 0 || move.to.col >= 8) {
      return { isValid: false, userColor, pieceToMove: null, localPieces, error: 'Move out of bounds' };
    }
    
    // Find the piece to move
    const pieceToMove = localPieces.find(p => 
      p.position.row === move.from.row && p.position.col === move.from.col
    );
    
    if (!pieceToMove) {
      return { isValid: false, userColor, pieceToMove: null, localPieces, error: 'No piece at source position' };
    }
    
    if (pieceToMove.color !== userColor) {
      return { isValid: false, userColor, pieceToMove, localPieces, error: 'Cannot move opponent\'s piece' };
    }
    
    // Validate move using game rules - check if the move is in the piece's valid moves
    const pieceValidMoves = getValidMoves(pieceToMove, localPieces);
    const isMoveValid = pieceValidMoves.some(validMove => 
      validMove.row === move.to.row && validMove.col === move.to.col
    );
    
    if (!isMoveValid) {
      return { isValid: false, userColor, pieceToMove, localPieces, error: 'Invalid move according to game rules' };
    }
    
    // Check if there are mandatory captures that must be taken instead
    const captureMoves = getCapturePositions(pieceToMove, localPieces);
    const allPlayerMoves = getAllValidMovesForPlayer(localPieces, userColor);
    const hasCaptures = allPlayerMoves.some(playerMove => 
      getCapturePositions(playerMove.piece, localPieces).length > 0
    );
    
    if (hasCaptures && captureMoves.length === 0) {
      // If other pieces can capture, this piece cannot make non-capture moves
      return { isValid: false, userColor, pieceToMove, localPieces, error: 'Must capture when capture is available' };
    }
    
    return { isValid: true, userColor, pieceToMove, localPieces };
  }
  
  /**
   * Calculate game end conditions
   */
  private calculateGameEnd(pieces: Piece[], currentPlayer: PieceColor): {
    isGameOver: boolean;
    winner: 'red' | 'blue' | 'draw' | null;
    endReason: 'all_pieces_captured' | 'no_valid_moves' | 'insufficient_material' | '';
  } {
    // Check for pieces remaining
    const redPieces = pieces.filter(p => p.color === 'red').length;
    const bluePieces = pieces.filter(p => p.color === 'blue').length;
    
    if (redPieces === 0) {
      return { isGameOver: true, winner: 'blue', endReason: 'all_pieces_captured' };
    }
    
    if (bluePieces === 0) {
      return { isGameOver: true, winner: 'red', endReason: 'all_pieces_captured' };
    }
    
    // Check for valid moves using existing rules
    const playerMoves = getAllValidMovesForPlayer(pieces, currentPlayer);
    if (playerMoves.length === 0) {
      const opponentColor = currentPlayer === 'red' ? 'blue' : 'red';
      return { isGameOver: true, winner: opponentColor, endReason: 'no_valid_moves' };
    }
    
    // Check for draw conditions (could be expanded)
    if (redPieces === 1 && bluePieces === 1) {
      // King vs King - potential draw
      return { isGameOver: true, winner: 'draw', endReason: 'insufficient_material' };
    }
    
    return { isGameOver: false, winner: null, endReason: '' };
  }
  
  /**
   * Make a move in an online game with comprehensive validation
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
      
      // Use a transaction to ensure atomic updates with comprehensive validation
      let gameEndResult: any = null;
      const success = await runTransaction(firebaseDb, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        
        if (!gameDoc.exists()) {
          throw new Error('Game not found');
        }
        
        const gameData = gameDoc.data() as GameRecord;
        
        // Comprehensive move validation
        const validation = this.validateMoveRequest(gameData, move, currentUserId);
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid move');
        }
        
        const { userColor, pieceToMove, localPieces } = validation;
        
        // Execute the move using game rules
        const moveResult = makeMove(localPieces, pieceToMove!, move.to);
        
        if (!moveResult) {
          throw new Error('Move execution failed');
        }
        
        const updatedPieces = moveResult.newPieces;
        const nextPlayer = userColor === 'red' ? 'blue' : 'red';
        
        // Create new board state with validation
        const newBoardState = convertToFirestoreBoard(updatedPieces, nextPlayer);
        
        // Additional board state validation
        if (!validateGameState(newBoardState)) {
          throw new Error('Generated board state is invalid');
        }
        
        // Generate move notation
        const moveNotation = generateMoveNotation({ 
          from: move.from, 
          to: move.to, 
          capturedPiece: moveResult.capturedPiece 
        });
        
        // Create move record with proper timing
        const moveStartTime = gameData.lastMoveAt ? 
          (gameData.lastMoveAt instanceof Date ? gameData.lastMoveAt : gameData.lastMoveAt.toDate()) : 
          new Date();
        const timeSpent = Math.max(1000, Date.now() - moveStartTime.getTime()); // Minimum 1 second
        
        const moveRecord: Omit<GameMove, 'timestamp'> = {
          moveNumber: gameData.totalMoves + 1,
          player: userColor,
          from: [move.from.row, move.from.col],
          to: [move.to.row, move.to.col],
          captures: moveResult.capturedPiece ? [[moveResult.capturedPiece.position.row, moveResult.capturedPiece.position.col]] : undefined,
          promotedToKing: moveResult.becameKing || false,
          timeSpent,
          boardStateAfter: newBoardState.gameStateHash,
          isValid: true,
          moveNotation
        };
        
        // Calculate game end conditions
        const gameEnd = this.calculateGameEnd(updatedPieces, nextPlayer);
        
        // Prepare update data
        const updateData: Partial<GameRecord> = {
          boardState: newBoardState,
          currentTurn: nextPlayer,
          moveHistory: [...gameData.moveHistory, { ...moveRecord, timestamp: serverTimestamp() as Timestamp }],
          lastMoveAt: serverTimestamp() as Timestamp,
          totalMoves: gameData.totalMoves + 1
        };
        
        // Handle game completion
        if (gameEnd.isGameOver) {
          updateData.status = 'completed';
          updateData.winner = gameEnd.winner || undefined;
          updateData.completedAt = serverTimestamp() as Timestamp;
          
          // Map internal end reasons to valid GameRecord end reasons
          if (gameEnd.endReason === 'all_pieces_captured' || gameEnd.endReason === 'no_valid_moves') {
            updateData.endReason = 'checkmate';
          } else if (gameEnd.endReason === 'insufficient_material') {
            updateData.endReason = 'draw';
          }
          
          console.log('Game completed:', { 
            winner: gameEnd.winner, 
            reason: updateData.endReason 
          });
        }
        
        // Apply atomic update
        transaction.update(gameRef, updateData);
        
        console.log('Move transaction completed successfully:', {
          moveNumber: moveRecord.moveNumber,
          player: userColor,
          notation: moveNotation,
          gameOver: gameEnd.isGameOver
        });
        
        // Store game end state for ELO processing after transaction
        gameEndResult = { gameEnd, updatedGameData: { ...gameData, ...updateData } };
        return true;
      });
      
      // Process ELO after transaction if game ended
      if (gameEndResult && gameEndResult.gameEnd.isGameOver) {
        try {
          await this.handleGameCompletion(
            gameEndResult.updatedGameData as GameRecord, 
            gameEndResult.gameEnd.winner!, 
            gameEndResult.gameEnd.endReason as any
          );
        } catch (error) {
          console.error('Failed to process ELO after game completion:', error);
          // Don't fail the entire move operation
        }
      }
      
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
   * Handle game completion with ELO processing
   */
  private async handleGameCompletion(
    gameData: GameRecord, 
    winner: 'red' | 'blue' | 'draw', 
    endReason: 'all_pieces_captured' | 'no_valid_moves' | 'resignation' | 'timeout' | 'abandonment'
  ): Promise<void> {
    try {
      // Calculate performance stats
      const performanceStats = eloService.calculatePerformanceStats(gameData);
      
      // Calculate game duration
      const startTime = gameData.startedAt?.toDate?.() || gameData.createdAt.toDate();
      const gameDuration = Date.now() - startTime.getTime();

      const completionData: GameCompletionData = {
        gameId: gameData.gameId,
        winner,
        endReason: endReason as any,
        totalMoves: gameData.totalMoves,
        gameDuration,
        playerPerformance: performanceStats
      };

      // Process ELO changes and update game/player records
      await eloService.processGameCompletion(gameData, completionData);
      
      console.log('Game completion processed:', {
        gameId: gameData.gameId,
        winner,
        endReason
      });
    } catch (error) {
      console.error('Failed to process game completion:', error);
      // Don't re-throw to avoid blocking the game flow
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