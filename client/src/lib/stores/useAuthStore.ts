import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../../services/auth';

interface AuthState {
  // Authentication state
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  
  // Session management
  isSessionRestored: boolean;
  lastActivity: number;
  rememberMe: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSessionRestored: (restored: boolean) => void;
  updateLastActivity: () => void;
  setRememberMe: (remember: boolean) => void;
  clearAuth: () => void;
  
  // Derived state getters
  needsDisplayNameSetup: () => boolean;
  isNewUser: () => boolean;
  getUserStats: () => {
    eloRating: number;
    totalGames: number;
    winRate: number;
    wins: number;
    losses: number;
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      userProfile: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      isSessionRestored: false,
      lastActivity: Date.now(),
      rememberMe: false,

      // Actions
      setUser: (user) => set((state) => ({
        user,
        isAuthenticated: !!user,
        error: user ? null : state.error,
      })),

      setUserProfile: (profile) => set({
        userProfile: profile,
      }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      setSessionRestored: (restored) => set({
        isSessionRestored: restored,
      }),

      updateLastActivity: () => set({
        lastActivity: Date.now(),
      }),

      setRememberMe: (remember) => set({
        rememberMe: remember,
      }),

      clearAuth: () => set({
        user: null,
        userProfile: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        isSessionRestored: false,
        lastActivity: Date.now(),
      }),

      // Derived state getters
      needsDisplayNameSetup: () => {
        const { userProfile } = get();
        return userProfile?.isNewUser === true;
      },

      isNewUser: () => {
        const { userProfile } = get();
        return userProfile?.isNewUser === true;
      },

      getUserStats: () => {
        const { userProfile } = get();
        if (!userProfile) {
          return {
            eloRating: 1200,
            totalGames: 0,
            winRate: 0,
            wins: 0,
            losses: 0,
          };
        }

        const winRate = userProfile.totalGames > 0 
          ? (userProfile.wins / userProfile.totalGames) * 100 
          : 0;

        return {
          eloRating: userProfile.eloRating,
          totalGames: userProfile.totalGames,
          winRate: Math.round(winRate),
          wins: userProfile.wins,
          losses: userProfile.losses,
        };
      },
    }),
    {
      name: 'synth-checkers-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential user data and preferences
        rememberMe: state.rememberMe,
        lastActivity: state.lastActivity,
        isSessionRestored: state.isSessionRestored,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useUserProfile = () => useAuthStore((state) => state.userProfile);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useUserStats = () => useAuthStore((state) => state.getUserStats());
export const useNeedsDisplayNameSetup = () => useAuthStore((state) => state.needsDisplayNameSetup());