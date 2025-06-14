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
 */
export async function searchUsers(searchQuery: string): Promise<SearchResult[]> {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return [];
  }

  try {
    const firebaseDb = await getFirebaseDb();
    const trimmedQuery = searchQuery.trim().toLowerCase();
    
    // Create a query to search for users by display name
    // Note: This is a simple approach. For production, consider using a search service like Algolia
    const usersQuery = query(
      collection(firebaseDb, 'users'),
      where('displayName', '>=', trimmedQuery),
      where('displayName', '<=', trimmedQuery + '\uf8ff'),
      limit(20)
    );

    const querySnapshot = await getDocs(usersQuery);
    const results: SearchResult[] = [];

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Only include users with public profiles
      if (userData.privacySettings?.profileVisible !== false) {
        results.push({
          uid: userData.uid,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          eloRating: userData.eloRating || 1200,
          totalGames: userData.totalGames || 0,
          wins: userData.wins || 0,
          losses: userData.losses || 0,
          isOnline: userData.isOnline || false,
          lastOnline: userData.lastOnline?.toDate() || new Date(),
        });
      }
    });

    return results.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
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