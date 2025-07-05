import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { GameRecord } from '@/types/firestore';

export interface TimeoutConfig {
  moveTimeout: number; // Time allowed per move in milliseconds
  totalGameTimeout: number; // Total game time in milliseconds
  reconnectionGracePeriod: number; // Grace period for reconnection
  warningThreshold: number; // Show warning when time remaining is below this
}

export interface TimeoutState {
  lastMoveTime: Date;
  timeRemaining: number;
  isWarning: boolean;
  timeoutId: ReturnType<typeof setTimeout> | null;
  warningTimeoutId: ReturnType<typeof setTimeout> | null;
}

export class TimeoutService {
  private timeouts = new Map<string, TimeoutState>();
  private readonly defaultConfig: TimeoutConfig = {
    moveTimeout: 300000, // 5 minutes per move
    totalGameTimeout: 1800000, // 30 minutes total
    reconnectionGracePeriod: 120000, // 2 minutes
    warningThreshold: 60000 // Warning at 1 minute remaining
  };

  /**
   * Start timeout tracking for a game
   */
  startTimeoutTracking(gameId: string, config: Partial<TimeoutConfig> = {}): void {
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    const timeoutState: TimeoutState = {
      lastMoveTime: new Date(),
      timeRemaining: mergedConfig.moveTimeout,
      isWarning: false,
      timeoutId: null,
      warningTimeoutId: null
    };

    this.timeouts.set(gameId, timeoutState);
    this.scheduleTimeouts(gameId, mergedConfig);
    
    console.log('Timeout tracking started for game:', gameId, 'with config:', mergedConfig);
  }

  /**
   * Stop timeout tracking for a game
   */
  stopTimeoutTracking(gameId: string): void {
    const timeoutState = this.timeouts.get(gameId);
    if (timeoutState) {
      this.clearTimeouts(timeoutState);
      this.timeouts.delete(gameId);
      console.log('Timeout tracking stopped for game:', gameId);
    }
  }

  /**
   * Reset timeout for new move
   */
  resetMoveTimeout(gameId: string, config: Partial<TimeoutConfig> = {}): void {
    const timeoutState = this.timeouts.get(gameId);
    if (timeoutState) {
      const mergedConfig = { ...this.defaultConfig, ...config };
      
      // Clear existing timeouts
      this.clearTimeouts(timeoutState);
      
      // Reset state
      timeoutState.lastMoveTime = new Date();
      timeoutState.timeRemaining = mergedConfig.moveTimeout;
      timeoutState.isWarning = false;
      
      // Schedule new timeouts
      this.scheduleTimeouts(gameId, mergedConfig);
      
      console.log('Move timeout reset for game:', gameId);
    }
  }

  /**
   * Pause timeout tracking (for disconnections)
   */
  pauseTimeout(gameId: string): void {
    const timeoutState = this.timeouts.get(gameId);
    if (timeoutState) {
      this.clearTimeouts(timeoutState);
      console.log('Timeout paused for game:', gameId);
    }
  }

  /**
   * Resume timeout tracking
   */
  resumeTimeout(gameId: string, config: Partial<TimeoutConfig> = {}): void {
    const timeoutState = this.timeouts.get(gameId);
    if (timeoutState) {
      const mergedConfig = { ...this.defaultConfig, ...config };
      
      // Calculate remaining time
      const elapsed = Date.now() - timeoutState.lastMoveTime.getTime();
      timeoutState.timeRemaining = Math.max(0, mergedConfig.moveTimeout - elapsed);
      
      if (timeoutState.timeRemaining > 0) {
        this.scheduleTimeouts(gameId, mergedConfig);
        console.log('Timeout resumed for game:', gameId, 'with', timeoutState.timeRemaining, 'ms remaining');
      } else {
        // Time already expired
        this.handleMoveTimeout(gameId);
      }
    }
  }

  /**
   * Schedule timeout warnings and final timeout
   */
  private scheduleTimeouts(gameId: string, config: TimeoutConfig): void {
    const timeoutState = this.timeouts.get(gameId);
    if (!timeoutState) return;

    const timeUntilWarning = Math.max(0, timeoutState.timeRemaining - config.warningThreshold);
    const timeUntilTimeout = timeoutState.timeRemaining;

    // Schedule warning
    if (timeUntilWarning > 0) {
      timeoutState.warningTimeoutId = setTimeout(() => {
        this.handleTimeWarning(gameId);
      }, timeUntilWarning);
    } else {
      // Already in warning state
      timeoutState.isWarning = true;
      this.emitTimeWarningEvent(gameId, timeoutState.timeRemaining);
    }

    // Schedule final timeout
    timeoutState.timeoutId = setTimeout(() => {
      this.handleMoveTimeout(gameId);
    }, timeUntilTimeout);
  }

  /**
   * Clear all timeouts for a game
   */
  private clearTimeouts(timeoutState: TimeoutState): void {
    if (timeoutState.timeoutId) {
      clearTimeout(timeoutState.timeoutId);
      timeoutState.timeoutId = null;
    }
    if (timeoutState.warningTimeoutId) {
      clearTimeout(timeoutState.warningTimeoutId);
      timeoutState.warningTimeoutId = null;
    }
  }

