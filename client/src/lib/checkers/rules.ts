import { Position, Piece, Move, PieceColor, PieceType } from './types';

// Board dimensions
export const BOARD_SIZE = 8;

// Check if a position is within the board boundaries
export const isValidPosition = (position: Position): boolean => {
  return position.row >= 0 && position.row < BOARD_SIZE && 
         position.col >= 0 && position.col < BOARD_SIZE;
};

// Check if a position is a valid square for a piece (black/dark squares only)
export const isValidSquare = (position: Position): boolean => {
  // Black/dark squares in our board have the same parity (odd+odd or even+even)
  return (position.row + position.col) % 2 === 0;
};

// Get piece at a specific position
export const getPieceAtPosition = (pieces: Piece[], position: Position): Piece | undefined => {
  return pieces.find(piece => 
    piece.position.row === position.row && 
    piece.position.col === position.col
  );
};

// Check if a square is empty
export const isSquareEmpty = (pieces: Piece[], position: Position): boolean => {
  return !getPieceAtPosition(pieces, position);
};

// Calculate possible moves for a piece
export const getValidMoves = (piece: Piece, pieces: Piece[], includeCapturesOnly = false): Position[] => {
  const validMoves: Position[] = [];
  const { color, type, position } = piece;
  
  // Direction of movement (red moves down, blue moves up)
  const direction = color === 'red' ? 1 : -1;
  
  // For regular moves (non-capturing)
  if (!includeCapturesOnly) {
    // Regular pieces can only move forward
    if (type === 'normal' || type === 'king') {
      // Forward left
      const forwardLeft: Position = { 
        row: position.row + direction, 
        col: position.col - 1 
      };
      
      // Forward right
      const forwardRight: Position = { 
        row: position.row + direction, 
        col: position.col + 1 
      };
      
      // Check if forward left is valid
      if (isValidPosition(forwardLeft) && isValidSquare(forwardLeft) && isSquareEmpty(pieces, forwardLeft)) {
        validMoves.push(forwardLeft);
      }
      
      // Check if forward right is valid
      if (isValidPosition(forwardRight) && isValidSquare(forwardRight) && isSquareEmpty(pieces, forwardRight)) {
        validMoves.push(forwardRight);
      }
    }
    
    // Kings can also move backward
    if (type === 'king') {
      // Backward left
      const backwardLeft: Position = { 
        row: position.row - direction, 
        col: position.col - 1 
      };
      
      // Backward right
      const backwardRight: Position = { 
        row: position.row - direction, 
        col: position.col + 1 
      };
      
      // Check if backward left is valid
      if (isValidPosition(backwardLeft) && isValidSquare(backwardLeft) && isSquareEmpty(pieces, backwardLeft)) {
        validMoves.push(backwardLeft);
      }
      
      // Check if backward right is valid
      if (isValidPosition(backwardRight) && isValidSquare(backwardRight) && isSquareEmpty(pieces, backwardRight)) {
        validMoves.push(backwardRight);
      }
    }
  }
  
  // For capturing moves
  const capturedPositions = getCapturePositions(piece, pieces);
  validMoves.push(...capturedPositions);
  
  return validMoves;
};

// Get all possible capture positions
export const getCapturePositions = (piece: Piece, pieces: Piece[]): Position[] => {
  const capturePositions: Position[] = [];
  const { color, type, position } = piece;
  const opponentColor = color === 'red' ? 'blue' : 'red';
  
  // Define the directions to check based on piece type
  let directions = [];
  if (type === 'normal') {
    // Regular pieces can only capture forward
    const direction = color === 'red' ? 1 : -1;
    directions = [
      { rowDelta: direction, colDelta: -1 }, // Forward left
      { rowDelta: direction, colDelta: 1 }   // Forward right
    ];
  } else {
    // Kings can capture in all four directions
    directions = [
      { rowDelta: 1, colDelta: -1 },  // Down left
      { rowDelta: 1, colDelta: 1 },   // Down right
      { rowDelta: -1, colDelta: -1 }, // Up left
      { rowDelta: -1, colDelta: 1 }   // Up right
    ];
  }
  
  // Check each direction
  for (const direction of directions) {
    const adjacentPos: Position = {
      row: position.row + direction.rowDelta,
      col: position.col + direction.colDelta
    };
    
    // Check if there's an opponent piece to capture
    if (isValidPosition(adjacentPos) && isValidSquare(adjacentPos)) {
      const adjacentPiece = getPieceAtPosition(pieces, adjacentPos);
      
      if (adjacentPiece && adjacentPiece.color === opponentColor) {
        // Check if we can land after the jump
        const landingPos: Position = {
          row: adjacentPos.row + direction.rowDelta,
          col: adjacentPos.col + direction.colDelta
        };
        
        if (isValidPosition(landingPos) && isValidSquare(landingPos) && isSquareEmpty(pieces, landingPos)) {
          capturePositions.push(landingPos);
        }
      }
    }
  }
  
  return capturePositions;
};

