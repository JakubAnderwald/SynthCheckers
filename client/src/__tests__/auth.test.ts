import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../services/auth';
import { useAuthStore } from '../lib/stores/useAuthStore';

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  getFirebaseAuth: vi.fn(),
  getFirebaseDb: vi.fn(),
  ensureFirebaseInitialized: vi.fn(),
}));

// Mock Firebase Auth
const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockAuth = {
  currentUser: mockUser,
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  setPersistence: vi.fn(),
};

const mockDb = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
};

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Persistence', () => {
    it('should set persistence preference in localStorage', async () => {
      await authService.setPersistencePreference(true);
      
      const stored = localStorage.getItem('synth_checkers_auth_preference');
      expect(stored).toBe('true');
    });

    it('should get persistence preference from localStorage', () => {
      localStorage.setItem('synth_checkers_auth_preference', 'false');
      
      const preference = authService.getPersistencePreference();
      expect(preference).toBe(false);
    });

    it('should default to false when no preference is stored', () => {
      const preference = authService.getPersistencePreference();
      expect(preference).toBe(false);
    });
  });

  describe('Display Name Validation', () => {
    it('should detect when user needs display name setup - no display name', async () => {
      const userWithoutDisplayName = { ...mockUser, displayName: null };
      
      const needsSetup = await authService.needsDisplayNameSetup(userWithoutDisplayName as any);
      expect(needsSetup).toBe(true);
    });

    it('should detect when user needs display name setup - short display name', async () => {
      const userWithShortName = { ...mockUser, displayName: 'A' };
      
      const needsSetup = await authService.needsDisplayNameSetup(userWithShortName as any);
      expect(needsSetup).toBe(true);
    });

    it('should detect auto-generated display name from email', async () => {
      const userWithEmailPrefix = { 
        ...mockUser, 
        displayName: 'test',
        email: 'test@example.com'
      };
      
      const needsSetup = await authService.needsDisplayNameSetup(userWithEmailPrefix as any);
      expect(needsSetup).toBe(true);
    });

    it('should not require setup for valid display name', async () => {
      const userWithValidName = { ...mockUser, displayName: 'Valid User Name' };
      
      const needsSetup = await authService.needsDisplayNameSetup(userWithValidName as any);
      expect(needsSetup).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should clear session data from localStorage', () => {
      localStorage.setItem('synth_checkers_auth_preference', 'true');
      
      authService.clearSessionData();
      
      const stored = localStorage.getItem('synth_checkers_auth_preference');
      expect(stored).toBe(null);
    });
  });
});

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.getState().clearAuth();
  });

  it('should initialize with default state', () => {
    const state = useAuthStore.getState();
    
    expect(state.user).toBe(null);
    expect(state.userProfile).toBe(null);
    expect(state.isAuthenticated).toBe(false);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('should update authentication state when user is set', () => {
    const { setUser } = useAuthStore.getState();
    
    setUser(mockUser as any);
    
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should clear authentication state when user is null', () => {
    const { setUser, clearAuth } = useAuthStore.getState();
    
    // First set a user
    setUser(mockUser as any);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    
    // Then clear auth
    clearAuth();
    
    const state = useAuthStore.getState();
    expect(state.user).toBe(null);
    expect(state.userProfile).toBe(null);
    expect(state.isAuthenticated).toBe(false);
  });

  it('should calculate user stats correctly', () => {
    const mockProfile = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      eloRating: 1350,
      totalGames: 10,
      wins: 7,
      losses: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastOnline: new Date(),
      isOnline: true,
    };

    const { setUserProfile } = useAuthStore.getState();
    setUserProfile(mockProfile);

    const stats = useAuthStore.getState().getUserStats();
    
    expect(stats.eloRating).toBe(1350);
    expect(stats.totalGames).toBe(10);
    expect(stats.wins).toBe(7);
    expect(stats.losses).toBe(3);
    expect(stats.winRate).toBe(70); // 7/10 * 100
  });

  it('should handle empty user stats gracefully', () => {
    const stats = useAuthStore.getState().getUserStats();
    
    expect(stats.eloRating).toBe(1200);
    expect(stats.totalGames).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.winRate).toBe(0);
  });

  it('should detect new users correctly', () => {
    const mockNewUserProfile = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      eloRating: 1200,
      totalGames: 0,
      wins: 0,
      losses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastOnline: new Date(),
      isOnline: true,
      isNewUser: true,
    };

    const { setUserProfile } = useAuthStore.getState();
    setUserProfile(mockNewUserProfile);

    expect(useAuthStore.getState().needsDisplayNameSetup()).toBe(true);
    expect(useAuthStore.getState().isNewUser()).toBe(true);
  });

  it('should update last activity timestamp', () => {
    const { updateLastActivity } = useAuthStore.getState();
    const initialTime = useAuthStore.getState().lastActivity;
    
    // Wait a bit to ensure timestamp difference
    setTimeout(() => {
      updateLastActivity();
      const newTime = useAuthStore.getState().lastActivity;
      expect(newTime).toBeGreaterThan(initialTime);
    }, 10);
  });
});