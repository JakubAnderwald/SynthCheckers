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
  const allMoves: Move[] = [];
  const piecesThatCanCapture = getPiecesThatCanCapture(pieces, color);
  
  // If captures are available, only return capture moves
  if (piecesThatCanCapture.length > 0) {
    for (const piece of piecesThatCanCapture) {
      const capturePositions = getCapturePositions(piece, pieces);
      
      for (const to of capturePositions) {
        // Calculate the captured piece position
        const capturedRow = (piece.position.row + to.row) / 2;
        const capturedCol = (piece.position.col + to.col) / 2;
        const capturedPiece = pieces.find(p => 
          p.position.row === capturedRow && 
          p.position.col === capturedCol
        );
        
        allMoves.push({
          from: piece.position,
          to,
          capturedPiece
        });
      }
    }
  } else {
    // Regular moves
    const piecesWithMoves = getAllValidMovesForPlayer(pieces, color);
    
    for (const { piece, moves } of piecesWithMoves) {
      for (const to of moves) {
        allMoves.push({
          from: piece.position,
          to
        });
      }
    }
  }
  
  return allMoves;
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
  
  // Determine search depth based on difficulty
  let depth = 1; // Use minimal depth for reliable, quick moves
  if (difficulty === 'medium') depth = 2;
  if (difficulty === 'hard') depth = 3;
  
  // Add randomness for easy difficulty
  if (difficulty === 'easy') {
    console.log("Easy mode - selecting random move");
    const allMoves = getAllMoves(pieces, aiColor);
    
    if (allMoves.length > 0) {
      console.log(`Found ${allMoves.length} possible moves for AI`);
      // Select from captures first if available
      const captureMoves = allMoves.filter(move => move.capturedPiece);
      
      if (captureMoves.length > 0) {
        console.log("Selecting random capture move");
        const randomIndex = Math.floor(Math.random() * captureMoves.length);
        return captureMoves[randomIndex];
      }
      
      // Otherwise select a random move
      const randomIndex = Math.floor(Math.random() * allMoves.length);
      return allMoves[randomIndex];
    }
    return null;
  }
  
  // For medium and hard, use minimax with appropriate depth
  console.log(`Using minimax with depth ${depth}`);
  const result = minimax(pieces, depth, -Infinity, Infinity, true, aiColor, difficulty);
  
  if (result.move) {
    console.log("Minimax selected move:", result.move, "with score:", result.score);
    return result.move;
  }
  
  console.log("No valid moves found for AI");
  return null;
};
