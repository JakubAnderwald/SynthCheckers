import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '../lib/firebase';

// Types for user data
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  eloRating: number;
  totalGames: number;
  wins: number;
  losses: number;
  createdAt: Date;
  updatedAt: Date;
  lastOnline: Date;
  isOnline: boolean;
}

export interface CreateUserProfile {
  uid: string;
  email: string;
  displayName: string;
}

class AuthService {
  private googleProvider: GoogleAuthProvider;

  constructor() {
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.addScope('email');
    this.googleProvider.addScope('profile');
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<User> {
    try {
      const result = await signInWithPopup(auth, this.googleProvider);
      const user = result.user;
      
      // Check if user document exists in Firestore
      await this.ensureUserDocument(user);
      
      return user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw new Error('Failed to sign in with Google');
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      // Update user's online status before signing out
      if (auth.currentUser) {
        await this.setUserOnlineStatus(false);
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Update online status when user comes online
        await this.setUserOnlineStatus(true);
      }
      callback(user);
    });
  }

  /**
   * Ensure user document exists in Firestore
   */
  private async ensureUserDocument(user: User): Promise<void> {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create new user document
      const userProfile: Omit<UserProfile, 'uid'> = {
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Player',
        eloRating: 1200, // Starting ELO rating
        totalGames: 0,
        wins: 0,
        losses: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOnline: new Date(),
        isOnline: true,
      };

      await setDoc(userDocRef, {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastOnline: serverTimestamp(),
      });
    } else {
      // Update existing user's last online time
      await updateDoc(userDocRef, {
        lastOnline: serverTimestamp(),
        isOnline: true,
      });
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastOnline: data.lastOnline?.toDate() || new Date(),
        } as UserProfile;
      }

      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Update user display name
   */
  async updateDisplayName(newDisplayName: string): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: newDisplayName,
      });

      // Update Firestore document
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        displayName: newDisplayName,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating display name:', error);
      throw new Error('Failed to update display name');
    }
  }

  /**
   * Set user online/offline status
   */
  async setUserOnlineStatus(isOnline: boolean): Promise<void> {
    if (!auth.currentUser) return;

    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        isOnline,
        lastOnline: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }
}

// Export singleton instance
export const authService = new AuthService();