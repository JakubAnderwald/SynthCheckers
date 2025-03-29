import React from 'react';
import { useCheckersStore } from '@/lib/stores/useCheckersStore';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { colors } from '@/lib/theme/colors';

const GameOver: React.FC = () => {
  const winner = useCheckersStore(state => state.winner);
  const returnToMenu = useCheckersStore(state => state.returnToMenu);
  const initGame = useCheckersStore(state => state.initGame);
  const gameMode = useCheckersStore(state => state.gameMode);
  const isMobile = useIsMobile();
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-background-dark/90 border-2 p-4 sm:p-8 rounded-lg shadow-xl max-w-md w-full mx-4 text-center"
        style={{ 
          borderColor: colors.neon.pink,
          boxShadow: `0 0 15px ${colors.neon.pink}` 
        }}
      >
        <h2 
          className="text-2xl sm:text-3xl font-bold mb-4 text-text-primary"
          style={{ 
            textShadow: `0 0 5px ${colors.neon.blue}, 0 0 10px ${colors.neon.blue}`
          }}
        >
          Game Over
        </h2>
        
        <p className="text-lg sm:text-xl mb-6 sm:mb-8">
          {winner === 'red' && (
            <span 
              className="font-bold"
              style={{ 
                color: colors.neon.pink,
                textShadow: `0 0 5px ${colors.neon.pink}`
              }}
            >
              {gameMode === 'single' ? 'You' : 'Red'} won!
            </span>
          )}
          
          {winner === 'blue' && (
            <span 
              className="font-bold"
              style={{ 
                color: colors.neon.blue,
                textShadow: `0 0 5px ${colors.neon.blue}`
              }}
            >
              {gameMode === 'single' ? 'AI' : 'Blue'} won!
            </span>
          )}
        </p>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => initGame(gameMode)}
            className="py-2 px-3 sm:px-4 bg-neon-purple hover:bg-purple-700 text-white font-bold rounded transition-colors duration-200"
            style={{ 
              boxShadow: `0 0 8px ${colors.neon.purple}`
            }}
          >
            Play Again
          </button>
          
          <button
            onClick={returnToMenu}
            className="py-2 px-3 sm:px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded transition-colors duration-200"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
