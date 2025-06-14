import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { LogOut, User, Trophy, Target, Users } from 'lucide-react';

interface UserProfileProps {
  compact?: boolean;
}

export function UserProfile({ compact = false }: UserProfileProps) {
  const { user, userProfile, signOut, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      setSigningOut(false);
    }
  };

  if (!user) {
    return null;
  }

  // Use Firebase user data as fallback when Firestore profile is unavailable
  const displayName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Anonymous';
  const eloRating = userProfile?.eloRating || 1200;
  const totalGames = userProfile?.totalGames || 0;
  const wins = userProfile?.wins || 0;
  const losses = userProfile?.losses || 0;
  const isOnline = userProfile?.isOnline || true;
  const createdAt = userProfile?.createdAt || new Date();
  const lastOnline = userProfile?.lastOnline || new Date();

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.photoURL || undefined} alt={displayName} />
          <AvatarFallback className="bg-purple-600 text-white text-xs">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {displayName}
          </p>
          <p className="text-xs text-gray-400">
            ELO: {eloRating}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-900/80 backdrop-blur-md border-purple-500/30">
      <CardHeader className="text-center pb-4">
        <div className="flex flex-col items-center space-y-3">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.photoURL || undefined} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xl">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl font-bold text-white">
              {displayName}
            </CardTitle>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
          {isOnline && (
            <Badge className="bg-green-600 hover:bg-green-700 text-white">
              Online
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Player Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center space-x-1 text-purple-400 mb-1">
              <Trophy className="h-4 w-4" />
              <span className="text-xs font-medium">ELO Rating</span>
            </div>
            <p className="text-lg font-bold text-white">{eloRating}</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center space-x-1 text-cyan-400 mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">Games</span>
            </div>
            <p className="text-lg font-bold text-white">{totalGames}</p>
          </div>
        </div>

        {/* Win/Loss Record */}
        {totalGames > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-center space-x-1 text-gray-300 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Record</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-400">
                Wins: {wins}
              </span>
              <span className="text-red-400">
                Losses: {losses}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-400 text-center">
              Win Rate: {totalGames > 0 
                ? Math.round((wins / totalGames) * 100) 
                : 0}%
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="text-xs text-gray-400 text-center space-y-1">
          <p>Member since {new Date(createdAt).toLocaleDateString()}</p>
          <p>Last online {new Date(lastOnline).toLocaleString()}</p>
        </div>

        {/* Sign Out Button */}
        <Button
          onClick={handleSignOut}
          disabled={signingOut || loading}
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-600/20 hover:text-red-300 hover:border-red-400"
        >
          {signingOut ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Signing out...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}