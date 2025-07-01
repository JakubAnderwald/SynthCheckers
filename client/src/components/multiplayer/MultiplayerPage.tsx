import React, { useState } from 'react';
import { ArrowLeft, Users, Zap, Swords, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { QuickMatch } from '../game/QuickMatch';
import { GameChallenges } from '../game/GameChallenges';
import { FriendSearch } from '../friends/FriendSearch';
import { FriendsList } from '../friends/FriendsList';
import { PendingRequests } from '../friends/PendingRequests';
import { ChallengeModal } from '../game/ChallengeModal';

interface MultiplayerPageProps {
  onBack: () => void;
  onGameStart?: (gameId: string) => void;
}

export function MultiplayerPage({ onBack, onGameStart }: MultiplayerPageProps) {
  const [activeTab, setActiveTab] = useState('quick-match');
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);

  const handleGameStart = (gameId: string) => {
    console.log('Starting game:', gameId);
    onGameStart?.(gameId);
  };

  const handleChallengeToGame = (friendUid: string) => {
    setSelectedFriendUid(friendUid);
    setChallengeModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-purple-500/30 text-cyan-400 hover:bg-purple-500/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Game
          </Button>
          <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-3">
            <Users className="h-8 w-8" />
            Multiplayer
          </h1>
        </div>

        {/* Quick Stats Card */}
        <Card className="bg-slate-800 border-purple-500/30 mb-6">
          <CardContent className="p-6">
            <div className="text-slate-300 text-center">
              <h2 className="text-xl font-semibold text-cyan-400 mb-2">
                Welcome to Multiplayer Checkers
              </h2>
              <p className="text-slate-400">
                Challenge friends, find quick matches, and compete with players around the world.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 p-1">
            <TabsTrigger 
              value="quick-match" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Quick Match
            </TabsTrigger>
            <TabsTrigger 
              value="challenges" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <Swords className="h-4 w-4" />
              Challenges
            </TabsTrigger>
            <TabsTrigger 
              value="friends" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger 
              value="find-players" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Find Players
            </TabsTrigger>
          </TabsList>

          {/* Quick Match Tab */}
          <TabsContent value="quick-match" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuickMatch onGameStart={handleGameStart} />
              
              <Card className="bg-slate-800 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400">How Quick Match Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-slate-300">
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <p className="text-sm">Choose between casual or ranked game mode</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <p className="text-sm">We'll find an opponent with similar skill level</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <p className="text-sm">Start playing immediately when matched</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-700 rounded-lg p-4 mt-4">
                    <h4 className="text-cyan-300 font-medium mb-2">Pro Tips:</h4>
                    <ul className="text-slate-400 text-sm space-y-1">
                      <li>• Ranked games affect your ELO rating</li>
                      <li>• Casual games are perfect for practice</li>
                      <li>• Your rating improves matchmaking accuracy</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-6">
            <GameChallenges onGameStart={handleGameStart} />
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <FriendsList onChallengeToGame={handleChallengeToGame} />
                <PendingRequests />
              </div>
              
              <Card className="bg-slate-800 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Friend System Benefits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-slate-300">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        ✓
                      </div>
                      <p className="text-sm">Challenge friends to private games</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        ✓
                      </div>
                      <p className="text-sm">See when friends are online</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        ✓
                      </div>
                      <p className="text-sm">Compare stats and rankings</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        ✓
                      </div>
                      <p className="text-sm">Create custom time controls</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-700 rounded-lg p-4 mt-4">
                    <h4 className="text-cyan-300 font-medium mb-2">Getting Started:</h4>
                    <p className="text-slate-400 text-sm">
                      Use the "Find Players" tab to search for other players by name and send friend requests.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Find Players Tab */}
          <TabsContent value="find-players" className="space-y-6">
            <FriendSearch />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Challenge Modal */}
      <ChallengeModal
        isOpen={challengeModalOpen}
        recipientUid={selectedFriendUid || undefined}
        onClose={() => {
          setChallengeModalOpen(false);
          setSelectedFriendUid(null);
        }}
      />
    </div>
  );
}