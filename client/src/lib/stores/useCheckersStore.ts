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
  getAllValidMovesForPlayer,
  getCapturePositions
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
      
      // Debug: Log state of the piece and board before checking for chain captures
      console.log(`MULTI-CAPTURE DEBUG: Piece ID ${selectedPiece.id}`);
      console.log(`MULTI-CAPTURE DEBUG: Found updated piece:`, updatedPiece);
      console.log(`MULTI-CAPTURE DEBUG: Current player:`, currentPlayer);
      console.log(`MULTI-CAPTURE DEBUG: Game state:`, get().gameState);
      console.log(`MULTI-CAPTURE DEBUG: Captured piece:`, capturedPiece);
      console.log(`MULTI-CAPTURE DEBUG: Became king:`, becameKing);
      
      // Can only continue if:
      // 1. A piece was captured
      // 2. The piece was NOT just promoted to a king (no extra move after promotion)
      // 3. There are additional capture moves available
      const canJumpAgain = updatedPiece && 
                          capturedPiece && 
                          !becameKing && 
                          canCaptureAgain(updatedPiece, newPieces);
      
      // Debug: Log the capture positions if relevant
      if (updatedPiece && capturedPiece) {
        console.log(`MULTI-CAPTURE DEBUG: Possible capture positions:`, 
          getCapturePositions(updatedPiece, newPieces));
      }
      
      console.log(`MULTI-CAPTURE DEBUG: Can jump again: ${canJumpAgain}`);
      
      if (canJumpAgain) {
        // Same player continues if multiple captures are possible
        const updatedValidMoves = getValidMoves(updatedPiece, newPieces, true);
        console.log(`MULTI-CAPTURE DEBUG: Setting up for chain capture, valid moves:`, updatedValidMoves);
        
        set({
          pieces: newPieces,
          selectedPiece: updatedPiece,
          validMoves: updatedValidMoves
        });
        
        // If it's the AI's turn and it has another capture
        if (currentPlayer === 'blue' && gameMode === 'single') {
          console.log(`MULTI-CAPTURE DEBUG: AI has another capture available, will execute it shortly`);
          
          // Set game state back to AI_TURN to ensure our AI handling logic triggers
          set(state => ({
            ...state,
            gameState: 'ai_turn'
          }));
          
          // Force an immediate AI turn to handle the chain capture
          // Clear any existing timeouts first
          if (window.aiTurnTimeout) {
            clearTimeout(window.aiTurnTimeout);
          }
          
          window.aiTurnTimeout = setTimeout(() => {
            console.log(`MULTI-CAPTURE DEBUG: Executing AI chain capture now`);
            get().aiTurn();
          }, 800); // Matched with the normal AI turn delay
        }
      } else {
        // Switch player
        const nextPlayer: PieceColor = currentPlayer === 'red' ? 'blue' : 'red';
        
        // Check for a winner
        const winner = checkForWinner(newPieces);
        
        if (winner) {
          console.log(`MULTI-CAPTURE DEBUG: Game over, winner: ${winner}`);
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
          console.log(`MULTI-CAPTURE DEBUG: Moving to next player: ${nextPlayer}`);
          const newGameState = gameMode === 'single' && nextPlayer === 'blue' ? 'ai_turn' : 'playing';
          
          set({
            pieces: newPieces,
            selectedPiece: null,
            validMoves: [],
            currentPlayer: nextPlayer,
            gameState: newGameState
          });
          
          // If it's AI's turn in single player mode, trigger AI move
          if (gameMode === 'single' && nextPlayer === 'blue') {
            console.log(`MULTI-CAPTURE DEBUG: Starting new AI turn after delay`);
            
            // Add a small delay to make the AI move feel more natural
            // Clear any existing timeouts to prevent multiple AI moves
            if (window.aiTurnTimeout) {
              clearTimeout(window.aiTurnTimeout);
            }
            
            window.aiTurnTimeout = setTimeout(() => {
              // Only proceed if we're still in AI turn state
              if (get().gameState === 'ai_turn') {
                console.log(`MULTI-CAPTURE DEBUG: Executing new AI turn now`);
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
      const { pieces, settings, selectedPiece, gameState, validMoves } = get();
      
      console.log("AI TURN DEBUG: -------- AI TURN STARTED --------");
      console.log("AI TURN DEBUG: Game state:", gameState);
      console.log("AI TURN DEBUG: Selected piece:", selectedPiece);
      console.log("AI TURN DEBUG: Valid moves:", validMoves);
      
      // If there's already a selected piece (chain capture scenario), use it 
      if (selectedPiece && selectedPiece.color === 'blue') {
        console.log("AI TURN DEBUG: Chain capture scenario detected");
        console.log("AI TURN DEBUG: Piece ID:", selectedPiece.id);
        console.log("AI TURN DEBUG: Piece position:", selectedPiece.position);
        console.log("AI TURN DEBUG: Piece type:", selectedPiece.type);
        
        // Get valid capture moves for this piece
        const validCaptureMoves = getValidMoves(selectedPiece, pieces, true);
        console.log("AI TURN DEBUG: Valid capture moves:", validCaptureMoves);
        
        if (validCaptureMoves.length > 0) {
          console.log("AI TURN DEBUG: Found valid capture moves for chain capture");
          
          // Choose a capture move (either random for easy, or smart for medium/hard)
          let movePosition;
          
          if (settings.difficulty === 'easy') {
            // Random selection for easy mode
            const randomMoveIndex = Math.floor(Math.random() * validCaptureMoves.length);
            movePosition = validCaptureMoves[randomMoveIndex];
            console.log("AI TURN DEBUG: Using random selection for easy mode:", movePosition);
          } else {
            // For medium/hard, choose first available capture (could be enhanced with better logic)
            movePosition = validCaptureMoves[0];
            console.log("AI TURN DEBUG: Using first available for medium/hard mode:", movePosition);
          }
          
          console.log("AI TURN DEBUG: Will continue chain capture to:", movePosition);
          
          // Execute the move after a brief delay
          setTimeout(() => {
            console.log("AI TURN DEBUG: Executing chain capture move now");
            get().movePiece(movePosition);
          }, 600);
          
          return;
        } else {
          console.log("AI TURN DEBUG: No valid capture moves found for chain capture!");
        }
      } else {
        console.log("AI TURN DEBUG: Not a chain capture scenario");
        if (selectedPiece) {
          console.log("AI TURN DEBUG: Selected piece color:", selectedPiece.color);
        }
      }
      
      // Otherwise, find a new move
      // Find all valid moves for the AI (blue pieces)
      const validMovesInfo = getAllValidMovesForPlayer(pieces, 'blue');
      
      if (validMovesInfo.length === 0) {
        console.log("AI has no valid moves, player wins!");
        
        set({
          winner: 'red',
          gameState: 'game_over'
        });
        
        // Play success sound for winning
        if (settings.soundEnabled) {
          console.log("Playing game over success sound");
          const audioStore = useAudio.getState();
          audioStore.playSuccess();
        }
        return;
      }
      
      // Choose a piece and move based on difficulty
      let pieceToMove, movePosition;
      
      if (settings.difficulty === 'easy') {
        // Choose a random piece and move
        const randomPieceIndex = Math.floor(Math.random() * validMovesInfo.length);
        const { piece, moves } = validMovesInfo[randomPieceIndex];
        
        // Choose a random move for this piece
        const randomMoveIndex = Math.floor(Math.random() * moves.length);
        movePosition = moves[randomMoveIndex];
        pieceToMove = piece;
      } else {
        // For medium and hard, prioritize capture moves
        // Find pieces that can capture
        const captureMovesInfo = validMovesInfo.filter(
          info => info.moves.some(move => 
            Math.abs(move.row - info.piece.position.row) > 1
          )
        );
        
        if (captureMovesInfo.length > 0) {
          // Choose first piece that can capture (or random for variety)
          const { piece, moves } = captureMovesInfo[0];
          
          // Filter for capture moves
          const captureMoves = moves.filter(
            move => Math.abs(move.row - piece.position.row) > 1
          );
          
          // Choose first capture move (or random for variety)
          movePosition = captureMoves[0];
          pieceToMove = piece;
        } else {
          // No captures available, choose first available move
          const { piece, moves } = validMovesInfo[0];
          movePosition = moves[0];
          pieceToMove = piece;
        }
      }
      
      console.log("AI will move:", pieceToMove.id, "from", pieceToMove.position, "to", movePosition);
      
      // First select the piece
      set({
        selectedPiece: pieceToMove,
        pieces: pieces.map(p => ({
          ...p,
          isSelected: p.id === pieceToMove.id
        })),
        validMoves: getValidMoves(pieceToMove, pieces)
      });
      
      // Then make the move after a brief delay
      setTimeout(() => {
        console.log("AI executing move now");
        get().movePiece(movePosition);
      }, 600);
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
