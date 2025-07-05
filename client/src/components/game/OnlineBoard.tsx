import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCheckersStore } from '@/lib/stores/useCheckersStore';
import { colors } from '@/lib/theme/colors';
import { BOARD_SIZE } from '@/lib/checkers/rules';
import { convertToFirestoreBoard, convertFromFirestoreBoard } from '@/lib/gameState';
import { GameRecord, BoardStateSnapshot } from '@/types/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Square from './Square';
import Piece from './Piece';

interface OnlineBoardProps {
  gameRecord: GameRecord;
  onMoveAttempt?: (move: { from: { row: number; col: number }; to: { row: number; col: number } }) => void;
  onPieceSelect?: (pieceId: string) => void;
  isPlayerTurn?: boolean;
  playerColor?: 'red' | 'blue';
  readOnly?: boolean;
}

const OnlineBoard: React.FC<OnlineBoardProps> = ({
  gameRecord,
  onMoveAttempt,
  onPieceSelect,
  isPlayerTurn = false,
  playerColor = 'red',
  readOnly = false
}) => {
  const boardRef = useRef<THREE.Group>(null);
  const [hoveredSquare, setHoveredSquare] = useState<{row: number, col: number} | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<{row: number, col: number}[]>([]);
  const [keyboardFocus, setKeyboardFocus] = useState<{row: number, col: number}>({row: 0, col: 1});
  
  // Get auth context
  const { user } = useAuth();
  
  // Get keyboard controls
  const [subscribeKeys, getKeys] = useKeyboardControls();
  
  // Convert Firestore board state to local pieces
  const pieces = useMemo(() => {
    if (!gameRecord?.boardState) return [];
    return convertFromFirestoreBoard(gameRecord.boardState);
  }, [gameRecord?.boardState]);
  
  // Check if current user is a player in this game
  const isCurrentUserPlayer = useMemo(() => {
    if (!user?.uid) return false;
    return gameRecord.playerRed.uid === user.uid || gameRecord.playerBlue.uid === user.uid;
  }, [user?.uid, gameRecord.playerRed.uid, gameRecord.playerBlue.uid]);
  
  // Check if it's the current user's turn
  const isCurrentPlayerTurn = useMemo(() => {
    if (!isCurrentUserPlayer) return false;
    const currentUserColor = gameRecord.playerRed.uid === user?.uid ? 'red' : 'blue';
    return gameRecord.currentTurn === currentUserColor;
  }, [isCurrentUserPlayer, gameRecord.currentTurn, gameRecord.playerRed.uid, user?.uid]);
  
  // Apply floating animation to board
  useFrame(({ clock }) => {
    if (boardRef.current) {
      boardRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.05 + 0.05;
    }
  });
  
  // Handle keyboard navigation for online games
  useEffect(() => {
    if (!isCurrentPlayerTurn || readOnly) return;
    
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
          handleSquareClick(row, col);
        }
      }
    );
    
    const unsubscribeCancel = subscribeKeys(
      (state) => state.cancel,
      (pressed) => {
        if (pressed && selectedPiece) {
          setSelectedPiece(null);
          setValidMoves([]);
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
  }, [isCurrentPlayerTurn, readOnly, keyboardFocus, selectedPiece, subscribeKeys]);
  
  // Calculate valid moves for selected piece
  useEffect(() => {
    if (!selectedPiece || !isCurrentPlayerTurn || readOnly) {
      setValidMoves([]);
      return;
    }
    
    const piece = pieces.find(p => p.id === selectedPiece);
    if (!piece) {
      setValidMoves([]);
      return;
    }
    
    // Import and use the existing rules engine for move calculation
    import('@/lib/checkers/rules').then(({ getValidMoves }) => {
      const moves = getValidMoves(piece, pieces);
      setValidMoves(moves);
    });
  }, [selectedPiece, pieces, isCurrentPlayerTurn, readOnly]);
  
  // Handle square click
  const handleSquareClick = (row: number, col: number) => {
    if (readOnly || !isCurrentPlayerTurn) return;
    
    console.log(`Online square clicked: row=${row}, col=${col}`);
    
    // If we have a selected piece and this is a valid move
    if (selectedPiece && validMoves.some(move => move.row === row && move.col === col)) {
      const piece = pieces.find(p => p.id === selectedPiece);
      if (piece && onMoveAttempt) {
        const move = {
          from: { row: piece.position.row, col: piece.position.col },
          to: { row, col }
        };
        console.log('Online move attempt:', move);
        onMoveAttempt(move);
      }
      setSelectedPiece(null);
      setValidMoves([]);
    } else {
      // Try to select a piece at this position
      const pieceAtPosition = pieces.find(
        p => p.position.row === row && p.position.col === col
      );
      
      if (pieceAtPosition) {
        // Only allow selection of own pieces
        const currentUserColor = gameRecord.playerRed.uid === user?.uid ? 'red' : 'blue';
        if (pieceAtPosition.color === currentUserColor) {
          console.log('Online piece selected:', pieceAtPosition);
          setSelectedPiece(pieceAtPosition.id);
          onPieceSelect?.(pieceAtPosition.id);
        }
      } else if (selectedPiece) {
        // Deselect if clicking on empty square
        setSelectedPiece(null);
        setValidMoves([]);
      }
    }
  };
  
  // Handle piece click
  const handlePieceClick = (pieceId: string) => {
    if (readOnly || !isCurrentPlayerTurn) return;
    
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece) return;
    
    // Only allow selection of own pieces
    const currentUserColor = gameRecord.playerRed.uid === user?.uid ? 'red' : 'blue';
    if (piece.color === currentUserColor) {
      console.log('Online piece clicked:', piece);
      setSelectedPiece(pieceId);
      onPieceSelect?.(pieceId);
    }
  };
  
  // Get turn indicator color
  const getTurnIndicatorColor = () => {
    if (!isCurrentUserPlayer) return colors.text.secondary;
    if (isCurrentPlayerTurn) return colors.neon.cyan;
    return colors.neon.purple;
  };
  
  // Check if mobile
  const isMobile = useMemo(() => {
    return typeof window !== 'undefined' && window.matchMedia(`(max-width: 767px)`).matches;
  }, []);
  
  const boardRotation = useMemo(() => {
    return new THREE.Euler(0, 0, 0);
  }, []);
  
  return (
    <group>
      {/* Turn indicator */}
      {isCurrentUserPlayer && (
        <mesh position={[3.5, 0.5, -1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6, 0.5]} />
          <meshBasicMaterial 
            color={getTurnIndicatorColor()}
            transparent 
            opacity={0.7}
          />
        </mesh>
      )}
      
      {/* Main board group */}
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
              isValidMove={validMoves.some(move => move.row === row && move.col === col)}
              isKeyboardFocused={keyboardFocus.row === row && keyboardFocus.col === col}
              isHovered={hoveredSquare?.row === row && hoveredSquare?.col === col}
              onSquareClick={() => handleSquareClick(row, col)}
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
            onClick={() => handlePieceClick(piece.id)}
          />
        ))}
      </group>
      
      {/* Game status indicators */}
      {gameRecord.status === 'waiting' && (
        <mesh position={[3.5, 1, -0.5]}>
          <planeGeometry args={[4, 1]} />
          <meshBasicMaterial 
            color={colors.neon.cyan}
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}
      
      {gameRecord.status === 'completed' && (
        <mesh position={[3.5, 1, -0.5]}>
          <planeGeometry args={[4, 1]} />
          <meshBasicMaterial 
            color={gameRecord.winner === playerColor ? colors.neon.blue : colors.neon.pink}
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
};

export default OnlineBoard;