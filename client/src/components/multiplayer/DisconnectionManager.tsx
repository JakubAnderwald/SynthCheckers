import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Wifi, WifiOff, Clock, RefreshCw, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnlineGameStore } from '@/lib/stores/useOnlineGameStore';
import { connectionService } from '@/services/connectionService';
import { timeoutService } from '@/services/timeoutService';

interface DisconnectionManagerProps {
  gameId: string;
  userId: string;
  onReconnect?: () => Promise<void>;
  onAbandoned?: () => void;
}

interface DisconnectionEvent {
  type: 'player_disconnected' | 'reconnection_timeout' | 'timeout_warning' | 'game_timeout' | 'game_abandoned';
  playerId?: string;
  timeRemaining?: number;
  timestamp: Date;
}

export function DisconnectionManager({ 
  gameId, 
  userId, 
  onReconnect, 
  onAbandoned 
}: DisconnectionManagerProps) {
  const { currentGame } = useOnlineGameStore();
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<DisconnectionEvent[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [timeWarning, setTimeWarning] = useState<{ timeRemaining: number } | null>(null);

  // Handle disconnection events
  const handlePlayerDisconnected = useCallback((event: CustomEvent) => {
    const { gameId: eventGameId, playerId } = event.detail;
    if (eventGameId === gameId) {
      setDisconnectedPlayers(prev => new Set(prev).add(playerId));
      setNotifications(prev => [...prev, {
        type: 'player_disconnected',
        playerId,
        timestamp: new Date()
      }]);
      console.log('Player disconnected:', playerId);
    }
  }, [gameId]);

  // Handle reconnection events
  const handlePlayerReconnected = useCallback((event: CustomEvent) => {
    const { gameId: eventGameId } = event.detail;
    if (eventGameId === gameId) {
      setDisconnectedPlayers(new Set()); // Clear all disconnected players
      setIsReconnecting(false);
      setNotifications(prev => prev.filter(n => n.type !== 'player_disconnected'));
      console.log('Player reconnected');
    }
  }, [gameId]);

  // Handle connection failure
  const handleConnectionFailed = useCallback((event: CustomEvent) => {
    const { gameId: eventGameId } = event.detail;
    if (eventGameId === gameId) {
      setIsReconnecting(false);
      console.log('Connection failed');
    }
  }, [gameId]);

  // Handle time warnings
  const handleTimeWarning = useCallback((event: CustomEvent) => {
    const { gameId: eventGameId, timeRemaining } = event.detail;
    if (eventGameId === gameId) {
      setTimeWarning({ timeRemaining });
      setNotifications(prev => [...prev, {
        type: 'timeout_warning',
        timeRemaining,
        timestamp: new Date()
      }]);
      console.log('Time warning:', timeRemaining);
    }
  }, [gameId]);

  // Handle game timeout
  const handleGameTimeout = useCallback((event: CustomEvent) => {
    const { gameId: eventGameId, timedOutPlayer } = event.detail;
    if (eventGameId === gameId) {
      setNotifications(prev => [...prev, {
        type: 'game_timeout',
        playerId: timedOutPlayer,
        timestamp: new Date()
      }]);
      console.log('Game timeout:', timedOutPlayer);
    }
  }, [gameId]);

  // Handle game abandoned
  const handleGameAbandoned = useCallback((event: CustomEvent) => {
    const { gameId: eventGameId, playerId } = event.detail;
    if (eventGameId === gameId) {
      setNotifications(prev => [...prev, {
        type: 'game_abandoned',
        playerId,
        timestamp: new Date()
      }]);
      onAbandoned?.();
      console.log('Game abandoned:', playerId);
    }
  }, [gameId, onAbandoned]);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('player:disconnected', handlePlayerDisconnected as EventListener);
    window.addEventListener('player:reconnected', handlePlayerReconnected as EventListener);
    window.addEventListener('connection:failed', handleConnectionFailed as EventListener);
    window.addEventListener('game:timeWarning', handleTimeWarning as EventListener);
    window.addEventListener('game:timeout', handleGameTimeout as EventListener);
    window.addEventListener('game:abandoned', handleGameAbandoned as EventListener);

    return () => {
      window.removeEventListener('player:disconnected', handlePlayerDisconnected as EventListener);
      window.removeEventListener('player:reconnected', handlePlayerReconnected as EventListener);
      window.removeEventListener('connection:failed', handleConnectionFailed as EventListener);
      window.removeEventListener('game:timeWarning', handleTimeWarning as EventListener);
      window.removeEventListener('game:timeout', handleGameTimeout as EventListener);
      window.removeEventListener('game:abandoned', handleGameAbandoned as EventListener);
    };
  }, [
    handlePlayerDisconnected,
    handlePlayerReconnected,
    handleConnectionFailed,
    handleTimeWarning,
    handleGameTimeout,
    handleGameAbandoned
  ]);

  // Clear time warning after delay
  useEffect(() => {
    if (timeWarning) {
      const timer = setTimeout(() => {
        setTimeWarning(null);
      }, 10000); // Clear after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [timeWarning]);

  // Handle manual reconnection
  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    try {
      if (onReconnect) {
        await onReconnect();
      } else {
        await connectionService.forceReconnect(gameId, userId);
      }
    } catch (error) {
      console.error('Manual reconnection failed:', error);
      setIsReconnecting(false);
    }
  };

  // Format time for display
  const formatTime = (timeMs: number): string => {
    const seconds = Math.ceil(timeMs / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get player display name
  const getPlayerDisplayName = (playerId: string): string => {
    if (!currentGame) return 'Unknown Player';
    if (currentGame.playerRed.uid === playerId) return currentGame.playerRed.displayName;
    if (currentGame.playerBlue.uid === playerId) return currentGame.playerBlue.displayName;
    return 'Unknown Player';
  };

  // Don't render if no issues
  if (disconnectedPlayers.size === 0 && !timeWarning && notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Player Disconnection Alerts */}
      {Array.from(disconnectedPlayers).map(playerId => (
        <Alert key={playerId} variant="destructive" className="border-orange-500/50 bg-orange-500/10">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>
                  <strong>{getPlayerDisplayName(playerId)}</strong> has disconnected
                </span>
              </div>
              {playerId !== userId && (
                <div className="text-sm text-orange-300">
                  Waiting for reconnection...
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Connection Recovery */}
      {disconnectedPlayers.has(userId) && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Connection Lost</strong>
                <p className="text-sm text-gray-300 mt-1">
                  Attempting to reconnect automatically...
                </p>
              </div>
              <Button
                onClick={handleManualReconnect}
                disabled={isReconnecting}
                size="sm"
                variant="outline"
                className="ml-4"
              >
                {isReconnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wifi className="h-4 w-4 mr-2" />
                )}
                {isReconnecting ? 'Reconnecting...' : 'Reconnect Now'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Time Warning */}
      {timeWarning && (
        <Alert className="border-red-500/50 bg-red-500/10 animate-pulse">
          <Clock className="h-4 w-4 text-red-400" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-red-400">Time Running Out!</strong>
                <p className="text-sm text-gray-300 mt-1">
                  You have {formatTime(timeWarning.timeRemaining)} remaining to make your move
                </p>
              </div>
              <div className="text-2xl font-bold text-red-400 font-mono">
                {formatTime(timeWarning.timeRemaining)}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Notifications */}
      {notifications.slice(-3).map((notification, index) => (
        <Alert
          key={`${notification.type}-${index}`}
          variant={notification.type === 'game_timeout' || notification.type === 'game_abandoned' ? 'destructive' : 'default'}
          className={cn(
            "transition-all duration-300",
            notification.type === 'timeout_warning' && "border-yellow-500/50 bg-yellow-500/10",
            notification.type === 'game_timeout' && "border-red-500/50 bg-red-500/10",
            notification.type === 'game_abandoned' && "border-red-500/50 bg-red-500/10"
          )}
        >
          {notification.type === 'timeout_warning' && <Clock className="h-4 w-4 text-yellow-400" />}
          {notification.type === 'game_timeout' && <AlertTriangle className="h-4 w-4 text-red-400" />}
          {notification.type === 'game_abandoned' && <User className="h-4 w-4 text-red-400" />}
          
          <AlertDescription>
            {notification.type === 'timeout_warning' && (
              <span>
                <strong>Time Warning:</strong> {formatTime(notification.timeRemaining || 0)} remaining
              </span>
            )}
            {notification.type === 'game_timeout' && (
              <span>
                <strong>Game Over:</strong> {getPlayerDisplayName(notification.playerId!)} ran out of time
              </span>
            )}
            {notification.type === 'game_abandoned' && (
              <span>
                <strong>Game Abandoned:</strong> {getPlayerDisplayName(notification.playerId!)} left the game
              </span>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}