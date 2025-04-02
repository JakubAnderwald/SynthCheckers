import React, { useRef, useState, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { Piece as PieceType } from '@/lib/checkers/types';
import { colors, getThreeColor } from '@/lib/theme/colors';
import { GLTF } from 'three-stdlib';

// Preload models
useGLTF.preload('/models/checker_piece.glb');
useGLTF.preload('/models/checker_king.glb');

interface PieceProps {
  piece: PieceType;
  onClick: () => void;
}

const Piece: React.FC<PieceProps> = ({ piece, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Load appropriate model based on piece type
  const { scene: pieceModel } = useGLTF(
    piece.type === 'king' ? '/models/checker_king.glb' : '/models/checker_piece.glb'
  ) as GLTF & {
    scene: THREE.Group
  };
  
  // Update model loaded state
  useEffect(() => {
    if (pieceModel) {
      setModelLoaded(true);
      console.log(`${piece.type} model loaded successfully`);
    }
  }, [pieceModel, piece.type]);
  
  // Animation for the piece
  useFrame(({ clock }) => {
    if (groupRef.current) {
      // If selected, make it hover
      if (piece.isSelected) {
        groupRef.current.position.y = 0.3 + Math.sin(clock.getElapsedTime() * 5) * 0.05;
      } else {
        groupRef.current.position.y = 0.15;
      }
      
      // Subtle rotation animation
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.2;
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
  
  // Clone and prepare the model
  const clonedModel = modelLoaded ? pieceModel.clone() : null;
  
  // Apply material to model if loaded
  if (clonedModel) {
    clonedModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(...threeColor),
          metalness: 0.8,
          roughness: 0.2,
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }
  
  return (
    <group position={position}>
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
      
      {/* The 3D model piece */}
      <group
        ref={groupRef}
        position={[0, 0.15, 0]}
        scale={[2.5, 2.5, 2.5]} // Scale up the model for better visibility
        onClick={(e) => {
          e.stopPropagation(); 
          console.log('Piece clicked:', piece.id, 'Color:', piece.color, 'Position:', piece.position);
          onClick();
        }}
        onPointerDown={(e) => {
          // Ensure we capture the pointer on mobile
          e.stopPropagation();
        }}
        onPointerUp={(e) => {
          // Handle pointer up events on mobile
          console.log('Piece pointer up:', piece.id);
          e.stopPropagation();
          // Delay to ensure it's a deliberate tap and not a quick touch
          setTimeout(() => {
            onClick();
          }, 50);
        }}
      >
        <Suspense fallback={
          <mesh>
            <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
            <meshStandardMaterial color={new THREE.Color(...threeColor)} />
          </mesh>
        }>
          {modelLoaded && clonedModel ? (
            <primitive object={clonedModel} />
          ) : (
            <mesh>
              <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
              <meshStandardMaterial color={new THREE.Color(...threeColor)} />
            </mesh>
          )}
        </Suspense>
      </group>
    </group>
  );
};

export default Piece;
