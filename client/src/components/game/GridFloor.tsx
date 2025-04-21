import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { colors } from '@/lib/theme/colors';

// Grid floor with a retro synthwave grid effect
const GridFloor: React.FC = () => {
  const gridRef = useRef<THREE.Group>(null);
  
  // Animate the grid
  useFrame(({ clock }) => {
    if (gridRef.current) {
      // Make the grid "move" by shifting its position
      const time = clock.getElapsedTime();
      gridRef.current.position.z = (time * 0.2) % 1;
    }
  });
  
  // Check if we're on mobile to adjust the grid rotation
  // Use useMemo to cache the result and prevent re-computation on every render
  const isMobile = useMemo(() => {
    return typeof window !== 'undefined' && window.matchMedia(`(max-width: 767px)`).matches;
  }, []);
  
  // Apply the same rotation as the board for consistency
  // Applying a 45 degree (clockwise) rotation around the Y axis for mobile
  // This aligns with the board's rotation
  const gridRotation = useMemo(() => {
    return isMobile ? new THREE.Euler(0, Math.PI/4, 0) : new THREE.Euler(0, 0, 0);
  }, [isMobile]);
  
  // Create a large grid plane that extends to the horizon
  return (
    <group ref={gridRef} position={[3.5, -0.5, 3.5]} rotation={gridRotation}>
      {/* Main grid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100, 100, 100]} />
        <meshStandardMaterial
          color={colors.background.dark}
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>
      
      {/* Secondary grid for more detail */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[100, 100, 20, 20]} />
        <meshStandardMaterial
          color={colors.neon.purple}
          wireframe
          transparent
          opacity={0.2}
        />
      </mesh>
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color={colors.background.dark}
          transparent
          opacity={0.7}
          metalness={0.2}
          roughness={0.9}
        />
      </mesh>
      
      {/* Horizon line with glow */}
      <mesh position={[0, 2, -50]} rotation={[0, 0, 0]}>
        <planeGeometry args={[100, 4]} />
        <meshBasicMaterial
          color={colors.neon.pink}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

export default GridFloor;
