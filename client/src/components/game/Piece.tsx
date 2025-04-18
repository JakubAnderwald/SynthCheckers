import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { Piece as PieceType } from '@/lib/checkers/types';
import { colors, getThreeColor } from '@/lib/theme/colors';

interface PieceProps {
  piece: PieceType;
  onClick: () => void;
}

const Piece: React.FC<PieceProps> = ({ piece, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const woodTexture = useTexture('/textures/wood.jpg');
  
  // Configure texture
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(1, 1);
  
  // Animation for the piece
  useFrame(({ clock }) => {
    if (meshRef.current) {
      // If selected, make it hover
      if (piece.isSelected) {
        meshRef.current.position.y = 0.3 + Math.sin(clock.getElapsedTime() * 5) * 0.05;
      } else {
        meshRef.current.position.y = 0.15;
      }
      
      // Subtle rotation animation
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.2;
    }
    
    // Glow animation
    if (glowMaterialRef.current) {
      if (piece.isSelected) {
        glowMaterialRef.current.opacity = 0.6 + Math.sin(clock.getElapsedTime() * 4) * 0.2;
      } else {
        glowMaterialRef.current.opacity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
      }
    }
  });
  
  // Determine piece color
  const pieceColor = piece.color === 'red' ? colors.piece.red : colors.piece.blue;
  const glowColor = piece.color === 'red' ? colors.piece.redGlow : colors.piece.blueGlow;
  const selectColor = piece.isSelected ? colors.piece.select : pieceColor;
  const selectGlowColor = piece.isSelected ? colors.piece.selectGlow : glowColor;
  
  // Convert hex colors to THREE.js colors
  const threeColor = getThreeColor(selectColor);
  const threeGlowColor = getThreeColor(selectGlowColor);
  
  // Position based on the piece's position
  const position: [number, number, number] = [piece.position.col, 0, piece.position.row];
  
  return (
    <group position={position}>
      {/* Invisible larger touch area for mobile devices */}
      <mesh
        position={[0, 0.1, 0]}
        onClick={(e) => {
          e.stopPropagation();
          console.log('Touch area clicked for piece:', piece.id);
          onClick();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.nativeEvent instanceof TouchEvent) {
            onClick();
          }
        }}
      >
        <cylinderGeometry args={[0.45, 0.45, 0.05, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Glow effect beneath the piece */}
      <mesh 
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial
          ref={glowMaterialRef}
          color={new THREE.Color(...threeGlowColor)}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      
      {/* The actual checker piece */}
      <mesh
        ref={meshRef}
        position={[0, 0.15, 0]}
        onClick={(e) => {
          e.stopPropagation(); 
          console.log('Piece clicked:', piece.id, 'Color:', piece.color, 'Position:', piece.position);
          onClick();
        }}
        onPointerDown={(e) => {
          // Ensure we capture the pointer on mobile
          e.stopPropagation();
          
          // On touchscreens, specifically check if it's a touch event
          if (e.nativeEvent instanceof TouchEvent) {
            console.log('Touch detected on piece:', piece.id);
            // Immediately trigger click on touch down to improve responsiveness
            onClick();
          }
        }}
        onPointerUp={(e) => {
          // Handle pointer up events on mobile
          console.log('Piece pointer up:', piece.id);
          e.stopPropagation();
          
          // We don't need timeout for mobile as we handle it in onPointerDown
          // This is to prevent double-triggering
          if (!(e.nativeEvent instanceof TouchEvent)) {
            setTimeout(() => {
              onClick();
            }, 50);
          }
        }}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.35, 0.35, 0.1, 32]} />
        <meshStandardMaterial
          color={new THREE.Color(...threeColor)}
          metalness={0.7}
          roughness={0.2}
          map={woodTexture}
        />
      </mesh>
      
      {/* If it's a king, add a crown or second piece on top */}
      {piece.type === 'king' && (
        <>
          {/* Second checker on top */}
          <mesh
            position={[0, 0.25, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.25, 0.25, 0.1, 32]} />
            <meshStandardMaterial
              color={new THREE.Color(...threeColor)}
              metalness={0.8}
              roughness={0.1}
              map={woodTexture}
            />
          </mesh>
          
          {/* Crown effect - a glowing ring */}
          <mesh
            position={[0, 0.35, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.2, 0.3, 32]} />
            <meshBasicMaterial
              color={new THREE.Color(...threeGlowColor)}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
};

export default Piece;
