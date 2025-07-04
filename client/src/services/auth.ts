import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
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
  isNewUser?: boolean;
}

export interface CreateUserProfile {
  uid: string;
  email: string;
  displayName: string;
}

class AuthService {
  private googleProvider: GoogleAuthProvider;
  private sessionStorageKey = 'synth_checkers_auth_preference';

  constructor() {
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.addScope('email');
    this.googleProvider.addScope('profile');
  }

  /**
   * Set authentication persistence preference
   */
  async setPersistencePreference(rememberMe: boolean): Promise<void> {
    const firebaseAuth = await getFirebaseAuth();
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    
    try {
      await setPersistence(firebaseAuth, persistence);
      // Store user preference for future sessions
      localStorage.setItem(this.sessionStorageKey, rememberMe.toString());
    } catch (error) {
      console.error('Error setting auth persistence:', error);
      throw new Error('Failed to set authentication persistence');
    }
  }

  /**
   * Get stored persistence preference
   */
  getPersistencePreference(): boolean {
    const stored = localStorage.getItem(this.sessionStorageKey);
    return stored === 'true'; // Default to false (session only)
  }

  /**
   * Initialize authentication with stored persistence preference
   */
  async initializeAuthPersistence(): Promise<void> {
    const rememberMe = this.getPersistencePreference();
    await this.setPersistencePreference(rememberMe);
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(rememberMe: boolean = false): Promise<User> {
    try {
      console.log('Starting Google sign-in process...');
      const firebaseAuth = await getFirebaseAuth();
      
      // Set persistence preference before signing in
      console.log('Setting persistence preference...');
      await this.setPersistencePreference(rememberMe);
      
      console.log('Opening Google sign-in popup...');
      const result = await signInWithPopup(firebaseAuth, this.googleProvider);
      const user = result.user;
      
      console.log('Sign-in successful, ensuring user document exists...');
      // Check if user document exists in Firestore with timeout
      const ensureDocPromise = this.ensureUserDocument(user);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User document creation timeout')), 10000);
      });
      
      await Promise.race([ensureDocPromise, timeoutPromise]);
      console.log('User document setup complete');
      
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
      const firebaseAuth = await getFirebaseAuth();
      // Update user's online status before signing out
      if (firebaseAuth.currentUser) {
        await this.setUserOnlineStatus(false);
      }
      await signOut(firebaseAuth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    const firebaseAuth = await getFirebaseAuth();
    return firebaseAuth.currentUser;
  }

  /**
   * Listen to authentication state changes
   */
  async onAuthStateChange(callback: (user: User | null) => void): Promise<() => void> {
    const firebaseAuth = await getFirebaseAuth();
    return onAuthStateChanged(firebaseAuth, async (user) => {
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
    try {
      console.log('Checking if user document exists for:', user.uid);
      const firebaseDb = await getFirebaseDb();
      const userDocRef = doc(firebaseDb, 'users', user.uid);
      
      // Add timeout for the getDoc operation
      const getDocPromise = getDoc(userDocRef);
      const getDocTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('GetDoc timeout')), 5000);
      });
      
      const userDoc = await Promise.race([getDocPromise, getDocTimeout]) as any;

      if (!userDoc.exists()) {
        console.log('Creating new user document...');
        // Create new user document with complete profile structure
        const newUserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Player',
          photoURL: user.photoURL || null,
          
          // Game Statistics
          eloRating: 1200,
          totalGames: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          
          // Rating History
          peakRating: 1200,
          lowestRating: 1200,
          ratingHistory: [],
          
          // Activity Tracking
          isOnline: true,
          isNewUser: true,
          isVerified: false,
          accountStatus: 'active',
          
          // Preferences
          gamePreferences: {
            preferredDifficulty: 'medium',
            allowChallenges: true,
            autoAcceptFriends: false,
            soundEnabled: true,
            musicEnabled: true,
            animationsEnabled: true
          },
          privacySettings: {
            profileVisible: true,
            statsVisible: true,
            onlineStatusVisible: true,
            allowDirectMessages: true,
            allowFriendRequests: true
          }
        };

        // Add timeout for the setDoc operation
        const setDocPromise = setDoc(userDocRef, {
          ...newUserProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastOnline: serverTimestamp(),
        });
        const setDocTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('SetDoc timeout')), 5000);
        });
        
        await Promise.race([setDocPromise, setDocTimeout]);
        console.log('Created new user document for:', user.uid);
      } else {
        console.log('Updating existing user document...');
        // Update existing user's last online time with timeout
        const updateDocPromise = updateDoc(userDocRef, {
          lastOnline: serverTimestamp(),
          isOnline: true,
        });
        const updateDocTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('UpdateDoc timeout')), 5000);
        });
        
        await Promise.race([updateDocPromise, updateDocTimeout]);
        console.log('Updated existing user document for:', user.uid);
      }
    } catch (error) {
      console.error('Error ensuring user document:', error);
      // Don't throw here to avoid breaking authentication flow
      // The UI will handle missing profile gracefully
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const firebaseDb = await getFirebaseDb();
      const userDocRef = doc(firebaseDb, 'users', uid);
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
    const firebaseAuth = await getFirebaseAuth();
    if (!firebaseAuth.currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      // Update Firebase Auth profile
      await updateProfile(firebaseAuth.currentUser, {
        displayName: newDisplayName,
      });

      // Update Firestore document
      const firebaseDb = await getFirebaseDb();
      const userDocRef = doc(firebaseDb, 'users', firebaseAuth.currentUser.uid);
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
    const firebaseAuth = await getFirebaseAuth();
    if (!firebaseAuth.currentUser) return;

    try {
      const firebaseDb = await getFirebaseDb();
      const userDocRef = doc(firebaseDb, 'users', firebaseAuth.currentUser.uid);
      
      // Check if document exists first
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        // If document doesn't exist, ensure it's created first
        await this.ensureUserDocument(firebaseAuth.currentUser);
        return; // The ensureUserDocument already sets isOnline: true
      }
      
      // Update existing document
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
  async isAuthenticated(): Promise<boolean> {
    const firebaseAuth = await getFirebaseAuth();
    return !!firebaseAuth.currentUser;
  }

  /**
   * Attempt to restore previous session
   */
  async restoreSession(): Promise<User | null> {
    try {
      // Initialize persistence first
      await this.initializeAuthPersistence();
      
      const firebaseAuth = await getFirebaseAuth();
      
      // Return current user if already available
      if (firebaseAuth.currentUser) {
        return firebaseAuth.currentUser;
      }

      // Wait for auth state to be determined
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
    } catch (error) {
      console.error('Error restoring session:', error);
      return null;
    }
  }

  /**
   * Handle network reconnection and session validation
   */
  async handleReconnection(): Promise<boolean> {
    try {
      const firebaseAuth = await getFirebaseAuth();
      
      if (!firebaseAuth.currentUser) {
        return false;
      }

      // Validate token by attempting to refresh it
      await firebaseAuth.currentUser.getIdToken(true);
      
      // Update user online status
      await this.setUserOnlineStatus(true);
      
      return true;
    } catch (error) {
      console.error('Error during reconnection:', error);
      return false;
    }
  }

  /**
   * Clear stored session data
   */
  clearSessionData(): void {
    localStorage.removeItem(this.sessionStorageKey);
  }

  /**
   * Check if user needs display name setup
   */
  async needsDisplayNameSetup(user: User): Promise<boolean> {
    if (!user.displayName || user.displayName.length < 2) {
      return true;
    }
    
    // Check if display name is just the email prefix (auto-generated)
    const emailPrefix = user.email?.split('@')[0] || '';
    return user.displayName === emailPrefix;
  }

  /**
   * Complete first-time user setup
   */
  async completeFirstTimeSetup(displayName?: string): Promise<void> {
    const firebaseAuth = await getFirebaseAuth();
    if (!firebaseAuth.currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      const firebaseDb = await getFirebaseDb();
      const userDocRef = doc(firebaseDb, 'users', firebaseAuth.currentUser.uid);
      
      const updates: any = {
        isNewUser: false,
        updatedAt: serverTimestamp(),
      };

      if (displayName) {
        // Update both Firebase Auth and Firestore
        await updateProfile(firebaseAuth.currentUser, { displayName });
        updates.displayName = displayName;
      }

      await updateDoc(userDocRef, updates);
    } catch (error) {
      console.error('Error completing first-time setup:', error);
      throw new Error('Failed to complete setup');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();