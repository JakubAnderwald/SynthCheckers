import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCheckersStore } from '@/lib/stores/useCheckersStore';
import { colors } from '@/lib/theme/colors';
import { BOARD_SIZE } from '@/lib/checkers/rules';
import Square from './Square';
import Piece from './Piece';

const Board: React.FC = () => {
  const boardRef = useRef<THREE.Group>(null);
  const [hoveredSquare, setHoveredSquare] = useState<{row: number, col: number} | null>(null);
  
  const pieces = useCheckersStore(state => state.pieces);
  const selectedPiece = useCheckersStore(state => state.selectedPiece);
  const validMoves = useCheckersStore(state => state.validMoves);
  const gameState = useCheckersStore(state => state.gameState);
  const selectPiece = useCheckersStore(state => state.selectPiece);
  const movePiece = useCheckersStore(state => state.movePiece);
  const resetSelection = useCheckersStore(state => state.resetSelection);
  
  // Get keyboard controls state
  const [subscribeKeys, getKeys] = useKeyboardControls();
  
  // Reference to track which square is "selected" via keyboard
  const [keyboardFocus, setKeyboardFocus] = useState<{row: number, col: number}>({row: 0, col: 1});
  
  // Apply a pulsing effect to the board
  useFrame(({ clock }) => {
    if (boardRef.current) {
      // Subtle floating animation
      boardRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.05 + 0.05;
    }
  });
  
  // Handle keyboard navigation
  useEffect(() => {
    // Only enable keyboard navigation when the game is in playing state
    if (gameState !== 'playing') return;
    
    const unsubscribeUp = subscribeKeys(
      (state) => state.up,
      (pressed) => {
        if (pressed) {
          setKeyboardFocus(prev => ({
            ...prev,
            row: Math.max(0, prev.row - 1)
          }));
        }
      }
    );
    
    const unsubscribeDown = subscribeKeys(
      (state) => state.down,
      (pressed) => {
        if (pressed) {
          setKeyboardFocus(prev => ({
            ...prev,
            row: Math.min(BOARD_SIZE - 1, prev.row + 1)
          }));
        }
      }
    );
    
    const unsubscribeLeft = subscribeKeys(
      (state) => state.left,
      (pressed) => {
        if (pressed) {
          setKeyboardFocus(prev => ({
            ...prev,
            col: Math.max(0, prev.col - 1)
          }));
        }
      }
    );
    
    const unsubscribeRight = subscribeKeys(
      (state) => state.right,
      (pressed) => {
        if (pressed) {
          setKeyboardFocus(prev => ({
            ...prev,
            col: Math.min(BOARD_SIZE - 1, prev.col + 1)
          }));
        }
      }
    );
    
    const unsubscribeConfirm = subscribeKeys(
      (state) => state.confirm,
      (pressed) => {
        if (pressed) {
          const { row, col } = keyboardFocus;
          
          // If a piece is already selected, try to move it
          if (selectedPiece) {
            const isValidMove = validMoves.some(
              move => move.row === row && move.col === col
            );
            
            if (isValidMove) {
              movePiece({ row, col });
            } else {
              // Check if there's a piece at this position
              const pieceAtPosition = pieces.find(
                p => p.position.row === row && p.position.col === col
              );
              
              if (pieceAtPosition) {
                selectPiece(pieceAtPosition);
              } else {
                resetSelection();
              }
            }
          } else {
            // Try to select a piece
            const pieceAtPosition = pieces.find(
              p => p.position.row === row && p.position.col === col
            );
            
            if (pieceAtPosition) {
              selectPiece(pieceAtPosition);
            }
          }
        }
      }
    );
    
    const unsubscribeCancel = subscribeKeys(
      (state) => state.cancel,
      (pressed) => {
        if (pressed && selectedPiece) {
          resetSelection();
        }
      }
    );
    
    return () => {
      unsubscribeUp();
      unsubscribeDown();
      unsubscribeLeft();
      unsubscribeRight();
      unsubscribeConfirm();
      unsubscribeCancel();
    };
  }, [
    gameState, 
    keyboardFocus, 
    selectedPiece, 
    validMoves, 
    pieces, 
    selectPiece, 
    movePiece, 
    resetSelection, 
    subscribeKeys
  ]);
  
  // Check if we're on mobile using a simple flag
  const isMobile = useMemo(() => {
    const settings = useCheckersStore.getState().settings;
    return settings.debugMode ? false : typeof window !== 'undefined' && window.matchMedia(`(max-width: 767px)`).matches;
  }, []);
  
  // For mobile, we counter-rotate by -45 degrees to fix the orientation issue
  // On mobile, we've observed that the board still needs a different rotation
  // Using a full top-down camera position with no rotation gives the clearest view
  // This ensures the board is oriented properly with the correct perspective
  const boardRotation = useMemo(() => {
    return isMobile ? new THREE.Euler(0, 0, 0) : new THREE.Euler(0, 0, 0);
  }, [isMobile]);
  
  return (
    <group ref={boardRef} rotation={boardRotation}>
      {/* Board base with glow effect */}
      <mesh receiveShadow position={[3.5, -0.1, 3.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOARD_SIZE + 0.5, BOARD_SIZE + 0.5]} />
        <meshStandardMaterial 
          color={colors.background.medium} 
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>
      
      {/* Create the board squares */}
      {Array.from({ length: BOARD_SIZE }).map((_, row) =>
        Array.from({ length: BOARD_SIZE }).map((_, col) => (
          <Square
            key={`${row}-${col}`}
            position={[col, 0, row]}
            color={(row + col) % 2 === 0 ? colors.board.light : colors.board.dark}
            isValidMove={validMoves.some(move => {
              const isValid = move.row === row && move.col === col;
              if (isValid) {
                console.log('Valid move found at', row, col);
              }
              return isValid;
            })}
            isKeyboardFocused={keyboardFocus.row === row && keyboardFocus.col === col}
            isHovered={hoveredSquare?.row === row && hoveredSquare?.col === col}
            onSquareClick={() => {
              console.log(`Square clicked: row=${row}, col=${col}`, 'touch-friendly event');
              
              // If this is a valid move for the selected piece, move there
              if (selectedPiece && validMoves.some(move => 
                  (move.row === row && move.col === col) ||  // Exact position
                  (isMobile && move.row === row+1 && move.col === col)   // Offset for mobile Safari touch
                )) {
                console.log('Valid move detected! Moving piece...');
                // Use the actual valid move position from validMoves, not the clicked position
                const actualMove = validMoves.find(move => 
                  (move.row === row && move.col === col) || 
                  (isMobile && move.row === row+1 && move.col === col)
                );
                movePiece(actualMove || { row, col }); // Fallback to clicked position if not found
              } else {
                // Try to select a piece at this position
                // Check both exact position and slightly offset position for better mobile touch support
                const pieceAtPosition = pieces.find(
                  p => (p.position.row === row && p.position.col === col) || 
                       (isMobile && p.position.row === row+1 && p.position.col === col) // Check one row ahead for Safari touch
                );
                
                if (pieceAtPosition) {
                  console.log('Piece found at position - selecting piece:', pieceAtPosition);
                  selectPiece(pieceAtPosition);
                } 
                // Commented out the auto-deselection on mobile to prevent accidental deselection
                // else if (selectedPiece) {
                //   // Clicking on an empty square deselects the current piece
                //   resetSelection();
                // }
              }
            }}
            onSquareHover={() => setHoveredSquare({ row, col })}
            onSquareUnhover={() => setHoveredSquare(null)}
          />
        ))
      )}
      
      {/* Render all pieces */}
      {pieces.map(piece => (
        <Piece
          key={piece.id}
          piece={piece}
          onClick={() => {
            if (gameState === 'playing') {
              selectPiece(piece);
            }
          }}
        />
      ))}
    </group>
  );
};

export default Board;
