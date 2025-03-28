import React, { useRef } from 'react';
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
  
  // Create a large grid plane that extends to the horizon
  return (
    <group ref={gridRef} position={[3.5, -0.5, 3.5]}>
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
