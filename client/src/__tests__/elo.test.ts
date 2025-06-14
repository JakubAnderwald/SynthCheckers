import { describe, it, expect } from 'vitest';
import {
  calculateExpectedScore,
  getKFactor,
  getActualScore,
  calculateNewRating,
  calculateGameRatingChanges,
  calculateRatingStatistics
} from '../lib/elo/eloCalculator';
import { ELO_CONSTANTS } from '../types/firestore';

describe('ELO Calculator', () => {
  describe('calculateExpectedScore', () => {
    it('should return 0.5 for equal ratings', () => {
      const result = calculateExpectedScore(1200, 1200);
      expect(result).toBeCloseTo(0.5, 3);
    });

    it('should return higher score for lower-rated player vs higher-rated opponent', () => {
      const result = calculateExpectedScore(1000, 1400);
      expect(result).toBeLessThan(0.5);
      expect(result).toBeCloseTo(0.091, 3);
    });

    it('should return lower score for higher-rated player vs lower-rated opponent', () => {
      const result = calculateExpectedScore(1400, 1000);
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeCloseTo(0.909, 3);
    });

    it('should handle extreme rating differences', () => {
      const result = calculateExpectedScore(1000, 2000);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.1);
    });
  });

  describe('getKFactor', () => {
    it('should return default K-factor for new players', () => {
      const result = getKFactor(1200, 15);
      expect(result).toBe(ELO_CONSTANTS.K_FACTOR_DEFAULT);
    });

    it('should return experienced K-factor for players with 30+ games', () => {
      const result = getKFactor(1500, 50);
      expect(result).toBe(ELO_CONSTANTS.K_FACTOR_EXPERIENCED);
    });

    it('should return master K-factor for high-rated players', () => {
      const result = getKFactor(2100, 100);
      expect(result).toBe(ELO_CONSTANTS.K_FACTOR_MASTER);
    });

    it('should prioritize rating over experience for masters', () => {
      const result = getKFactor(2000, 20); // High rating but few games
      expect(result).toBe(ELO_CONSTANTS.K_FACTOR_MASTER);
    });
  });

  describe('getActualScore', () => {
    it('should return 1.0 for win', () => {
      expect(getActualScore('win')).toBe(1.0);
    });

    it('should return 0.0 for loss', () => {
      expect(getActualScore('loss')).toBe(0.0);
    });

    it('should return 0.5 for draw', () => {
      expect(getActualScore('draw')).toBe(0.5);
    });

    it('should throw error for invalid result', () => {
      expect(() => getActualScore('invalid' as any)).toThrow('Invalid game result');
    });
  });

  describe('calculateNewRating', () => {
    it('should increase rating for unexpected win', () => {
      const player = { rating: 1200, totalGames: 10 };
      const opponent = { rating: 1600, totalGames: 50 };
      
      const result = calculateNewRating(player, opponent, 'win');
      
      expect(result.newRating).toBeGreaterThan(player.rating);
      expect(result.ratingChange).toBeGreaterThan(0);
      expect(result.kFactor).toBe(ELO_CONSTANTS.K_FACTOR_DEFAULT);
    });

    it('should decrease rating for unexpected loss', () => {
      const player = { rating: 1600, totalGames: 50 };
      const opponent = { rating: 1200, totalGames: 10 };
      
      const result = calculateNewRating(player, opponent, 'loss');
      
      expect(result.newRating).toBeLessThan(player.rating);
      expect(result.ratingChange).toBeLessThan(0);
    });

    it('should handle draws with minimal rating change', () => {
      const player = { rating: 1400, totalGames: 30 };
      const opponent = { rating: 1400, totalGames: 30 };
      
      const result = calculateNewRating(player, opponent, 'draw');
      
      expect(Math.abs(result.ratingChange)).toBeLessThan(2);
    });

    it('should enforce rating floor', () => {
      const player = { rating: ELO_CONSTANTS.RATING_FLOOR + 10, totalGames: 5 };
      const opponent = { rating: 2000, totalGames: 100 };
      
      const result = calculateNewRating(player, opponent, 'loss');
      
      expect(result.newRating).toBeGreaterThanOrEqual(ELO_CONSTANTS.RATING_FLOOR);
    });

    it('should enforce rating ceiling', () => {
      const player = { rating: ELO_CONSTANTS.RATING_CEILING - 10, totalGames: 100 };
      const opponent = { rating: 1000, totalGames: 50 };
      
      const result = calculateNewRating(player, opponent, 'win');
      
      expect(result.newRating).toBeLessThanOrEqual(ELO_CONSTANTS.RATING_CEILING);
    });

    it('should throw error for invalid player rating', () => {
      const player = { rating: 50, totalGames: 10 }; // Below floor
      const opponent = { rating: 1200, totalGames: 10 };
      
      expect(() => calculateNewRating(player, opponent, 'win')).toThrow('outside valid range');
    });
  });

  describe('calculateGameRatingChanges', () => {
    it('should calculate rating changes for both players when red wins', () => {
      const redPlayer = { rating: 1200, totalGames: 20 };
      const bluePlayer = { rating: 1300, totalGames: 30 };
      
      const result = calculateGameRatingChanges(redPlayer, bluePlayer, 'red');
      
      expect(result.red.ratingChange).toBeGreaterThan(0);
      expect(result.blue.ratingChange).toBeLessThan(0);
      expect(Math.abs(result.red.ratingChange)).toBeGreaterThan(Math.abs(result.blue.ratingChange));
    });

    it('should calculate rating changes for both players when blue wins', () => {
      const redPlayer = { rating: 1400, totalGames: 40 };
      const bluePlayer = { rating: 1300, totalGames: 30 };
      
      const result = calculateGameRatingChanges(redPlayer, bluePlayer, 'blue');
      
      expect(result.red.ratingChange).toBeLessThan(0);
      expect(result.blue.ratingChange).toBeGreaterThan(0);
    });

    it('should handle draws with minimal changes for both players', () => {
      const redPlayer = { rating: 1400, totalGames: 50 };
      const bluePlayer = { rating: 1400, totalGames: 50 };
      
      const result = calculateGameRatingChanges(redPlayer, bluePlayer, 'draw');
      
      expect(Math.abs(result.red.ratingChange)).toBeLessThan(3);
      expect(Math.abs(result.blue.ratingChange)).toBeLessThan(3);
    });

    it('should throw error for invalid winner', () => {
      const redPlayer = { rating: 1400, totalGames: 50 };
      const bluePlayer = { rating: 1400, totalGames: 50 };
      
      expect(() => calculateGameRatingChanges(redPlayer, bluePlayer, 'invalid' as any)).toThrow('Invalid winner');
    });
  });

  describe('calculateRatingStatistics', () => {
    it('should return default values for empty history', () => {
      const result = calculateRatingStatistics([]);
      
      expect(result.currentRating).toBe(ELO_CONSTANTS.DEFAULT_RATING);
      expect(result.peakRating).toBe(ELO_CONSTANTS.DEFAULT_RATING);
      expect(result.lowestRating).toBe(ELO_CONSTANTS.DEFAULT_RATING);
      expect(result.totalGames).toBe(0);
      expect(result.trend).toBe('stable');
    });

    it('should calculate correct statistics for rating history', () => {
      const history = [
        { rating: 1200, change: 0, timestamp: new Date('2024-01-01') },
        { rating: 1225, change: 25, timestamp: new Date('2024-01-02') },
        { rating: 1210, change: -15, timestamp: new Date('2024-01-03') },
        { rating: 1240, change: 30, timestamp: new Date('2024-01-04') },
        { rating: 1220, change: -20, timestamp: new Date('2024-01-05') }
      ];
      
      const result = calculateRatingStatistics(history);
      
      expect(result.currentRating).toBe(1220);
      expect(result.peakRating).toBe(1240);
      expect(result.lowestRating).toBe(1200);
      expect(result.totalGames).toBe(5);
      expect(result.averageChange).toBe(4); // (0+25-15+30-20)/5
    });

    it('should detect improving trend', () => {
      const history = [
        { rating: 1200, change: 0, timestamp: new Date('2024-01-01') },
        { rating: 1210, change: 10, timestamp: new Date('2024-01-02') },
        { rating: 1225, change: 15, timestamp: new Date('2024-01-03') },
        { rating: 1240, change: 15, timestamp: new Date('2024-01-04') },
        { rating: 1260, change: 20, timestamp: new Date('2024-01-05') }
      ];
      
      const result = calculateRatingStatistics(history);
      
      expect(result.trend).toBe('improving');
    });

    it('should detect declining trend', () => {
      const history = [
        { rating: 1400, change: 0, timestamp: new Date('2024-01-01') },
        { rating: 1380, change: -20, timestamp: new Date('2024-01-02') },
        { rating: 1355, change: -25, timestamp: new Date('2024-01-03') },
        { rating: 1340, change: -15, timestamp: new Date('2024-01-04') },
        { rating: 1320, change: -20, timestamp: new Date('2024-01-05') }
      ];
      
      const result = calculateRatingStatistics(history);
      
      expect(result.trend).toBe('declining');
    });

    it('should calculate 30-day change correctly', () => {
      const now = new Date();
      const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
      
      const history = [
        { rating: 1200, change: 0, timestamp: fortyDaysAgo },
        { rating: 1250, change: 50, timestamp: twentyDaysAgo },
        { rating: 1300, change: 50, timestamp: now }
      ];
      
      const result = calculateRatingStatistics(history);
      
      expect(result.last30DaysChange).toBe(50); // 1300 - 1250
    });

    it('should calculate volatility correctly', () => {
      const history = [
        { rating: 1200, change: 0, timestamp: new Date() },
        { rating: 1220, change: 20, timestamp: new Date() },
        { rating: 1200, change: -20, timestamp: new Date() },
        { rating: 1220, change: 20, timestamp: new Date() }
      ];
      
      const result = calculateRatingStatistics(history);
      
      expect(result.volatility).toBeGreaterThan(15);
      expect(result.volatility).toBeLessThan(25);
    });
  });
});