import React, { useState } from 'react';
import { Search, UserPlus, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { FriendRequestModal } from './FriendRequestModal';
import { searchUsers } from '../../services/userService';
import { toast } from 'sonner';

interface SearchResult {
  uid: string;
  displayName: string;
  photoURL?: string;
  eloRating: number;
  totalGames: number;
  isOnline: boolean;
  lastOnline: Date;
}

export function FriendSearch() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ uid: string; displayName: string } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a display name to search');
      return;
    }

    if (searchQuery.trim().length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      
      // Filter out current user
      const filteredResults = results.filter(result => result.uid !== user?.uid);
      
      setSearchResults(filteredResults);
      
      if (filteredResults.length === 0) {
        toast.info('No players found with that name');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search for players');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = (targetUid: string, targetDisplayName: string) => {
    setSelectedUser({ uid: targetUid, displayName: targetDisplayName });
    setShowRequestModal(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Players
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter player's display name..."
              className="bg-slate-700 border-purple-500/30 text-cyan-100 placeholder-slate-400"
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {loading && (
            <div className="text-center text-slate-400 py-4">
              Searching for players...
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-cyan-300">
                Search Results ({searchResults.length})
              </div>
              {searchResults.map((result) => (
                <div
                  key={result.uid}
                  className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-purple-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={result.photoURL} />
                        <AvatarFallback className="bg-purple-600 text-white">
                          {result.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {result.isOnline && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-slate-700" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-cyan-100">
                        {result.displayName}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>ELO {result.eloRating}</span>
                        <span>•</span>
                        <span>{result.totalGames} games</span>
                        {result.isOnline ? (
                          <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                            Online
                          </Badge>
                        ) : (
                          <span className="text-slate-500">Offline</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(result.uid, result.displayName)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchQuery && !loading && searchResults.length === 0 && (
            <div className="text-center text-slate-400 py-4">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No players found. Try a different search term.
            </div>
          )}
        </CardContent>
      </Card>

      <FriendRequestModal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedUser(null);
        }}
        recipientUid={selectedUser?.uid}
        recipientDisplayName={selectedUser?.displayName}
      />
    </div>
  );
}