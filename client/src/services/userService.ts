import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  startAt,
  endAt
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
  const firebaseDb = await getFirebaseDb();
  
  const normalizedQuery = searchQuery.toLowerCase().trim();
  
  // Create query for partial matching using range queries
  const usersQuery = query(
    collection(firebaseDb, 'users'),
    orderBy('displayName'),
    startAt(normalizedQuery),
    endAt(normalizedQuery + '\uf8ff'),
    limit(20)
  );

  try {
    const snapshot = await getDocs(usersQuery);
    const results: SearchResult[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Additional client-side filtering for better matching
      const displayNameLower = data.displayName?.toLowerCase() || '';
      if (displayNameLower.includes(normalizedQuery)) {
        results.push({
          uid: doc.id,
          displayName: data.displayName || 'Unknown',
          photoURL: data.photoURL,
          eloRating: data.eloRating || 1200,
          totalGames: data.totalGames || 0,
          wins: data.wins || 0,
          losses: data.losses || 0,
          isOnline: data.isOnline || false,
          lastOnline: data.lastOnline?.toDate() || new Date(),
        });
      }
    });

    // Sort by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aExact = a.displayName.toLowerCase() === normalizedQuery;
      const bExact = b.displayName.toLowerCase() === normalizedQuery;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // If both are exact or both are partial, sort by display name
      return a.displayName.localeCompare(b.displayName);
    });

    return results;
  } catch (error) {
    console.error('Error searching users:', error);
    throw new Error('Failed to search users');
  }
}

/**
 * Get user profile by UID for public viewing
 */
export async function getUserProfile(uid: string): Promise<SearchResult | null> {
  const firebaseDb = await getFirebaseDb();
  
  try {
    const userDoc = await getDocs(
      query(collection(firebaseDb, 'users'), where('uid', '==', uid), limit(1))
    );
    
    if (userDoc.empty) {
      return null;
    }
    
    const data = userDoc.docs[0].data();
    
    return {
      uid: userDoc.docs[0].id,
      displayName: data.displayName || 'Unknown',
      photoURL: data.photoURL,
      eloRating: data.eloRating || 1200,
      totalGames: data.totalGames || 0,
      wins: data.wins || 0,
      losses: data.losses || 0,
      isOnline: data.isOnline || false,
      lastOnline: data.lastOnline?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}