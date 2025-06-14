import React, { useState } from 'react';
import { Users, UserPlus, Search, Bell, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { FriendsList } from './FriendsList';
import { PendingRequests } from './PendingRequests';
import { FriendSearch } from './FriendSearch';
import { FriendRequestModal } from './FriendRequestModal';

interface FriendsPageProps {
  onChallengeToGame?: (friendUid: string) => void;
  onBack?: () => void;
}

export function FriendsPage({ onChallengeToGame, onBack }: FriendsPageProps) {
  const [showRequestModal, setShowRequestModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                onClick={onBack}
                variant="outline"
                size="sm"
                className="border-purple-500/30 text-cyan-300 hover:bg-purple-500/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">Friends</h1>
              <p className="text-slate-400">Manage your friends and social connections</p>
            </div>
          </div>
          <Button
            onClick={() => setShowRequestModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Friend
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-purple-500/30">
            <TabsTrigger 
              value="friends" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              Friends
            </TabsTrigger>
            <TabsTrigger 
              value="requests" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Bell className="h-4 w-4 mr-2" />
              Requests
            </TabsTrigger>
            <TabsTrigger 
              value="search" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Search className="h-4 w-4 mr-2" />
              Find Players
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            <FriendsList onChallengeToGame={onChallengeToGame} />
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <PendingRequests />
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <FriendSearch />
          </TabsContent>
        </Tabs>

        {/* Friend Request Modal */}
        <FriendRequestModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
        />
      </div>
    </div>
  );
}