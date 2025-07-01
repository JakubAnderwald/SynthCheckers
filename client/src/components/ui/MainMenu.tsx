import React, { useEffect, useState } from 'react';
import { useCheckersStore } from '@/lib/stores/useCheckersStore';
import { useAudio } from '@/lib/stores/useAudio';
import { colors } from '@/lib/theme/colors';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MultiplayerPage } from '@/components/multiplayer/MultiplayerPage';

const MainMenu: React.FC = () => {
  const initGame = useCheckersStore(state => state.initGame);
  const toggleSettings = useCheckersStore(state => state.toggleSettings);
  const { toggleMute, isMuted } = useAudio();
  const isMobile = useIsMobile();
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  
  // Background grid effect for the menu
  const gridStyle = {
    backgroundImage: `
      linear-gradient(to right, ${colors.grid.light} 1px, transparent 1px),
      linear-gradient(to bottom, ${colors.grid.light} 1px, transparent 1px)
    `,
    backgroundSize: isMobile ? '20px 20px' : '40px 40px',
    backgroundPosition: 'center center',
  };
  


  if (showMultiplayer) {
    return <MultiplayerPage onBack={() => setShowMultiplayer(false)} onGameStart={(gameId) => {
      console.log('Starting multiplayer game:', gameId);
      // Handle game start - integrate with existing game system
    }} />;
  }

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center z-10 overflow-auto"
      style={{
        ...gridStyle,
        backgroundColor: colors.background.dark
      }}
    >
      <div className="w-full max-w-md px-4 py-6 sm:py-8 flex flex-col items-center">
        {/* Game Title */}
        <h1 
          className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 sm:mb-8 text-center tracking-tight"
          style={{ 
            fontFamily: "'Orbitron', sans-serif",
            color: colors.neon.pink,
            textShadow: `0 0 10px ${colors.neon.pink}, 0 0 20px ${colors.neon.pink}`
          }}
        >
          SYNTH
          <span 
            style={{ 
              color: colors.neon.blue,
              textShadow: `0 0 10px ${colors.neon.blue}, 0 0 20px ${colors.neon.blue}`
            }}
          >
            CHECKERS
          </span>
        </h1>
        
        {/* Menu Options */}
        <div className="w-full max-w-xs space-y-3 mb-4 sm:mb-6">
          <button
            onClick={() => initGame('single')}
            className="w-full py-2 sm:py-3 px-4 sm:px-6 text-base sm:text-lg font-medium rounded-md bg-neon-pink hover:bg-opacity-80 text-white transition-all duration-200 transform hover:scale-105"
            style={{ 
              boxShadow: `0 0 10px ${colors.neon.pink}, 0 0 5px ${colors.neon.pink}`,
            }}
          >
            Single Player
          </button>
          
          <button
            onClick={() => initGame('two_player')}
            className="w-full py-2 sm:py-3 px-4 sm:px-6 text-base sm:text-lg font-medium rounded-md bg-neon-blue hover:bg-opacity-80 text-white transition-all duration-200 transform hover:scale-105"
            style={{ 
              boxShadow: `0 0 10px ${colors.neon.blue}, 0 0 5px ${colors.neon.blue}`,
            }}
          >
            Two Players
          </button>
          
          <button
            onClick={() => setShowMultiplayer(true)}
            className="w-full py-2 sm:py-3 px-4 sm:px-6 text-base sm:text-lg font-medium rounded-md bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all duration-200 transform hover:scale-105"
            style={{ 
              boxShadow: `0 0 10px #f97316, 0 0 5px #f97316`,
            }}
          >
            Multiplayer
          </button>
          

          <button
            onClick={toggleSettings}
            className="w-full py-2 sm:py-3 px-4 sm:px-6 text-base sm:text-lg font-medium rounded-md bg-neon-purple hover:bg-opacity-80 text-white transition-all duration-200 transform hover:scale-105"
            style={{ 
              boxShadow: `0 0 10px ${colors.neon.purple}, 0 0 5px ${colors.neon.purple}`,
            }}
          >
            Settings
          </button>
        </div>
        
        {/* Sound Toggle */}
        <button
          onClick={toggleMute}
          className="flex items-center justify-center px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <span className="mr-2">{isMuted ? '🔇' : '🔊'}</span>
          <span className="text-white">Sound: {isMuted ? 'Off' : 'On'}</span>
        </button>
        
        {/* Footer - Hide on small mobile screens to save space */}
        <div className={`mt-6 sm:mt-12 text-xs sm:text-sm text-gray-400 text-center ${isMobile ? 'mb-4' : ''}`}>
          <p>{isMobile ? 'Tap to select pieces and move' : 'Use arrow keys to navigate and Space/Enter to select.'}</p>
          <p className="mt-2">
            <a 
              href="https://buymeacoffee.com/jakubanderwald" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-neon-blue hover:text-neon-pink transition-colors"
              style={{ 
                textShadow: `0 0 5px ${colors.neon.blue}`,
              }}
            >
              ☕ Enjoying the game? Buy me a coffee!
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
