import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  User, 
  UserPlus, 
  MessageCircle, 
  Trophy, 
  Target, 
  Shield, 
  Clock,
  Calendar,
  Gamepad2
} from 'lucide-react';
import { ProfileStats } from './ProfileStats';
import { GameHistory } from './GameHistory';
import { RatingChart } from './RatingChart';
import type { UserProfile } from '../../types/firestore';

interface PublicProfileProps {
  profile: UserProfile;
  currentUserUid: string;
  onSendFriendRequest?: (targetUid: string) => Promise<void>;
  onSendMessage?: (targetUid: string) => void;
  onChallengeToGame?: (targetUid: string) => void;
}

export function PublicProfile({ 
  profile, 
  currentUserUid, 
  onSendFriendRequest,
  onSendMessage,
  onChallengeToGame 
}: PublicProfileProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'charts'>('stats');
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);

  const isOwnProfile = profile.uid === currentUserUid;
  const canViewStats = profile.privacySettings.statsVisible || isOwnProfile;
  const canSendFriendRequest = profile.privacySettings.allowFriendRequests && !isOwnProfile;
  const canChallenge = profile.gamePreferences.allowChallenges && !isOwnProfile;

  const handleSendFriendRequest = async () => {
    if (!onSendFriendRequest) return;
    
    setSendingFriendRequest(true);
    try {
      await onSendFriendRequest(profile.uid);
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setSendingFriendRequest(false);
    }
  };

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

  const winPercentage = profile.totalGames > 0 
    ? Math.round((profile.wins / profile.totalGames) * 100) 
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="bg-gray-900/80 backdrop-blur-md border-purple-500/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.photoURL} alt={profile.displayName} />
                <AvatarFallback className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-2xl">
                  {profile.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-2xl font-bold text-white">{profile.displayName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                    {getRatingTitle(profile.eloRating)}
                  </Badge>
                  {profile.isOnline && profile.privacySettings.onlineStatusVisible && (
                    <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">
                      Online
                    </Badge>
                  )}
                  {profile.accountStatus !== 'active' && (
                    <Badge variant="destructive" className="text-xs">
                      {profile.accountStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Rating Display */}
            <div className="flex-1 text-center md:text-left">
              <div className={`text-3xl font-bold ${getRatingColor(profile.eloRating)}`}>
                {profile.eloRating}
              </div>
              <div className="text-sm text-gray-400">ELO Rating</div>
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && (
              <div className="flex gap-2">
                {canSendFriendRequest && (
                  <Button
                    onClick={handleSendFriendRequest}
                    disabled={sendingFriendRequest}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {sendingFriendRequest ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                )}

                {profile.privacySettings.allowDirectMessages && onSendMessage && (
                  <Button
                    onClick={() => onSendMessage(profile.uid)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                )}

                {canChallenge && onChallengeToGame && (
                  <Button
                    onClick={() => onChallengeToGame(profile.uid)}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
                  >
                    <Gamepad2 className="h-4 w-4 mr-2" />
                    Challenge
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {canViewStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-lg font-bold text-white">{profile.totalGames}</div>
                <div className="text-xs text-gray-400">Games Played</div>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-lg font-bold text-green-400">{profile.wins}</div>
                <div className="text-xs text-gray-400">Wins</div>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-lg font-bold text-cyan-400">{winPercentage}%</div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-lg font-bold text-purple-400">{profile.peakRating}</div>
                <div className="text-xs text-gray-400">Peak Rating</div>
              </div>
            </div>
          )}

          {/* Account Info */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Member since {profile.createdAt.toDate().toLocaleDateString()}
            </div>
            {profile.privacySettings.onlineStatusVisible && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last seen {profile.lastOnline.toDate().toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      {!canViewStats && (
        <Card className="bg-gray-900/80 backdrop-blur-md border-gray-500/30">
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">Private Profile</h3>
            <p className="text-gray-500">
              This player has set their profile to private. Only basic information is visible.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Profile Tabs */}
      {canViewStats && (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-2">
            {(['stats', 'history', 'charts'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'outline'}
                onClick={() => setActiveTab(tab)}
                className={`capitalize ${
                  activeTab === tab 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'border-gray-600 text-gray-300 hover:bg-gray-800'
                }`}
              >
                {tab === 'stats' && <Trophy className="h-4 w-4 mr-2" />}
                {tab === 'history' && <Target className="h-4 w-4 mr-2" />}
                {tab === 'charts' && <User className="h-4 w-4 mr-2" />}
                {tab}
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'stats' && (
              <ProfileStats profile={profile} isOwnProfile={isOwnProfile} />
            )}
            
            {activeTab === 'history' && (
              <GameHistory userUid={profile.uid} isOwnHistory={isOwnProfile} />
            )}
            
            {activeTab === 'charts' && (
              <RatingChart
                ratingHistory={profile.ratingHistory}
                currentRating={profile.eloRating}
                wins={profile.wins}
                losses={profile.losses}
                draws={profile.draws}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}