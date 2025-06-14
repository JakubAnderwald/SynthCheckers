import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { Search, User, Trophy, Target, UserPlus, Eye } from 'lucide-react';
import type { UserProfile } from '../../types/firestore';

interface UserSearchProps {
  onSelectUser: (user: UserProfile) => void;
  onSendFriendRequest?: (targetUid: string) => Promise<void>;
  currentUserUid: string;
}

interface SearchResult {
  uid: string;
  displayName: string;
  eloRating: number;
  totalGames: number;
  wins: number;
  losses: number;
  photoURL?: string;
  isOnline: boolean;
  onlineStatusVisible: boolean;
  profileVisible: boolean;
  accountStatus: 'active' | 'suspended' | 'banned';
  lastOnline: Date;
}

export function UserSearch({ onSelectUser, onSendFriendRequest, currentUserUid }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set());

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock search results - would be replaced with Firestore query
      const mockResults: SearchResult[] = [
        {
          uid: 'user-1',
          displayName: 'ChessMaster2024',
          eloRating: 1850,
          totalGames: 156,
          wins: 98,
          losses: 52,
          photoURL: undefined,
          isOnline: true,
          onlineStatusVisible: true,
          profileVisible: true,
          accountStatus: 'active',
          lastOnline: new Date()
        },
        {
          uid: 'user-2',
          displayName: 'StrategicPlayer',
          eloRating: 1425,
          totalGames: 89,
          wins: 45,
          losses: 38,
          photoURL: undefined,
          isOnline: false,
          onlineStatusVisible: true,
          profileVisible: true,
          accountStatus: 'active',
          lastOnline: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          uid: 'user-3',
          displayName: 'QuickThinker',
          eloRating: 1200,
          totalGames: 23,
          wins: 12,
          losses: 10,
          photoURL: undefined,
          isOnline: false,
          onlineStatusVisible: false,
          profileVisible: true,
          accountStatus: 'active',
          lastOnline: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          uid: 'user-4',
          displayName: 'PrivatePlayer',
          eloRating: 1600,
          totalGames: 200,
          wins: 120,
          losses: 75,
          photoURL: undefined,
          isOnline: true,
          onlineStatusVisible: false,
          profileVisible: false,
          accountStatus: 'active',
          lastOnline: new Date()
        }
      ].filter(user => 
        user.displayName.toLowerCase().includes(query.toLowerCase()) &&
        user.uid !== currentUserUid
      );

      setSearchResults(mockResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserUid]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSendFriendRequest = async (targetUid: string) => {
    if (!onSendFriendRequest) return;

    setSendingRequests(prev => new Set(prev).add(targetUid));
    try {
      await onSendFriendRequest(targetUid);
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUid);
        return newSet;
      });
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

  const formatLastOnline = (lastOnline: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - lastOnline.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastOnline.toLocaleDateString();
  };

  return (
    <Card className="bg-gray-900/80 backdrop-blur-md border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Search className="h-5 w-5 text-cyan-400" />
          Find Players
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by display name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
          />
        </div>

        {/* Search Results */}
        <div className="space-y-3">
          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 bg-gray-700" />
                    <Skeleton className="h-3 w-24 bg-gray-700" />
                  </div>
                  <Skeleton className="h-8 w-16 bg-gray-700" />
                </div>
              ))}
            </>
          )}

          {!loading && hasSearched && searchQuery.length >= 2 && (
            <>
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <User className="h-12 w-12 mx-auto mb-3 text-gray-500" />
                  <p>No players found matching "{searchQuery}"</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.uid}
                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm">
                          {user.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* User Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{user.displayName}</span>
                          <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs">
                            {getRatingTitle(user.eloRating)}
                          </Badge>
                          {user.isOnline && user.onlineStatusVisible && (
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className={getRatingColor(user.eloRating)}>
                            {user.eloRating} ELO
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {user.totalGames} games
                          </span>
                          {user.totalGames > 0 && (
                            <span className="flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              {Math.round((user.wins / user.totalGames) * 100)}% win rate
                            </span>
                          )}
                        </div>

                        {/* Last Online */}
                        {!user.isOnline && user.onlineStatusVisible && (
                          <div className="text-xs text-gray-500 mt-1">
                            Last online {formatLastOnline(user.lastOnline)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {user.profileVisible ? (
                        <Button
                          onClick={() => {
                            // Convert SearchResult to UserProfile for compatibility
                            const fullProfile: UserProfile = {
                              uid: user.uid,
                              email: '', // Not available in search results
                              displayName: user.displayName,
                              photoURL: user.photoURL,
                              eloRating: user.eloRating,
                              totalGames: user.totalGames,
                              wins: user.wins,
                              losses: user.losses,
                              draws: user.totalGames - user.wins - user.losses,
                              peakRating: user.eloRating, // Simplified
                              lowestRating: user.eloRating, // Simplified
                              ratingHistory: [],
                              createdAt: { toDate: () => new Date() } as any,
                              updatedAt: { toDate: () => new Date() } as any,
                              lastOnline: { toDate: () => user.lastOnline } as any,
                              isOnline: user.isOnline,
                              isNewUser: false,
                              isVerified: true,
                              accountStatus: user.accountStatus,
                              gamePreferences: {
                                preferredDifficulty: 'medium',
                                allowChallenges: true,
                                autoAcceptFriends: false,
                                soundEnabled: true,
                                musicEnabled: true,
                                animationsEnabled: true
                              },
                              privacySettings: {
                                profileVisible: user.profileVisible,
                                statsVisible: true,
                                onlineStatusVisible: user.onlineStatusVisible,
                                allowDirectMessages: true,
                                allowFriendRequests: true
                              }
                            };
                            onSelectUser(fullProfile);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="text-xs text-gray-500 px-2">
                          Private
                        </div>
                      )}

                      {onSendFriendRequest && (
                        <Button
                          onClick={() => handleSendFriendRequest(user.uid)}
                          disabled={sendingRequests.has(user.uid)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {sendingRequests.has(user.uid) ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {!hasSearched && (
            <div className="text-center py-8 text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-500" />
              <p>Search for players by their display name</p>
              <p className="text-sm mt-1">Enter at least 2 characters to start searching</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}