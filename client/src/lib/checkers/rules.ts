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
  // Black/dark squares in our board have odd parity (odd+even or even+odd)
  return (position.row + position.col) % 2 === 1;
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
  
  console.log(`Finding valid moves for ${piece.id} at [${position.row},${position.col}], type: ${type}, color: ${color}`);
  console.log(`Include captures only: ${includeCapturesOnly}`);
  
  // Direction of movement (red moves up, blue moves down)
  const direction = color === 'red' ? -1 : 1;
  
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
      
      console.log(`Checking forward left: [${forwardLeft.row},${forwardLeft.col}]`);
      
      // Check if forward left is valid
      const flValid = isValidPosition(forwardLeft);
      const flValidSquare = isValidSquare(forwardLeft);
      const flEmpty = isSquareEmpty(pieces, forwardLeft);
      
      console.log(`- Valid position: ${flValid}, Valid square: ${flValidSquare}, Empty: ${flEmpty}`);
      
      if (flValid && flValidSquare && flEmpty) {
        console.log(`- Adding forward left as valid move`);
        validMoves.push(forwardLeft);
      }
      
      console.log(`Checking forward right: [${forwardRight.row},${forwardRight.col}]`);
      
      // Check if forward right is valid
      const frValid = isValidPosition(forwardRight);
      const frValidSquare = isValidSquare(forwardRight);
      const frEmpty = isSquareEmpty(pieces, forwardRight);
      
      console.log(`- Valid position: ${frValid}, Valid square: ${frValidSquare}, Empty: ${frEmpty}`);
      
      if (frValid && frValidSquare && frEmpty) {
        console.log(`- Adding forward right as valid move`);
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
      
      console.log(`Checking backward left: [${backwardLeft.row},${backwardLeft.col}]`);
      
      // Check if backward left is valid
      const blValid = isValidPosition(backwardLeft);
      const blValidSquare = isValidSquare(backwardLeft);
      const blEmpty = isSquareEmpty(pieces, backwardLeft);
      
      console.log(`- Valid position: ${blValid}, Valid square: ${blValidSquare}, Empty: ${blEmpty}`);
      
      if (blValid && blValidSquare && blEmpty) {
        console.log(`- Adding backward left as valid move`);
        validMoves.push(backwardLeft);
      }
      
      console.log(`Checking backward right: [${backwardRight.row},${backwardRight.col}]`);
      
      // Check if backward right is valid
      const brValid = isValidPosition(backwardRight);
      const brValidSquare = isValidSquare(backwardRight);
      const brEmpty = isSquareEmpty(pieces, backwardRight);
      
      console.log(`- Valid position: ${brValid}, Valid square: ${brValidSquare}, Empty: ${brEmpty}`);
      
      if (brValid && brValidSquare && brEmpty) {
        console.log(`- Adding backward right as valid move`);
        validMoves.push(backwardRight);
      }
    }
  }
  
  // For capturing moves
  console.log(`Checking for capture positions...`);
  const capturedPositions = getCapturePositions(piece, pieces);
  
  if (capturedPositions.length > 0) {
    console.log(`- Found ${capturedPositions.length} capture positions`);
    validMoves.push(...capturedPositions);
  } else {
    console.log(`- No capture positions found`);
  }
  
  console.log(`Total valid moves found: ${validMoves.length}`);
  return validMoves;
};

