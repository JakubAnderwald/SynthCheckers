import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { GameRecord } from '@/types/firestore';

interface ConnectionState {
  isOnline: boolean;
  lastSeen: Date;
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  presenceRef: any;
}

export class ConnectionService {
  private connections = new Map<string, ConnectionState>();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly TIMEOUT_THRESHOLD = 60000; // 60 seconds

  /**
   * Start presence tracking for a game
   */
  async startPresence(gameId: string, userId: string): Promise<void> {
    try {
      const db = await getFirebaseDb();
      const gameRef = doc(db, 'gameRooms', gameId);
      
      // Initial presence update
      await this.updatePresence(gameId, userId, true);
      
      // Set up heartbeat
      const heartbeatInterval = setInterval(async () => {
        try {
          await this.updatePresence(gameId, userId, true);
        } catch (error) {
          console.warn('Heartbeat failed:', error);
          this.handleConnectionLoss(gameId, userId);
        }
      }, this.HEARTBEAT_INTERVAL);

      // Set up presence listener
      const presenceRef = onSnapshot(gameRef, (snapshot) => {
        if (snapshot.exists()) {
          const gameData = snapshot.data() as GameRecord;
          this.checkPlayerConnections(gameData);
        }
      });

      this.connections.set(gameId, {
        isOnline: true,
        lastSeen: new Date(),
        heartbeatInterval,
        presenceRef
      });

      console.log('Presence tracking started for game:', gameId);
    } catch (error) {
      console.error('Failed to start presence tracking:', error);
      throw error;
    }
  }

  /**
   * Stop presence tracking for a game
   */
  async stopPresence(gameId: string, userId: string): Promise<void> {
    try {
      const connection = this.connections.get(gameId);
      if (connection) {
        // Clear heartbeat
        if (connection.heartbeatInterval) {
          clearInterval(connection.heartbeatInterval);
        }

        // Unsubscribe from presence updates
        if (connection.presenceRef) {
          connection.presenceRef();
        }

        // Mark as offline
        await this.updatePresence(gameId, userId, false);
        
        this.connections.delete(gameId);
        console.log('Presence tracking stopped for game:', gameId);
      }
    } catch (error) {
      console.error('Failed to stop presence tracking:', error);
    }
  }

  /**
   * Update player presence in Firestore
   */
  private async updatePresence(gameId: string, userId: string, isOnline: boolean): Promise<void> {
    try {
      const db = await getFirebaseDb();
      const gameRef = doc(db, 'gameRooms', gameId);
      
      const presenceUpdate = {
        [`playerPresence.${userId}`]: {
          isOnline,
          lastSeen: serverTimestamp(),
          timestamp: new Date().toISOString()
        }
      };

      await updateDoc(gameRef, presenceUpdate);
    } catch (error) {
      console.error('Failed to update presence:', error);
      throw error;
    }
  }

  /**
   * Check all player connections in a game
   */
  private checkPlayerConnections(gameData: GameRecord): void {
    const now = Date.now();
    const playerPresence = (gameData as any).playerPresence || {};

    Object.entries(playerPresence).forEach(([playerId, presence]: [string, any]) => {
      if (presence.lastSeen) {
        const lastSeenTime = presence.lastSeen.toDate ? presence.lastSeen.toDate().getTime() : new Date(presence.timestamp).getTime();
        const timeSinceLastSeen = now - lastSeenTime;

        if (timeSinceLastSeen > this.TIMEOUT_THRESHOLD && presence.isOnline) {
          console.warn(`Player ${playerId} appears disconnected (${timeSinceLastSeen}ms since last seen)`);
          this.handlePlayerDisconnection(gameData.gameId, playerId);
        }
      }
    });
  }

  /**
   * Handle player disconnection
   */
  private async handlePlayerDisconnection(gameId: string, playerId: string): Promise<void> {
    try {
      console.log(`Handling disconnection for player ${playerId} in game ${gameId}`);
      
      // Mark player as offline
      await this.updatePresence(gameId, playerId, false);
      
      // Emit disconnection event
      this.emitDisconnectionEvent(gameId, playerId);
      
      // Start reconnection grace period
      this.startReconnectionGracePeriod(gameId, playerId);
    } catch (error) {
      console.error('Failed to handle player disconnection:', error);
    }
  }

  /**
   * Handle connection loss for current user
   */
  private handleConnectionLoss(gameId: string, userId: string): void {
    const connection = this.connections.get(gameId);
    if (connection) {
      connection.isOnline = false;
      console.log('Connection lost for game:', gameId);
      
      // Attempt to reconnect
      this.attemptReconnection(gameId, userId);
    }
  }

