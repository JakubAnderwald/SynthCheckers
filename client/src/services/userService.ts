import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  doc,
  getDoc
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';

export interface SearchResult {
  uid: string;
  displayName: string;
  photoURL?: string;
  eloRating: number;
  totalGames: number;
  wins: number;
  losses: number;
  isOnline: boolean;
  lastOnline: Date;
}

/**
 * Search for users by display name
 * Note: Currently returns sample data due to Firestore permissions
 */
export async function searchUsers(searchQuery: string): Promise<SearchResult[]> {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return [];
  }

  try {
    // Return sample users for testing while Firestore rules are being updated
    const sampleUsers: SearchResult[] = [
      {
        uid: 'sample1',
        displayName: 'TestUser1',
        photoURL: undefined,
        eloRating: 1250,
        totalGames: 15,
        wins: 8,
        losses: 7,
        isOnline: true,
        lastOnline: new Date()
      },
      {
        uid: 'sample2',
        displayName: 'Player2',
        photoURL: undefined,
        eloRating: 1180,
        totalGames: 22,
        wins: 10,
        losses: 12,
        isOnline: false,
        lastOnline: new Date(Date.now() - 300000) // 5 minutes ago
      },
      {
        uid: 'sample3',
        displayName: 'GameMaster',
        photoURL: undefined,
        eloRating: 1340,
        totalGames: 45,
        wins: 28,
        losses: 17,
        isOnline: true,
        lastOnline: new Date()
      }
    ];

    const trimmedQuery = searchQuery.trim().toLowerCase();
    return sampleUsers.filter(user => 
      user.displayName.toLowerCase().includes(trimmedQuery)
    );
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Get user profile by UID for public viewing
 */
export async function getUserProfile(uid: string): Promise<SearchResult | null> {
  try {
    const firebaseDb = await getFirebaseDb();
    const userDoc = await getDoc(doc(firebaseDb, 'users', uid));
    
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    
    // Check if profile is public
    if (userData.privacySettings?.profileVisible === false) {
      return null;
    }

    return {
      uid: userData.uid,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      eloRating: userData.eloRating || 1200,
      totalGames: userData.totalGames || 0,
      wins: userData.wins || 0,
      losses: userData.losses || 0,
      isOnline: userData.isOnline || false,
      lastOnline: userData.lastOnline?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}