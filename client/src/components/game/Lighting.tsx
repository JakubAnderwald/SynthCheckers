import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { colors } from '@/lib/theme/colors';

const Lighting: React.FC = () => {
  const spotlightRef = useRef<THREE.SpotLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  
  // Animate the spotlight to create a dynamic lighting effect
  useFrame(({ clock }) => {
    if (spotlightRef.current) {
      // Move the spotlight in a circular pattern
      const angle = clock.getElapsedTime() * 0.2;
      const radius = 8;
      
      spotlightRef.current.position.x = Math.sin(angle) * radius;
      spotlightRef.current.position.z = Math.cos(angle) * radius;
      
      // Always point to the center of the board
      spotlightRef.current.target.position.set(3.5, 0, 3.5);
      spotlightRef.current.target.updateMatrixWorld();
      
      // Pulsing intensity for the ambient light
      if (ambientRef.current) {
        ambientRef.current.intensity = 0.4 + Math.sin(clock.getElapsedTime() * 0.5) * 0.05;
      }
    }
  });
  
  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight ref={ambientRef} intensity={0.4} color="#b5a9ff" />
      
      {/* Main spotlight */}
      <spotLight
        ref={spotlightRef}
        position={[10, 15, 10]}
        angle={0.3}
        penumbra={0.8}
        intensity={0.8}
        castShadow
        shadow-bias={-0.0001}
        color="#ffffff"
      />
      
      {/* Point lights for the synthwave glow effect */}
      <pointLight position={[0, 2, 0]} intensity={0.6} color={colors.neon.pink} distance={10} />
      <pointLight position={[7, 2, 7]} intensity={0.6} color={colors.neon.blue} distance={10} />
      <pointLight position={[0, 2, 7]} intensity={0.6} color={colors.accent.yellow} distance={10} />
      
      {/* Directional light for shadows */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
    </>
  );
};

export default Lighting;
