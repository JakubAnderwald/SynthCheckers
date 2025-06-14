import React, { useState } from 'react';
import { X, Send, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
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
  const [searchQuery, setSearchQuery] = useState(recipientDisplayName || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendRequest = async () => {
    if (!user || !recipientUid) {
      toast.error('Please select a user to send a friend request to');
      return;
    }

    if (!searchQuery.trim()) {
      toast.error('Please enter a display name');
      return;
    }

    setLoading(true);
    try {
      await friendService.sendFriendRequest(user.uid, recipientUid, message.trim() || undefined);
      toast.success(`Friend request sent to ${searchQuery}!`);
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
              disabled={loading || !searchQuery.trim() || !recipientUid}
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