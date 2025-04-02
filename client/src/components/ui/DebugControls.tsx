import React, { useState } from 'react';
import { useCheckersStore } from '@/lib/stores/useCheckersStore';
import { Position, Piece } from '@/lib/checkers/types';
import { Button } from '@/components/ui/button';

const DebugControls: React.FC = () => {
  const pieces = useCheckersStore(state => state.pieces);
  const selectedPiece = useCheckersStore(state => state.selectedPiece);
  const validMoves = useCheckersStore(state => state.validMoves);
  const selectPiece = useCheckersStore(state => state.selectPiece);
  const movePiece = useCheckersStore(state => state.movePiece);
  const gameState = useCheckersStore(state => state.gameState);
  const currentPlayer = useCheckersStore(state => state.currentPlayer);
  const initGame = useCheckersStore(state => state.initGame);
  
  const [debugMode, setDebugMode] = useState(false);
  
  // Filter for only current player's pieces
  const currentPlayerPieces = pieces.filter(piece => piece.color === currentPlayer);
  
  // Always show the debug button
  if (!debugMode) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button 
          onClick={() => setDebugMode(true)}
          variant="destructive"
          size="sm"
          className="glow-text glow-border"
        >
          Debug Mode
        </Button>
      </div>
    );
  }
  
  // If in menu and debug mode is enabled, add a start game button
  if (gameState === 'menu') {
    return (
      <div className="fixed top-4 right-4 z-50 p-4 bg-black/80 rounded-lg backdrop-blur-sm text-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Debug Controls</h3>
          <Button 
            onClick={() => setDebugMode(false)}
            variant="ghost"
            size="sm"
          >
            Close
          </Button>
        </div>
        <Button 
          onClick={() => initGame('two_player')}
          variant="default"
          className="mb-2 w-full"
        >
          Start Two Player Game
        </Button>
        <Button 
          onClick={() => initGame('single')}
          variant="secondary"
          className="w-full"
        >
          Start vs AI
        </Button>
      </div>
    );
  }
  
  return (
    <div className="fixed top-24 right-4 z-50 p-4 bg-black/80 rounded-lg backdrop-blur-sm text-white max-w-xs overflow-y-auto max-h-[60vh]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Debug Controls</h3>
        <Button 
          onClick={() => setDebugMode(false)}
          variant="ghost"
          size="sm"
        >
          Close
        </Button>
      </div>
      
      <div className="mb-4">
        <p className="text-sm mb-2">
          Current Player: <span className={currentPlayer === 'red' ? 'text-red-400' : 'text-blue-400'}>{currentPlayer}</span>
        </p>
        <p className="text-sm mb-2">
          Selected Piece: {selectedPiece ? `${selectedPiece.id} at [${selectedPiece.position.row},${selectedPiece.position.col}]` : 'None'}
        </p>
      </div>
      
      <div className="mb-4">
        <h4 className="text-sm font-bold mb-2">Available Pieces:</h4>
        <div className="grid grid-cols-2 gap-2">
          {currentPlayerPieces.map(piece => (
            <Button
              key={piece.id}
              onClick={() => selectPiece(piece)}
              variant={selectedPiece?.id === piece.id ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              {piece.id} [{piece.position.row},{piece.position.col}]
            </Button>
          ))}
        </div>
      </div>
      
      {selectedPiece && (
        <div>
          <h4 className="text-sm font-bold mb-2">Valid Moves:</h4>
          {validMoves.length === 0 ? (
            <p className="text-xs text-gray-400">No valid moves available</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {validMoves.map((move, index) => (
                <Button
                  key={index}
                  onClick={() => movePiece(move)}
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                >
                  Move to [{move.row},{move.col}]
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugControls;