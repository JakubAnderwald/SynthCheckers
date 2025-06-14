import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Trophy, Target, TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';
import type { UserProfile } from '../../types/firestore';

interface ProfileStatsProps {
  profile: UserProfile;
  isOwnProfile?: boolean;
}

export function ProfileStats({ profile, isOwnProfile = false }: ProfileStatsProps) {
  const winPercentage = profile.totalGames > 0 
    ? Math.round((profile.wins / profile.totalGames) * 100) 
    : 0;

  const getRatingColor = (rating: number) => {
    if (rating >= 2000) return 'text-purple-400';
    if (rating >= 1600) return 'text-blue-400';
    if (rating >= 1400) return 'text-green-400';
    if (rating >= 1200) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getRatingTitle = (rating: number) => {
    if (rating >= 2000) return 'Master';
    if (rating >= 1800) return 'Expert';
    if (rating >= 1600) return 'Advanced';
    if (rating >= 1400) return 'Intermediate';
    if (rating >= 1200) return 'Novice';
    return 'Beginner';
  };

  const recentRatingChange = profile.ratingHistory.length > 0 
    ? profile.eloRating - (profile.ratingHistory[profile.ratingHistory.length - 1]?.rating || profile.eloRating)
    : 0;

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      <Card className="bg-gray-900/80 backdrop-blur-md border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Rating Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className={`text-4xl font-bold ${getRatingColor(profile.eloRating)}`}>
              {profile.eloRating}
            </div>
            <Badge variant="outline" className="mt-2 border-purple-500/30 text-purple-300">
              {getRatingTitle(profile.eloRating)}
            </Badge>
            {recentRatingChange !== 0 && (
              <div className="flex items-center justify-center gap-1 mt-2">
                {recentRatingChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  recentRatingChange > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {recentRatingChange > 0 ? '+' : ''}{recentRatingChange}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-green-400 font-semibold">Peak Rating</div>
              <div className="text-white text-lg">{profile.peakRating}</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-orange-400 font-semibold">Lowest Rating</div>
              <div className="text-white text-lg">{profile.lowestRating}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Statistics */}
      <Card className="bg-gray-900/80 backdrop-blur-md border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Target className="h-5 w-5 text-cyan-400" />
            Game Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-white">{profile.totalGames}</div>
              <div className="text-xs text-gray-400">Total Games</div>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{profile.wins}</div>
              <div className="text-xs text-gray-400">Wins</div>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{profile.losses}</div>
              <div className="text-xs text-gray-400">Losses</div>
            </div>
          </div>

          {profile.draws > 0 && (
            <div className="text-center">
              <div className="p-2 bg-gray-800/50 rounded-lg inline-block">
                <span className="text-lg font-bold text-yellow-400">{profile.draws}</span>
                <span className="text-xs text-gray-400 ml-1">Draws</span>
              </div>
            </div>
          )}

          {/* Win Rate Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Win Rate</span>
              <span className="text-white font-semibold">{winPercentage}%</span>
            </div>
            <Progress 
              value={winPercentage} 
              className="h-2 bg-gray-700"
            />
          </div>

          {/* Win/Loss Ratio */}
          {profile.losses > 0 && (
            <div className="text-center text-sm text-gray-300">
              Win/Loss Ratio: <span className="text-white font-semibold">
                {(profile.wins / profile.losses).toFixed(2)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Information */}
      {isOwnProfile && (
        <Card className="bg-gray-900/80 backdrop-blur-md border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5 text-indigo-400" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Member Since</span>
              <span className="text-white">
                {profile.createdAt.toDate().toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Last Online</span>
              <span className="text-white flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {profile.lastOnline.toDate().toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Account Status</span>
              <Badge 
                variant={profile.accountStatus === 'active' ? 'default' : 'destructive'}
                className="capitalize"
              >
                {profile.accountStatus}
              </Badge>
            </div>
            {profile.isOnline && (
              <div className="flex items-center justify-center">
                <Badge className="bg-green-600 hover:bg-green-700">
                  Currently Online
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Privacy Notice for Public Profiles */}
      {!isOwnProfile && !profile.privacySettings.statsVisible && (
        <Card className="bg-gray-900/80 backdrop-blur-md border-gray-500/30">
          <CardContent className="text-center py-6">
            <div className="text-gray-400">
              This player's detailed statistics are private.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}