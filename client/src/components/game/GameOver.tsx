import React from 'react';
import { useCheckersStore } from '@/lib/stores/useCheckersStore';
import { cn } from '@/lib/utils';

const GameOver: React.FC = () => {
  const winner = useCheckersStore(state => state.winner);
  const returnToMenu = useCheckersStore(state => state.returnToMenu);
  const initGame = useCheckersStore(state => state.initGame);
  const gameMode = useCheckersStore(state => state.gameMode);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background/90 border border-neon-pink p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        <h2 className="text-3xl font-bold mb-4 text-text-primary glow-text">Game Over</h2>
        
        <p className="text-xl mb-8">
          {winner === 'red' && (
            <span className={cn(
              "font-bold",
              gameMode === 'single' ? "text-neon-pink" : "text-neon-pink"
            )}>
              {gameMode === 'single' ? 'You' : 'Red'} won!
            </span>
          )}
          
          {winner === 'blue' && (
            <span className={cn(
              "font-bold",
              gameMode === 'single' ? "text-neon-blue" : "text-neon-blue"
            )}>
              {gameMode === 'single' ? 'AI' : 'Blue'} won!
            </span>
          )}
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => initGame(gameMode)}
            className="py-2 px-4 bg-neon-purple hover:bg-purple-700 text-white font-bold rounded transition-colors duration-200"
          >
            Play Again
          </button>
          
          <button
            onClick={returnToMenu}
            className="py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded transition-colors duration-200"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
