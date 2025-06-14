import React, { useState, useEffect } from 'react';
import { Check, X, Clock, User, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { useAuth } from '../../contexts/AuthContext';
import { friendService, type PendingFriendRequest } from '../../services/friendService';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function PendingRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<{
    incoming: PendingFriendRequest[];
    outgoing: PendingFriendRequest[];
  }>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadRequests = async () => {
      try {
        const pendingRequests = await friendService.getPendingRequests(user.uid);
        setRequests(pendingRequests);
      } catch (error) {
        console.error('Error loading friend requests:', error);
        toast.error('Failed to load friend requests');
      } finally {
        setLoading(false);
      }
    };

    loadRequests();

    // Set up real-time listener
    let unsubscribe: (() => void) | null = null;
    
    const setupListener = async () => {
      unsubscribe = await friendService.onFriendRequestsChange(user.uid, setRequests);
    };
    
    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleAcceptRequest = async (requestId: string) => {
    if (!user) return;
    
    setProcessingRequest(requestId);
    try {
      await friendService.acceptFriendRequest(requestId, user.uid);
      toast.success('Friend request accepted!');
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept friend request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!user) return;
    
    setProcessingRequest(requestId);
    try {
      await friendService.declineFriendRequest(requestId, user.uid);
      toast.success('Friend request declined');
    } catch (error) {
      console.error('Error declining request:', error);
      toast.error('Failed to decline friend request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!user) return;
    
    setProcessingRequest(requestId);
    try {
      await friendService.cancelFriendRequest(requestId, user.uid);
      toast.success('Friend request cancelled');
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel friend request');
    } finally {
      setProcessingRequest(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-purple-500/30">
        <CardContent className="p-6">
          <div className="text-center text-slate-400">Loading friend requests...</div>
        </CardContent>
      </Card>
    );
  }

  const totalRequests = requests.incoming.length + requests.outgoing.length;

  if (totalRequests === 0) {
    return (
      <Card className="bg-slate-800 border-purple-500/30">
        <CardContent className="p-6">
          <div className="text-center text-slate-400">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No pending friend requests
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.incoming.length > 0 && (
        <Card className="bg-slate-800 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <User className="h-5 w-5" />
              Incoming Requests
              <Badge variant="secondary" className="bg-purple-600 text-white">
                {requests.incoming.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.incoming.map((request) => (
              <div
                key={request.requestId}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-purple-500/20"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={request.fromPhotoURL} />
                    <AvatarFallback className="bg-purple-600 text-white">
                      {request.fromDisplayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-cyan-100">
                      {request.fromDisplayName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                    </div>
                    {request.message && (
                      <div className="text-sm text-slate-300 mt-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {request.message}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptRequest(request.requestId)}
                    disabled={processingRequest === request.requestId}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeclineRequest(request.requestId)}
                    disabled={processingRequest === request.requestId}
                    className="border-red-500 text-red-400 hover:bg-red-500/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {requests.outgoing.length > 0 && (
        <>
          {requests.incoming.length > 0 && <Separator className="bg-purple-500/30" />}
          <Card className="bg-slate-800 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Sent Requests
                <Badge variant="secondary" className="bg-slate-600 text-white">
                  {requests.outgoing.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requests.outgoing.map((request) => (
                <div
                  key={request.requestId}
                  className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-purple-500/20"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.fromPhotoURL} />
                      <AvatarFallback className="bg-slate-600 text-white">
                        {request.fromDisplayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-cyan-100">
                        {request.fromDisplayName}
                      </div>
                      <div className="text-xs text-slate-400">
                        Sent {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                      </div>
                      {request.message && (
                        <div className="text-sm text-slate-300 mt-1 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {request.message}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancelRequest(request.requestId)}
                    disabled={processingRequest === request.requestId}
                    className="border-slate-500 text-slate-400 hover:bg-slate-600/50"
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}