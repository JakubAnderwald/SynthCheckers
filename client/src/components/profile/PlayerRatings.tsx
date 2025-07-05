import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Star, Medal, Award, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { eloService } from '@/services/eloService';
import { cn } from '@/lib/utils';

interface PlayerRatingsProps {
  onBack: () => void;
}

export function PlayerRatings({ onBack }: PlayerRatingsProps) {
  const { userProfile, user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple loading simulation since userProfile comes from context
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading ratings...</div>
      </div>
    );
  }

  if (!userProfile || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Please sign in to view ratings</div>
          <Button onClick={onBack} variant="outline">
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  const currentRating = userProfile.eloRating || 1200;
  const totalGames = userProfile.totalGames || 0;
  const wins = userProfile.wins || 0;
  const losses = userProfile.losses || 0;
  const draws = (userProfile as any).draws || 0;
  
  const winPercentage = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const ratingCategory = eloService.getRatingCategory(currentRating);
  const confidence = eloService.getRatingConfidence(totalGames);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-400" />
            Player Ratings
          </h1>
          <Button onClick={onBack} variant="outline">
            Back to Menu
          </Button>
        </div>

        {/* Player Profile Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
              {userProfile.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{userProfile.displayName}</h2>
              <p className="text-gray-400">{user.email}</p>
            </div>
          </div>

          {/* Rating Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-400 mb-2">{currentRating}</div>
              <div className="text-gray-300 font-medium">Current Rating</div>
              <div className={cn("text-sm font-medium", ratingCategory.color)}>
                {ratingCategory.name}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-2">{winPercentage}%</div>
              <div className="text-gray-300 font-medium">Win Rate</div>
              <div className="text-sm text-gray-400">
                {wins}W - {losses}L - {draws}D
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-2">{totalGames}</div>
              <div className="text-gray-300 font-medium">Games Played</div>
              <div className={cn(
                "text-sm font-medium",
                confidence.level === 'high' && "text-green-400",
                confidence.level === 'medium' && "text-yellow-400",
                confidence.level === 'low' && "text-red-400"
              )}>
                {confidence.description}
              </div>
            </div>
          </div>
        </div>

        {/* Rating Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Rating History Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Rating Progress
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Peak Rating:</span>
                <span className="text-green-400 font-bold">
                  {(userProfile as any).peakRating || currentRating}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Lowest Rating:</span>
                <span className="text-red-400 font-bold">
                  {(userProfile as any).lowestRating || currentRating}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Rating Range:</span>
                <span className="text-gray-400">
                  {ratingCategory.range}
                </span>
              </div>
            </div>

            {totalGames < 10 && (
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                <div className="text-yellow-400 text-sm font-medium mb-1">
                  Provisional Rating
                </div>
                <div className="text-yellow-300 text-xs">
                  Play {10 - totalGames} more games for a stable rating
                </div>
              </div>
            )}
          </div>

          {/* Account Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Account Info
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Member Since:</span>
                <span className="text-gray-400">
                  {formatDate(userProfile.createdAt)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Last Game:</span>
                <span className="text-gray-400">
                  {formatDate((userProfile as any).lastGameAt)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Status:</span>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    userProfile.isOnline ? "bg-green-400" : "bg-gray-400"
                  )} />
                  <span className="text-gray-400">
                    {userProfile.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-400" />
            Achievements
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* First Win */}
            <div className={cn(
              "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
              wins > 0 
                ? "border-green-400/50 bg-green-400/10" 
                : "border-gray-600 bg-gray-700/20"
            )}>
              <Trophy className={cn(
                "h-8 w-8 mb-2",
                wins > 0 ? "text-green-400" : "text-gray-500"
              )} />
              <div className={cn(
                "text-sm font-medium text-center",
                wins > 0 ? "text-green-400" : "text-gray-500"
              )}>
                First Victory
              </div>
              <div className="text-xs text-gray-400 text-center">
                Win your first game
              </div>
            </div>

            {/* 10 Games */}
            <div className={cn(
              "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
              totalGames >= 10 
                ? "border-blue-400/50 bg-blue-400/10" 
                : "border-gray-600 bg-gray-700/20"
            )}>
              <Star className={cn(
                "h-8 w-8 mb-2",
                totalGames >= 10 ? "text-blue-400" : "text-gray-500"
              )} />
              <div className={cn(
                "text-sm font-medium text-center",
                totalGames >= 10 ? "text-blue-400" : "text-gray-500"
              )}>
                Getting Started
              </div>
              <div className="text-xs text-gray-400 text-center">
                Play 10 games
              </div>
            </div>

            {/* High Rating */}
            <div className={cn(
              "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
              currentRating >= 1500 
                ? "border-purple-400/50 bg-purple-400/10" 
                : "border-gray-600 bg-gray-700/20"
            )}>
              <Medal className={cn(
                "h-8 w-8 mb-2",
                currentRating >= 1500 ? "text-purple-400" : "text-gray-500"
              )} />
              <div className={cn(
                "text-sm font-medium text-center",
                currentRating >= 1500 ? "text-purple-400" : "text-gray-500"
              )}>
                Rising Star
              </div>
              <div className="text-xs text-gray-400 text-center">
                Reach 1500 rating
              </div>
            </div>

            {/* Win Streak */}
            <div className={cn(
              "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
              winPercentage >= 60 && totalGames >= 5
                ? "border-yellow-400/50 bg-yellow-400/10" 
                : "border-gray-600 bg-gray-700/20"
            )}>
              <TrendingUp className={cn(
                "h-8 w-8 mb-2",
                winPercentage >= 60 && totalGames >= 5 ? "text-yellow-400" : "text-gray-500"
              )} />
              <div className={cn(
                "text-sm font-medium text-center",
                winPercentage >= 60 && totalGames >= 5 ? "text-yellow-400" : "text-gray-500"
              )}>
                Consistent
              </div>
              <div className="text-xs text-gray-400 text-center">
                60%+ win rate
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <div className="text-gray-400 mb-4">
            Ready to improve your rating?
          </div>
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={onBack}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              Play Online Game
            </Button>
            <Button 
              onClick={onBack}
              variant="outline"
            >
              Practice vs AI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}