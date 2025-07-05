import React from 'react';
import { TurnIndicator } from './TurnIndicator';
import { PlayerTimer } from './TurnTimer';
import { useOnlineGameStore } from '@/lib/stores/useOnlineGameStore';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface TurnManagementProps {
  className?: string;
}

export function TurnManagement({ className }: TurnManagementProps) {
  const { user } = useAuth();
  const {
    currentGame,
    playerColor,
    isPlayerTurn,
    playerTimers,
    isGameActive,
    isGameWaiting,
    isGameCompleted
  } = useOnlineGameStore();

  if (!currentGame || !user) {
    return null;
  }

  const myPlayer = playerColor === 'red' ? currentGame.playerRed : currentGame.playerBlue;
  const opponentPlayer = playerColor === 'red' ? currentGame.playerBlue : currentGame.playerRed;
  
  const defaultTimeControl = currentGame.timeControl || { initialTime: 10, increment: 5 };
  const totalTime = defaultTimeControl.initialTime * 60 * 1000; // Convert to milliseconds

  const handleTimeUp = () => {
    // Handle time up event - could trigger resignation or loss
    console.log('Time up for current player');
    // TODO: Implement timeout handling in game service
  };

  const handleLowTime = (timeLeft: number) => {
    // Handle low time warning - could play sound or show notification
    console.log('Low time warning:', timeLeft);
    // TODO: Implement low time notifications
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Turn Indicator */}
      <TurnIndicator className="w-full" />
      
      {/* Detailed Player Timers */}
      {(isGameActive() || isGameCompleted()) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* My Timer */}
          <PlayerTimer
            player={{
              displayName: myPlayer.displayName,
              eloRating: myPlayer.eloRating,
              hasResigned: myPlayer.hasResigned,
              timeRemaining: playerTimers[playerColor!]
            }}
            isMyTurn={isPlayerTurn}
            isActive={isGameActive()}
            totalTime={totalTime}
            onTimeUp={handleTimeUp}
            className="order-1"
          />
          
          {/* Opponent Timer */}
          <PlayerTimer
            player={{
              displayName: opponentPlayer.displayName,
              eloRating: opponentPlayer.eloRating,
              hasResigned: opponentPlayer.hasResigned,
              timeRemaining: playerTimers[playerColor === 'red' ? 'blue' : 'red']
            }}
            isMyTurn={!isPlayerTurn}
            isActive={isGameActive()}
            totalTime={totalTime}
            onTimeUp={handleTimeUp}
            className="order-2"
          />
        </div>
      )}
      
      {/* Game Status Information */}
      {isGameWaiting() && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-cyan-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent" />
            <span>Waiting for opponent to join...</span>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Share the game ID: <code className="bg-gray-700 px-2 py-1 rounded">{currentGame.gameId}</code>
          </p>
        </div>
      )}
      
      {isGameCompleted() && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-lg font-semibold mb-2">
            {currentGame.winner === 'draw' ? (
              <span className="text-yellow-400">Game Draw</span>
            ) : currentGame.winner === playerColor ? (
              <span className="text-green-400">Victory!</span>
            ) : (
              <span className="text-red-400">Defeat</span>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            {currentGame.endReason && `Reason: ${currentGame.endReason.replace('_', ' ')}`}
          </p>
          {currentGame.totalMoves > 0 && (
            <p className="text-gray-500 text-xs mt-1">
              Game lasted {currentGame.totalMoves} moves
            </p>
          )}
        </div>
      )}
    </div>
  );
}