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
  const isMobile = typeof window !== 'undefined' && window.matchMedia(`(max-width: 767px)`).matches;
  
  // For mobile, we counter-rotate by -45 degrees to correct the orientation
  // Use useMemo to optimize performance and avoid recreating on each render
  const gridRotation = useMemo(() => {
    return isMobile ? new THREE.Euler(0, -Math.PI/4, 0) : new THREE.Euler(0, 0, 0);
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
