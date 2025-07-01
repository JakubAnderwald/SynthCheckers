import React, { useState, useEffect } from 'react';
import { Users, UserMinus, MessageCircle, Gamepad2, Circle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { friendService, type FriendshipStatus } from '../../services/friendService';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface FriendsListProps {
  onChallengeToGame?: (friendUid: string, friendDisplayName?: string) => void;
}

export function FriendsList({ onChallengeToGame }: FriendsListProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendshipStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingFriend, setRemovingFriend] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadFriends = async () => {
      try {
        const friendsList = await friendService.getFriends(user.uid);
        setFriends(friendsList);
      } catch (error) {
        console.error('Error loading friends:', error);
        toast.error('Failed to load friends list');
      } finally {
        setLoading(false);
      }
    };

    loadFriends();

    // Set up real-time listener
    let unsubscribe: (() => void) | null = null;
    
    const setupListener = async () => {
      unsubscribe = await friendService.onFriendsChange(user.uid, setFriends);
    };
    
    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleRemoveFriend = async (friendshipId: string, friendName: string) => {
    if (!user) return;
    
    if (!confirm(`Are you sure you want to remove ${friendName} from your friends list?`)) {
      return;
    }
    
    setRemovingFriend(friendshipId);
    try {
      await friendService.removeFriend(friendshipId, user.uid);
      toast.success(`${friendName} removed from friends`);
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    } finally {
      setRemovingFriend(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-purple-500/30">
        <CardContent className="p-6">
          <div className="text-center text-slate-400">Loading friends...</div>
        </CardContent>
      </Card>
    );
  }

  if (friends.length === 0) {
    return (
      <Card className="bg-slate-800 border-purple-500/30">
        <CardContent className="p-6">
          <div className="text-center text-slate-400">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No friends yet. Start by sending friend requests!
          </div>
        </CardContent>
      </Card>
    );
  }

  const onlineFriends = friends.filter(f => f.isOnline);
  const offlineFriends = friends.filter(f => !f.isOnline);

  return (
    <Card className="bg-slate-800 border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-cyan-400 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Friends
          <Badge variant="secondary" className="bg-purple-600 text-white">
            {friends.length}
          </Badge>
          {onlineFriends.length > 0 && (
            <Badge variant="secondary" className="bg-green-600 text-white">
              {onlineFriends.length} online
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Online Friends */}
        {onlineFriends.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-green-400 flex items-center gap-2">
              <Circle className="h-3 w-3 fill-current" />
              Online ({onlineFriends.length})
            </div>
            {onlineFriends.map((friend) => (
              <div
                key={friend.friendshipId}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-green-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={friend.photoURL} />
                      <AvatarFallback className="bg-purple-600 text-white">
                        {friend.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-slate-700" />
                  </div>
                  <div>
                    <div className="font-medium text-cyan-100">
                      {friend.displayName}
                    </div>
                    <div className="text-xs text-green-400 flex items-center gap-1">
                      <Circle className="h-2 w-2 fill-current" />
                      Online • ELO {friend.eloRating}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {onChallengeToGame && (
                    <Button
                      size="sm"
                      onClick={() => onChallengeToGame(friend.uid, friend.displayName)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      title="Challenge to game"
                    >
                      <Gamepad2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-500 text-slate-400 hover:bg-slate-600/50"
                    title="Send message"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveFriend(friend.friendshipId, friend.displayName)}
                    disabled={removingFriend === friend.friendshipId}
                    className="border-red-500 text-red-400 hover:bg-red-500/20"
                    title="Remove friend"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Offline Friends */}
        {offlineFriends.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Circle className="h-3 w-3" />
              Offline ({offlineFriends.length})
            </div>
            {offlineFriends.map((friend) => (
              <div
                key={friend.friendshipId}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/30"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="opacity-75">
                      <AvatarImage src={friend.photoURL} />
                      <AvatarFallback className="bg-slate-600 text-white">
                        {friend.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-slate-500 rounded-full border-2 border-slate-700" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-300">
                      {friend.displayName}
                    </div>
                    <div className="text-xs text-slate-400">
                      Last seen {formatDistanceToNow(friend.lastOnline, { addSuffix: true })} • ELO {friend.eloRating}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {onChallengeToGame && (
                    <Button
                      size="sm"
                      onClick={() => onChallengeToGame(friend.uid, friend.displayName)}
                      className="bg-blue-600 hover:bg-blue-700 text-white opacity-75 hover:opacity-100"
                      title="Challenge to game"
                    >
                      <Gamepad2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-500 text-slate-400 hover:bg-slate-600/50"
                    title="Send message"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveFriend(friend.friendshipId, friend.displayName)}
                    disabled={removingFriend === friend.friendshipId}
                    className="border-red-500 text-red-400 hover:bg-red-500/20"
                    title="Remove friend"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}