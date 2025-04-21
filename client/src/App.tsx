import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useAudio } from "./lib/stores/useAudio";
import { useCheckersStore } from "./lib/stores/useCheckersStore";
import "@fontsource/inter";
import MainMenu from "./components/ui/MainMenu";
import Board from "./components/game/Board";
import Lighting from "./components/game/Lighting";
import GridFloor from "./components/game/GridFloor";
import GameControls from "./components/ui/GameControls";
import GameOver from "./components/game/GameOver";
import SettingsMenu from "./components/ui/SettingsMenu";
import DebugControls from "./components/ui/DebugControls";
import { useIsMobile } from "./hooks/use-is-mobile";

// Define control keys for the game
const controls = [
  { name: "confirm", keys: ["Enter", "Space"] },
  { name: "cancel", keys: ["Escape"] },
  { name: "up", keys: ["ArrowUp", "KeyW"] },
  { name: "down", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
];

// Main App component
function App() {
  const gameState = useCheckersStore(state => state.gameState);
  const settingsOpen = useCheckersStore(state => state.settingsOpen);
  const [showCanvas, setShowCanvas] = useState(false);
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();
  const isMobile = useIsMobile();

  // Add meta viewport tag for mobile devices
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    document.head.appendChild(meta);
    
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  // Load audio assets
  useEffect(() => {
    // Load the custom synthwave music uploaded by the user
    const bgMusic = new Audio("/sounds/synth_music.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.75; // Increased volume for better experience with custom synthwave music
    console.log("Loading background music...");
    
    // Set up event listeners to track audio loading
    bgMusic.addEventListener('canplaythrough', () => {
      console.log("Background music loaded successfully");
    });
    
    bgMusic.addEventListener('error', (e) => {
      console.error("Background music error:", e);
    });
    
    setBackgroundMusic(bgMusic);

    // Sound effects - make sure these load properly
    const hit = new Audio("/sounds/hit.mp3");
    hit.volume = 0.6; // Match the volume in useAudio
    console.log("Loading hit sound effect...");
    hit.addEventListener('canplaythrough', () => {
      console.log("Hit sound loaded successfully");
    });
    hit.addEventListener('error', (e) => {
      console.error("Hit sound load error:", e);
    });
    setHitSound(hit);
    
    const success = new Audio("/sounds/success.mp3");
    success.volume = 0.8;
    console.log("Loading success sound effect...");
    success.addEventListener('canplaythrough', () => {
      console.log("Success sound loaded successfully");
    });
    success.addEventListener('error', (e) => {
      console.error("Success sound load error:", e);
    });
    setSuccessSound(success);
    
    // Load audio manually to ensure they're ready
    bgMusic.load();
    hit.load();
    success.load();
    
    setShowCanvas(true);
    
    // Try playing a quick silent sound to enable audio
    const enableAudio = () => {
      const silentSound = new Audio();
      silentSound.play().catch(e => console.log("Silent sound error:", e));
      document.removeEventListener('click', enableAudio);
    };
    document.addEventListener('click', enableAudio);
    
    return () => {
      bgMusic.pause();
      hit.pause();
      success.pause();
      document.removeEventListener('click', enableAudio);
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  // Adjust camera position to show the entire board from a good angle
  // For mobile, use a true top-down view for better touch precision
  const cameraPosition: [number, number, number] = isMobile ? [3.5, 20, 3.5] : [3.5, 10, 12];
  const cameraFov = isMobile ? 35 : 40;
  const targetPosition = new THREE.Vector3(3.5, 0, 3.5);

  return (
    <div className="game-container">
      {showCanvas && (
        <KeyboardControls map={controls}>
          {gameState === 'menu' && <MainMenu />}
          
          {(gameState === 'playing' || gameState === 'ai_turn' || gameState === 'game_over') && (
            <>
              <Canvas
                shadows
                camera={{
                  position: cameraPosition,
                  fov: cameraFov,
                  near: 0.1,
                  far: 1000
                }}
                gl={{
                  antialias: true,
                  powerPreference: "default"
                }}
              >
                <color attach="background" args={["#0f0a2a"]} />
                <fog attach="fog" args={["#0f0a2a", 10, 30]} />
                
                {/* Camera Controls - Allow for both mobile and desktop */}
                <OrbitControls 
                  enableZoom={true}
                  enablePan={false}
                  enableRotate={isMobile ? false : true} // Disable rotation on mobile for better input handling
                  minPolarAngle={isMobile ? 0 : Math.PI / 6} // More top-down for mobile
                  maxPolarAngle={isMobile ? Math.PI / 6 : Math.PI / 2.5} // Restrict angle on mobile
                  target={targetPosition}
                  minDistance={isMobile ? 10 : 5}
                  maxDistance={20}
                  // Configure touch controls differently for mobile
                  mouseButtons={{
                    LEFT: isMobile ? undefined : THREE.MOUSE.ROTATE,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: undefined
                  }}
                  touches={{
                    ONE: isMobile ? undefined : THREE.TOUCH.ROTATE,
                    TWO: THREE.TOUCH.DOLLY_PAN
                  }}
                />
                
                {/* Lighting */}
                <Lighting />
                
                {/* Game Board */}
                <Suspense fallback={null}>
                  <GridFloor />
                  <Board />
                </Suspense>
              </Canvas>
              
              <GameControls />
              {gameState === 'game_over' && <GameOver />}
            </>
          )}
          
          {/* Always show debug controls, regardless of game state */}
          <DebugControls />
          
          {settingsOpen && <SettingsMenu />}
        </KeyboardControls>
      )}
    </div>
  );
}

export default App;
