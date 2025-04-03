export type PlayerType = 'player1' | 'player2' | 'ai';
export type PieceColor = 'red' | 'blue';
export type PieceType = 'normal' | 'king';
export type GameState = 'menu' | 'playing' | 'ai_turn' | 'game_over';
export type GameMode = 'single' | 'two_player';

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  id: string;
  color: PieceColor;
  type: PieceType;
  position: Position;
  isSelected: boolean;
}

export interface Move {
  from: Position;
  to: Position;
  capturedPiece?: Piece;
}

export interface GameSettings {
  musicEnabled: boolean;
  soundEnabled: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  debugMode: boolean;
}

export interface BoardState {
  pieces: Piece[];
  selectedPiece: Piece | null;
  validMoves: Position[];
  currentPlayer: PieceColor;
  gameState: GameState;
  gameMode: GameMode;
  winner: PieceColor | null;
  settingsOpen: boolean;
  settings: GameSettings;
}

// Declare window type extension for AI timeout
declare global {
  interface Window {
    aiTurnTimeout?: ReturnType<typeof setTimeout>;
  }
}