// Get all possible capture positions
export const getCapturePositions = (piece: Piece, pieces: Piece[]): Position[] => {
  const capturePositions: Position[] = [];
  const { color, type, position } = piece;
  const opponentColor = color === 'red' ? 'blue' : 'red';
  
  console.log(`Finding capture positions for ${piece.id}, color: ${color}, type: ${type}`);
  
  // Define the directions to check based on piece type
  let directions = [];
  if (type === 'normal') {
    // Regular pieces can capture in all directions (both forward and backward)
    directions = [
      { rowDelta: 1, colDelta: -1 },  // Down left
      { rowDelta: 1, colDelta: 1 },   // Down right
      { rowDelta: -1, colDelta: -1 }, // Up left
      { rowDelta: -1, colDelta: 1 }   // Up right
    ];
    console.log(`Normal piece, checking all 4 directions for captures`);
  } else {
    // Kings can capture in all four directions (same as normal pieces for captures)
    directions = [
      { rowDelta: 1, colDelta: -1 },  // Down left
      { rowDelta: 1, colDelta: 1 },   // Down right
      { rowDelta: -1, colDelta: -1 }, // Up left
      { rowDelta: -1, colDelta: 1 }   // Up right
    ];
    console.log(`King piece, checking all 4 directions`);
  }
  
  // Check each direction
  for (const direction of directions) {
    const adjacentPos: Position = {
      row: position.row + direction.rowDelta,
      col: position.col + direction.colDelta
    };
    
    console.log(`Checking adjacent position: [${adjacentPos.row},${adjacentPos.col}]`);
    
    // Check if there's an opponent piece to capture
    const adjValid = isValidPosition(adjacentPos);
    const adjValidSquare = isValidSquare(adjacentPos);
    
    console.log(`- Valid position: ${adjValid}, Valid square: ${adjValidSquare}`);
    
    if (adjValid && adjValidSquare) {
      const adjacentPiece = getPieceAtPosition(pieces, adjacentPos);
      
      if (adjacentPiece) {
        console.log(`- Found piece: ${adjacentPiece.id}, color: ${adjacentPiece.color}`);
      } else {
        console.log(`- No piece found at this position`);
      }
      
      if (adjacentPiece && adjacentPiece.color === opponentColor) {
        console.log(`- Found opponent piece to capture`);
        
        // Check if we can land after the jump
        const landingPos: Position = {
          row: adjacentPos.row + direction.rowDelta,
          col: adjacentPos.col + direction.colDelta
        };
        
        console.log(`- Checking landing position: [${landingPos.row},${landingPos.col}]`);
        
        const landValid = isValidPosition(landingPos);
        const landValidSquare = isValidSquare(landingPos);
        const landEmpty = isSquareEmpty(pieces, landingPos);
        
        console.log(`- Landing valid: ${landValid}, Valid square: ${landValidSquare}, Empty: ${landEmpty}`);
        
        if (landValid && landValidSquare && landEmpty) {
          console.log(`- Adding capture move to [${landingPos.row},${landingPos.col}]`);
          capturePositions.push(landingPos);
        }
      }
    }
  }
  
  console.log(`Total capture positions found: ${capturePositions.length}`);
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
    console.log(`Checking king promotion: ${pieceToMove.color} at row ${targetPosition.row}`);
    if ((pieceToMove.color === 'red' && targetPosition.row === 0) ||
        (pieceToMove.color === 'blue' && targetPosition.row === BOARD_SIZE - 1)) {
      console.log(`PROMOTING TO KING: ${pieceToMove.id}`);
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
  
  console.log("Initializing FULL CHECKERS board...");
  
  // In standard checkers, each player starts with 12 pieces on dark squares
  // in the first three rows closest to their side
  
  // Create BLUE PIECES (top of board)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Only place pieces on dark squares
      if (isValidSquare({ row, col })) {
        const piece = {
          id: `blue-${row}-${col}`,
          color: 'blue' as const,
          type: 'normal' as const,
          position: { row, col },
          isSelected: false
        };
        console.log(`Creating blue piece at [${row},${col}]`);
        pieces.push(piece);
      }
    }
  }
  
  // Create RED PIECES (bottom of board)
  for (let row = BOARD_SIZE - 3; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Only place pieces on dark squares
      if (isValidSquare({ row, col })) {
        const piece = {
          id: `red-${row}-${col}`,
          color: 'red' as const,
          type: 'normal' as const,
          position: { row, col },
          isSelected: false
        };
        console.log(`Creating red piece at [${row},${col}]`);
        pieces.push(piece);
      }
    }
  }
  
  console.log(`Total pieces created: ${pieces.length} (${pieces.filter(p => p.color === 'red').length} red, ${pieces.filter(p => p.color === 'blue').length} blue)`);
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
