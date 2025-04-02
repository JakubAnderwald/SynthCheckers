# Synth Checkers

![Synth Checkers Logo](generated-icon.png)

A modern, synthwave-themed 3D checkers game built with React, Three.js and TypeScript. Experience the classic board game with an immersive neon aesthetic optimized for mobile play.

## ✨ Features

- **Immersive 3D Environment**: Full 3D board and pieces rendered with Three.js
- **Synthwave Aesthetic**: Neon colors, grid effects, and retro-futuristic visuals
- **Mobile Optimized**: Responsive design for gameplay on any device
- **Game Modes**: 
  - Single-player against AI (with adjustable difficulty)
  - Two-player mode for face-to-face gameplay
- **Enhanced Checkers Rules**:
  - Flying kings that can move any distance diagonally
  - Mandatory captures
  - Multiple jumps in a single turn
- **Interactive Audio**: 
  - Synthwave background music
  - Sound effects for moves, captures, and king promotions
  - Support for custom audio tracks

## 🎮 How to Play

1. **Game Setup**: 
   - Red pieces start at the bottom and move upward
   - Blue pieces start at the top and move downward
   - Each player starts with 12 pieces

2. **Movement**:
   - Regular pieces move diagonally forward
   - Kings can move diagonally in any direction
   - Capture opponent pieces by jumping over them

3. **Special Rules**:
   - If a capture is available, it must be made
   - Multiple captures can be made in a single turn
   - Pieces that reach the opposite end become kings
   - Kings can move any distance along diagonals

4. **Winning**:
   - Capture all opponent pieces or
   - Block opponent from making any valid moves

## 🛠️ Technology Stack

- **Frontend**: React with TypeScript
- **3D Rendering**: Three.js with React Three Fiber
- **State Management**: Zustand
- **Styling**: Tailwind CSS with custom neon theme
- **Sound**: HTML5 Audio API

## 🚀 Installation & Development

```bash
# Clone the repository
git clone https://github.com/yourusername/synth-checkers.git

# Navigate to the project directory
cd synth-checkers

# Install dependencies
npm install

# Start the development server
npm run dev
```

## 🎨 Customization

- **Audio**: Replace the default background track by adding your own MP3 file to `client/public/sounds/synth_music.mp3`
- **Difficulty**: Adjust AI difficulty in the in-game settings
- **Visual Settings**: Toggle various visual effects in the settings menu

## 📱 Mobile Deployment

The game is optimized for the Google Play Store, with:
- Touch controls for easy piece movement
- Responsive UI that adapts to any screen size
- Efficient rendering for mobile hardware

## 📄 License

[MIT License](LICENSE)

## 👏 Acknowledgments

- Inspired by the visual aesthetics of synthwave/retrowave art
- Built with modern web technologies for immersive browser-based gaming
- Special thanks to the open-source community for the tools and libraries that made this possible