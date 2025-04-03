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

// This import ensures the window interface extension is included
import '../checkers/types';
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
  difficulty: 'medium',
  debugMode: false
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
      if (get().settings.musicEnabled && audioStore.backgroundMusic && !audioStore.isMuted) {
        console.log("Starting game music...");
        // Make sure we start from the beginning
        audioStore.backgroundMusic.currentTime = 0;
        // Volume for custom synthwave music
        audioStore.backgroundMusic.volume = 0.75; // Match the same volume throughout the app
        
        // Try to play the audio
        const playAudio = () => {
          if (audioStore.backgroundMusic) {
            audioStore.backgroundMusic.play().catch(err => {
              console.log("Audio play prevented in game start:", err);
              console.log("Will try again on next user interaction");
            });
          }
        };
        
        // Play immediately
        playAudio();
        
        // And also set up an event to try again on user interaction
        // This helps with browsers that require user interaction to play audio
        const tryPlayOnInteraction = () => {
          playAudio();
          // Remove the event listener after first use
          document.removeEventListener('click', tryPlayOnInteraction);
          document.removeEventListener('touchstart', tryPlayOnInteraction);
          document.removeEventListener('keydown', tryPlayOnInteraction);
        };
        
        document.addEventListener('click', tryPlayOnInteraction);
        document.addEventListener('touchstart', tryPlayOnInteraction);
        document.addEventListener('keydown', tryPlayOnInteraction);
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
      console.log('movePiece called with position:', position);
      
      const { 
        pieces, 
        selectedPiece, 
        currentPlayer, 
        gameMode, 
        settings,
        validMoves 
      } = get();
      
      console.log('Current state:', {
        currentPlayer,
        selectedPiece: selectedPiece ? {
          id: selectedPiece.id,
          position: selectedPiece.position,
          color: selectedPiece.color
        } : null,
        validMoves: validMoves.map(move => `${move.row},${move.col}`)
      });
      
      // Check if there's a selected piece
      if (!selectedPiece) {
        console.error('No piece selected!');
        return;
      }
      
      // Verify this is a valid move
      const isValidMove = validMoves.some(move => move.row === position.row && move.col === position.col);
      if (!isValidMove) {
        console.error('Invalid move!', position, 'not in valid moves:', validMoves);
        return;
      }
      
      console.log('Making move from', selectedPiece.position, 'to', position);
      const { newPieces, capturedPiece, becameKing } = makeMove(pieces, selectedPiece, position);
      console.log('Move completed:', { capturedPiece, becameKing });
      
      // Play sound effects with appropriate debugging
      const audioStore = useAudio.getState();
      if (settings.soundEnabled && !audioStore.isMuted) {
        if (capturedPiece) {
          console.log("Triggering capture sound effect");
          audioStore.playHit();
          // Try a direct play as well for redundancy 
          try {
            const tempSound = new Audio("/sounds/hit.mp3");
            tempSound.volume = 0.7;
            tempSound.play().catch(e => console.log("Direct hit sound error:", e));
          } catch (e) {
            console.error("Failed to create temp sound:", e);
          }
        } else if (becameKing) {
          console.log("Triggering king promotion sound effect");
          audioStore.playSuccess();
        } else {
          // Always play a sound on move for better feedback
          console.log("Triggering regular move sound");
          audioStore.playHit();
        }
      } else {
        console.log("Sound effects disabled or muted");
      }
      
      // Check if the piece can capture again
      const updatedPiece = newPieces.find(p => p.id === selectedPiece.id);
      
      // Can only continue if:
      // 1. A piece was captured
      // 2. The piece was NOT just promoted to a king (no extra move after promotion)
      // 3. There are additional capture moves available
      const canJumpAgain = updatedPiece && 
                          capturedPiece && 
                          !becameKing && 
                          canCaptureAgain(updatedPiece, newPieces);
      
      console.log(`Can jump again: ${canJumpAgain}, becameKing: ${becameKing}`);
      
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
          if (settings.soundEnabled && !audioStore.isMuted) {
            console.log("Playing game over success sound");
            audioStore.playSuccess();
            
            // Try a direct play as well for redundancy
            try {
              const tempSound = new Audio("/sounds/success.mp3");
              tempSound.volume = 0.8;
              tempSound.play().catch(e => console.log("Direct success sound error:", e));
            } catch (e) {
              console.error("Failed to create temp success sound:", e);
            }
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
            // Clear any existing timeouts to prevent multiple AI moves
            if (window.aiTurnTimeout) {
              clearTimeout(window.aiTurnTimeout);
            }
            
            window.aiTurnTimeout = setTimeout(() => {
              // Only proceed if we're still in AI turn state
              if (get().gameState === 'ai_turn') {
                get().aiTurn();
              }
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
      
      console.log("AI turn started");
      
      // Get AI's best move
      const aiMove = getAIMove(pieces, 'blue', settings.difficulty);
      
      if (aiMove) {
        console.log("AI selected move:", aiMove);
        
        const pieceToMove = getPieceAtPosition(pieces, aiMove.from);
        
        if (pieceToMove) {
          console.log("AI will move piece:", pieceToMove.id, "from", pieceToMove.position, "to", aiMove.to);
          
          // Calculate valid moves for the selected piece
          const mustCapturePieces = mustCapture(pieces, 'blue');
          const validMovesForPiece = getValidMoves(pieceToMove, pieces, mustCapturePieces);
          
          console.log("Valid moves for AI piece:", validMovesForPiece.map(move => `[${move.row},${move.col}]`));
          
          // Make sure the AI move is in the valid moves list
          const moveIsValid = validMovesForPiece.some(
            move => move.row === aiMove.to.row && move.col === aiMove.to.col
          );
          
          if (!moveIsValid) {
            console.error("AI selected an invalid move:", aiMove.to);
            return; // Don't proceed with an invalid move
          }
          
          // First select the piece with calculated valid moves
          set({
            selectedPiece: pieceToMove,
            pieces: pieces.map(p => ({
              ...p,
              isSelected: p.id === pieceToMove.id
            })),
            validMoves: validMovesForPiece // Set the valid moves so the move can be validated
          });
          
          // Then move it after a brief delay to visualize the selection
          setTimeout(() => {
            console.log("AI executing move now");
            // Make one single move
            get().movePiece(aiMove.to);
          }, 600); // Increased delay for better visualization
        }
      } else {
        console.log("AI could not find a valid move");
        
        // If AI can't move, check for win condition
        const hasValidMoves = getAllValidMovesForPlayer(pieces, 'blue').length > 0;
        
        if (!hasValidMoves) {
          console.log("AI has no valid moves, player wins!");
          
          set({
            winner: 'red',
            gameState: 'game_over'
          });
          
          // Play success sound for winning on AI defeat
          if (settings.soundEnabled) {
            console.log("Playing game over success sound (AI defeated)");
            const audioStore = useAudio.getState();
            audioStore.playSuccess();
            
            // Try a direct play as well for redundancy
            try {
              const tempSound = new Audio("/sounds/success.mp3");
              tempSound.volume = 0.8;
              tempSound.play().catch(e => console.log("Direct success sound error:", e));
            } catch (e) {
              console.error("Failed to create temp success sound:", e);
            }
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
      
      // Clear any pending AI turn timeouts
      if (window.aiTurnTimeout) {
        clearTimeout(window.aiTurnTimeout);
        window.aiTurnTimeout = undefined;
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
      const audioStore = useAudio.getState();
      const { gameState } = get();
      
      if (newSettings.musicEnabled !== undefined) {
        if (newSettings.musicEnabled && gameState !== 'menu') {
          console.log("Enabling game music from settings...");
          // Turn music on
          if (audioStore.backgroundMusic && !audioStore.isMuted) {
            // Make sure volume is consistent with App.tsx
            audioStore.backgroundMusic.volume = 0.75; // Volume for custom synthwave track
            console.log("Attempting to play music...");
            
            // Try to play the audio
            const playAudio = () => {
              if (audioStore.backgroundMusic) {
                audioStore.backgroundMusic.play().catch(err => {
                  console.log("Audio play prevented in settings:", err);
                  console.log("Will try again on next user interaction");
                });
              }
            };
            
            // Play immediately
            playAudio();
            
            // And also set up an event to try again on user interaction
            // This helps with browsers that require user interaction to play audio
            const tryPlayOnInteraction = () => {
              playAudio();
              // Remove the event listener after first use
              document.removeEventListener('click', tryPlayOnInteraction);
              document.removeEventListener('touchstart', tryPlayOnInteraction);
              document.removeEventListener('keydown', tryPlayOnInteraction);
            };
            
            document.addEventListener('click', tryPlayOnInteraction);
            document.addEventListener('touchstart', tryPlayOnInteraction);
            document.addEventListener('keydown', tryPlayOnInteraction);
          }
        } else {
          console.log("Disabling music from settings");
          // Turn music off
          if (audioStore.backgroundMusic) {
            audioStore.backgroundMusic.pause();
          }
        }
      }
    }
  }))
);
