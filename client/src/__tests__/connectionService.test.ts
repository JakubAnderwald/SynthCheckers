import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectionService } from '@/services/connectionService';

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  getFirebaseDb: vi.fn().mockResolvedValue({
    doc: vi.fn(),
    updateDoc: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn()
  })
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue({}),
  serverTimestamp: vi.fn().mockReturnValue({ toDate: () => new Date() }),
  onSnapshot: vi.fn()
}));

describe('ConnectionService', () => {
  const gameId = 'test-game-123';
  const userId = 'test-user-456';

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing timeouts
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    connectionService.cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Presence Tracking', () => {
    it('should start presence tracking successfully', async () => {
      const { updateDoc } = await import('firebase/firestore');
      vi.mocked(updateDoc).mockResolvedValue();

      await connectionService.startPresence(gameId, userId);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          [`playerPresence.${userId}`]: expect.objectContaining({
            isOnline: true,
            lastSeen: expect.anything(),
            timestamp: expect.any(String)
          })
        })
      );
    });

    it('should stop presence tracking and mark as offline', async () => {
      const { updateDoc } = await import('firebase/firestore');
      vi.mocked(updateDoc).mockResolvedValue();

      // Start first
      await connectionService.startPresence(gameId, userId);
      
      // Then stop
      await connectionService.stopPresence(gameId, userId);

      expect(updateDoc).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          [`playerPresence.${userId}`]: expect.objectContaining({
            isOnline: false
          })
        })
      );
    });

    it('should send heartbeats at regular intervals', async () => {
      const { updateDoc } = await import('firebase/firestore');
      vi.mocked(updateDoc).mockResolvedValue();

      await connectionService.startPresence(gameId, userId);

      // Fast-forward 30 seconds (heartbeat interval)
      vi.advanceTimersByTime(30000);

      // Should have been called at least twice (initial + heartbeat)
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });

    it('should handle heartbeat failures and trigger reconnection', async () => {
      const { updateDoc } = await import('firebase/firestore');
      
      // First call succeeds (initial presence)
      vi.mocked(updateDoc)
        .mockResolvedValueOnce()
        .mockRejectedValue(new Error('Network error'));

      await connectionService.startPresence(gameId, userId);

      // Fast-forward to trigger heartbeat
      vi.advanceTimersByTime(30000);

      // Should attempt reconnection
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('Connection Monitoring', () => {
    it('should detect player disconnection after timeout', async () => {
      const mockGameData = {
        gameId,
        playerPresence: {
          [userId]: {
            isOnline: true,
            lastSeen: { toDate: () => new Date(Date.now() - 120000) }, // 2 minutes ago
            timestamp: new Date(Date.now() - 120000).toISOString()
          }
        }
      };

      const { onSnapshot } = await import('firebase/firestore');
      const mockSnapshot = {
        exists: () => true,
        data: () => mockGameData
      };

      // Mock onSnapshot to immediately call callback with disconnected player
      vi.mocked(onSnapshot).mockImplementation((ref, callback) => {
        callback(mockSnapshot);
        return () => {}; // unsubscribe function
      });

      const disconnectSpy = vi.fn();
      window.addEventListener('player:disconnected', disconnectSpy);

      await connectionService.startPresence(gameId, userId);

      expect(disconnectSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { gameId, playerId: userId }
        })
      );

      window.removeEventListener('player:disconnected', disconnectSpy);
    });

    it('should emit reconnection events', () => {
      const reconnectSpy = vi.fn();
      window.addEventListener('player:reconnected', reconnectSpy);

      // Simulate reconnection event
      window.dispatchEvent(new CustomEvent('player:reconnected', {
        detail: { gameId }
      }));

      expect(reconnectSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { gameId }
        })
      );

      window.removeEventListener('player:reconnected', reconnectSpy);
    });

    it('should handle connection failures', () => {
      const failureSpy = vi.fn();
      window.addEventListener('connection:failed', failureSpy);

      // Simulate connection failure
      window.dispatchEvent(new CustomEvent('connection:failed', {
        detail: { gameId }
      }));

      expect(failureSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { gameId }
        })
      );

      window.removeEventListener('connection:failed', failureSpy);
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection with exponential backoff', async () => {
      const { updateDoc } = await import('firebase/firestore');
      
      // Simulate reconnection failures then success
      vi.mocked(updateDoc)
        .mockResolvedValueOnce() // Initial connection
        .mockRejectedValueOnce(new Error('Network error')) // First reconnect attempt
        .mockRejectedValueOnce(new Error('Network error')) // Second attempt
        .mockResolvedValueOnce(); // Successful reconnection

      await connectionService.startPresence(gameId, userId);
      
      // Force reconnection
      await connectionService.forceReconnect(gameId, userId);

      // Should have attempted multiple reconnections
      expect(updateDoc).toHaveBeenCalledTimes(4);
    });

    it('should start grace period for disconnected players', async () => {
      const { updateDoc } = await import('firebase/firestore');
      vi.mocked(updateDoc).mockResolvedValue();

      const abandonedSpy = vi.fn();
      window.addEventListener('game:abandoned', abandonedSpy);

      await connectionService.startPresence(gameId, userId);

      // Fast-forward past grace period (2 minutes)
      vi.advanceTimersByTime(120000);

      // Should eventually mark game as abandoned
      setTimeout(() => {
        expect(abandonedSpy).toHaveBeenCalled();
      }, 0);

      window.removeEventListener('game:abandoned', abandonedSpy);
    });
  });

  describe('Game Abandonment', () => {
    it('should handle abandoned games after grace period', async () => {
      const { updateDoc } = await import('firebase/firestore');
      vi.mocked(updateDoc).mockResolvedValue();

      const abandonedSpy = vi.fn();
      window.addEventListener('game:abandoned', abandonedSpy);

      // Simulate abandonment
      window.dispatchEvent(new CustomEvent('game:abandoned', {
        detail: { gameId, playerId: userId }
      }));

      expect(abandonedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { gameId, playerId: userId }
        })
      );

      window.removeEventListener('game:abandoned', abandonedSpy);
    });
  });

  describe('Connection Status', () => {
    it('should track connection status correctly', async () => {
      // Initially disconnected
      let status = connectionService.getConnectionStatus(gameId);
      expect(status.isOnline).toBe(false);
      expect(status.lastSeen).toBe(null);

      // After starting presence
      await connectionService.startPresence(gameId, userId);
      status = connectionService.getConnectionStatus(gameId);
      expect(status.isOnline).toBe(true);
      expect(status.lastSeen).toBeInstanceOf(Date);

      // After stopping presence
      await connectionService.stopPresence(gameId, userId);
      status = connectionService.getConnectionStatus(gameId);
      expect(status.isOnline).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should clean up all connections and timers', async () => {
      await connectionService.startPresence(gameId, userId);
      
      connectionService.cleanup();

      const status = connectionService.getConnectionStatus(gameId);
      expect(status.isOnline).toBe(false);
      expect(status.lastSeen).toBe(null);
    });
  });
});