  /**
   * Handle time warning
   */
  private handleTimeWarning(gameId: string): void {
    const timeoutState = this.timeouts.get(gameId);
    if (timeoutState) {
      timeoutState.isWarning = true;
      
      const timeRemaining = Math.max(0, 
        this.defaultConfig.moveTimeout - (Date.now() - timeoutState.lastMoveTime.getTime())
      );
      
      console.warn(`Time warning for game ${gameId}: ${timeRemaining}ms remaining`);
      this.emitTimeWarningEvent(gameId, timeRemaining);
    }
  }

  /**
   * Handle move timeout
   */
  private async handleMoveTimeout(gameId: string): Promise<void> {
    try {
      console.warn(`Move timeout for game ${gameId}`);
      
      const timeoutState = this.timeouts.get(gameId);
      if (timeoutState) {
        timeoutState.timeRemaining = 0;
      }
      
      // Get current game state
      const gameData = await this.getGameData(gameId);
      if (!gameData) {
        console.error('Cannot handle timeout: game not found');
        return;
      }

      // Determine which player timed out
      const currentPlayer = gameData.currentTurn;
      const opponentPlayer = currentPlayer === 'red' ? 'blue' : 'red';
      
      // Update game state - opponent wins by timeout
      await this.markGameCompletedByTimeout(gameId, opponentPlayer, currentPlayer);
      
      this.emitTimeoutEvent(gameId, currentPlayer);
      this.stopTimeoutTracking(gameId);
    } catch (error) {
      console.error('Failed to handle move timeout:', error);
    }
  }

  /**
   * Get game data from Firestore
   */
  private async getGameData(gameId: string): Promise<GameRecord | null> {
    try {
      const db = await getFirebaseDb();
      const gameRef = doc(db, 'gameRooms', gameId);
      const snapshot = await getDoc(gameRef);
      
      if (snapshot.exists()) {
        return snapshot.data() as GameRecord;
      }
      return null;
    } catch (error) {
      console.error('Failed to get game data:', error);
      return null;
    }
  }

  /**
   * Mark game as completed due to timeout
   */
  private async markGameCompletedByTimeout(
    gameId: string, 
    winner: 'red' | 'blue', 
    timedOutPlayer: 'red' | 'blue'
  ): Promise<void> {
    try {
      const db = await getFirebaseDb();
      const gameRef = doc(db, 'gameRooms', gameId);
      
      await updateDoc(gameRef, {
        status: 'completed',
        winner,
        endReason: 'timeout',
        completedAt: serverTimestamp(),
        [`timedOutPlayer`]: timedOutPlayer
      });
      
      console.log(`Game ${gameId} completed: ${winner} wins by timeout (${timedOutPlayer} timed out)`);
    } catch (error) {
      console.error('Failed to mark game completed by timeout:', error);
      throw error;
    }
  }

  /**
   * Handle player reconnection timeout
   */
  async handleReconnectionTimeout(gameId: string, playerId: string): Promise<void> {
    try {
      console.warn(`Reconnection timeout for player ${playerId} in game ${gameId}`);
      
      const gameData = await this.getGameData(gameId);
      if (!gameData || gameData.status !== 'active') return;

      // Determine winner (the other player)
      const winner = gameData.playerRed.uid === playerId ? 'blue' : 'red';
      
      await this.markGameCompletedByTimeout(gameId, winner, playerId === gameData.playerRed.uid ? 'red' : 'blue');
      
      this.emitReconnectionTimeoutEvent(gameId, playerId);
      this.stopTimeoutTracking(gameId);
    } catch (error) {
      console.error('Failed to handle reconnection timeout:', error);
    }
  }

  /**
   * Event emitters for UI updates
   */
  private emitTimeWarningEvent(gameId: string, timeRemaining: number): void {
    window.dispatchEvent(new CustomEvent('game:timeWarning', {
      detail: { gameId, timeRemaining }
    }));
  }

  private emitTimeoutEvent(gameId: string, timedOutPlayer: string): void {
    window.dispatchEvent(new CustomEvent('game:timeout', {
      detail: { gameId, timedOutPlayer }
    }));
  }

  private emitReconnectionTimeoutEvent(gameId: string, playerId: string): void {
    window.dispatchEvent(new CustomEvent('game:reconnectionTimeout', {
      detail: { gameId, playerId }
    }));
  }

  /**
   * Get timeout status for a game
   */
  getTimeoutStatus(gameId: string): {
    timeRemaining: number;
    isWarning: boolean;
    lastMoveTime: Date | null;
  } {
    const timeoutState = this.timeouts.get(gameId);
    if (timeoutState) {
      const elapsed = Date.now() - timeoutState.lastMoveTime.getTime();
      const remaining = Math.max(0, this.defaultConfig.moveTimeout - elapsed);
      
      return {
        timeRemaining: remaining,
        isWarning: timeoutState.isWarning,
        lastMoveTime: timeoutState.lastMoveTime
      };
    }
    
    return {
      timeRemaining: 0,
      isWarning: false,
      lastMoveTime: null
    };
  }

  /**
   * Cleanup all timeouts
   */
  cleanup(): void {
    this.timeouts.forEach((timeoutState) => {
      this.clearTimeouts(timeoutState);
    });
    this.timeouts.clear();
  }
}

export const timeoutService = new TimeoutService();