  /**
   * Attempt to reconnect to game
   */
  private async attemptReconnection(gameId: string, userId: string): Promise<void> {
    const maxAttempts = 5;
    let attempts = 0;

    const reconnect = async (): Promise<void> => {
      attempts++;
      try {
        await this.updatePresence(gameId, userId, true);
        
        const connection = this.connections.get(gameId);
        if (connection) {
          connection.isOnline = true;
          connection.lastSeen = new Date();
        }
        
        console.log('Successfully reconnected to game:', gameId);
        this.emitReconnectionEvent(gameId);
      } catch (error) {
        console.warn(`Reconnection attempt ${attempts} failed:`, error);
        
        if (attempts < maxAttempts) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
          setTimeout(reconnect, delay);
        } else {
          console.error('Failed to reconnect after maximum attempts');
          this.emitConnectionFailureEvent(gameId);
        }
      }
    };

    await reconnect();
  }

  /**
   * Start reconnection grace period
   */
  private startReconnectionGracePeriod(gameId: string, playerId: string): void {
    const gracePeriod = 120000; // 2 minutes
    
    setTimeout(async () => {
      try {
        const db = await getFirebaseDb();
        const gameRef = doc(db, 'gameRooms', gameId);
        
        // Check if player is still disconnected
        const playerPresence = await this.getPlayerPresence(gameId, playerId);
        if (playerPresence && !playerPresence.isOnline) {
          console.log(`Player ${playerId} did not reconnect within grace period`);
          await this.handleAbandonedGame(gameId, playerId);
        }
      } catch (error) {
        console.error('Error during grace period check:', error);
      }
    }, gracePeriod);
  }

  /**
   * Get player presence status
   */
  private async getPlayerPresence(gameId: string, playerId: string): Promise<any> {
    try {
      const db = await getFirebaseDb();
      const gameRef = doc(db, 'gameRooms', gameId);
      const snapshot = await getDoc(gameRef);
      
      if (snapshot.exists()) {
        const gameData = snapshot.data() as any;
        return gameData.playerPresence?.[playerId];
      }
      return null;
    } catch (error) {
      console.error('Failed to get player presence:', error);
      return null;
    }
  }

  /**
   * Handle abandoned game
   */
  private async handleAbandonedGame(gameId: string, playerId: string): Promise<void> {
    try {
      const db = await getFirebaseDb();
      const gameRef = doc(db, 'gameRooms', gameId);
      
      await updateDoc(gameRef, {
        status: 'completed',
        winner: null, // Will be determined by the other player winning by abandonment
        endReason: 'abandonment',
        completedAt: serverTimestamp(),
        [`playerPresence.${playerId}.abandoned`]: true
      });
      
      console.log(`Game ${gameId} marked as abandoned due to player ${playerId} disconnection`);
      this.emitGameAbandonedEvent(gameId, playerId);
    } catch (error) {
      console.error('Failed to handle abandoned game:', error);
    }
  }

  /**
   * Event emitters for UI updates
   */
  private emitDisconnectionEvent(gameId: string, playerId: string): void {
    window.dispatchEvent(new CustomEvent('player:disconnected', {
      detail: { gameId, playerId }
    }));
  }

  private emitReconnectionEvent(gameId: string): void {
    window.dispatchEvent(new CustomEvent('player:reconnected', {
      detail: { gameId }
    }));
  }

  private emitConnectionFailureEvent(gameId: string): void {
    window.dispatchEvent(new CustomEvent('connection:failed', {
      detail: { gameId }
    }));
  }

  private emitGameAbandonedEvent(gameId: string, playerId: string): void {
    window.dispatchEvent(new CustomEvent('game:abandoned', {
      detail: { gameId, playerId }
    }));
  }

  /**
   * Get connection status for a game
   */
  getConnectionStatus(gameId: string): { isOnline: boolean; lastSeen: Date | null } {
    const connection = this.connections.get(gameId);
    return {
      isOnline: connection?.isOnline || false,
      lastSeen: connection?.lastSeen || null
    };
  }

  /**
   * Force reconnection attempt
   */
  async forceReconnect(gameId: string, userId: string): Promise<void> {
    await this.attemptReconnection(gameId, userId);
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    this.connections.forEach((connection, gameId) => {
      if (connection.heartbeatInterval) {
        clearInterval(connection.heartbeatInterval);
      }
      if (connection.presenceRef) {
        connection.presenceRef();
      }
    });
    this.connections.clear();
  }
}

export const connectionService = new ConnectionService();