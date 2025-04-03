import { Piece, Position, PieceColor, Move } from './types';
import { 
  getAllValidMovesForPlayer, 
  getPiecesThatCanCapture,
  makeMove,
  getCapturePositions
} from './rules';

// Piece value weights
const PIECE_VALUES = {
  normal: 1,
  king: 2,
};

// Position value - encourage advancement and edge control
const getPositionValue = (position: Position, color: PieceColor): number => {
  const { row } = position;
  
  // Favor positions closer to the opposite side for promotion
  const promotionValue = color === 'red' ? row / 7 : (7 - row) / 7;
  
  // Favor center and edges slightly
  const col = position.col;
  const centerValue = col >= 2 && col <= 5 ? 0.1 : 0;
  const edgeValue = (col === 0 || col === 7) ? 0.05 : 0;
  
  return promotionValue + centerValue + edgeValue;
};

// Evaluate the board state from the perspective of the given player
const evaluateBoard = (pieces: Piece[], color: PieceColor): number => {
  let score = 0;
  
  // Count pieces and their values
  for (const piece of pieces) {
    const pieceValue = PIECE_VALUES[piece.type];
    const positionValue = getPositionValue(piece.position, piece.color);
    
    if (piece.color === color) {
      score += pieceValue + positionValue;
    } else {
      score -= pieceValue + positionValue;
    }
  }
  
  return score;
};

// Helper to get all possible moves including captures
const getAllMoves = (pieces: Piece[], color: PieceColor): Move[] => {
  // Use the same validated move logic for consistency
  const piecesWithValidMoves = getAllValidMovesForPlayer(pieces, color);
  const allValidMoves: Move[] = [];
  
  for (const { piece, moves } of piecesWithValidMoves) {
    for (const to of moves) {
      // Calculate if this is a capture move
      let capturedPiece: Piece | undefined;
      
      // Check if this is a capture move by examining if it jumps over a piece
      if (Math.abs(piece.position.row - to.row) > 1) {
        const midRow = (piece.position.row + to.row) / 2;
        const midCol = (piece.position.col + to.col) / 2;
        capturedPiece = pieces.find(p => 
          p.position.row === midRow && 
          p.position.col === midCol &&
          p.color !== piece.color
        );
      }
      
      allValidMoves.push({
        from: piece.position,
        to,
        capturedPiece
      });
    }
  }
  
  return allValidMoves;
};

// Minimax algorithm with alpha-beta pruning
const minimax = (
  pieces: Piece[],
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  color: PieceColor,
  difficulty: 'easy' | 'medium' | 'hard'
): { score: number, move?: Move } => {
  // Base case: depth reached or game over
  if (depth === 0) {
    return { score: evaluateBoard(pieces, color) };
  }
  
  const opponentColor: PieceColor = color === 'red' ? 'blue' : 'red';
  const currentColor = maximizingPlayer ? color : opponentColor;
  
  const allMoves = getAllMoves(pieces, currentColor);
  
  // If no moves are available, return a very negative/positive score
  if (allMoves.length === 0) {
    return {
      score: maximizingPlayer ? -1000 : 1000
    };
  }
  
  let bestMove: Move | undefined;
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    
    for (const move of allMoves) {
      // Find the actual piece object
      const pieceToMove = pieces.find(p => 
        p.position.row === move.from.row && 
        p.position.col === move.from.col
      );
      
      if (!pieceToMove) continue;
      
      // Make the move
      const { newPieces } = makeMove(
        [...pieces], 
        pieceToMove, 
        move.to
      );
      
      // Recursively evaluate the resulting position
      const evalResult = minimax(newPieces, depth - 1, alpha, beta, false, color, difficulty);
      
      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = move;
      }
      
      alpha = Math.max(alpha, maxEval);
      if (beta <= alpha) {
        break; // Beta cutoff
      }
    }
    
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    
    for (const move of allMoves) {
      // Find the actual piece object
      const pieceToMove = pieces.find(p => 
        p.position.row === move.from.row && 
        p.position.col === move.from.col
      );
      
      if (!pieceToMove) continue;
      
      // Make the move
      const { newPieces } = makeMove(
        [...pieces], 
        pieceToMove, 
        move.to
      );
      
      // Recursively evaluate the resulting position
      const evalResult = minimax(newPieces, depth - 1, alpha, beta, true, color, difficulty);
      
      if (evalResult.score < minEval) {
        minEval = evalResult.score;
        bestMove = move;
      }
      
      beta = Math.min(beta, minEval);
      if (beta <= alpha) {
        break; // Alpha cutoff
      }
    }
    
    return { score: minEval, move: bestMove };
  }
};

