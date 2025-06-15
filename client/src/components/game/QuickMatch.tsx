import React, { useState } from 'react';
import { Zap, Trophy, Clock, Users, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { gameService } from '../../services/gameService';
import { toast } from 'sonner';

interface QuickMatchProps {
  onGameStart?: (gameId: string) => void;
}

export function QuickMatch({ onGameStart }: QuickMatchProps) {
  const { user } = useAuth();
  const [gameType, setGameType] = useState<'ranked' | 'casual'>('casual');
  const [loading, setLoading] = useState(false);

  const handleQuickMatch = async () => {
    if (!user) {
      toast.error('Please sign in to play');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting quick match search...');
      const gameId = await gameService.findQuickMatch(user.uid, gameType);
      
      if (gameId) {
        toast.success('Match found! Starting game...');
        onGameStart?.(gameId);
      } else {
        toast.info('Waiting for an opponent...');
      }
    } catch (error) {
      console.error('Error finding quick match:', error);
      toast.error('Failed to find a match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-800 border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-cyan-400 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Match
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-slate-300 text-sm">
          Find a random opponent and start playing immediately.
        </div>

        <div className="space-y-3">
          <Label className="text-cyan-300 flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Game Type
          </Label>
          <RadioGroup 
            value={gameType} 
            onValueChange={(value) => setGameType(value as 'ranked' | 'casual')}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2 p-3 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-colors">
              <RadioGroupItem value="casual" id="quick-casual" />
              <div className="flex-1">
                <Label htmlFor="quick-casual" className="text-slate-300 font-medium cursor-pointer">
                  Casual Game
                </Label>
                <p className="text-slate-400 text-xs mt-1">
                  Just for fun - no ELO rating changes
                </p>
              </div>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            
            <div className="flex items-center space-x-2 p-3 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-colors">
              <RadioGroupItem value="ranked" id="quick-ranked" />
              <div className="flex-1">
                <Label htmlFor="quick-ranked" className="text-slate-300 font-medium cursor-pointer">
                  Ranked Game
                </Label>
                <p className="text-slate-400 text-xs mt-1">
                  Competitive play - affects your ELO rating
                </p>
              </div>
              <Trophy className="h-4 w-4 text-orange-400" />
            </div>
          </RadioGroup>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-cyan-300 text-sm font-medium mb-2">
            <Clock className="h-4 w-4" />
            Quick Match Rules
          </div>
          <ul className="text-slate-400 text-xs space-y-1">
            <li>• No time limits - play at your own pace</li>
            <li>• Matched with players of similar skill level</li>
            <li>• Games can be abandoned without penalty</li>
            <li>• Rankings only affected in ranked games</li>
          </ul>
        </div>

        <Button
          onClick={handleQuickMatch}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching for opponent...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Find Quick Match
            </>
          )}
        </Button>

        {loading && (
          <div className="text-center text-slate-400 text-sm">
            This may take a moment while we find the perfect opponent for you.
          </div>
        )}
      </CardContent>
    </Card>
  );
}