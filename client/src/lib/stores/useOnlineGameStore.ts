import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GameRecord, BoardStateSnapshot, GameMove } from '@/types/firestore';
import { PieceColor } from '@/lib/checkers/types';

interface OnlineGameState {
  // Current game data
  currentGame: GameRecord | null;
  gameId: string | null;
  
  // Connection state
  isConnected: boolean;
  isReconnecting: boolean;
  lastSyncTime: Date | null;
  
  // Game state
  playerColor: PieceColor | null;
  isPlayerTurn: boolean;
  selectedPieceId: string | null;
  pendingMove: {
    from: { row: number; col: number };
    to: { row: number; col: number };
  } | null;
  
  // Timer state
  playerTimers: {
    red: number;
    blue: number;
  };
  timerInterval: ReturnType<typeof setInterval> | null;
  
  // Game history
  moveHistory: GameMove[];
  
  // UI state
  showGameOver: boolean;
  showReconnectingDialog: boolean;
  showMoveAnimation: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  setCurrentGame: (game: GameRecord | null) => void;
  setGameId: (gameId: string | null) => void;
  setPlayerColor: (color: PieceColor | null) => void;
  setIsPlayerTurn: (isTurn: boolean) => void;
  setSelectedPieceId: (pieceId: string | null) => void;
  setPendingMove: (move: { from: { row: number; col: number }; to: { row: number; col: number } } | null) => void;
  setIsConnected: (connected: boolean) => void;
  setIsReconnecting: (reconnecting: boolean) => void;
  setLastSyncTime: (time: Date | null) => void;
  setPlayerTimers: (timers: { red: number; blue: number }) => void;
  startTimer: () => void;
  stopTimer: () => void;
  updateTimer: (color: PieceColor, timeRemaining: number) => void;
  addMove: (move: GameMove) => void;
  setMoveHistory: (moves: GameMove[]) => void;
  setShowGameOver: (show: boolean) => void;
  setShowReconnectingDialog: (show: boolean) => void;
  setShowMoveAnimation: (show: boolean) => void;
  setError: (error: string | null) => void;
  
  // Game logic actions
  canMakeMove: () => boolean;
  getCurrentPlayerTimer: () => number;
  getOpponentTimer: () => number;
  isGameActive: () => boolean;
  isGameWaiting: () => boolean;
  isGameCompleted: () => boolean;
  
  // Reset actions
  resetGameState: () => void;
  resetUIState: () => void;
  resetTimers: () => void;
}

const initialState = {
  currentGame: null,
  gameId: null,
  isConnected: false,
  isReconnecting: false,
  lastSyncTime: null,
  playerColor: null,
  isPlayerTurn: false,
  selectedPieceId: null,
  pendingMove: null,
  playerTimers: { red: 0, blue: 0 },
  timerInterval: null,
  moveHistory: [],
  showGameOver: false,
  showReconnectingDialog: false,
  showMoveAnimation: false,
  error: null,
};

export const useOnlineGameStore = create<OnlineGameState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // Basic setters
    setCurrentGame: (game) => {
      set({ currentGame: game });
      if (game) {
        set({ 
          moveHistory: game.moveHistory || [],
          playerTimers: {
            red: game.playerRed.timeRemaining || 0,
            blue: game.playerBlue.timeRemaining || 0
          }
        });
      }
    },
    
    setGameId: (gameId) => set({ gameId }),
    setPlayerColor: (color) => set({ playerColor: color }),
    setIsPlayerTurn: (isTurn) => set({ isPlayerTurn: isTurn }),
    setSelectedPieceId: (pieceId) => set({ selectedPieceId: pieceId }),
    setPendingMove: (move) => set({ pendingMove: move }),
    setIsConnected: (connected) => set({ isConnected: connected }),
    setIsReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),
    setLastSyncTime: (time) => set({ lastSyncTime: time }),
    
    // Timer management
    setPlayerTimers: (timers) => set({ playerTimers: timers }),
    
    startTimer: () => {
      const state = get();
      if (state.timerInterval) {
        clearInterval(state.timerInterval);
      }
      
      const interval = setInterval(() => {
        const currentState = get();
        if (!currentState.currentGame || !currentState.isPlayerTurn) return;
        
        const playerColor = currentState.playerColor;
        if (!playerColor) return;
        
        const currentTime = currentState.playerTimers[playerColor];
        if (currentTime > 0) {
          set(state => ({
            playerTimers: {
              ...state.playerTimers,
              [playerColor]: Math.max(0, currentTime - 1000)
            }
          }));
        }
      }, 1000);
      
      set({ timerInterval: interval });
    },
    
    stopTimer: () => {
      const state = get();
      if (state.timerInterval) {
        clearInterval(state.timerInterval);
        set({ timerInterval: null });
      }
    },
    
    updateTimer: (color, timeRemaining) => {
      set(state => ({
        playerTimers: {
          ...state.playerTimers,
          [color]: timeRemaining
        }
      }));
    },
    
    // Move history management
    addMove: (move) => {
      set(state => ({
        moveHistory: [...state.moveHistory, move]
      }));
    },
    
    setMoveHistory: (moves) => set({ moveHistory: moves }),
    
    // UI state management
    setShowGameOver: (show) => set({ showGameOver: show }),
    setShowReconnectingDialog: (show) => set({ showReconnectingDialog: show }),
    setShowMoveAnimation: (show) => set({ showMoveAnimation: show }),
    setError: (error) => set({ error }),
    
    // Game logic helpers
    canMakeMove: () => {
      const state = get();
      return (
        state.currentGame !== null &&
        state.isConnected &&
        state.isPlayerTurn &&
        state.currentGame.status === 'active' &&
        !state.pendingMove
      );
    },
    
    getCurrentPlayerTimer: () => {
      const state = get();
      return state.playerColor ? state.playerTimers[state.playerColor] : 0;
    },
    
    getOpponentTimer: () => {
      const state = get();
      const opponentColor = state.playerColor === 'red' ? 'blue' : 'red';
      return state.playerTimers[opponentColor];
    },
    
    isGameActive: () => {
      const state = get();
      return state.currentGame?.status === 'active';
    },
    
    isGameWaiting: () => {
      const state = get();
      return state.currentGame?.status === 'waiting';
    },
    
    isGameCompleted: () => {
      const state = get();
      return state.currentGame?.status === 'completed';
    },
    
    // Reset functions
    resetGameState: () => {
      const state = get();
      if (state.timerInterval) {
        clearInterval(state.timerInterval);
      }
      set({
        currentGame: null,
        gameId: null,
        playerColor: null,
        isPlayerTurn: false,
        selectedPieceId: null,
        pendingMove: null,
        playerTimers: { red: 0, blue: 0 },
        timerInterval: null,
        moveHistory: [],
        error: null
      });
    },
    
    resetUIState: () => {
      set({
        selectedPieceId: null,
        showGameOver: false,
        showReconnectingDialog: false,
        showMoveAnimation: false,
        error: null
      });
    },
    
    resetTimers: () => {
      const state = get();
      if (state.timerInterval) {
        clearInterval(state.timerInterval);
      }
      set({
        playerTimers: { red: 0, blue: 0 },
        timerInterval: null
      });
    }
  }))
);

// Cleanup function to be called when component unmounts
export const cleanupOnlineGameStore = () => {
  const state = useOnlineGameStore.getState();
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }
};