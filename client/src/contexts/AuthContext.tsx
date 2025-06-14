import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { authService, UserProfile } from '../services/auth';
import { useAuthStore } from '../lib/stores/useAuthStore';

interface AuthContextType {
  // Auth state
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  
  // Auth actions
  signInWithGoogle: (rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (newDisplayName: string) => Promise<void>;
  
  // Session management
  restoreSession: () => Promise<void>;
  handleReconnection: () => Promise<boolean>;
  
  // First-time setup
  needsDisplayNameSetup: () => boolean;
  completeFirstTimeSetup: (displayName?: string) => Promise<void>;
  
  // Auth status
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Sync with Zustand store
  const {
    setUser: setStoreUser,
    setUserProfile: setStoreUserProfile,
    setLoading: setStoreLoading,
    setError: setStoreError,
    setSessionRestored,
    updateLastActivity,
    setRememberMe,
    clearAuth: clearStoreAuth,
  } = useAuthStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        // Set up auth state listener
        unsubscribe = await authService.onAuthStateChange(async (firebaseUser) => {
          setUser(firebaseUser);
          setStoreUser(firebaseUser);
          
          if (firebaseUser) {
            try {
              // User signed in - fetch their profile
              const profile = await authService.getUserProfile(firebaseUser.uid);
              setUserProfile(profile);
              setStoreUserProfile(profile);
              setStoreError(null);
              updateLastActivity();
              
              // Set user as online
              await authService.setUserOnlineStatus(true);
            } catch (error) {
              console.error('Error getting user profile:', error);
              setStoreError('Failed to load user profile');
            }
          } else {
            // User signed out
            setUserProfile(null);
            setStoreUserProfile(null);
          }
          
          setLoading(false);
          setStoreLoading(false);
        });
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup auth listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Set user offline when page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        authService.setUserOnlineStatus(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  const signInWithGoogle = async (rememberMe: boolean = false) => {
    try {
      setLoading(true);
      await authService.signInWithGoogle(rememberMe);
      // Auth state change will be handled by the listener
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      // Set user offline before signing out
      if (user) {
        await authService.setUserOnlineStatus(false);
      }
      await authService.signOut();
      // Auth state change will be handled by the listener
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
      throw error;
    }
  };

  const updateDisplayName = async (newDisplayName: string) => {
    try {
      await authService.updateDisplayName(newDisplayName);
      
      // Update local user profile state
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          displayName: newDisplayName,
        });
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      throw error;
    }
  };

  const restoreSession = async () => {
    try {
      setLoading(true);
      const restoredUser = await authService.restoreSession();
      // Auth state will be updated by the listener
    } catch (error) {
      console.error('Error restoring session:', error);
      setLoading(false);
    }
  };

  const handleReconnection = async (): Promise<boolean> => {
    try {
      return await authService.handleReconnection();
    } catch (error) {
      console.error('Error handling reconnection:', error);
      return false;
    }
  };

  const needsDisplayNameSetup = (): boolean => {
    if (!user || !userProfile) return false;
    return userProfile.isNewUser === true;
  };

  const completeFirstTimeSetup = async (displayName?: string): Promise<void> => {
    try {
      await authService.completeFirstTimeSetup(displayName);
      
      // Update local user profile state
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          isNewUser: false,
          displayName: displayName || userProfile.displayName,
        });
      }
    } catch (error) {
      console.error('Error completing first-time setup:', error);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signOut,
    updateDisplayName,
    restoreSession,
    handleReconnection,
    needsDisplayNameSetup,
    completeFirstTimeSetup,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook for checking auth status
export function useRequireAuth() {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login or show auth modal
      console.warn('Authentication required');
    }
  }, [user, loading]);

  return { user, loading, isAuthenticated: !!user };
}