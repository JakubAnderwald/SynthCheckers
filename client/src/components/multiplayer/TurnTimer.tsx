import React, { useEffect, useState } from 'react';
import { Clock, Timer, AlertTriangle, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface TurnTimerProps {
  timeRemaining: number; // milliseconds
  totalTime: number; // milliseconds
  isActive: boolean;
  isMyTurn: boolean;
  isPaused?: boolean;
  onTimeUp?: () => void;
  onLowTime?: (timeLeft: number) => void;
  className?: string;
}

export function TurnTimer({
  timeRemaining,
  totalTime,
  isActive,
  isMyTurn,
  isPaused = false,
  onTimeUp,
  onLowTime,
  className
}: TurnTimerProps) {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  const [isLowTime, setIsLowTime] = useState(false);

  useEffect(() => {
    setDisplayTime(timeRemaining);
    
    // Check for low time warning (under 30 seconds)
    const lowTimeThreshold = 30000; // 30 seconds
    const wasLowTime = isLowTime;
    const nowLowTime = timeRemaining < lowTimeThreshold && timeRemaining > 0;
    
    if (nowLowTime && !wasLowTime) {
      setIsLowTime(true);
      onLowTime?.(timeRemaining);
    } else if (!nowLowTime && wasLowTime) {
      setIsLowTime(false);
    }
    
    // Check for time up
    if (timeRemaining <= 0 && isActive) {
      onTimeUp?.();
    }
  }, [timeRemaining, isActive, isLowTime, onTimeUp, onLowTime]);

  const formatTime = (timeMs: number): string => {
    const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimePercentage = (): number => {
    if (totalTime <= 0) return 0;
    return Math.max(0, Math.min(100, (displayTime / totalTime) * 100));
  };

  const getTimerColor = (): string => {
    if (!isActive) return 'text-gray-400';
    if (displayTime <= 0) return 'text-red-400';
    if (isLowTime) return 'text-orange-400';
    if (isMyTurn) return 'text-cyan-400';
    return 'text-pink-400';
  };

  const getProgressColor = (): string => {
    if (!isActive) return 'bg-gray-600';
    if (displayTime <= 0) return 'bg-red-500';
    if (isLowTime) return 'bg-orange-500';
    if (isMyTurn) return 'bg-cyan-500';
    return 'bg-pink-500';
  };

  const shouldPulse = isActive && isMyTurn && !isPaused;
  const shouldBlink = isActive && isLowTime && !isPaused;

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
      "bg-gray-800/50 border border-gray-700",
      shouldPulse && "animate-pulse",
      className
    )}>
      {/* Timer Icon */}
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full",
        "bg-gray-700/50 border border-gray-600",
        getTimerColor()
      )}>
        {isPaused ? (
          <Pause className="h-4 w-4" />
        ) : displayTime <= 0 ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Timer className="h-4 w-4" />
        )}
      </div>

      {/* Time Display */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            "text-sm font-mono font-medium transition-colors duration-300",
            getTimerColor(),
            shouldBlink && "animate-pulse"
          )}>
            {formatTime(displayTime)}
          </span>
          
          {isPaused && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Pause className="h-3 w-3" />
              <span>Paused</span>
            </div>
          )}
          
          {displayTime <= 0 && (
            <div className="flex items-center gap-1 text-xs text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Time Up!</span>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              getProgressColor(),
              shouldBlink && "animate-pulse"
            )}
            style={{ 
              width: `${getTimePercentage()}%`,
              transition: 'width 0.3s ease-out'
            }}
          />
        </div>
      </div>

      {/* Status Indicator */}
      <div className={cn(
        "w-2 h-2 rounded-full transition-all duration-300",
        isActive && !isPaused ? getProgressColor() : "bg-gray-600"
      )} />
    </div>
  );
}

interface PlayerTimerProps {
  player: {
    displayName: string;
    eloRating: number;
    hasResigned: boolean;
    timeRemaining?: number;
  };
  isMyTurn: boolean;
  isActive: boolean;
  totalTime: number;
  onTimeUp?: () => void;
  className?: string;
}

export function PlayerTimer({
  player,
  isMyTurn,
  isActive,
  totalTime,
  onTimeUp,
  className
}: PlayerTimerProps) {
  const timeRemaining = player.timeRemaining || 0;
  const isTimerActive = isActive && isMyTurn && !player.hasResigned;

  return (
    <div className={cn(
      "bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3",
      "flex items-center justify-between",
      isMyTurn && "border-cyan-400/50 bg-cyan-400/5",
      className
    )}>
      {/* Player Info */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
          isMyTurn ? "bg-cyan-400/20 text-cyan-400" : "bg-gray-700 text-gray-400"
        )}>
          {player.displayName.charAt(0).toUpperCase()}
        </div>
        
        <div>
          <div className={cn(
            "font-medium",
            isMyTurn ? "text-cyan-400" : "text-gray-300"
          )}>
            {player.displayName}
          </div>
          <div className="text-xs text-gray-500">
            {player.eloRating} ELO
          </div>
        </div>
        
        {player.hasResigned && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-400/20 text-red-400 rounded-full text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>Resigned</span>
          </div>
        )}
      </div>

      {/* Timer */}
      <TurnTimer
        timeRemaining={timeRemaining}
        totalTime={totalTime}
        isActive={isTimerActive}
        isMyTurn={isMyTurn}
        onTimeUp={onTimeUp}
        className="min-w-[120px]"
      />
    </div>
  );
}