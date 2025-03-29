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
    const bgMusic = new Audio("/sounds/background.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.5;
    setBackgroundMusic(bgMusic);

    const hit = new Audio("/sounds/hit.mp3");
    hit.volume = 0.6;
    setHitSound(hit);
    
    const success = new Audio("/sounds/success.mp3");
    success.volume = 0.7;
    setSuccessSound(success);
    
    setShowCanvas(true);
    
    return () => {
      bgMusic.pause();
      hit.pause();
      success.pause();
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  // Adjust camera position for mobile with a more top-down view
  const cameraPosition: [number, number, number] = isMobile ? [0, 20, 0.1] : [0, 10, 8];
  const cameraFov = isMobile ? 40 : 45;
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
                
                {/* Camera Controls */}
                {isMobile ? (
                  <OrbitControls 
                    enableZoom={true}
                    enablePan={false}
                    enableRotate={false}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2.5}
                    target={targetPosition}
                    // Only allow zooming, disable rotation to prevent interference with piece selection
                    mouseButtons={{
                      LEFT: undefined,
                      MIDDLE: THREE.MOUSE.DOLLY,
                      RIGHT: undefined
                    }}
                    touches={{
                      ONE: undefined,
                      TWO: THREE.TOUCH.DOLLY_PAN
                    }}
                  />
                ) : null}
                
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
          
          {settingsOpen && <SettingsMenu />}
        </KeyboardControls>
      )}
    </div>
  );
}

export default App;
