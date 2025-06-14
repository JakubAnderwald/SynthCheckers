import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { authService, UserProfile } from '../services/auth';

interface AuthContextType {
  // Auth state
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  
  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (newDisplayName: string) => Promise<void>;
  
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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        // Set up auth state listener
        unsubscribe = await authService.onAuthStateChange(async (firebaseUser) => {
          setUser(firebaseUser);
          
          if (firebaseUser) {
            // User signed in - fetch their profile
            const profile = await authService.getUserProfile(firebaseUser.uid);
            setUserProfile(profile);
            
            // Set user as online
            await authService.setUserOnlineStatus(true);
          } else {
            // User signed out
            setUserProfile(null);
          }
          
          setLoading(false);
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

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await authService.signInWithGoogle();
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

  const contextValue: AuthContextType = {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signOut,
    updateDisplayName,
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