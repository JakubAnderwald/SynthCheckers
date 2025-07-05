import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { timeoutService } from '@/services/timeoutService';

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  getFirebaseDb: vi.fn().mockResolvedValue({
    doc: vi.fn(),
    updateDoc: vi.fn(),
    getDoc: vi.fn()
  })
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue({}),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn().mockReturnValue({ toDate: () => new Date() })
}));

describe('TimeoutService', () => {
  const gameId = 'test-game-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    timeoutService.cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Timeout Tracking', () => {
    it('should start timeout tracking with default config', () => {
      timeoutService.startTimeoutTracking(gameId);

      const status = timeoutService.getTimeoutStatus(gameId);
      expect(status.timeRemaining).toBeGreaterThan(0);
      expect(status.isWarning).toBe(false);
      expect(status.lastMoveTime).toBeInstanceOf(Date);
    });

    it('should start timeout tracking with custom config', () => {
      const customConfig = {
        moveTimeout: 60000, // 1 minute
        warningThreshold: 10000 // 10 seconds
      };

      timeoutService.startTimeoutTracking(gameId, customConfig);

      const status = timeoutService.getTimeoutStatus(gameId);
      expect(status.timeRemaining).toBeLessThanOrEqual(60000);
    });

    it('should stop timeout tracking', () => {
      timeoutService.startTimeoutTracking(gameId);
      timeoutService.stopTimeoutTracking(gameId);

      const status = timeoutService.getTimeoutStatus(gameId);
      expect(status.timeRemaining).toBe(0);
      expect(status.lastMoveTime).toBe(null);
    });
  });

  describe('Move Timeout Reset', () => {
    it('should reset timeout for new move', () => {
      timeoutService.startTimeoutTracking(gameId);
      
      // Advance time
      vi.advanceTimersByTime(30000); // 30 seconds
      
      let status = timeoutService.getTimeoutStatus(gameId);
      const timeBeforeReset = status.timeRemaining;
      
      // Reset move timeout
      timeoutService.resetMoveTimeout(gameId);
      
      status = timeoutService.getTimeoutStatus(gameId);
      expect(status.timeRemaining).toBeGreaterThan(timeBeforeReset);
    });

    it('should clear warning state on reset', () => {
      const config = { 
        moveTimeout: 60000, 
        warningThreshold: 30000 
      };
      
      timeoutService.startTimeoutTracking(gameId, config);
      
      // Advance to warning threshold
      vi.advanceTimersByTime(35000);
      
      let status = timeoutService.getTimeoutStatus(gameId);
      expect(status.isWarning).toBe(true);
      
      // Reset timeout
      timeoutService.resetMoveTimeout(gameId, config);
      
      status = timeoutService.getTimeoutStatus(gameId);
      expect(status.isWarning).toBe(false);
    });
  });

  describe('Pause and Resume', () => {
    it('should pause timeout tracking', () => {
      timeoutService.startTimeoutTracking(gameId);
      timeoutService.pauseTimeout(gameId);

      // Advancing time should not trigger timeout
      vi.advanceTimersByTime(600000); // 10 minutes

      const status = timeoutService.getTimeoutStatus(gameId);
      expect(status.timeRemaining).toBeGreaterThan(0);
    });

    it('should resume timeout tracking', () => {
      const config = { moveTimeout: 60000 };
      timeoutService.startTimeoutTracking(gameId, config);
      
      // Advance some time
      vi.advanceTimersByTime(30000);
      
      // Pause
      timeoutService.pauseTimeout(gameId);
      
      // Resume
      timeoutService.resumeTimeout(gameId, config);
      
      const status = timeoutService.getTimeoutStatus(gameId);
      expect(status.timeRemaining).toBeLessThanOrEqual(30000);
    });

    it('should handle timeout if time already expired during pause', async () => {
      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          gameId,
          currentTurn: 'red',
          status: 'active'
        })
      });

      const timeoutSpy = vi.fn();
      window.addEventListener('game:timeout', timeoutSpy);

      const config = { moveTimeout: 30000 };
      timeoutService.startTimeoutTracking(gameId, config);
      
      // Advance past timeout
      vi.advanceTimersByTime(40000);
      
      // Pause then resume
      timeoutService.pauseTimeout(gameId);
      timeoutService.resumeTimeout(gameId, config);

      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { gameId, timedOutPlayer: 'red' }
        })
      );

      window.removeEventListener('game:timeout', timeoutSpy);
    });
  });

  describe('Warning System', () => {
    it('should emit warning when threshold is reached', () => {
      const warningSpy = vi.fn();
      window.addEventListener('game:timeWarning', warningSpy);

      const config = {
        moveTimeout: 60000, // 1 minute
        warningThreshold: 30000 // 30 seconds
      };

      timeoutService.startTimeoutTracking(gameId, config);

      // Advance to warning threshold
      vi.advanceTimersByTime(30000);

      expect(warningSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { 
            gameId, 
            timeRemaining: expect.any(Number)
          }
        })
      );

      window.removeEventListener('game:timeWarning', warningSpy);
    });

    it('should immediately show warning if starting below threshold', () => {
      const warningSpy = vi.fn();
      window.addEventListener('game:timeWarning', warningSpy);

      const config = {
        moveTimeout: 60000,
        warningThreshold: 70000 // Threshold higher than total time
      };

      timeoutService.startTimeoutTracking(gameId, config);

      expect(warningSpy).toHaveBeenCalled();

      window.removeEventListener('game:timeWarning', warningSpy);
    });
  });

  describe('Final Timeout', () => {
    it('should emit timeout event when time expires', async () => {
      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          gameId,
          currentTurn: 'red',
          status: 'active'
        })
      });

      const timeoutSpy = vi.fn();
      window.addEventListener('game:timeout', timeoutSpy);

      const config = { moveTimeout: 30000 };
      timeoutService.startTimeoutTracking(gameId, config);

      // Advance past timeout
      vi.advanceTimersByTime(30000);

      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { gameId, timedOutPlayer: 'red' }
        })
      );

      window.removeEventListener('game:timeout', timeoutSpy);
    });

    it('should update game status on timeout', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          gameId,
          currentTurn: 'blue',
          status: 'active'
        })
      });

      const config = { moveTimeout: 30000 };
      timeoutService.startTimeoutTracking(gameId, config);

      // Advance past timeout
      vi.advanceTimersByTime(30000);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'completed',
          winner: 'red', // Opponent of blue (who timed out)
          endReason: 'timeout',
          timedOutPlayer: 'blue'
        })
      );
    });
  });

  describe('Reconnection Timeout', () => {
    it('should handle reconnection timeout', async () => {
      const { getDoc } = await import('firebase/firestore');
      const playerId = 'player-123';
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          gameId,
          status: 'active',
          playerRed: { uid: playerId },
          playerBlue: { uid: 'other-player' }
        })
      });

      const timeoutSpy = vi.fn();
      window.addEventListener('game:reconnectionTimeout', timeoutSpy);

      await timeoutService.handleReconnectionTimeout(gameId, playerId);

      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { gameId, playerId }
        })
      );

      window.removeEventListener('game:reconnectionTimeout', timeoutSpy);
    });
  });

  describe('Status Tracking', () => {
    it('should track timeout status accurately', () => {
      const config = { moveTimeout: 60000 };
      timeoutService.startTimeoutTracking(gameId, config);

      let status = timeoutService.getTimeoutStatus(gameId);
      expect(status.timeRemaining).toBeLessThanOrEqual(60000);
      expect(status.isWarning).toBe(false);

      // Advance time
      vi.advanceTimersByTime(30000);

      status = timeoutService.getTimeoutStatus(gameId);
      expect(status.timeRemaining).toBeLessThanOrEqual(30000);
    });

    it('should return zero status for non-existent game', () => {
      const status = timeoutService.getTimeoutStatus('non-existent');
      expect(status.timeRemaining).toBe(0);
      expect(status.isWarning).toBe(false);
      expect(status.lastMoveTime).toBe(null);
    });
  });

  describe('Cleanup', () => {
    it('should clean up all timeouts and tracking', () => {
      timeoutService.startTimeoutTracking(gameId);
      timeoutService.cleanup();

      const status = timeoutService.getTimeoutStatus(gameId);
      expect(status.timeRemaining).toBe(0);
      expect(status.lastMoveTime).toBe(null);
    });
  });
});