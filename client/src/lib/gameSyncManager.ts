import { onSnapshot, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { GameRecord, BoardStateSnapshot, COLLECTIONS } from '@/types/firestore';
import { useOnlineGameStore } from '@/lib/stores/useOnlineGameStore';
import { validateGameState } from '@/lib/gameState';

export interface SyncManagerOptions {
  gameId: string;
  userId: string;
  onGameUpdate?: (game: GameRecord) => void;
  onMoveReceived?: (move: any) => void;
  onPlayerDisconnected?: (playerId: string) => void;
  onSyncError?: (error: Error) => void;
}

class GameSyncManager {
  private gameId: string;
  private userId: string;
  private gameUnsubscribe: (() => void) | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSyncTime: Date = new Date();
  private isDestroyed = false;
  
  // Callbacks
  private onGameUpdate?: (game: GameRecord) => void;
  private onMoveReceived?: (move: any) => void;
  private onPlayerDisconnected?: (playerId: string) => void;
  private onSyncError?: (error: Error) => void;
  
  // Connection state
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  
  constructor(options: SyncManagerOptions) {
    this.gameId = options.gameId;
    this.userId = options.userId;
    this.onGameUpdate = options.onGameUpdate;
    this.onMoveReceived = options.onMoveReceived;
    this.onPlayerDisconnected = options.onPlayerDisconnected;
    this.onSyncError = options.onSyncError;
    
    console.log('GameSyncManager initialized for game:', this.gameId);
  }
  
  /**
   * Start real-time synchronization
   */
  async startSync(): Promise<void> {
    if (this.isDestroyed) return;
    
    try {
      console.log('Starting game synchronization for:', this.gameId);
      
      // Set up Firestore listener
      await this.setupGameListener();
      
      // Start heartbeat for presence detection
      this.startHeartbeat();
      
      // Mark as connected
      this.setConnectionState(true);
      
      console.log('Game synchronization started successfully');
    } catch (error) {
      console.error('Failed to start game synchronization:', error);
      this.handleSyncError(error as Error);
    }
  }
  
  /**
   * Stop synchronization and clean up
   */
  stopSync(): void {
    console.log('Stopping game synchronization for:', this.gameId);
    
    this.isDestroyed = true;
    
    // Clean up listeners
    if (this.gameUnsubscribe) {
      this.gameUnsubscribe();
      this.gameUnsubscribe = null;
    }
    
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Mark as disconnected
    this.setConnectionState(false);
    
    console.log('Game synchronization stopped');
  }
  
  /**
   * Set up Firestore real-time listener for game document
   */
  private async setupGameListener(): Promise<void> {
    if (this.isDestroyed) return;
    
    try {
      const firebaseDb = await getFirebaseDb();
      const gameRef = doc(firebaseDb, COLLECTIONS.GAMES, this.gameId);
      
      console.log('Setting up Firestore listener for game:', this.gameId);
      
      this.gameUnsubscribe = onSnapshot(
        gameRef,
        (snapshot) => {
          if (this.isDestroyed) return;
          
          if (snapshot.exists()) {
            const gameData = snapshot.data() as GameRecord;
            this.handleGameUpdate(gameData);
          } else {
            console.warn('Game document does not exist:', this.gameId);
            this.handleSyncError(new Error('Game not found'));
          }
        },
        (error) => {
          console.error('Firestore listener error:', error);
          this.handleSyncError(error);
        }
      );
      
      console.log('Firestore listener set up successfully');
    } catch (error) {
      console.error('Failed to set up Firestore listener:', error);
      throw error;
    }
  }
  
  /**
   * Handle game document updates
   */
  private handleGameUpdate(gameData: GameRecord): void {
    if (this.isDestroyed) return;
    
    console.log('Game update received:', {
      gameId: gameData.gameId,
      status: gameData.status,
      currentTurn: gameData.currentTurn,
      totalMoves: gameData.totalMoves,
      lastMoveAt: gameData.lastMoveAt
    });
    
    try {
      // Validate game state integrity
      if (!this.validateGameUpdate(gameData)) {
        console.error('Invalid game state received');
        this.handleSyncError(new Error('Invalid game state'));
        return;
      }
      
      // Update last sync time
      this.lastSyncTime = new Date();
      
      // Update store with new game data
      const store = useOnlineGameStore.getState();
      store.setCurrentGame(gameData);
      
      // Determine if it's the current user's turn
      const userColor = gameData.playerRed.uid === this.userId ? 'red' : 'blue';
      const isUserTurn = gameData.currentTurn === userColor;
      store.setIsPlayerTurn(isUserTurn);
      
      // Check for new moves
      this.checkForNewMoves(gameData);
      
      // Check for player disconnections
      this.checkPlayerConnections(gameData);
      
      // Notify callback
      if (this.onGameUpdate) {
        this.onGameUpdate(gameData);
      }
      
      // Reset reconnect attempts on successful update
      this.reconnectAttempts = 0;
      
    } catch (error) {
      console.error('Error handling game update:', error);
      this.handleSyncError(error as Error);
    }
  }
  
  /**
   * Validate incoming game update
   */
  private validateGameUpdate(gameData: GameRecord): boolean {
    try {
      // Basic validation
      if (!gameData.gameId || !gameData.boardState || !gameData.playerRed || !gameData.playerBlue) {
        return false;
      }
      
      // Validate board state
      if (!validateGameState(gameData.boardState)) {
        console.warn('Board state validation failed');
        return false;
      }
      
      // Check move sequence
      const store = useOnlineGameStore.getState();
      const currentGame = store.currentGame;
      
      if (currentGame && currentGame.totalMoves > gameData.totalMoves) {
        console.warn('Move sequence violation detected');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Game validation error:', error);
      return false;
    }
  }
  
  /**
   * Check for new moves and notify
   */
  private checkForNewMoves(gameData: GameRecord): void {
    const store = useOnlineGameStore.getState();
    const currentGame = store.currentGame;
    
    // If we have a previous game state, compare move counts
    if (currentGame && gameData.totalMoves > currentGame.totalMoves) {
      const newMoves = gameData.moveHistory.slice(currentGame.totalMoves);
      
      newMoves.forEach((move) => {
        console.log('New move received:', move);
        
        // Add move to store
        store.addMove(move);
        
        // Notify callback
        if (this.onMoveReceived) {
          this.onMoveReceived(move);
        }
        
        // Show move animation
        store.setShowMoveAnimation(true);
        setTimeout(() => store.setShowMoveAnimation(false), 1000);
      });
    }
  }
  
  /**
   * Check for player connection status
   */
  private checkPlayerConnections(gameData: GameRecord): void {
    // This would be enhanced with presence detection
    // For now, we check last move timing for basic timeout detection
    if (gameData.lastMoveAt) {
      const lastMoveTime = gameData.lastMoveAt instanceof Date 
        ? gameData.lastMoveAt 
        : (gameData.lastMoveAt as any).toDate();
      
      const timeSinceLastMove = Date.now() - lastMoveTime.getTime();
      const timeoutThreshold = 60000; // 60 seconds
      
      if (timeSinceLastMove > timeoutThreshold && gameData.status === 'active') {
        console.warn('Potential player timeout detected');
        
        // Notify callback
        const opponentId = gameData.playerRed.uid === this.userId 
          ? gameData.playerBlue.uid 
          : gameData.playerRed.uid;
          
        if (this.onPlayerDisconnected) {
          this.onPlayerDisconnected(opponentId);
        }
      }
    }
  }
  
  /**
   * Start heartbeat for presence detection
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(async () => {
      if (this.isDestroyed) return;
      
      try {
        await this.sendHeartbeat();
      } catch (error) {
        console.error('Heartbeat error:', error);
        this.handleConnectionLoss();
      }
    }, 30000); // Send heartbeat every 30 seconds
  }
  
  /**
   * Send heartbeat to maintain presence
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      const firebaseDb = await getFirebaseDb();
      const gameRef = doc(firebaseDb, COLLECTIONS.GAMES, this.gameId);
      
      // Update player's last seen timestamp
      const currentGame = await this.getCurrentGame();
      if (!currentGame) return;
      
      const playerField = this.userId === currentGame.playerRed.uid 
        ? 'playerRed' 
        : 'playerBlue';
      
      await updateDoc(gameRef, {
        [`${playerField}.lastSeen`]: serverTimestamp()
      });
      
      console.log('Heartbeat sent successfully');
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
      throw error;
    }
  }
  
  /**
   * Handle connection loss and attempt reconnection
   */
  private handleConnectionLoss(): void {
    if (this.isDestroyed) return;
    
    console.log('Connection loss detected, attempting reconnection...');
    
    this.setConnectionState(false);
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.handleSyncError(new Error('Connection lost - max retry attempts exceeded'));
      return;
    }
    
    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(async () => {
      if (this.isDestroyed) return;
      
      try {
        await this.startSync();
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.handleConnectionLoss();
      }
    }, delay);
  }
  
  /**
   * Set connection state and update store
   */
  private setConnectionState(connected: boolean): void {
    this.isConnected = connected;
    
    const store = useOnlineGameStore.getState();
    store.setIsConnected(connected);
    
    if (!connected) {
      store.setIsReconnecting(this.reconnectAttempts > 0);
    } else {
      store.setIsReconnecting(false);
    }
  }
  
  /**
   * Handle sync errors
   */
  private handleSyncError(error: Error): void {
    console.error('Sync error:', error);
    
    const store = useOnlineGameStore.getState();
    store.setError(error.message);
    
    if (this.onSyncError) {
      this.onSyncError(error);
    }
  }
  
  /**
   * Get current game data
   */
  private async getCurrentGame(): Promise<GameRecord | null> {
    const store = useOnlineGameStore.getState();
    return store.currentGame;
  }
  
  /**
   * Get connection status
   */
  isGameConnected(): boolean {
    return this.isConnected;
  }
  
  /**
   * Get last sync time
   */
  getLastSyncTime(): Date {
    return this.lastSyncTime;
  }
}

export default GameSyncManager;