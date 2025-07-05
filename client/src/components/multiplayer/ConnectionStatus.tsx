import React from 'react';
import { useOnlineGameStore } from '@/lib/stores/useOnlineGameStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { colors } from '@/lib/theme/colors';

interface ConnectionStatusProps {
  onReconnect?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  onReconnect,
  showDetails = true,
  compact = false
}) => {
  const isConnected = useOnlineGameStore(state => state.isConnected);
  const isReconnecting = useOnlineGameStore(state => state.isReconnecting);
  const lastSyncTime = useOnlineGameStore(state => state.lastSyncTime);
  const error = useOnlineGameStore(state => state.error);
  
  const getStatusInfo = () => {
    if (error) {
      return {
        status: 'error',
        text: 'Connection Error',
        icon: AlertTriangle,
        color: 'destructive',
        description: error
      };
    }
    
    if (isReconnecting) {
      return {
        status: 'reconnecting',
        text: 'Reconnecting...',
        icon: RefreshCw,
        color: 'secondary',
        description: 'Attempting to restore connection'
      };
    }
    
    if (!isConnected) {
      return {
        status: 'disconnected',
        text: 'Disconnected',
        icon: WifiOff,
        color: 'destructive',
        description: 'No connection to game server'
      };
    }
    
    return {
      status: 'connected',
      text: 'Connected',
      icon: Wifi,
      color: 'default',
      description: 'Real-time sync active'
    };
  };
  
  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;
  
  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    
    if (diff < 5000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    
    return lastSyncTime.toLocaleTimeString();
  };
  
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <div 
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            } ${isReconnecting ? 'animate-pulse' : ''}`}
          />
          <Icon 
            className={`w-4 h-4 ${
              isReconnecting ? 'animate-spin' : ''
            } ${
              isConnected ? 'text-green-400' : 'text-red-400'
            }`}
          />
        </div>
        
        {!isConnected && onReconnect && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReconnect}
            className="h-6 px-2 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {/* Status Badge */}
      <div className="flex items-center space-x-2">
        <Badge 
          variant={statusInfo.color as any}
          className="flex items-center space-x-1"
        >
          <Icon 
            className={`w-3 h-3 ${
              isReconnecting ? 'animate-spin' : ''
            }`}
          />
          <span>{statusInfo.text}</span>
        </Badge>
        
        {!isConnected && onReconnect && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReconnect}
            disabled={isReconnecting}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isReconnecting ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </div>
      
      {/* Details */}
      {showDetails && (
        <div className="text-xs text-gray-400 space-y-1">
          <div>{statusInfo.description}</div>
          {lastSyncTime && (
            <div>Last sync: {formatLastSync()}</div>
          )}
        </div>
      )}
      
      {/* Error Details */}
      {error && (
        <div className="text-xs text-red-400 bg-red-900 bg-opacity-20 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;