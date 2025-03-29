import React from 'react';
import { useCheckersStore } from '@/lib/stores/useCheckersStore';
import { useAudio } from '@/lib/stores/useAudio';
import { colors } from '@/lib/theme/colors';
import { useIsMobile } from '@/hooks/use-is-mobile';

const GameControls: React.FC = () => {
  const gameState = useCheckersStore(state => state.gameState);
  const gameMode = useCheckersStore(state => state.gameMode);
  const currentPlayer = useCheckersStore(state => state.currentPlayer);
  const returnToMenu = useCheckersStore(state => state.returnToMenu);
  const toggleSettings = useCheckersStore(state => state.toggleSettings);
  const resetSelection = useCheckersStore(state => state.resetSelection);
  const isMobile = useIsMobile();
  
  // Determine whose turn it is
  const playerTurn = gameMode === 'single' 
    ? currentPlayer === 'red' ? 'Your Turn' : 'AI Thinking...'
    : currentPlayer === 'red' ? 'Red\'s Turn' : 'Blue\'s Turn';
  
  // Only show controls when the game is active
  if (gameState === 'menu') {
    return null;
  }
  
  return (
    <>
      {/* Top controls - game info */}
      <div className="fixed top-0 left-0 right-0 p-2 sm:p-4 flex justify-between items-center z-10">
        <div 
          className="bg-background-dark/80 backdrop-blur-sm px-2 sm:px-4 py-1 sm:py-2 rounded-lg flex items-center"
          style={{ 
            borderBottom: `2px solid ${colors.neon.pink}`,
            boxShadow: `0 0 10px ${colors.neon.pink}` 
          }}
        >
          {!isMobile && (
            <div className="mr-4">
              <p className="text-white text-xs sm:text-sm font-medium">
                Mode: <span className="text-neon-blue">{gameMode === 'single' ? 'Single Player' : 'Two Players'}</span>
              </p>
            </div>
          )}
          
          <div>
            <p className="text-white text-xs sm:text-sm font-medium">
              <span 
                className="inline-block w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1"
                style={{ 
                  backgroundColor: currentPlayer === 'red' ? colors.neon.pink : colors.neon.blue,
                  boxShadow: `0 0 5px ${currentPlayer === 'red' ? colors.neon.pink : colors.neon.blue}`
                }}
              ></span>
              <span>{playerTurn}</span>
            </p>
          </div>
        </div>
        
        {/* Control buttons for desktop */}
        {!isMobile && (
          <div className="flex space-x-2">
            <button
              onClick={resetSelection}
              className="bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={toggleSettings}
              className="bg-neon-purple/80 backdrop-blur-sm hover:bg-neon-purple text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Settings
            </button>
            
            <button
              onClick={returnToMenu}
              className="bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Menu
            </button>
          </div>
        )}
      </div>
      
      {/* Mobile bottom controls */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 p-2 flex justify-center items-center z-10">
          <div className="flex space-x-2 bg-background-dark/80 backdrop-blur-sm rounded-lg p-2">
            <button
              onClick={resetSelection}
              className="bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm transition-colors flex-1"
            >
              Cancel
            </button>
            
            <button
              onClick={toggleSettings}
              className="bg-neon-purple/80 backdrop-blur-sm hover:bg-neon-purple text-white px-3 py-2 rounded-md text-sm transition-colors flex-1"
            >
              Settings
            </button>
            
            <button
              onClick={returnToMenu}
              className="bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm transition-colors flex-1"
            >
              Menu
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GameControls;
