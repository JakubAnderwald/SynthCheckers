import { BoardStateSnapshot, PieceState, GameRules, GameMove } from '@/types/firestore';
import { Piece, Position, PieceColor } from '@/lib/checkers/types';
import { BOARD_SIZE } from '@/lib/checkers/rules';

/**
 * Convert local game board state to Firestore-compatible format
 */
export function convertToFirestoreBoard(pieces: Piece[], currentPlayer: PieceColor): BoardStateSnapshot {
  const firestorePieces: PieceState[] = pieces.map(piece => ({
    id: piece.id,
    color: piece.color,
    type: piece.type,
    position: [piece.position.row, piece.position.col],
    canMove: true, // This would be calculated based on valid moves
    threatLevel: 0, // This would be calculated by AI evaluation
  }));

  const gameStateHash = generateGameStateHash(firestorePieces, currentPlayer);

  return {
    pieces: firestorePieces,
    currentPlayer,
    mustCapture: false, // This would be calculated from rules
    kingPromotions: [], // Track king promotions separately
    gameStateHash,
    timestamp: new Date() as any, // Will be converted to Firestore Timestamp
  };
}

/**
 * Convert Firestore board state to local game format
 */
export function convertFromFirestoreBoard(boardState: BoardStateSnapshot): Piece[] {
  return boardState.pieces.map(piece => ({
    id: piece.id,
    color: piece.color,
    type: piece.type,
    position: {
      row: piece.position[0],
      col: piece.position[1],
    },
    isSelected: false,
  }));
}

/**
 * Generate a hash of the current game state for validation
 */
export function generateGameStateHash(pieces: PieceState[], currentPlayer: PieceColor): string {
  const stateString = JSON.stringify({
    pieces: pieces.map(p => ({
      id: p.id,
      color: p.color,
      type: p.type,
      position: p.position,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    currentPlayer,
  });
  
  // Simple hash function - in production, use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < stateString.length; i++) {
    const char = stateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(16);
}

/**
 * Validate if a game state is consistent
 */
export function validateGameState(boardState: BoardStateSnapshot): boolean {
  const calculatedHash = generateGameStateHash(boardState.pieces, boardState.currentPlayer);
  return calculatedHash === boardState.gameStateHash;
}

/**
 * Get default game rules for standard checkers
 */
export function getDefaultGameRules(): GameRules {
  return {
    boardSize: BOARD_SIZE,
    forcedCapture: true,
    flyingKings: true,
    multipleJumps: true,
    backwardCaptures: false,
    drawAfterMoves: 50, // 50 moves without capture = draw
  };
}

/**
 * Convert a local move to Firestore move format
 */
export function convertMoveToFirestore(
  move: { from: Position; to: Position; capturedPiece?: Piece },
  player: PieceColor,
  moveNumber: number,
  timeSpent: number,
  boardStateAfter: BoardStateSnapshot
): Omit<GameMove, 'timestamp'> {
  return {
    moveNumber,
    player,
    from: [move.from.row, move.from.col],
    to: [move.to.row, move.to.col],
    captures: move.capturedPiece ? [[move.capturedPiece.position.row, move.capturedPiece.position.col]] : undefined,
    promotedToKing: false, // This would be determined by the move logic
    timeSpent,
    boardStateAfter: boardStateAfter.gameStateHash,
    isValid: true,
    moveNotation: generateMoveNotation(move),
  };
}

/**
 * Generate human-readable move notation
 */
export function generateMoveNotation(move: { from: Position; to: Position; capturedPiece?: Piece }): string {
  const fromNotation = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row}`;
  const toNotation = `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;
  
  if (move.capturedPiece) {
    return `${fromNotation}x${toNotation}`;
  } else {
    return `${fromNotation}-${toNotation}`;
  }
}

/**
 * Check if a player has valid moves available
 */
export function hasValidMoves(pieces: PieceState[], player: PieceColor): boolean {
  const playerPieces = pieces.filter(p => p.color === player);
  return playerPieces.some(piece => piece.canMove);
}

/**
 * Count pieces for each player
 */
export function countPieces(pieces: PieceState[]): { red: number; blue: number } {
  const red = pieces.filter(p => p.color === 'red').length;
  const blue = pieces.filter(p => p.color === 'blue').length;
  
  return { red, blue };
}

/**
 * Determine game winner based on current board state
 */
export function determineWinner(boardState: BoardStateSnapshot): 'red' | 'blue' | 'draw' | null {
  const pieceCounts = countPieces(boardState.pieces);
  
  // If a player has no pieces, they lose
  if (pieceCounts.red === 0) return 'blue';
  if (pieceCounts.blue === 0) return 'red';
  
  // If current player has no valid moves, they lose
  if (!hasValidMoves(boardState.pieces, boardState.currentPlayer)) {
    return boardState.currentPlayer === 'red' ? 'blue' : 'red';
  }
  
  // Check for insufficient material (rare in checkers)
  if (pieceCounts.red <= 1 && pieceCounts.blue <= 1) {
    return 'draw';
  }
  
  return null; // Game continues
}