// Get all pieces that can capture
export const getPiecesThatCanCapture = (pieces: Piece[], playerColor: PieceColor): Piece[] => {
  return pieces
    .filter(piece => piece.color === playerColor)
    .filter(piece => getCapturePositions(piece, pieces).length > 0);
};

// Get all valid moves for a player
export const getAllValidMovesForPlayer = (pieces: Piece[], playerColor: PieceColor): {piece: Piece, moves: Position[]}[] => {
  const piecesThatCanCapture = getPiecesThatCanCapture(pieces, playerColor);
  
  // If there are pieces that can capture, only those are valid to move
  if (piecesThatCanCapture.length > 0) {
    return piecesThatCanCapture.map(piece => ({
      piece,
      moves: getCapturePositions(piece, pieces)
    }));
  }
  
  // Otherwise, all pieces with valid moves can be moved
  return pieces
    .filter(piece => piece.color === playerColor)
    .map(piece => ({
      piece,
      moves: getValidMoves(piece, pieces)
    }))
    .filter(({ moves }) => moves.length > 0);
};

// Make a move and return the new state
export const makeMove = (
  pieces: Piece[], 
  selectedPiece: Piece, 
  targetPosition: Position
): { 
  newPieces: Piece[], 
  capturedPiece: Piece | undefined,
  becameKing: boolean
} => {
  // Create new pieces array to modify
  const newPieces = [...pieces];
  let capturedPiece: Piece | undefined = undefined;
  let becameKing = false;
  
  // Find the selected piece in the new array
  const pieceToMove = newPieces.find(p => 
    p.id === selectedPiece.id
  );
  
  if (!pieceToMove) {
    return { newPieces, capturedPiece, becameKing };
  }
  
  // Check if this is a capture move
  const rowDiff = Math.abs(targetPosition.row - pieceToMove.position.row);
  const colDiff = Math.abs(targetPosition.col - pieceToMove.position.col);
  
  if (rowDiff === 2 && colDiff === 2) {
    // This is a capture move, find the captured piece
    const capturedRow = (pieceToMove.position.row + targetPosition.row) / 2;
    const capturedCol = (pieceToMove.position.col + targetPosition.col) / 2;
    
    const capturedPieceIndex = newPieces.findIndex(p => 
      p.position.row === capturedRow && p.position.col === capturedCol
    );
    
    if (capturedPieceIndex !== -1) {
      capturedPiece = newPieces[capturedPieceIndex];
      // Remove the captured piece
      newPieces.splice(capturedPieceIndex, 1);
    }
  }
  
  // Update the piece's position
  pieceToMove.position = targetPosition;
  pieceToMove.isSelected = false;
  
  // Check if the piece should be promoted to king
  if (pieceToMove.type !== 'king') {
    if ((pieceToMove.color === 'red' && targetPosition.row === BOARD_SIZE - 1) ||
        (pieceToMove.color === 'blue' && targetPosition.row === 0)) {
      pieceToMove.type = 'king';
      becameKing = true;
    }
  }
  
  return { newPieces, capturedPiece, becameKing };
};

// Check if a player has won
export const checkForWinner = (pieces: Piece[]): PieceColor | null => {
  const redPieces = pieces.filter(piece => piece.color === 'red');
  const bluePieces = pieces.filter(piece => piece.color === 'blue');
  
  if (redPieces.length === 0) {
    return 'blue';
  }
  
  if (bluePieces.length === 0) {
    return 'red';
  }
  
  // Check if a player has no valid moves left
  const redMoves = getAllValidMovesForPlayer(pieces, 'red');
  if (redMoves.length === 0 && redPieces.length > 0) {
    return 'blue';
  }
  
  const blueMoves = getAllValidMovesForPlayer(pieces, 'blue');
  if (blueMoves.length === 0 && bluePieces.length > 0) {
    return 'red';
  }
  
  return null;
};

// Initialize the board with pieces in starting positions
export const initializeBoard = (): Piece[] => {
  const pieces: Piece[] = [];
  
  // Create pieces for both players
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Only place pieces on valid squares (dark squares)
      if (isValidSquare({ row, col })) {
        let piece: Piece | null = null;
        
        // Blue pieces at the top
        if (row < 3) {
          piece = {
            id: `blue-${row}-${col}`,
            color: 'blue',
            type: 'normal',
            position: { row, col },
            isSelected: false
          };
        }
        // Red pieces at the bottom
        else if (row > 4) {
          piece = {
            id: `red-${row}-${col}`,
            color: 'red',
            type: 'normal',
            position: { row, col },
            isSelected: false
          };
        }
        
        if (piece) {
          pieces.push(piece);
        }
      }
    }
  }
  
  return pieces;
};

// Check if a player must capture with this piece
export const mustCapture = (pieces: Piece[], playerColor: PieceColor): boolean => {
  return getPiecesThatCanCapture(pieces, playerColor).length > 0;
};

// Check if a piece can make another capture after the first one
export const canCaptureAgain = (piece: Piece, pieces: Piece[]): boolean => {
  return getCapturePositions(piece, pieces).length > 0;
};
