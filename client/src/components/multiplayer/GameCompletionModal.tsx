import React, { useEffect, useState } from 'react';
import { Trophy, Clock, Target, TrendingUp, TrendingDown, Minus, Star, Medal, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnlineGameStore } from '@/lib/stores/useOnlineGameStore';
import { useAuth } from '@/contexts/AuthContext';
import { eloService } from '@/services/eloService';

interface GameCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain?: () => void;
  onBackToMenu: () => void;
}

interface GameCompletionData {
  gameId: string;
  winner: 'red' | 'blue' | 'draw';
  endReason: string;
  eloChanges: {
    red: number;
    blue: number;
  };
  finalRatings: {
    red: number;
    blue: number;
  };
  gameStats: {
    totalMoves: number;
    gameDuration: number;
    playerPerformance: {
      red: PlayerPerformance;
      blue: PlayerPerformance;
    };
  };
}

interface PlayerPerformance {
  averageMoveTime: number;
  timeUsed: number;
  capturesMade: number;
  kingsPromoted: number;
}

export function GameCompletionModal({
  isOpen,
  onClose,
  onPlayAgain,
  onBackToMenu
}: GameCompletionModalProps) {
  const { user } = useAuth();
  const { currentGame, playerColor } = useOnlineGameStore();
  const [completionData, setCompletionData] = useState<GameCompletionData | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isOpen && currentGame && currentGame.status === 'completed') {
      // Extract completion data from game record
      const gameData: GameCompletionData = {
        gameId: currentGame.gameId,
        winner: currentGame.winner || 'draw',
        endReason: currentGame.endReason || 'unknown',
        eloChanges: currentGame.eloChanges || { red: 0, blue: 0 },
        finalRatings: (currentGame as any).finalRatings || { 
          red: currentGame.playerRed.eloRating, 
          blue: currentGame.playerBlue.eloRating 
        },
        gameStats: (currentGame as any).gameStats || {
          totalMoves: currentGame.totalMoves,
          gameDuration: Date.now() - (currentGame.startedAt?.toDate?.() || currentGame.createdAt.toDate()).getTime(),
          playerPerformance: eloService.calculatePerformanceStats(currentGame)
        }
      };
      
      setCompletionData(gameData);
      
      // Trigger animation after a short delay
      setTimeout(() => setShowAnimation(true), 300);
    }
  }, [isOpen, currentGame]);

  useEffect(() => {
    // Listen for game completion events
    const handleGameCompletion = (event: CustomEvent) => {
      const { gameId, winner, endReason, eloChanges, gameStats } = event.detail;
      
      if (currentGame && gameId === currentGame.gameId) {
        setCompletionData({
          gameId,
          winner,
          endReason,
          eloChanges,
          finalRatings: {
            red: currentGame.playerRed.eloRating + eloChanges.redEloChange,
            blue: currentGame.playerBlue.eloRating + eloChanges.blueEloChange
          },
          gameStats
        });
      }
    };

    window.addEventListener('game:completed', handleGameCompletion as EventListener);
    return () => window.removeEventListener('game:completed', handleGameCompletion as EventListener);
  }, [currentGame]);

  if (!isOpen || !completionData || !currentGame || !playerColor) {
    return null;
  }

  const isWinner = completionData.winner === playerColor;
  const isDraw = completionData.winner === 'draw';
  const myEloChange = playerColor === 'red' ? completionData.eloChanges.red : completionData.eloChanges.blue;
  const opponentEloChange = playerColor === 'red' ? completionData.eloChanges.blue : completionData.eloChanges.red;
  const myFinalRating = playerColor === 'red' ? completionData.finalRatings.red : completionData.finalRatings.blue;
  const opponentFinalRating = playerColor === 'red' ? completionData.finalRatings.blue : completionData.finalRatings.red;
  
  const myPlayer = playerColor === 'red' ? currentGame.playerRed : currentGame.playerBlue;
  const opponentPlayer = playerColor === 'red' ? currentGame.playerBlue : currentGame.playerRed;
  const myPerformance = completionData.gameStats.playerPerformance[playerColor];
  const opponentPerformance = completionData.gameStats.playerPerformance[playerColor === 'red' ? 'blue' : 'red'];

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (ms: number): string => {
    const totalMinutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${totalMinutes}m ${seconds}s`;
  };

  const getEndReasonText = (reason: string): string => {
    switch (reason) {
      case 'checkmate': return 'All pieces captured';
      case 'timeout': return 'Time expired';
      case 'resignation': return 'Resignation';
      case 'abandonment': return 'Player left';
      case 'draw': return 'Draw agreed';
      default: return 'Game ended';
    }
  };

  const getResultIcon = () => {
    if (isDraw) return <Minus className="h-12 w-12 text-yellow-400" />;
    if (isWinner) return <Trophy className="h-12 w-12 text-green-400" />;
    return <Medal className="h-12 w-12 text-red-400" />;
  };

  const getResultText = () => {
    if (isDraw) return 'Draw';
    if (isWinner) return 'Victory!';
    return 'Defeat';
  };

  const getResultColor = () => {
    if (isDraw) return 'text-yellow-400';
    if (isWinner) return 'text-green-400';
    return 'text-red-400';
  };

  const myRatingCategory = eloService.getRatingCategory(myFinalRating);
  const opponentRatingCategory = eloService.getRatingCategory(opponentFinalRating);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={cn(
        "bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto",
        "transform transition-all duration-500",
        showAnimation ? "scale-100 opacity-100" : "scale-95 opacity-0"
      )}>
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-6 text-center">
          <div className={cn(
            "flex items-center justify-center gap-4 mb-4",
            "transform transition-all duration-700 delay-300",
            showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}>
            {getResultIcon()}
            <h1 className={cn("text-3xl font-bold", getResultColor())}>
              {getResultText()}
            </h1>
          </div>
          
          <p className="text-gray-400">
            {getEndReasonText(completionData.endReason)} • {formatDuration(completionData.gameStats.gameDuration)}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Players Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* My Results */}
            <div className={cn(
              "bg-gray-800/50 border border-gray-700 rounded-lg p-4",
              isWinner && "border-green-400/50 bg-green-400/5",
              isDraw && "border-yellow-400/50 bg-yellow-400/5"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                    playerColor === 'red' ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                  )}>
                    {myPlayer.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-white">{myPlayer.displayName} (You)</div>
                    <div className="text-sm text-gray-400">
                      {myRatingCategory.name} • {myFinalRating} ELO
                    </div>
                  </div>
                </div>
                
                {isWinner && <Award className="h-6 w-6 text-green-400" />}
                {isDraw && <Star className="h-6 w-6 text-yellow-400" />}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Rating Change</span>
                  <div className="flex items-center gap-1">
                    {myEloChange > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : myEloChange < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    ) : (
                      <Minus className="h-4 w-4 text-gray-400" />
                    )}
                    <span className={cn(
                      "font-medium",
                      myEloChange > 0 && "text-green-400",
                      myEloChange < 0 && "text-red-400",
                      myEloChange === 0 && "text-gray-400"
                    )}>
                      {myEloChange > 0 ? '+' : ''}{myEloChange}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Avg Move Time</span>
                  <span className="text-white">{formatTime(myPerformance.averageMoveTime)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Captures</span>
                  <span className="text-white">{myPerformance.capturesMade}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Kings</span>
                  <span className="text-white">{myPerformance.kingsPromoted}</span>
                </div>
              </div>
            </div>

            {/* Opponent Results */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                    playerColor === 'red' ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {opponentPlayer.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-white">{opponentPlayer.displayName}</div>
                    <div className="text-sm text-gray-400">
                      {opponentRatingCategory.name} • {opponentFinalRating} ELO
                    </div>
                  </div>
                </div>
                
                {!isWinner && !isDraw && <Award className="h-6 w-6 text-green-400" />}
                {isDraw && <Star className="h-6 w-6 text-yellow-400" />}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Rating Change</span>
                  <div className="flex items-center gap-1">
                    {opponentEloChange > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : opponentEloChange < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    ) : (
                      <Minus className="h-4 w-4 text-gray-400" />
                    )}
                    <span className={cn(
                      "font-medium",
                      opponentEloChange > 0 && "text-green-400",
                      opponentEloChange < 0 && "text-red-400",
                      opponentEloChange === 0 && "text-gray-400"
                    )}>
                      {opponentEloChange > 0 ? '+' : ''}{opponentEloChange}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Avg Move Time</span>
                  <span className="text-white">{formatTime(opponentPerformance.averageMoveTime)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Captures</span>
                  <span className="text-white">{opponentPerformance.capturesMade}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Kings</span>
                  <span className="text-white">{opponentPerformance.kingsPromoted}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Statistics */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Game Statistics
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">{completionData.gameStats.totalMoves}</div>
                <div className="text-sm text-gray-400">Total Moves</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {formatDuration(completionData.gameStats.gameDuration)}
                </div>
                <div className="text-sm text-gray-400">Game Duration</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {myPerformance.capturesMade + opponentPerformance.capturesMade}
                </div>
                <div className="text-sm text-gray-400">Total Captures</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {myPerformance.kingsPromoted + opponentPerformance.kingsPromoted}
                </div>
                <div className="text-sm text-gray-400">Kings Promoted</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {onPlayAgain && (
              <Button
                onClick={onPlayAgain}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                Play Again
              </Button>
            )}
            
            <Button
              onClick={onBackToMenu}
              variant="outline"
              className="flex-1"
            >
              Back to Menu
            </Button>
            
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}