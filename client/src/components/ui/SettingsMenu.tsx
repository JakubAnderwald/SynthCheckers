import React from 'react';
import { useCheckersStore } from '@/lib/stores/useCheckersStore';
import { useAudio } from '@/lib/stores/useAudio';
import { colors } from '@/lib/theme/colors';

const SettingsMenu: React.FC = () => {
  const toggleSettings = useCheckersStore(state => state.toggleSettings);
  const settings = useCheckersStore(state => state.settings);
  const updateSettings = useCheckersStore(state => state.updateSettings);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-background-dark/90 p-6 rounded-lg shadow-xl max-w-md w-full border-2"
        style={{ 
          borderColor: colors.neon.purple,
          boxShadow: `0 0 20px ${colors.neon.purple}` 
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 
            className="text-2xl font-bold"
            style={{ 
              color: colors.text.primary,
              textShadow: `0 0 5px ${colors.neon.blue}`
            }}
          >
            Settings
          </h2>
          
          <button
            onClick={toggleSettings}
            className="text-gray-300 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Sound Settings */}
          <div>
            <h3 className="text-xl mb-4 text-neon-blue">Audio</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-white">Background Music</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.musicEnabled}
                    onChange={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-blue"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-white">Sound Effects</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.soundEnabled}
                    onChange={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-blue"></div>
                </label>
              </div>
            </div>
          </div>
          
          {/* Difficulty Settings */}
          <div>
            <h3 className="text-xl mb-4 text-neon-pink">Difficulty</h3>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                className={`py-2 px-4 rounded-md ${settings.difficulty === 'easy' ? 'bg-neon-pink text-white' : 'bg-gray-700 text-gray-300'}`}
                onClick={() => updateSettings({ difficulty: 'easy' })}
              >
                Easy
              </button>
              
              <button
                className={`py-2 px-4 rounded-md ${settings.difficulty === 'medium' ? 'bg-neon-pink text-white' : 'bg-gray-700 text-gray-300'}`}
                onClick={() => updateSettings({ difficulty: 'medium' })}
              >
                Medium
              </button>
              
              <button
                className={`py-2 px-4 rounded-md ${settings.difficulty === 'hard' ? 'bg-neon-pink text-white' : 'bg-gray-700 text-gray-300'}`}
                onClick={() => updateSettings({ difficulty: 'hard' })}
              >
                Hard
              </button>
            </div>
          </div>
          
          {/* Controls Info */}
          <div>
            <h3 className="text-xl mb-3 text-neon-blue">Controls</h3>
            
            <div className="bg-gray-800 rounded-md p-3 text-sm text-gray-300">
              <ul className="space-y-1">
                <li><span className="text-neon-pink">Arrow Keys:</span> Move selection</li>
                <li><span className="text-neon-pink">Enter/Space:</span> Select piece/move</li>
                <li><span className="text-neon-pink">Escape:</span> Cancel selection</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={toggleSettings}
            className="px-4 py-2 bg-neon-purple text-white rounded-md hover:bg-opacity-80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;
