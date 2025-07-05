import React, { useEffect, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineGameStore } from '@/lib/stores/useOnlineGameStore';
import { onlineGameService } from '@/services/onlineGameService';
import useGameSync from '@/hooks/useGameSync';
import { GameRecord, GameMove } from '@/types/firestore';
import { colors } from '@/lib/theme/colors';
import Board from '@/components/game/Board';
import Lighting from '@/components/game/Lighting';
import GridFloor from '@/components/game/GridFloor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface OnlineGameProps {
  gameId: string;
  onGameEnd?: (winner: 'red' | 'blue' | 'draw' | null) => void;
  onBackToMenu?: () => void;
}

const OnlineGame: React.FC<OnlineGameProps> = ({
  gameId,
  onGameEnd,
  onBackToMenu
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [moveInProgress, setMoveInProgress] = useState(false);
  
  // Store state
  const currentGame = useOnlineGameStore(state => state.currentGame);
  const playerColor = useOnlineGameStore(state => state.playerColor);
  const isPlayerTurn = useOnlineGameStore(state => state.isPlayerTurn);
  const selectedPieceId = useOnlineGameStore(state => state.selectedPieceId);
  const pendingMove = useOnlineGameStore(state => state.pendingMove);
  const showMoveAnimation = useOnlineGameStore(state => state.showMoveAnimation);
  
  // Store actions
  const setPlayerColor = useOnlineGameStore(state => state.setPlayerColor);
  const setSelectedPieceId = useOnlineGameStore(state => state.setSelectedPieceId);
  const setPendingMove = useOnlineGameStore(state => state.setPendingMove);
  const setShowGameOver = useOnlineGameStore(state => state.setShowGameOver);
  
  /**
   * Handle game updates from sync
   */
  const handleGameUpdate = useCallback((game: GameRecord) => {
    console.log('OnlineGame received game update:', game.status);
    
    // Determine player color if not set
    if (!playerColor && user?.uid) {
      const userColor = game.playerRed.uid === user.uid ? 'red' : 'blue';
      setPlayerColor(userColor);
    }
    
    // Handle game completion
    if (game.status === 'completed') {
      setShowGameOver(true);
      if (onGameEnd) {
        onGameEnd(game.winner || null);
      }
    }
    
    setIsLoading(false);
  }, [playerColor, user?.uid, setPlayerColor, setShowGameOver, onGameEnd]);
  
  /**
   * Handle move received
   */
  const handleMoveReceived = useCallback((move: GameMove) => {
    console.log('OnlineGame received move:', move.moveNotation);
    
    // Clear any pending move if it's our move that was processed
    if (move.player === playerColor) {
      setPendingMove(null);
      setMoveInProgress(false);
    }
  }, [playerColor, setPendingMove]);
  
  /**
   * Handle player disconnection
   */
  const handlePlayerDisconnected = useCallback((playerId: string) => {
    console.log('Player disconnected in game:', playerId);
    // The sync manager already shows the toast
  }, []);
  
  // Set up game synchronization
  const { 
    isConnected, 
    isReconnecting, 
    error,
    forceReconnect 
  } = useGameSync({
    gameId,
    onGameUpdate: handleGameUpdate,
    onMoveReceived: handleMoveReceived,
    onPlayerDisconnected: handlePlayerDisconnected,
    enableAutoReconnect: true
  });
  
  /**
   * Handle move attempt from board
   */
  const handleMoveAttempt = useCallback(async (move: { 
    from: { row: number; col: number }; 
    to: { row: number; col: number } 
  }) => {
    if (!user?.uid || !currentGame || moveInProgress) {
      return;
    }
    
    console.log('Attempting move:', move);
    
    setMoveInProgress(true);
    setPendingMove(move);
    
    try {
      await onlineGameService.makeMove(gameId, move, user.uid);
      console.log('Move submitted successfully');
    } catch (error) {
      console.error('Move failed:', error);
      toast.error('Move failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 3000
      });
      
      // Clear pending move on error
      setPendingMove(null);
      setMoveInProgress(false);
    }
  }, [user?.uid, currentGame, moveInProgress, gameId, setPendingMove]);
  
  /**
   * Handle piece selection
   */
  const handlePieceSelect = useCallback((pieceId: string) => {
    if (!isPlayerTurn || moveInProgress) {
      return;
    }
    
    console.log('Piece selected:', pieceId);
    setSelectedPieceId(pieceId);
  }, [isPlayerTurn, moveInProgress, setSelectedPieceId]);
  
  /**
   * Handle game resignation
   */
  const handleResign = useCallback(async () => {
    if (!user?.uid || !currentGame) return;
    
    const confirmed = window.confirm('Are you sure you want to resign?');
    if (!confirmed) return;
    
    try {
      await onlineGameService.resignGame(gameId, user.uid);
      toast.info('You resigned from the game');
    } catch (error) {
      console.error('Resignation failed:', error);
      toast.error('Failed to resign');
    }
  }, [user?.uid, currentGame, gameId]);
  
  /**
   * Get game status display info
   */
  const getGameStatusInfo = () => {
    if (!currentGame) return { text: 'Loading...', color: 'secondary' };
    
    if (error) return { text: 'Connection Error', color: 'destructive' };
    if (isReconnecting) return { text: 'Reconnecting...', color: 'secondary' };
    if (!isConnected) return { text: 'Disconnected', color: 'destructive' };
    
    switch (currentGame.status) {
      case 'waiting':
        return { text: 'Waiting for Player', color: 'secondary' };
      case 'active':
        if (isPlayerTurn) {
          return { text: 'Your Turn', color: 'default' };
        } else {
          return { text: 'Opponent\'s Turn', color: 'secondary' };
        }
      case 'completed':
        const userColor = currentGame.playerRed.uid === user?.uid ? 'red' : 'blue';
        const isWinner = currentGame.winner === userColor;
        return { 
          text: isWinner ? 'You Won!' : currentGame.winner === 'draw' ? 'Draw' : 'You Lost',
          color: isWinner ? 'default' : 'secondary'
        };
      default:
        return { text: 'Unknown', color: 'secondary' };
    }
  };
  
  const statusInfo = getGameStatusInfo();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark to-background-medium flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Loading game...</p>
        </div>
      </div>
    );
  }
  
  if (!currentGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark to-background-medium flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Game not found</p>
          <Button onClick={onBackToMenu}>Back to Menu</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark to-background-medium relative">
      {/* Game UI Header */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          {/* Game Status */}
          <div className="flex items-center space-x-3">
            <Badge variant={statusInfo.color as any} className="text-sm">
              {statusInfo.text}
            </Badge>
            
            {/* Connection indicator */}
            <div className="flex items-center space-x-2">
              <div 
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                }`}
              />
              <span className="text-xs text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Move animation indicator */}
            {showMoveAnimation && (
              <div className="animate-pulse bg-neon-cyan bg-opacity-20 px-2 py-1 rounded text-xs text-cyan-300">
                Move made
              </div>
            )}
          </div>
          
          {/* Game Actions */}
          <div className="flex items-center space-x-2">
            {!isConnected && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={forceReconnect}
              >
                Reconnect
              </Button>
            )}
            
            {currentGame.status === 'active' && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleResign}
                disabled={moveInProgress}
              >
                Resign
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBackToMenu}
            >
              Back to Menu
            </Button>
          </div>
        </div>
      </div>
      
      {/* Game Board */}
      <div className="pt-16">
        <Canvas
          shadows
          camera={{ position: [10, 8, 10], fov: 60 }}
          style={{ background: 'transparent' }}
        >
          <PerspectiveCamera makeDefault position={[10, 8, 10]} />
          <OrbitControls 
            enablePan={false}
            minDistance={8}
            maxDistance={20}
            maxPolarAngle={Math.PI / 2.2}
          />
          
          <Lighting />
          <GridFloor />
          
          <Board
            mode="online"
            gameRecord={currentGame}
            onMoveAttempt={handleMoveAttempt}
            onPieceSelect={handlePieceSelect}
            isPlayerTurn={isPlayerTurn}
            playerColor={playerColor || 'red'}
            readOnly={currentGame.status !== 'active' || moveInProgress}
          />
        </Canvas>
      </div>
      
      {/* Bottom UI */}
      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-black bg-opacity-50 backdrop-blur-sm rounded-lg p-4">
            <div className="flex justify-between items-center text-sm text-gray-300">
              <div>
                <span className="text-neon-pink">Red:</span> {currentGame.playerRed.displayName}
                {currentGame.playerRed.uid === user?.uid && <span className="ml-1 text-neon-cyan">(You)</span>}
              </div>
              
              <div className="text-center">
                Move {currentGame.totalMoves}
                {pendingMove && (
                  <div className="text-xs text-yellow-400 mt-1">
                    Processing move...
                  </div>
                )}
              </div>
              
              <div>
                <span className="text-neon-blue">Blue:</span> {currentGame.playerBlue.displayName}
                {currentGame.playerBlue.uid === user?.uid && <span className="ml-1 text-neon-cyan">(You)</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineGame;