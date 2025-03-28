// Synthwave color palette
export const colors = {
  // Background colors
  background: {
    dark: '#0f0a2a',
    medium: '#1a1141',
    light: '#2c1e63'
  },
  
  // Primary neon colors
  neon: {
    pink: '#f72585',
    purple: '#b5179e',
    blue: '#4cc9f0',
    cyan: '#0df5e3',
  },
  
  // Accent neon colors
  accent: {
    orange: '#ff9900',
    yellow: '#ffea00',
    green: '#0eff00'
  },
  
  // Grid and line colors
  grid: {
    light: '#ffffff33',
    dark: '#ffffff10',
    active: '#f72585'
  },
  
  // Piece colors
  piece: {
    red: '#f72585',
    redGlow: '#f7258555',
    blue: '#4cc9f0',
    blueGlow: '#4cc9f055',
    select: '#ffea00',
    selectGlow: '#ffea0055'
  },
  
  // Board colors
  board: {
    light: '#2c1e6399',
    dark: '#1a114199',
    validMove: '#ffea0044'
  },
  
  // UI text colors
  text: {
    primary: '#ffffff',
    secondary: '#d8c9ff',
    highlight: '#f72585'
  }
};

// Convert colors to THREE.js Color objects
export const getThreeColor = (hexColor: string): [number, number, number] => {
  // Remove the hash if it exists
  const hex = hexColor.replace('#', '');
  
  // Parse the hex color
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  return [r, g, b];
};
