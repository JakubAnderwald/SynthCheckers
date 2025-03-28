import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { 
  BoardState, 
  Piece, 
  Position, 
  PieceColor, 
  GameMode, 
  GameState,
  GameSettings
} from "../checkers/types";
import { 
  initializeBoard, 
  getValidMoves, 
  makeMove, 
  checkForWinner,
  mustCapture,
  canCaptureAgain,
  getPieceAtPosition,
  getAllValidMovesForPlayer
} from "../checkers/rules";
import { getAIMove } from "../checkers/ai";
import { useAudio } from "./useAudio";

const initialSettings: GameSettings = {
  musicEnabled: true,
  soundEnabled: true,
  difficulty: 'medium'
};

const initialState: BoardState = {
  pieces: [],
  selectedPiece: null,
  validMoves: [],
  currentPlayer: 'red', // Red always goes first
  gameState: 'menu',
  gameMode: 'single',
  winner: null,
  settingsOpen: false,
  settings: initialSettings
};

export const useCheckersStore = create<BoardState & {
  // Game Actions
  initGame: (mode: GameMode) => void;
  selectPiece: (piece: Piece) => void;
  movePiece: (position: Position) => void;
  resetSelection: () => void;
  aiTurn: () => void;
  returnToMenu: () => void;
  
  // Settings
  toggleSettings: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
}>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    initGame: (mode) => {
      set({
        pieces: initializeBoard(),
        selectedPiece: null,
        validMoves: [],
        currentPlayer: 'red',
        gameState: 'playing',
        gameMode: mode,
        winner: null
      });
      
      // Play background music when game starts
      const audioStore = useAudio.getState();
      if (get().settings.musicEnabled && audioStore.backgroundMusic) {
        audioStore.backgroundMusic.currentTime = 0;
        audioStore.backgroundMusic.play().catch(err => console.log("Audio play prevented:", err));
      }
    },
    
    selectPiece: (piece) => {
      const { pieces, currentPlayer, gameState } = get();
      
      // Can only select pieces during playing state
      if (gameState !== 'playing') return;
      
      // Can only select own pieces
      if (piece.color !== currentPlayer) return;
      
      // Check if there are mandatory captures
      const mustCapturePieces = mustCapture(pieces, currentPlayer);
      const pieceCanCapture = getValidMoves(piece, pieces, true).length > 0;
      
      // If there are pieces that must capture, only allow selecting those
      if (mustCapturePieces && !pieceCanCapture) return;
      
      // Select the piece and calculate valid moves
      const validMoves = getValidMoves(piece, pieces, mustCapturePieces);
      
      // Update state with the selected piece and valid moves
      set({
        selectedPiece: piece,
        validMoves,
        pieces: pieces.map(p => ({
          ...p,
          isSelected: p.id === piece.id
        }))
      });
    },
    
    movePiece: (position) => {
      const { 
        pieces, 
        selectedPiece, 
        currentPlayer, 
        gameMode, 
        settings 
      } = get();
      
      if (!selectedPiece) return;
      
      const { newPieces, capturedPiece, becameKing } = makeMove(pieces, selectedPiece, position);
      
      // Play sound effects
      const audioStore = useAudio.getState();
      if (settings.soundEnabled) {
        if (capturedPiece) {
          audioStore.playHit();
        } else if (becameKing) {
          audioStore.playSuccess();
        }
      }
      
      // Check if the piece can capture again
      const updatedPiece = newPieces.find(p => p.id === selectedPiece.id);
      const canJumpAgain = updatedPiece && capturedPiece && canCaptureAgain(updatedPiece, newPieces);
      
      if (canJumpAgain) {
        // Same player continues if multiple captures are possible
        set({
          pieces: newPieces,
          selectedPiece: updatedPiece,
          validMoves: getValidMoves(updatedPiece, newPieces, true)
        });
      } else {
        // Switch player
        const nextPlayer: PieceColor = currentPlayer === 'red' ? 'blue' : 'red';
        
        // Check for a winner
        const winner = checkForWinner(newPieces);
        
        if (winner) {
          set({
            pieces: newPieces,
            selectedPiece: null,
            validMoves: [],
            winner,
            gameState: 'game_over'
          });
          
          // Play success sound for winning
          if (settings.soundEnabled) {
            audioStore.playSuccess();
          }
        } else {
          // No winner yet, continue the game
          set({
            pieces: newPieces,
            selectedPiece: null,
            validMoves: [],
            currentPlayer: nextPlayer,
            gameState: gameMode === 'single' && nextPlayer === 'blue' ? 'ai_turn' : 'playing'
          });
          
          // If it's AI's turn in single player mode, trigger AI move
          if (gameMode === 'single' && nextPlayer === 'blue') {
            // Add a small delay to make the AI move feel more natural
            setTimeout(() => {
              get().aiTurn();
            }, 800);
          }
        }
      }
    },
    
    resetSelection: () => {
      set(state => ({
        selectedPiece: null,
        validMoves: [],
        pieces: state.pieces.map(p => ({
          ...p,
          isSelected: false
        }))
      }));
    },
    
    aiTurn: () => {
      const { pieces, settings } = get();
      
      // Get AI's best move
      const aiMove = getAIMove(pieces, 'blue', settings.difficulty);
      
      if (aiMove) {
        const pieceToMove = getPieceAtPosition(pieces, aiMove.from);
        
        if (pieceToMove) {
          // First select the piece
          set({
            selectedPiece: pieceToMove,
            pieces: pieces.map(p => ({
              ...p,
              isSelected: p.id === pieceToMove.id
            }))
          });
          
          // Then move it after a brief delay to visualize the selection
          setTimeout(() => {
            get().movePiece(aiMove.to);
          }, 400);
        }
      } else {
        // If AI can't move, check for win condition
        const hasValidMoves = getAllValidMovesForPlayer(pieces, 'blue').length > 0;
        
        if (!hasValidMoves) {
          set({
            winner: 'red',
            gameState: 'game_over'
          });
          
          // Play success sound for winning
          if (settings.soundEnabled) {
            useAudio.getState().playSuccess();
          }
        }
      }
    },
    
    returnToMenu: () => {
      // Stop the background music
      const audioStore = useAudio.getState();
      if (audioStore.backgroundMusic) {
        audioStore.backgroundMusic.pause();
      }
      
      // Reset game state
      set({
        ...initialState,
        settings: get().settings // Keep current settings
      });
    },
    
    toggleSettings: () => {
      set(state => ({ settingsOpen: !state.settingsOpen }));
    },
    
    updateSettings: (newSettings) => {
      set(state => ({
        settings: {
          ...state.settings,
          ...newSettings
        }
      }));
      
      // Handle music toggling
      const { settings } = get();
      const audioStore = useAudio.getState();
      
      if (newSettings.musicEnabled !== undefined) {
        if (newSettings.musicEnabled && settings.musicEnabled && get().gameState !== 'menu') {
          // Turn music on
          if (audioStore.backgroundMusic) {
            audioStore.backgroundMusic.play().catch(err => console.log("Audio play prevented:", err));
          }
        } else {
          // Turn music off
          if (audioStore.backgroundMusic) {
            audioStore.backgroundMusic.pause();
          }
        }
      }
    }
  }))
);
