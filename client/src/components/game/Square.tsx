import React, { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getThreeColor } from '@/lib/theme/colors';

interface SquareProps {
  position: [number, number, number] | readonly [number, number, number];
  color: string;
  isValidMove: boolean;
  isKeyboardFocused: boolean;
  isHovered: boolean;
  onSquareClick: () => void;
  onSquareHover: () => void;
  onSquareUnhover: () => void;
}

const Square: React.FC<SquareProps> = ({
  position: originalPosition,
  color,
  isValidMove,
  isKeyboardFocused,
  isHovered,
  onSquareClick,
  onSquareHover,
  onSquareUnhover
}) => {
  // Check if we're on mobile - use useMemo to prevent recalculation on every render
  const isMobile = useMemo(() => {
    return typeof window !== 'undefined' && window.matchMedia(`(max-width: 767px)`).matches;
  }, []);
  
  // Use original position without any modifications
  const position = originalPosition;
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  // Animation for valid move indicators and keyboard focus
  useFrame(({ clock }) => {
    if (materialRef.current) {
      if (isValidMove) {
        // Pulse effect for valid moves
        materialRef.current.emissive.setRGB(
          0.3 + Math.sin(clock.getElapsedTime() * 3) * 0.1,
          0.3 + Math.sin(clock.getElapsedTime() * 3) * 0.1,
          0
        );
      } else if (isKeyboardFocused) {
        // Subtle pulse for keyboard focus
        materialRef.current.emissive.setRGB(
          0.1 + Math.sin(clock.getElapsedTime() * 4) * 0.05,
          0.1 + Math.sin(clock.getElapsedTime() * 4) * 0.05,
          0.1 + Math.sin(clock.getElapsedTime() * 4) * 0.05
        );
      } else if (isHovered) {
        // Highlight for hover
        materialRef.current.emissive.setRGB(0.1, 0.1, 0.1);
      } else {
        // No highlight
        materialRef.current.emissive.setRGB(0, 0, 0);
      }
    }
  });
  
  // Convert color string to THREE.js color
  const threeColor = getThreeColor(color);

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        console.log('Square clicked:', position);
        onSquareClick();
      }}

      onPointerUp={(e) => {
        // Handle pointer up events as clicks on mobile
        if (isMobile) {
          console.log('Square pointer up (mobile):', position);
          e.stopPropagation();
          onSquareClick(); // Execute click on pointer up for mobile
        } else {
          console.log('Square pointer up (desktop):', position);
          e.stopPropagation();
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onSquareHover();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onSquareUnhover();
      }}
      receiveShadow
      ref={meshRef}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        ref={materialRef}
        color={new THREE.Color(...threeColor)}
        metalness={0.2}
        roughness={0.8}
        transparent={true}
        opacity={0.9}
      />
    </mesh>
  );
};

export default Square;
