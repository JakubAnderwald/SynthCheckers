import React, { useState, useEffect } from 'react';
import { Clock, Swords, Trophy, User, Check, X, Timer, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { gameService, GameChallenge } from '../../services/gameService';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface GameChallengesProps {
  onGameStart?: (gameId: string) => void;
}

export function GameChallenges({ onGameStart }: GameChallengesProps) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<{
    incoming: GameChallenge[];
    outgoing: GameChallenge[];
  }>({
    incoming: [],
    outgoing: [],
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadChallenges = async () => {
      try {
        const challengeData = await gameService.getGameChallenges(user.uid);
        setChallenges(challengeData);
      } catch (error) {
        console.error('Error loading challenges:', error);
        toast.error('Failed to load game challenges');
      } finally {
        setLoading(false);
      }
    };

    loadChallenges();

    // Set up real-time listener
    const setupListener = async () => {
      const unsubscribe = await gameService.onGameChallengesChange(user.uid, (challengeData) => {
        setChallenges(challengeData);
      });
      return unsubscribe;
    };

    setupListener().then((unsubscribe) => {
      return () => unsubscribe?.();
    });
  }, [user]);

  const handleAcceptChallenge = async (challengeId: string) => {
    if (!user) return;
    
    setActionLoading(challengeId);
    try {
      const gameId = await gameService.acceptGameChallenge(challengeId, user.uid);
      toast.success('Challenge accepted! Game starting...');
      onGameStart?.(gameId);
    } catch (error) {
      console.error('Error accepting challenge:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to accept challenge');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    if (!user) return;
    
    setActionLoading(challengeId);
    try {
      await gameService.declineGameChallenge(challengeId, user.uid);
      toast.success('Challenge declined');
    } catch (error) {
      console.error('Error declining challenge:', error);
      toast.error('Failed to decline challenge');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelChallenge = async (challengeId: string) => {
    if (!user) return;
    
    setActionLoading(challengeId);
    try {
      await gameService.cancelGameChallenge(challengeId, user.uid);
      toast.success('Challenge cancelled');
    } catch (error) {
      console.error('Error cancelling challenge:', error);
      toast.error('Failed to cancel challenge');
    } finally {
      setActionLoading(null);
    }
  };

  const formatTimeControl = (timeControl: any) => {
    if (!timeControl) return 'No time limit';
    return `${timeControl.initialTime}+${timeControl.increment}`;
  };

  const isExpired = (challenge: GameChallenge) => {
    return new Date() > challenge.expiresAt;
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-purple-500/30">
        <CardContent className="p-6">
          <div className="text-center text-slate-400">
            Loading challenges...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-cyan-400 flex items-center gap-2">
          <Swords className="h-5 w-5" />
          Game Challenges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-700">
            <TabsTrigger value="incoming" className="data-[state=active]:bg-purple-600">
              Incoming ({challenges.incoming.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="data-[state=active]:bg-purple-600">
              Outgoing ({challenges.outgoing.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-3 mt-4">
            {challenges.incoming.length === 0 ? (
              <div className="text-center text-slate-400 py-6">
                <Swords className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No incoming challenges
              </div>
            ) : (
              challenges.incoming.map((challenge) => (
                <div
                  key={challenge.challengeId}
                  className="bg-slate-700 rounded-lg p-4 border border-purple-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-cyan-400" />
                        <span className="font-medium text-cyan-100">
                          {challenge.fromDisplayName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          ELO: {challenge.fromEloRating}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-300 mb-2">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          <span className="capitalize">{challenge.gameType}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeControl(challenge.timeControl)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          <span>{formatDistanceToNow(challenge.createdAt)} ago</span>
                        </div>
                      </div>

                      {challenge.message && (
                        <p className="text-slate-400 text-sm mb-3 italic">
                          "{challenge.message}"
                        </p>
                      )}

                      {isExpired(challenge) && (
                        <Badge variant="destructive" className="mb-2">
                          Expired
                        </Badge>
                      )}
                    </div>

                    {challenge.status === 'pending' && !isExpired(challenge) && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptChallenge(challenge.challengeId)}
                          disabled={actionLoading === challenge.challengeId}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineChallenge(challenge.challengeId)}
                          disabled={actionLoading === challenge.challengeId}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}

                    {challenge.status !== 'pending' && (
                      <Badge 
                        variant={challenge.status === 'accepted' ? 'default' : 'destructive'}
                        className="ml-4"
                      >
                        {challenge.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-3 mt-4">
            {challenges.outgoing.length === 0 ? (
              <div className="text-center text-slate-400 py-6">
                <Swords className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No outgoing challenges
              </div>
            ) : (
              challenges.outgoing.map((challenge) => (
                <div
                  key={challenge.challengeId}
                  className="bg-slate-700 rounded-lg p-4 border border-purple-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-cyan-400" />
                        <span className="font-medium text-cyan-100">
                          {challenge.toDisplayName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          ELO: {challenge.toEloRating}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-300 mb-2">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          <span className="capitalize">{challenge.gameType}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeControl(challenge.timeControl)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          <span>{formatDistanceToNow(challenge.createdAt)} ago</span>
                        </div>
                      </div>

                      {challenge.message && (
                        <p className="text-slate-400 text-sm mb-3 italic">
                          "{challenge.message}"
                        </p>
                      )}

                      {isExpired(challenge) && (
                        <Badge variant="destructive" className="mb-2">
                          Expired
                        </Badge>
                      )}
                    </div>

                    {challenge.status === 'pending' && !isExpired(challenge) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelChallenge(challenge.challengeId)}
                        disabled={actionLoading === challenge.challengeId}
                        className="ml-4 border-red-500/50 text-red-400 hover:bg-red-500/20"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    )}

                    {challenge.status !== 'pending' && (
                      <Badge 
                        variant={challenge.status === 'accepted' ? 'default' : 'destructive'}
                        className="ml-4"
                      >
                        {challenge.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}