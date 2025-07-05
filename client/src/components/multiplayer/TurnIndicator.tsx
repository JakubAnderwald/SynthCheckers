import React from 'react';
import { Clock, User, Crown, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnlineGameStore } from '@/lib/stores/useOnlineGameStore';
import { useGameSync } from '@/hooks/useGameSync';

interface TurnIndicatorProps {
  className?: string;
}

export function TurnIndicator({ className }: TurnIndicatorProps) {
  const {
    currentGame,
    playerColor,
    isPlayerTurn,
    playerTimers,
    getCurrentPlayerTimer,
    getOpponentTimer,
    isGameActive,
    isGameWaiting,
    isGameCompleted
  } = useOnlineGameStore();

  const { isConnected, isReconnecting } = useGameSync({
    gameId: currentGame?.gameId || null
  });

  if (!currentGame) {
    return null;
  }

  const currentPlayer = currentGame.currentTurn;
  const isMyTurn = isPlayerTurn;
  const myTimer = getCurrentPlayerTimer();
  const opponentTimer = getOpponentTimer();
  
  const myPlayer = playerColor === 'red' ? currentGame.playerRed : currentGame.playerBlue;
  const opponentPlayer = playerColor === 'red' ? currentGame.playerBlue : currentGame.playerRed;

  const formatTime = (timeMs: number): string => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPlayerStatusIcon = (player: typeof myPlayer, isCurrentTurn: boolean) => {
    if (player.hasResigned) return <AlertTriangle className="h-4 w-4 text-red-400" />;
    if (isCurrentTurn) return <Crown className="h-4 w-4 text-yellow-400" />;
    return <User className="h-4 w-4 text-gray-400" />;
  };

  const getConnectionStatus = () => {
    if (isReconnecting) {
      return (
        <div className="flex items-center gap-2 text-orange-400">
          <WifiOff className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Reconnecting...</span>
        </div>
      );
    }
    
    if (!isConnected) {
      return (
        <div className="flex items-center gap-2 text-red-400">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">Disconnected</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-green-400">
        <Wifi className="h-4 w-4" />
        <span className="text-sm">Connected</span>
      </div>
    );
  };

  if (isGameWaiting()) {
    return (
      <div className={cn(
        "bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4",
        "flex items-center justify-center gap-4",
        className
      )}>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent" />
          <span className="text-cyan-400 font-medium">Waiting for opponent...</span>
        </div>
        {getConnectionStatus()}
      </div>
    );
  }

  if (isGameCompleted()) {
    const winner = currentGame.winner;
    const isWinner = winner === playerColor;
    const isDraw = winner === 'draw';
    
    return (
      <div className={cn(
        "bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4",
        "flex items-center justify-between",
        className
      )}>
        <div className="flex items-center gap-3">
          {isDraw ? (
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Game Draw</span>
            </div>
          ) : (
            <div className={cn(
              "flex items-center gap-2 font-semibold",
              isWinner ? "text-green-400" : "text-red-400"
            )}>
              <Crown className="h-5 w-5" />
              <span>{isWinner ? "You Won!" : "You Lost"}</span>
            </div>
          )}
          <span className="text-gray-400 text-sm">
            {currentGame.endReason && `(${currentGame.endReason.replace('_', ' ')})`}
          </span>
        </div>
        {getConnectionStatus()}
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4",
      "flex items-center justify-between",
      className
    )}>
      {/* Current Turn Indicator */}
      <div className="flex items-center gap-4">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-300",
          isMyTurn 
            ? "bg-cyan-400/20 border border-cyan-400/50 text-cyan-400" 
            : "bg-gray-700/50 border border-gray-600 text-gray-400"
        )}>
          {getPlayerStatusIcon(myPlayer, isMyTurn)}
          <span className="font-medium">{myPlayer.displayName}</span>
          {isMyTurn && (
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              <span>{formatTime(myTimer)}</span>
            </div>
          )}
        </div>

        <div className="text-gray-500 text-sm">vs</div>

        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-300",
          !isMyTurn 
            ? "bg-pink-400/20 border border-pink-400/50 text-pink-400" 
            : "bg-gray-700/50 border border-gray-600 text-gray-400"
        )}>
          {getPlayerStatusIcon(opponentPlayer, !isMyTurn)}
          <span className="font-medium">{opponentPlayer.displayName}</span>
          {!isMyTurn && (
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              <span>{formatTime(opponentTimer)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Turn Status and Connection */}
      <div className="flex items-center gap-4">
        {isGameActive() && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
            isMyTurn 
              ? "bg-green-400/20 text-green-400" 
              : "bg-orange-400/20 text-orange-400"
          )}>
            {isMyTurn ? "Your Turn" : "Opponent's Turn"}
          </div>
        )}
        
        {getConnectionStatus()}
      </div>
    </div>
  );
}