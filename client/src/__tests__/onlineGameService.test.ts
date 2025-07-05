import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onlineGameService } from '@/services/onlineGameService';
import { GameRecord, BoardStateSnapshot, GameMove } from '@/types/firestore';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  getFirebaseDb: vi.fn().mockResolvedValue({
    collection: vi.fn(),
    doc: vi.fn(),
    runTransaction: vi.fn()
  })
}));

// Mock checkers rules
vi.mock('@/lib/checkers/rules', () => ({
  makeMove: vi.fn(),
  checkForWinner: vi.fn(),
  getValidMoves: vi.fn(),
  getAllValidMovesForPlayer: vi.fn(),
  getCapturePositions: vi.fn()
}));

// Mock game state functions
vi.mock('@/lib/gameState', () => ({
  convertToFirestoreBoard: vi.fn(),
  convertMoveToFirestore: vi.fn(),
  validateGameState: vi.fn(),
  hasValidMoves: vi.fn(),
  countPieces: vi.fn(),
  determineWinner: vi.fn(),
  generateMoveNotation: vi.fn()
}));

describe('OnlineGameService - Atomic Move Validation', () => {
  let mockGameRecord: GameRecord;
  let mockBoardState: BoardStateSnapshot;
  
  beforeEach(() => {
    // Create mock board state
    mockBoardState = {
      pieces: [
        { id: 'piece1', color: 'red', type: 'normal', position: [2, 1], canMove: true, threatLevel: 0 },
        { id: 'piece2', color: 'blue', type: 'normal', position: [5, 2], canMove: true, threatLevel: 0 }
      ],
      currentPlayer: 'red',
      mustCapture: false,
      kingPromotions: [],
      gameStateHash: 'mock-hash',
      timestamp: { toDate: () => new Date() } as Timestamp
    };
    
    // Create mock game record
    mockGameRecord = {
      gameId: 'test-game-123',
      playerRed: {
        uid: 'user-red',
        displayName: 'Red Player',
        eloRating: 1200,
        isReady: true,
        hasResigned: false
      },
      playerBlue: {
        uid: 'user-blue',
        displayName: 'Blue Player',
        eloRating: 1200,
        isReady: true,
        hasResigned: false
      },
      status: 'active',
      currentTurn: 'red',
      moveHistory: [],
      boardState: mockBoardState,
      gameRules: {
        boardSize: 8,
        forcedCapture: true,
        flyingKings: true,
        multipleJumps: true,
        backwardCaptures: false,
        drawAfterMoves: 50
      },
      createdAt: { toDate: () => new Date() } as Timestamp,
      eloChanges: { red: 0, blue: 0 },
      gameType: 'ranked',
      totalMoves: 0,
      gameSession: 'session-123',
      endReason: 'checkmate'
    };
    
    // Reset all mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Move Validation', () => {
    it('should validate game state integrity before processing move', async () => {
      const { validateGameState } = await import('@/lib/gameState');
      vi.mocked(validateGameState).mockReturnValue(false);
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation((callback) => callback(mockTransaction))
      } as any);
      
      await expect(
        onlineGameService.makeMove('test-game-123', { from: { row: 2, col: 1 }, to: { row: 3, col: 2 } }, 'user-red')
      ).rejects.toThrow('Invalid board state');
    });
    
    it('should reject moves when game is not active', async () => {
      mockGameRecord.status = 'completed';
      
      const { validateGameState } = await import('@/lib/gameState');
      vi.mocked(validateGameState).mockReturnValue(true);
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation((callback) => callback(mockTransaction))
      } as any);
      
      await expect(
        onlineGameService.makeMove('test-game-123', { from: { row: 2, col: 1 }, to: { row: 3, col: 2 } }, 'user-red')
      ).rejects.toThrow('Game is not active');
    });
    
    it('should reject moves when not player\'s turn', async () => {
      mockGameRecord.currentTurn = 'blue';
      
      const { validateGameState } = await import('@/lib/gameState');
      vi.mocked(validateGameState).mockReturnValue(true);
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation((callback) => callback(mockTransaction))
      } as any);
      
      await expect(
        onlineGameService.makeMove('test-game-123', { from: { row: 2, col: 1 }, to: { row: 3, col: 2 } }, 'user-red')
      ).rejects.toThrow('Not your turn');
    });
    
    it('should validate move bounds', async () => {
      const { validateGameState } = await import('@/lib/gameState');
      vi.mocked(validateGameState).mockReturnValue(true);
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation((callback) => callback(mockTransaction))
      } as any);
      
      await expect(
        onlineGameService.makeMove('test-game-123', { from: { row: -1, col: 1 }, to: { row: 3, col: 2 } }, 'user-red')
      ).rejects.toThrow('Move out of bounds');
      
      await expect(
        onlineGameService.makeMove('test-game-123', { from: { row: 2, col: 1 }, to: { row: 8, col: 2 } }, 'user-red')
      ).rejects.toThrow('Move out of bounds');
    });
    
    it('should reject move when no piece at source position', async () => {
      const { validateGameState } = await import('@/lib/gameState');
      vi.mocked(validateGameState).mockReturnValue(true);
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation((callback) => callback(mockTransaction))
      } as any);
      
      await expect(
        onlineGameService.makeMove('test-game-123', { from: { row: 0, col: 0 }, to: { row: 1, col: 1 } }, 'user-red')
      ).rejects.toThrow('No piece at source position');
    });
    
    it('should reject move when trying to move opponent\'s piece', async () => {
      const { validateGameState } = await import('@/lib/gameState');
      vi.mocked(validateGameState).mockReturnValue(true);
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation((callback) => callback(mockTransaction))
      } as any);
      
      await expect(
        onlineGameService.makeMove('test-game-123', { from: { row: 5, col: 2 }, to: { row: 4, col: 3 } }, 'user-red')
      ).rejects.toThrow('Cannot move opponent\'s piece');
    });
  });
  
  describe('Atomic Transaction Processing', () => {
    it('should successfully process valid move with atomic transaction', async () => {
      const { validateGameState, convertToFirestoreBoard, generateMoveNotation } = await import('@/lib/gameState');
      const { makeMove, getValidMoves, getAllValidMovesForPlayer, getCapturePositions } = await import('@/lib/checkers/rules');
      
      // Mock validation functions
      vi.mocked(validateGameState).mockReturnValue(true);
      vi.mocked(getValidMoves).mockReturnValue([{ row: 3, col: 2 }]);
      vi.mocked(getAllValidMovesForPlayer).mockReturnValue([]);
      vi.mocked(getCapturePositions).mockReturnValue([]);
      
      // Mock move result
      const mockMoveResult = {
        newPieces: [
          { id: 'piece1', color: 'red', type: 'normal', position: { row: 3, col: 2 }, isSelected: false },
          { id: 'piece2', color: 'blue', type: 'normal', position: { row: 5, col: 2 }, isSelected: false }
        ],
        capturedPiece: null,
        becameKing: false
      };
      vi.mocked(makeMove).mockReturnValue(mockMoveResult);
      
      // Mock board state conversion
      vi.mocked(convertToFirestoreBoard).mockReturnValue({
        ...mockBoardState,
        currentPlayer: 'blue',
        gameStateHash: 'new-hash'
      });
      
      vi.mocked(generateMoveNotation).mockReturnValue('a1-b2');
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation(async (callback) => {
          await callback(mockTransaction);
          return true;
        })
      } as any);
      
      const result = await onlineGameService.makeMove(
        'test-game-123',
        { from: { row: 2, col: 1 }, to: { row: 3, col: 2 } },
        'user-red'
      );
      
      expect(result).toBe(true);
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          boardState: expect.any(Object),
          currentTurn: 'blue',
          totalMoves: 1
        })
      );
    });
    
    it('should handle game completion in atomic transaction', async () => {
      const { validateGameState, convertToFirestoreBoard, generateMoveNotation } = await import('@/lib/gameState');
      const { makeMove, getValidMoves, getAllValidMovesForPlayer, getCapturePositions } = await import('@/lib/checkers/rules');
      
      // Mock validation functions
      vi.mocked(validateGameState).mockReturnValue(true);
      vi.mocked(getValidMoves).mockReturnValue([{ row: 3, col: 2 }]);
      vi.mocked(getAllValidMovesForPlayer).mockReturnValueOnce([]).mockReturnValueOnce([]); // No moves for next player
      vi.mocked(getCapturePositions).mockReturnValue([]);
      
      // Mock move result that captures last piece
      const mockMoveResult = {
        newPieces: [
          { id: 'piece1', color: 'red', type: 'normal', position: { row: 3, col: 2 }, isSelected: false }
        ],
        capturedPiece: { id: 'piece2', color: 'blue', type: 'normal', position: { row: 5, col: 2 }, isSelected: false },
        becameKing: false
      };
      vi.mocked(makeMove).mockReturnValue(mockMoveResult);
      
      // Mock board state conversion
      vi.mocked(convertToFirestoreBoard).mockReturnValue({
        ...mockBoardState,
        currentPlayer: 'blue',
        gameStateHash: 'new-hash'
      });
      
      vi.mocked(generateMoveNotation).mockReturnValue('a1xb2');
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation(async (callback) => {
          await callback(mockTransaction);
          return true;
        })
      } as any);
      
      const result = await onlineGameService.makeMove(
        'test-game-123',
        { from: { row: 2, col: 1 }, to: { row: 3, col: 2 } },
        'user-red'
      );
      
      expect(result).toBe(true);
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'completed',
          winner: 'red',
          endReason: 'checkmate'
        })
      );
    });
    
    it('should enforce mandatory captures', async () => {
      const { validateGameState } = await import('@/lib/gameState');
      const { getValidMoves, getAllValidMovesForPlayer, getCapturePositions } = await import('@/lib/checkers/rules');
      
      vi.mocked(validateGameState).mockReturnValue(true);
      vi.mocked(getValidMoves).mockReturnValue([{ row: 3, col: 2 }]); // Non-capture move
      vi.mocked(getAllValidMovesForPlayer).mockReturnValue([
        { piece: { id: 'other-piece' }, moves: [] }
      ]);
      vi.mocked(getCapturePositions)
        .mockReturnValueOnce([]) // Current piece has no captures
        .mockReturnValueOnce([{ row: 4, col: 4 }]); // Other piece has captures
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation((callback) => callback(mockTransaction))
      } as any);
      
      await expect(
        onlineGameService.makeMove('test-game-123', { from: { row: 2, col: 1 }, to: { row: 3, col: 2 } }, 'user-red')
      ).rejects.toThrow('Must capture when capture is available');
    });
  });
  
  describe('Game End Detection', () => {
    it('should detect win by capturing all pieces', async () => {
      const { validateGameState, convertToFirestoreBoard, generateMoveNotation } = await import('@/lib/gameState');
      const { makeMove, getValidMoves, getAllValidMovesForPlayer, getCapturePositions } = await import('@/lib/checkers/rules');
      
      vi.mocked(validateGameState).mockReturnValue(true);
      vi.mocked(getValidMoves).mockReturnValue([{ row: 5, col: 2 }]);
      vi.mocked(getAllValidMovesForPlayer).mockReturnValue([]);
      vi.mocked(getCapturePositions).mockReturnValue([]);
      
      // Mock move that captures the last piece
      const mockMoveResult = {
        newPieces: [
          { id: 'piece1', color: 'red', type: 'normal', position: { row: 5, col: 2 }, isSelected: false }
        ],
        capturedPiece: { id: 'piece2', color: 'blue', type: 'normal', position: { row: 5, col: 2 }, isSelected: false },
        becameKing: false
      };
      vi.mocked(makeMove).mockReturnValue(mockMoveResult);
      vi.mocked(convertToFirestoreBoard).mockReturnValue({ ...mockBoardState, gameStateHash: 'new-hash' });
      vi.mocked(generateMoveNotation).mockReturnValue('a1xb2');
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation(async (callback) => {
          await callback(mockTransaction);
          return true;
        })
      } as any);
      
      await onlineGameService.makeMove('test-game-123', { from: { row: 2, col: 1 }, to: { row: 5, col: 2 } }, 'user-red');
      
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'completed',
          winner: 'red',
          endReason: 'checkmate'
        })
      );
    });
    
    it('should detect draw with insufficient material', async () => {
      const { validateGameState, convertToFirestoreBoard, generateMoveNotation } = await import('@/lib/gameState');
      const { makeMove, getValidMoves, getAllValidMovesForPlayer, getCapturePositions } = await import('@/lib/checkers/rules');
      
      vi.mocked(validateGameState).mockReturnValue(true);
      vi.mocked(getValidMoves).mockReturnValue([{ row: 3, col: 2 }]);
      vi.mocked(getAllValidMovesForPlayer).mockReturnValue([
        { piece: { id: 'remaining-piece' }, moves: [{ row: 4, col: 3 }] }
      ]);
      vi.mocked(getCapturePositions).mockReturnValue([]);
      
      // Mock move result with only one piece per side remaining
      const mockMoveResult = {
        newPieces: [
          { id: 'piece1', color: 'red', type: 'king', position: { row: 3, col: 2 }, isSelected: false },
          { id: 'piece2', color: 'blue', type: 'king', position: { row: 5, col: 2 }, isSelected: false }
        ],
        capturedPiece: null,
        becameKing: false
      };
      vi.mocked(makeMove).mockReturnValue(mockMoveResult);
      vi.mocked(convertToFirestoreBoard).mockReturnValue({ ...mockBoardState, gameStateHash: 'new-hash' });
      vi.mocked(generateMoveNotation).mockReturnValue('a1-b2');
      
      const { getFirebaseDb } = await import('@/lib/firebase');
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockGameRecord
        }),
        update: vi.fn()
      };
      
      vi.mocked(getFirebaseDb).mockResolvedValue({
        runTransaction: vi.fn().mockImplementation(async (callback) => {
          await callback(mockTransaction);
          return true;
        })
      } as any);
      
      await onlineGameService.makeMove('test-game-123', { from: { row: 2, col: 1 }, to: { row: 3, col: 2 } }, 'user-red');
      
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'completed',
          winner: 'draw',
          endReason: 'draw'
        })
      );
    });
  });
});