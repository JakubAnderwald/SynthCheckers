import React, { useEffect } from 'react';
import { useCheckersStore } from '@/lib/stores/useCheckersStore';
import { useAudio } from '@/lib/stores/useAudio';
import { colors } from '@/lib/theme/colors';
import { useIsMobile } from '@/hooks/use-is-mobile';

const MainMenu: React.FC = () => {
  const initGame = useCheckersStore(state => state.initGame);
  const toggleSettings = useCheckersStore(state => state.toggleSettings);
  const { toggleMute, isMuted } = useAudio();
  const isMobile = useIsMobile();
  
  // Background grid effect for the menu
  const gridStyle = {
    backgroundImage: `
      linear-gradient(to right, ${colors.grid.light} 1px, transparent 1px),
      linear-gradient(to bottom, ${colors.grid.light} 1px, transparent 1px)
    `,
    backgroundSize: isMobile ? '20px 20px' : '40px 40px',
    backgroundPosition: 'center center',
  };
  
  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center bg-background-dark z-10 overflow-auto"
      style={gridStyle}
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
          <p className="mt-2">© 2023 Synth Checkers</p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
