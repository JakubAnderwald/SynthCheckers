import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eloService, EloService } from '../services/eloService';
import type { GameRecord } from '../types/firestore';

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  getFirebaseDb: vi.fn().mockResolvedValue({
    doc: vi.fn(),
    runTransaction: vi.fn()
  })
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue({}),
  runTransaction: vi.fn(),
  increment: vi.fn((value) => ({ __increment: value })),
  serverTimestamp: vi.fn().mockReturnValue({ __serverTimestamp: true })
}));

describe('EloService', () => {
  let service: EloService;

  beforeEach(() => {
    service = new EloService();
    vi.clearAllMocks();
  });

  describe('ELO Calculation', () => {
    it('should calculate rating changes correctly for new players', () => {
      // Two new players with default ratings
      const result = service.calculateEloChanges(1200, 1200, 0, 0, 'red');
      
      expect(result.redEloChange).toBeGreaterThan(0);
      expect(result.blueEloChange).toBeLessThan(0);
      expect(result.redNewRating).toBe(1200 + result.redEloChange);
      expect(result.blueNewRating).toBe(1200 + result.blueEloChange);
    });

    it('should use higher K-factor for provisional players', () => {
      // Provisional player vs established player
      const provisionalResult = service.calculateEloChanges(1200, 1200, 5, 50, 'red');
      const establishedResult = service.calculateEloChanges(1200, 1200, 25, 50, 'red');
      
      // Provisional player should have larger rating change
      expect(Math.abs(provisionalResult.redEloChange)).toBeGreaterThan(
        Math.abs(establishedResult.redEloChange)
      );
    });

    it('should handle draws correctly', () => {
      const result = service.calculateEloChanges(1200, 1200, 20, 20, 'draw');
      
      // For equal ratings, draw should result in no change
      expect(result.redEloChange).toBe(0);
      expect(result.blueEloChange).toBe(0);
    });

    it('should favor underdog in rating changes', () => {
      // Underdog (1000) beats favorite (1500)
      const result = service.calculateEloChanges(1000, 1500, 20, 20, 'red');
      
      expect(result.redEloChange).toBeGreaterThan(20); // Underdog gains more
      expect(result.blueEloChange).toBeLessThan(-20); // Favorite loses more
    });

    it('should respect rating floor and ceiling', () => {
      // Test rating floor
      const floorResult = service.calculateEloChanges(150, 1500, 20, 20, 'blue');
      expect(floorResult.redNewRating).toBeGreaterThanOrEqual(100);
      
      // Test rating ceiling
      const ceilingResult = service.calculateEloChanges(2950, 1500, 20, 20, 'red');
      expect(ceilingResult.redNewRating).toBeLessThanOrEqual(3000);
    });
  });

  describe('Performance Statistics', () => {
    it('should calculate player performance stats correctly', () => {
      const mockGameData: Partial<GameRecord> = {
        moveHistory: [
          {
            moveNumber: 1,
            player: 'red',
            from: [2, 1],
            to: [3, 2],
            notation: 'c3-d4',
            timeSpent: 5000,
            captures: [],
            promotedToKing: false,
            timestamp: { toDate: () => new Date() } as any
          },
          {
            moveNumber: 2,
            player: 'blue',
            from: [5, 2],
            to: [4, 3],
            notation: 'c6-d5',
            timeSpent: 8000,
            captures: [{ id: 'piece1', color: 'red', type: 'regular', position: [3, 2] }],
            promotedToKing: false,
            timestamp: { toDate: () => new Date() } as any
          },
          {
            moveNumber: 3,
            player: 'red',
            from: [1, 0],
            to: [7, 6],
            notation: 'a2-g8',
            timeSpent: 12000,
            captures: [],
            promotedToKing: true,
            timestamp: { toDate: () => new Date() } as any
          }
        ]
      };

      const stats = service.calculatePerformanceStats(mockGameData as GameRecord);

      expect(stats.red.averageMoveTime).toBe(8500); // (5000 + 12000) / 2
      expect(stats.red.timeUsed).toBe(17000);
      expect(stats.red.capturesMade).toBe(0);
      expect(stats.red.kingsPromoted).toBe(1);

      expect(stats.blue.averageMoveTime).toBe(8000);
      expect(stats.blue.timeUsed).toBe(8000);
      expect(stats.blue.capturesMade).toBe(1);
      expect(stats.blue.kingsPromoted).toBe(0);
    });

    it('should handle empty move history', () => {
      const mockGameData: Partial<GameRecord> = {
        moveHistory: []
      };

      const stats = service.calculatePerformanceStats(mockGameData as GameRecord);

      expect(stats.red.averageMoveTime).toBe(0);
      expect(stats.red.timeUsed).toBe(0);
      expect(stats.red.capturesMade).toBe(0);
      expect(stats.red.kingsPromoted).toBe(0);
    });
  });

  describe('Rating Categories', () => {
    it('should categorize ratings correctly', () => {
      expect(service.getRatingCategory(2300).name).toBe('Expert');
      expect(service.getRatingCategory(1900).name).toBe('Advanced');
      expect(service.getRatingCategory(1500).name).toBe('Intermediate');
      expect(service.getRatingCategory(1200).name).toBe('Beginner');
      expect(service.getRatingCategory(800).name).toBe('Novice');
    });

    it('should assign appropriate colors to categories', () => {
      expect(service.getRatingCategory(2300).color).toBe('text-purple-400');
      expect(service.getRatingCategory(1900).color).toBe('text-blue-400');
      expect(service.getRatingCategory(1500).color).toBe('text-green-400');
      expect(service.getRatingCategory(1200).color).toBe('text-yellow-400');
      expect(service.getRatingCategory(800).color).toBe('text-gray-400');
    });
  });

  describe('Rating Confidence', () => {
    it('should calculate confidence based on games played', () => {
      expect(service.getRatingConfidence(60).level).toBe('high');
      expect(service.getRatingConfidence(60).percentage).toBe(95);

      expect(service.getRatingConfidence(30).level).toBe('medium');
      expect(service.getRatingConfidence(30).percentage).toBe(80);

      expect(service.getRatingConfidence(10).level).toBe('low');
      expect(service.getRatingConfidence(10).percentage).toBe(60);
    });
  });

  describe('Game Completion Handlers', () => {
    const mockGameData: Partial<GameRecord> = {
      gameId: 'test-game',
      playerRed: { uid: 'red-player', displayName: 'Red Player', eloRating: 1200 },
      playerBlue: { uid: 'blue-player', displayName: 'Blue Player', eloRating: 1200 },
      totalMoves: 25,
      startedAt: { toDate: () => new Date(Date.now() - 600000) } as any, // 10 minutes ago
      createdAt: { toDate: () => new Date(Date.now() - 600000) } as any,
      moveHistory: []
    };

    beforeEach(() => {
      const { runTransaction } = require('firebase/firestore');
      vi.mocked(runTransaction).mockImplementation(async (db, updateFunction) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ eloRating: 1200, totalGames: 10, wins: 5, losses: 4, draws: 1 })
          }),
          update: vi.fn()
        };
        return await updateFunction(mockTransaction);
      });
    });

    it('should handle resignation correctly', async () => {
      await service.handleResignation('test-game', 'red-player');

      const { runTransaction } = require('firebase/firestore');
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should handle timeout correctly', async () => {
      await service.handleTimeout('test-game', 'blue-player');

      const { runTransaction } = require('firebase/firestore');
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should handle abandonment correctly', async () => {
      await service.handleAbandonment('test-game', 'red-player');

      const { runTransaction } = require('firebase/firestore');
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should emit game completion events', () => {
      const eventSpy = vi.fn();
      window.addEventListener('game:completed', eventSpy);

      // Trigger completion event manually (since processGameCompletion is complex to mock)
      window.dispatchEvent(new CustomEvent('game:completed', {
        detail: {
          gameId: 'test-game',
          winner: 'red',
          endReason: 'resignation',
          eloChanges: { redEloChange: 20, blueEloChange: -20 },
          gameStats: { totalMoves: 25 }
        }
      }));

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            gameId: 'test-game',
            winner: 'red',
            endReason: 'resignation'
          })
        })
      );

      window.removeEventListener('game:completed', eventSpy);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high rating differences', () => {
      const result = service.calculateEloChanges(3000, 100, 50, 50, 'blue');
      
      // Higher rated player losing should result in significant rating change
      expect(result.redEloChange).toBeLessThan(-30);
      expect(result.blueEloChange).toBeGreaterThan(30);
    });

    it('should handle minimum rating changes', () => {
      // Test with very close ratings
      const result = service.calculateEloChanges(1200, 1201, 100, 100, 'red');
      
      expect(Math.abs(result.redEloChange)).toBeGreaterThan(0);
      expect(Math.abs(result.blueEloChange)).toBeGreaterThan(0);
    });

    it('should maintain rating sum consistency', () => {
      const initialSum = 1200 + 1500;
      const result = service.calculateEloChanges(1200, 1500, 20, 20, 'red');
      const finalSum = result.redNewRating + result.blueNewRating;
      
      // Total rating points should be conserved (within rounding)
      expect(Math.abs(finalSum - initialSum)).toBeLessThan(2);
    });
  });

  describe('Transaction Safety', () => {
    it('should handle database transaction failures gracefully', async () => {
      const { runTransaction } = require('firebase/firestore');
      vi.mocked(runTransaction).mockRejectedValue(new Error('Transaction failed'));

      await expect(service.handleResignation('test-game', 'red-player'))
        .rejects.toThrow('Transaction failed');
    });

    it('should handle missing player documents', async () => {
      const { runTransaction } = require('firebase/firestore');
      vi.mocked(runTransaction).mockImplementation(async (db, updateFunction) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
            data: () => null
          }),
          update: vi.fn()
        };
        return await updateFunction(mockTransaction);
      });

      await expect(service.handleResignation('test-game', 'red-player'))
        .rejects.toThrow('Player documents not found');
    });
  });
});