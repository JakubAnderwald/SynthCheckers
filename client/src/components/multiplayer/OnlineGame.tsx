import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OnlineBoard from '@/components/game/OnlineBoard';
import { TurnManagement } from '@/components/multiplayer/TurnManagement';
import { useOnlineGameStore } from '@/lib/stores/useOnlineGameStore';
import { useGameSync } from '@/hooks/useGameSync';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Wifi, WifiOff, Settings, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("animate-spin rounded-full border-2 border-cyan-400 border-t-transparent", sizeClasses[size])} />
      {text && <span className="text-gray-400 text-sm">{text}</span>}
    </div>
  );
}

export function OnlineGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    currentGame,
    playerColor,
    isPlayerTurn,
    error,
    setError,
    resetGameState,
    resetUIState,
    startPlayerTimers,
    stopPlayerTimers
  } = useOnlineGameStore();

  const {
    isConnected,
    isReconnecting,
    error: syncError,
    startSync,
    stopSync,
    forceReconnect
  } = useGameSync({
    gameId: gameId || null,
    onGameUpdate: (game) => {
      console.log('Game updated:', game);
      // Start timers when game becomes active
      if (game.status === 'active') {
        startPlayerTimers(game.timeControl);
      }
    },
    onMoveReceived: (move) => {
      console.log('Move received:', move);
      // Move is automatically processed through the store
    },
    onPlayerDisconnected: (playerId) => {
      console.log('Player disconnected:', playerId);
      // Could show notification or update UI
    }
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/multiplayer');
      return;
    }

    if (!gameId) {
      setError('No game ID provided');
      setIsLoading(false);
      return;
    }

    // Initialize game sync
    const initializeGame = async () => {
      try {
        await startSync();
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize game:', err);
        setError('Failed to connect to game');
        setIsLoading(false);
      }
    };

    initializeGame();

    // Cleanup on unmount
    return () => {
      stopSync();
      stopPlayerTimers();
      resetGameState();
      resetUIState();
    };
  }, [gameId, isAuthenticated, user, navigate, startSync, stopSync, stopPlayerTimers, resetGameState, resetUIState, setError]);

  const handleLeaveGame = () => {
    stopSync();
    stopPlayerTimers();
    resetGameState();
    resetUIState();
    navigate('/multiplayer');
  };

  const handleReconnect = async () => {
    try {
      await forceReconnect();
    } catch (err) {
      console.error('Failed to reconnect:', err);
      setError('Failed to reconnect to game');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Connecting to game..." />
      </div>
    );
  }

  if (error || syncError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              {error || syncError || 'Failed to connect to game'}
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button onClick={handleReconnect} variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={handleLeaveGame} variant="outline" className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentGame) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading game..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Game Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleLeaveGame}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Leave Game
            </Button>
            
            <div className="text-gray-400">
              <span className="text-sm">Game ID: </span>
              <span className="font-mono text-white">{gameId}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isReconnecting ? (
              <div className="flex items-center gap-2 text-orange-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Reconnecting...</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-2 text-green-400">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">Disconnected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Game Board */}
          <div className="xl:col-span-3">
            <div className="space-y-6">
              {/* Turn Management */}
              <TurnManagement />
              
              {/* Game Board */}
              {currentGame && <OnlineBoard gameRecord={currentGame} />}
            </div>
          </div>
          
          {/* Game Info Sidebar */}
          <div className="space-y-4">
            {/* Game Status */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Game Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={cn(
                    "capitalize font-medium",
                    currentGame.status === 'active' && "text-green-400",
                    currentGame.status === 'waiting' && "text-yellow-400",
                    currentGame.status === 'completed' && "text-blue-400"
                  )}>
                    {currentGame.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Moves:</span>
                  <span className="text-white">{currentGame.totalMoves}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white capitalize">{currentGame.gameType}</span>
                </div>
                {currentGame.timeControl && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time Control:</span>
                    <span className="text-white">
                      {currentGame.timeControl.initialTime}+{currentGame.timeControl.increment}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Players */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Players</h3>
              <div className="space-y-3">
                <div className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-all",
                  currentGame.currentTurn === 'red' && "bg-red-500/10 border border-red-500/20",
                  playerColor === 'red' && "ring-1 ring-cyan-400/50"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div>
                      <div className="text-white text-sm font-medium">
                        {currentGame.playerRed.displayName}
                        {playerColor === 'red' && <span className="text-cyan-400 ml-1">(You)</span>}
                      </div>
                      <div className="text-gray-400 text-xs">{currentGame.playerRed.eloRating} ELO</div>
                    </div>
                  </div>
                  {currentGame.playerRed.hasResigned && (
                    <span className="text-red-400 text-xs">Resigned</span>
                  )}
                </div>
                
                <div className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-all",
                  currentGame.currentTurn === 'blue' && "bg-blue-500/10 border border-blue-500/20",
                  playerColor === 'blue' && "ring-1 ring-cyan-400/50"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="text-white text-sm font-medium">
                        {currentGame.playerBlue.displayName}
                        {playerColor === 'blue' && <span className="text-cyan-400 ml-1">(You)</span>}
                      </div>
                      <div className="text-gray-400 text-xs">{currentGame.playerBlue.eloRating} ELO</div>
                    </div>
                  </div>
                  {currentGame.playerBlue.hasResigned && (
                    <span className="text-red-400 text-xs">Resigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Game Actions */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled={currentGame.status !== 'active'}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Game Settings
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled={currentGame.status !== 'active'}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}