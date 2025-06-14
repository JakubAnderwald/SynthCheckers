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
    const trimmedQuery = searchQuery.trim();
    
    console.log('Searching for users with query:', trimmedQuery);
    
    // Get all users and filter client-side for better search flexibility
    // For production, consider using a search service like Algolia for better performance
    const usersQuery = query(
      collection(firebaseDb, 'users'),
      limit(100) // Get more users to search through
    );

    const querySnapshot = await getDocs(usersQuery);
    const results: SearchResult[] = [];
    
    console.log('Found', querySnapshot.size, 'total users in database');

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Check if display name matches search query (case-insensitive)
      const displayName = userData.displayName || '';
      const matchesSearch = displayName.toLowerCase().includes(trimmedQuery.toLowerCase());
      
      console.log('User:', displayName, 'matches search:', matchesSearch, 'profileVisible:', userData.privacySettings?.profileVisible);
      
      // Only include users with public profiles and matching search
      if (matchesSearch && userData.privacySettings?.profileVisible !== false) {
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

    console.log('Search returned', results.length, 'results');
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