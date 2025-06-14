import React, { useState, useEffect } from 'react';
import { X, Send, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useAuth } from '../../contexts/AuthContext';
import { friendService } from '../../services/friendService';
import { toast } from 'sonner';

interface FriendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUid?: string;
  recipientDisplayName?: string;
}

export function FriendRequestModal({ 
  isOpen, 
  onClose, 
  recipientUid, 
  recipientDisplayName 
}: FriendRequestModalProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Update searchQuery when recipientDisplayName changes
  useEffect(() => {
    setSearchQuery(recipientDisplayName || '');
    console.log('Modal props updated:', { recipientUid, recipientDisplayName, isOpen });
  }, [recipientDisplayName, recipientUid, isOpen]);

  const handleSendRequest = async () => {
    console.log('Sending friend request:', { user: user?.uid, recipientUid, searchQuery });
    
    if (!user || !recipientUid) {
      console.error('Missing user or recipientUid:', { user: user?.uid, recipientUid });
      toast.error('Please select a user to send a friend request to');
      return;
    }

    setLoading(true);
    try {
      console.log('Calling friendService.sendFriendRequest...');
      await friendService.sendFriendRequest(user.uid, recipientUid, message.trim() || undefined);
      console.log('Friend request sent successfully');
      toast.success(`Friend request sent to ${recipientDisplayName || searchQuery}!`);
      setSearchQuery('');
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Error sending friend request:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to send friend request');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Send Friend Request
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Send a friend request to connect with another player.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-cyan-300">
              To Player
            </Label>
            <Input
              id="displayName"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter display name..."
              disabled={!!recipientDisplayName}
              className="bg-slate-800 border-purple-500/30 text-cyan-100 placeholder-slate-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-cyan-300">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something nice..."
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
              onClick={handleSendRequest}
              disabled={loading || !recipientUid}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}