// Get the best move for the AI player
export const getAIMove = (
  pieces: Piece[], 
  aiColor: PieceColor,
  difficulty: 'easy' | 'medium' | 'hard'
): Move | null => {
  console.log(`Finding AI move for ${aiColor} with difficulty ${difficulty}`);
  
  // Get all valid moves using the same logic as the game
  const piecesWithValidMoves = getAllValidMovesForPlayer(pieces, aiColor);
  
  // If no valid moves, return null
  if (piecesWithValidMoves.length === 0) {
    console.log("No valid moves found for AI");
    return null;
  }
  
  // Convert to the Move format for processing
  const allValidMoves: Move[] = [];
  for (const { piece, moves } of piecesWithValidMoves) {
    for (const to of moves) {
      // Calculate if this is a capture move
      let capturedPiece: Piece | undefined;
      
      // Check if this is a capture move by examining if it jumps over a piece
      if (Math.abs(piece.position.row - to.row) > 1) {
        const midRow = (piece.position.row + to.row) / 2;
        const midCol = (piece.position.col + to.col) / 2;
        capturedPiece = pieces.find(p => 
          p.position.row === midRow && 
          p.position.col === midCol &&
          p.color !== piece.color
        );
      }
      
      allValidMoves.push({
        from: piece.position,
        to,
        capturedPiece
      });
    }
  }
  
  console.log(`Found ${allValidMoves.length} verified valid moves for AI`);
  
  // No valid moves
  if (allValidMoves.length === 0) {
    return null;
  }
  
  // Determine search depth based on difficulty
  let depth = 1; // Use minimal depth for reliable, quick moves
  if (difficulty === 'medium') depth = 2;
  if (difficulty === 'hard') depth = 3;
  
  // Add randomness for easy difficulty
  if (difficulty === 'easy') {
    console.log("Easy mode - selecting random move");
    
    // Select from captures first if available
    const captureMoves = allValidMoves.filter(move => move.capturedPiece);
    
    if (captureMoves.length > 0) {
      console.log("Selecting random capture move");
      const randomIndex = Math.floor(Math.random() * captureMoves.length);
      const selectedMove = captureMoves[randomIndex];
      console.log("AI selected move:", selectedMove);
      return selectedMove;
    }
    
    // Otherwise select a random move
    const randomIndex = Math.floor(Math.random() * allValidMoves.length);
    const selectedMove = allValidMoves[randomIndex];
    console.log("AI selected move:", selectedMove);
    return selectedMove;
  }
  
  // For medium and hard, use minimax with appropriate depth
  console.log(`Using minimax with depth ${depth}`);
  const result = minimax(pieces, depth, -Infinity, Infinity, true, aiColor, difficulty);
  
  if (result.move) {
    console.log("Minimax selected move:", result.move, "with score:", result.score);
    
    // Verify the minimax move is valid
    const isValidMove = allValidMoves.some(
      move => move.from.row === result.move!.from.row && 
              move.from.col === result.move!.from.col &&
              move.to.row === result.move!.to.row && 
              move.to.col === result.move!.to.col
    );
    
    if (isValidMove) {
      return result.move;
    } else {
      console.log("Minimax selected an invalid move, using a random valid move instead");
      const randomIndex = Math.floor(Math.random() * allValidMoves.length);
      return allValidMoves[randomIndex];
    }
  }
  
  // If minimax failed, fallback to a random valid move
  console.log("Minimax failed, selecting a random valid move");
  const randomIndex = Math.floor(Math.random() * allValidMoves.length);
  return allValidMoves[randomIndex];
};
