import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineGameStore } from '@/lib/stores/useOnlineGameStore';
import GameSyncManager from '@/lib/gameSyncManager';
import { GameRecord, GameMove } from '@/types/firestore';
import { toast } from 'sonner';

interface UseGameSyncOptions {
  gameId: string | null;
  onGameUpdate?: (game: GameRecord) => void;
  onMoveReceived?: (move: GameMove) => void;
  onPlayerDisconnected?: (playerId: string) => void;
  enableAutoReconnect?: boolean;
}

interface UseGameSyncReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  lastSyncTime: Date | null;
  error: string | null;
  syncManager: GameSyncManager | null;
  startSync: () => Promise<void>;
  stopSync: () => void;
  forceReconnect: () => Promise<void>;
}

export function useGameSync(options: UseGameSyncOptions): UseGameSyncReturn {
  const { gameId, onGameUpdate, onMoveReceived, onPlayerDisconnected, enableAutoReconnect = true } = options;
  
  const { user } = useAuth();
  const syncManagerRef = useRef<GameSyncManager | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Get store state
  const isConnected = useOnlineGameStore(state => state.isConnected);
  const isReconnecting = useOnlineGameStore(state => state.isReconnecting);
  const error = useOnlineGameStore(state => state.error);
  const setError = useOnlineGameStore(state => state.setError);
  
  /**
   * Handle game updates from sync manager
   */
  const handleGameUpdate = useCallback((game: GameRecord) => {
    console.log('Game sync update:', game.gameId, game.status);
    setLastSyncTime(new Date());
    
    // Show toast for game status changes
    if (game.status === 'completed') {
      const userColor = game.playerRed.uid === user?.uid ? 'red' : 'blue';
      const isWinner = game.winner === userColor;
      
      toast.success(
        isWinner ? 'Game won! 🎉' : 'Game lost',
        {
          description: `Game ended by ${game.endReason}`,
          duration: 5000
        }
      );
    }
    
    // Call external callback
    if (onGameUpdate) {
      onGameUpdate(game);
    }
  }, [user?.uid, onGameUpdate]);
  
  /**
   * Handle new moves from sync manager
   */
  const handleMoveReceived = useCallback((move: GameMove) => {
    console.log('Move received via sync:', move);
    
    // Show move notification if it's opponent's move
    const userColor = useOnlineGameStore.getState().playerColor;
    if (move.player !== userColor) {
      toast.info('Opponent moved', {
        description: `Move: ${move.moveNotation}`,
        duration: 3000
      });
    }
    
    // Call external callback
    if (onMoveReceived) {
      onMoveReceived(move);
    }
  }, [onMoveReceived]);
  
  /**
   * Handle player disconnection
   */
  const handlePlayerDisconnected = useCallback((playerId: string) => {
    console.log('Player disconnected:', playerId);
    
    toast.warning('Opponent disconnected', {
      description: 'Waiting for reconnection...',
      duration: 5000
    });
    
    // Call external callback
    if (onPlayerDisconnected) {
      onPlayerDisconnected(playerId);
    }
  }, [onPlayerDisconnected]);
  
  /**
   * Handle sync errors
   */
  const handleSyncError = useCallback((error: Error) => {
    console.error('Game sync error:', error);
    
    toast.error('Connection error', {
      description: error.message,
      duration: 5000
    });
    
    // If auto-reconnect is disabled, don't attempt reconnection
    if (!enableAutoReconnect) {
      setError(error.message);
    }
  }, [enableAutoReconnect, setError]);
  
  /**
   * Start game synchronization
   */
  const startSync = useCallback(async () => {
    if (!gameId || !user?.uid) {
      console.warn('Cannot start sync: missing gameId or user');
      return;
    }
    
    // Clean up existing sync manager
    if (syncManagerRef.current) {
      syncManagerRef.current.stopSync();
    }
    
    try {
      console.log('Starting game sync for:', gameId);
      
      // Create new sync manager
      syncManagerRef.current = new GameSyncManager({
        gameId,
        userId: user.uid,
        onGameUpdate: handleGameUpdate,
        onMoveReceived: handleMoveReceived,
        onPlayerDisconnected: handlePlayerDisconnected,
        onSyncError: handleSyncError
      });
      
      // Start synchronization
      await syncManagerRef.current.startSync();
      
      console.log('Game sync started successfully');
      
      // Clear any previous errors
      setError(null);
      
    } catch (error) {
      console.error('Failed to start game sync:', error);
      handleSyncError(error as Error);
    }
  }, [gameId, user?.uid, handleGameUpdate, handleMoveReceived, handlePlayerDisconnected, handleSyncError, setError]);
  
  /**
   * Stop game synchronization
   */
  const stopSync = useCallback(() => {
    console.log('Stopping game sync');
    
    if (syncManagerRef.current) {
      syncManagerRef.current.stopSync();
      syncManagerRef.current = null;
    }
    
    // Reset store state
    const store = useOnlineGameStore.getState();
    store.setIsConnected(false);
    store.setIsReconnecting(false);
    store.setError(null);
    
    setLastSyncTime(null);
  }, []);
  
  /**
   * Force reconnection
   */
  const forceReconnect = useCallback(async () => {
    console.log('Force reconnecting game sync...');
    
    stopSync();
    
    // Wait a moment before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await startSync();
  }, [stopSync, startSync]);
  
  /**
   * Auto-start sync when gameId or user changes
   */
  useEffect(() => {
    if (gameId && user?.uid) {
      startSync();
    } else {
      stopSync();
    }
    
    // Cleanup on unmount
    return () => {
      stopSync();
    };
  }, [gameId, user?.uid, startSync, stopSync]);
  
  /**
   * Handle visibility change for background sync management
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('App backgrounded - maintaining sync');
        // Keep sync running but reduce heartbeat frequency
      } else {
        console.log('App foregrounded - ensuring sync is active');
        // Ensure sync is active and force a refresh
        if (syncManagerRef.current && !syncManagerRef.current.isGameConnected()) {
          forceReconnect();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [forceReconnect]);
  
  /**
   * Network status monitoring
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network reconnected - restarting sync');
      forceReconnect();
    };
    
    const handleOffline = () => {
      console.log('Network disconnected');
      toast.warning('Network disconnected', {
        description: 'Trying to reconnect...',
        duration: 3000
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [forceReconnect]);
  
  return {
    isConnected,
    isReconnecting,
    lastSyncTime,
    error,
    syncManager: syncManagerRef.current,
    startSync,
    stopSync,
    forceReconnect
  };
}

export default useGameSync;