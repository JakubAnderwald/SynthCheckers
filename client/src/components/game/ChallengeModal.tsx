import React, { useState } from 'react';
import { X, Swords, Clock, Trophy, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useAuth } from '../../contexts/AuthContext';
import { gameService, TimeControl } from '../../services/gameService';
import { toast } from 'sonner';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUid?: string;
  recipientDisplayName?: string;
}

export function ChallengeModal({ 
  isOpen, 
  onClose, 
  recipientUid, 
  recipientDisplayName 
}: ChallengeModalProps) {
  const { user } = useAuth();
  const [gameType, setGameType] = useState<'ranked' | 'casual'>('casual');
  const [timeControlType, setTimeControlType] = useState<'none' | 'blitz' | 'rapid' | 'custom'>('none');
  const [customTime, setCustomTime] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(5);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const timeControlOptions = {
    none: undefined,
    blitz: { initialTime: 3, increment: 2 },
    rapid: { initialTime: 10, increment: 5 },
    custom: { initialTime: customTime, increment: customIncrement }
  };

  const handleSendChallenge = async () => {
    if (!user || !recipientUid) {
      toast.error('Please select a player to challenge');
      return;
    }

    setLoading(true);
    try {
      const timeControl = timeControlOptions[timeControlType];
      await gameService.sendGameChallenge(
        user.uid, 
        recipientUid, 
        gameType, 
        timeControl, 
        message.trim() || undefined
      );
      
      toast.success(`Game challenge sent to ${recipientDisplayName}!`);
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Error sending game challenge:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Challenge Player
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Challenge {recipientDisplayName} to a game of checkers.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Game Type */}
          <div className="space-y-3">
            <Label className="text-cyan-300 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Game Type
            </Label>
            <RadioGroup value={gameType} onValueChange={(value) => setGameType(value as 'ranked' | 'casual')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="casual" id="casual" />
                <Label htmlFor="casual" className="text-slate-300">
                  Casual Game - Just for fun
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ranked" id="ranked" />
                <Label htmlFor="ranked" className="text-slate-300">
                  Ranked Game - Affects ELO rating
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Time Control */}
          <div className="space-y-3">
            <Label className="text-cyan-300 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Control
            </Label>
            <Select value={timeControlType} onValueChange={(value) => setTimeControlType(value as any)}>
              <SelectTrigger className="bg-slate-800 border-purple-500/30 text-cyan-100">
                <SelectValue placeholder="Select time control" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-purple-500/30">
                <SelectItem value="none">No Time Limit</SelectItem>
                <SelectItem value="blitz">Blitz (3+2)</SelectItem>
                <SelectItem value="rapid">Rapid (10+5)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {timeControlType === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label className="text-slate-400 text-xs">Initial Time (min)</Label>
                  <Select value={customTime.toString()} onValueChange={(value) => setCustomTime(parseInt(value))}>
                    <SelectTrigger className="bg-slate-800 border-purple-500/30 text-cyan-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-purple-500/30">
                      <SelectItem value="1">1 min</SelectItem>
                      <SelectItem value="3">3 min</SelectItem>
                      <SelectItem value="5">5 min</SelectItem>
                      <SelectItem value="10">10 min</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Increment (sec)</Label>
                  <Select value={customIncrement.toString()} onValueChange={(value) => setCustomIncrement(parseInt(value))}>
                    <SelectTrigger className="bg-slate-800 border-purple-500/30 text-cyan-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-purple-500/30">
                      <SelectItem value="0">0 sec</SelectItem>
                      <SelectItem value="2">2 sec</SelectItem>
                      <SelectItem value="5">5 sec</SelectItem>
                      <SelectItem value="10">10 sec</SelectItem>
                      <SelectItem value="15">15 sec</SelectItem>
                      <SelectItem value="30">30 sec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-cyan-300">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Good luck!"
              maxLength={200}
              className="bg-slate-800 border-purple-500/30 text-cyan-100 placeholder-slate-400 resize-none"
              rows={3}
            />
            <div className="text-xs text-slate-400 text-right">
              {message.length}/200
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-purple-500/30 text-cyan-300 hover:bg-purple-500/20"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSendChallenge}
              disabled={loading || !recipientUid}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
            >
              <Swords className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Challenge'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}