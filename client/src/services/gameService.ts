import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';

export interface GameChallenge {
  challengeId: string;
  fromUid: string;
  fromDisplayName: string;
  fromPhotoURL?: string;
  fromEloRating: number;
  toUid: string;
  toDisplayName: string;
  toPhotoURL?: string;
  toEloRating: number;
  gameType: 'ranked' | 'casual';
  timeControl?: TimeControl;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
}

export interface TimeControl {
  initialTime: number; // minutes
  increment: number; // seconds per move
}

export interface GameRoom {
  gameId: string;
  playerRed: GamePlayer;
  playerBlue: GamePlayer;
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  gameType: 'ranked' | 'casual';
  timeControl?: TimeControl;
  createdAt: Date;
  startedAt?: Date;
  currentTurn: 'red' | 'blue';
  moveHistory: GameMove[];
  boardState: string;
  winner?: 'red' | 'blue' | 'draw';
  endReason?: 'checkmate' | 'timeout' | 'resignation' | 'draw' | 'abandonment';
}

export interface GamePlayer {
  uid: string;
  displayName: string;
  eloRating: number;
  isReady: boolean;
  hasResigned: boolean;
  timeRemaining?: number;
}

export interface GameMove {
  moveNumber: number;
  player: 'red' | 'blue';
  from: [number, number];
  to: [number, number];
  captures?: [number, number][];
  promotedToKing?: boolean;
  timestamp: Date;
  timeSpent: number;
}

class GameService {
  /**
   * Send a game challenge to another player
   */
  async sendGameChallenge(
    fromUid: string,
    toUid: string,
    gameType: 'ranked' | 'casual',
    timeControl?: TimeControl,
    message?: string
  ): Promise<string> {
    console.log('GameService.sendGameChallenge called with:', { fromUid, toUid, gameType, timeControl, message });
    
    if (fromUid === toUid) {
      throw new Error('Cannot challenge yourself');
    }

    const firebaseDb = await getFirebaseDb();
    
    // Get player profiles for challenge data
    const fromUserDoc = await getDocs(query(collection(firebaseDb, 'users'), where('uid', '==', fromUid), limit(1)));
    const toUserDoc = await getDocs(query(collection(firebaseDb, 'users'), where('uid', '==', toUid), limit(1)));
    
    if (fromUserDoc.empty || toUserDoc.empty) {
      throw new Error('Player not found');
    }
    
    const fromUser = fromUserDoc.docs[0].data();
    const toUser = toUserDoc.docs[0].data();
    
    // Check for existing pending challenge between these players
    const existingChallenges = await getDocs(
      query(
        collection(firebaseDb, 'gameChallenges'),
        where('fromUid', '==', fromUid),
        where('toUid', '==', toUid),
        where('status', '==', 'pending')
      )
    );
    
    // Check if any existing challenges are actually still valid (not expired)
    let hasValidPendingChallenge = false;
    const now = new Date();
    
    for (const doc of existingChallenges.docs) {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      
      if (expiresAt > now) {
        // Challenge is still valid
        hasValidPendingChallenge = true;
      } else {
        // Challenge has expired, mark it as expired
        console.log('Marking expired challenge as expired:', doc.id);
        await updateDoc(doc.ref, { 
          status: 'expired',
          respondedAt: serverTimestamp()
        });
      }
    }
    
    if (hasValidPendingChallenge) {
      throw new Error('You already have a pending challenge with this player');
    }
    
    // Create challenge document
    const challengeData = {
      fromUid,
      fromDisplayName: fromUser.displayName,
      fromPhotoURL: fromUser.photoURL,
      fromEloRating: fromUser.eloRating || 1200,
      toUid,
      toDisplayName: toUser.displayName,
      toPhotoURL: toUser.photoURL,
      toEloRating: toUser.eloRating || 1200,
      gameType,
      timeControl: timeControl || null,
      message: message || '',
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    };

    const docRef = await addDoc(collection(firebaseDb, 'gameChallenges'), challengeData);
    console.log('Game challenge created successfully:', docRef.id);
    return docRef.id;
  }

  /**
   * Accept a game challenge and create a game room
   */
  async acceptGameChallenge(challengeId: string, currentUserUid: string): Promise<string> {
    console.log('Accepting game challenge:', challengeId);
    
    const firebaseDb = await getFirebaseDb();
    const challengeRef = doc(firebaseDb, 'gameChallenges', challengeId);
    
    // Get challenge details
    const challengeDoc = await getDocs(query(collection(firebaseDb, 'gameChallenges'), where('__name__', '==', challengeId)));
    if (challengeDoc.empty) {
      throw new Error('Challenge not found');
    }
    
    const challenge = challengeDoc.docs[0].data();
    
    if (challenge.toUid !== currentUserUid) {
      throw new Error('You are not the recipient of this challenge');
    }
    
    if (challenge.status !== 'pending') {
      throw new Error('This challenge is no longer available');
    }
    
    // Create game room
    const gameData = {
      playerRed: {
        uid: challenge.fromUid,
        displayName: challenge.fromDisplayName,
        eloRating: challenge.fromEloRating,
        isReady: true,
        hasResigned: false,
        timeRemaining: challenge.timeControl ? challenge.timeControl.initialTime * 60000 : null,
      },
      playerBlue: {
        uid: challenge.toUid,
        displayName: challenge.toDisplayName,
        eloRating: challenge.toEloRating,
        isReady: true,
        hasResigned: false,
        timeRemaining: challenge.timeControl ? challenge.timeControl.initialTime * 60000 : null,
      },
      status: 'waiting' as const,
      gameType: challenge.gameType,
      timeControl: challenge.timeControl,
      createdAt: serverTimestamp(),
      currentTurn: 'red' as const,
      moveHistory: [],
      boardState: 'initial', // Will be replaced with actual board state
    };
    
    const gameDocRef = await addDoc(collection(firebaseDb, 'gameRooms'), gameData);
    
    // Update challenge status
    await updateDoc(challengeRef, {
      status: 'accepted',
      respondedAt: serverTimestamp(),
    });
    
    console.log('Game room created:', gameDocRef.id);
    return gameDocRef.id;
  }

  /**
   * Decline a game challenge
   */
  async declineGameChallenge(challengeId: string, currentUserUid: string): Promise<void> {
    console.log('Declining game challenge:', challengeId);
    
    const firebaseDb = await getFirebaseDb();
    const challengeRef = doc(firebaseDb, 'gameChallenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'declined',
      respondedAt: serverTimestamp(),
    });
  }

  /**
   * Cancel a sent game challenge
   */
  async cancelGameChallenge(challengeId: string, currentUserUid: string): Promise<void> {
    console.log('Cancelling game challenge:', challengeId);
    
    const firebaseDb = await getFirebaseDb();
    const challengeRef = doc(firebaseDb, 'gameChallenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'cancelled',
    });
  }

  /**
   * Get all game challenges for a user (incoming and outgoing)
   */
  async getGameChallenges(userUid: string): Promise<{
    incoming: GameChallenge[];
    outgoing: GameChallenge[];
  }> {
    console.log('Loading game challenges for user:', userUid);
    
    try {
      const firebaseDb = await getFirebaseDb();
      
      // Get incoming challenges
      const incomingQuery = query(
        collection(firebaseDb, 'gameChallenges'),
        where('toUid', '==', userUid),
        where('status', 'in', ['pending', 'accepted', 'declined']),
        orderBy('createdAt', 'desc')
      );
      
      // Get outgoing challenges
      const outgoingQuery = query(
        collection(firebaseDb, 'gameChallenges'),
        where('fromUid', '==', userUid),
        where('status', 'in', ['pending', 'accepted', 'declined', 'cancelled']),
        orderBy('createdAt', 'desc')
      );
      
      console.log('Executing challenge queries...');
      const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
        getDocs(incomingQuery),
        getDocs(outgoingQuery)
      ]);
      
      console.log('Query results:', {
        incoming: incomingSnapshot.size,
        outgoing: outgoingSnapshot.size
      });
      
      const incoming: GameChallenge[] = [];
      const outgoing: GameChallenge[] = [];
      const now = new Date();
    
    // Process incoming challenges and check for expired ones
    for (const doc of incomingSnapshot.docs) {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      
      // If challenge is pending but expired, mark it as expired
      if (data.status === 'pending' && expiresAt <= now) {
        console.log('Auto-expiring incoming challenge:', doc.id);
        await updateDoc(doc.ref, { 
          status: 'expired',
          respondedAt: serverTimestamp()
        });
        // Don't add expired challenges to the list
        continue;
      }
      
      incoming.push({
        challengeId: doc.id,
        fromUid: data.fromUid,
        fromDisplayName: data.fromDisplayName,
        fromPhotoURL: data.fromPhotoURL,
        fromEloRating: data.fromEloRating,
        toUid: data.toUid,
        toDisplayName: data.toDisplayName,
        toPhotoURL: data.toPhotoURL,
        toEloRating: data.toEloRating,
        gameType: data.gameType,
        timeControl: data.timeControl,
        message: data.message,
        status: data.status,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        expiresAt: expiresAt,
        respondedAt: data.respondedAt?.toDate ? data.respondedAt.toDate() : (data.respondedAt ? new Date(data.respondedAt) : undefined),
      });
    }
    
    // Process outgoing challenges and check for expired ones
    for (const doc of outgoingSnapshot.docs) {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      
      // If challenge is pending but expired, mark it as expired
      if (data.status === 'pending' && expiresAt <= now) {
        console.log('Auto-expiring outgoing challenge:', doc.id);
        await updateDoc(doc.ref, { 
          status: 'expired',
          respondedAt: serverTimestamp()
        });
        // Don't add expired challenges to the list
        continue;
      }
      
      outgoing.push({
        challengeId: doc.id,
        fromUid: data.fromUid,
        fromDisplayName: data.fromDisplayName,
        fromPhotoURL: data.fromPhotoURL,
        fromEloRating: data.fromEloRating,
        toUid: data.toUid,
        toDisplayName: data.toDisplayName,
        toPhotoURL: data.toPhotoURL,
        toEloRating: data.toEloRating,
        gameType: data.gameType,
        timeControl: data.timeControl,
        message: data.message,
        status: data.status,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        expiresAt: expiresAt,
        respondedAt: data.respondedAt?.toDate ? data.respondedAt.toDate() : (data.respondedAt ? new Date(data.respondedAt) : undefined),
      });
      }
      
      return { incoming, outgoing };
    } catch (error) {
      console.error('Error loading game challenges:', error);
      throw error;
    }
  }

  /**
   * Set up real-time listener for game challenges
   */
  async onGameChallengesChange(
    userUid: string,
    callback: (challenges: { incoming: GameChallenge[]; outgoing: GameChallenge[] }) => void
  ): Promise<() => void> {
    const firebaseDb = await getFirebaseDb();
    
    const incomingQuery = query(
      collection(firebaseDb, 'gameChallenges'),
      where('toUid', '==', userUid),
      where('status', 'in', ['pending'])
    );
    
    const outgoingQuery = query(
      collection(firebaseDb, 'gameChallenges'),
      where('fromUid', '==', userUid),
      where('status', 'in', ['pending'])
    );
    
    let incomingChallenges: GameChallenge[] = [];
    let outgoingChallenges: GameChallenge[] = [];
    
    const unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
      incomingChallenges = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        incomingChallenges.push({
          challengeId: doc.id,
          fromUid: data.fromUid,
          fromDisplayName: data.fromDisplayName,
          fromPhotoURL: data.fromPhotoURL,
          fromEloRating: data.fromEloRating,
          toUid: data.toUid,
          toDisplayName: data.toDisplayName,
          toPhotoURL: data.toPhotoURL,
          toEloRating: data.toEloRating,
          gameType: data.gameType,
          timeControl: data.timeControl,
          message: data.message,
          status: data.status,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt),
          respondedAt: data.respondedAt?.toDate ? data.respondedAt.toDate() : (data.respondedAt ? new Date(data.respondedAt) : undefined),
        });
      });
      callback({ incoming: incomingChallenges, outgoing: outgoingChallenges });
    });
    
    const unsubscribeOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      outgoingChallenges = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        outgoingChallenges.push({
          challengeId: doc.id,
          fromUid: data.fromUid,
          fromDisplayName: data.fromDisplayName,
          fromPhotoURL: data.fromPhotoURL,
          fromEloRating: data.fromEloRating,
          toUid: data.toUid,
          toDisplayName: data.toDisplayName,
          toPhotoURL: data.toPhotoURL,
          toEloRating: data.toEloRating,
          gameType: data.gameType,
          timeControl: data.timeControl,
          message: data.message,
          status: data.status,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt),
          respondedAt: data.respondedAt?.toDate ? data.respondedAt.toDate() : (data.respondedAt ? new Date(data.respondedAt) : undefined),
        });
      });
      callback({ incoming: incomingChallenges, outgoing: outgoingChallenges });
    });
    
    return () => {
      unsubscribeIncoming();
      unsubscribeOutgoing();
    };
  }

  /**
   * Find and join a quick match game
   */
  async findQuickMatch(userUid: string, gameType: 'ranked' | 'casual'): Promise<string | null> {
    console.log('Finding quick match for user:', userUid, 'type:', gameType);
    
    const firebaseDb = await getFirebaseDb();
    
    // Look for existing waiting games
    const waitingGamesQuery = query(
      collection(firebaseDb, 'gameRooms'),
      where('status', '==', 'waiting'),
      where('gameType', '==', gameType),
      limit(10)
    );
    
    const waitingGames = await getDocs(waitingGamesQuery);
    
    // Find a suitable opponent
    for (const gameDoc of waitingGames.docs) {
      const game = gameDoc.data();
      const opponent = game.playerRed.uid !== userUid ? game.playerRed : game.playerBlue;
      
      if (opponent.uid !== userUid) {
        // Join this game
        const userDoc = await getDocs(query(collection(firebaseDb, 'users'), where('uid', '==', userUid), limit(1)));
        if (userDoc.empty) continue;
        
        const userData = userDoc.docs[0].data();
        
        // Update game with second player
        const gameRef = doc(firebaseDb, 'gameRooms', gameDoc.id);
        const updateData = game.playerRed.uid === userUid ? {
          playerRed: {
            uid: userUid,
            displayName: userData.displayName,
            eloRating: userData.eloRating || 1200,
            isReady: true,
            hasResigned: false,
            timeRemaining: game.timeControl ? game.timeControl.initialTime * 60000 : null,
          },
          status: 'active',
          startedAt: serverTimestamp(),
        } : {
          playerBlue: {
            uid: userUid,
            displayName: userData.displayName,
            eloRating: userData.eloRating || 1200,
            isReady: true,
            hasResigned: false,
            timeRemaining: game.timeControl ? game.timeControl.initialTime * 60000 : null,
          },
          status: 'active',
          startedAt: serverTimestamp(),
        };
        
        await updateDoc(gameRef, updateData);
        console.log('Joined existing game:', gameDoc.id);
        return gameDoc.id;
      }
    }
    
    // No suitable game found, create a new one
    const userDoc = await getDocs(query(collection(firebaseDb, 'users'), where('uid', '==', userUid), limit(1)));
    if (userDoc.empty) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.docs[0].data();
    
    const gameData = {
      playerRed: {
        uid: userUid,
        displayName: userData.displayName,
        eloRating: userData.eloRating || 1200,
        isReady: true,
        hasResigned: false,
        timeRemaining: null, // No time control for quick match
      },
      playerBlue: {
        uid: '',
        displayName: '',
        eloRating: 0,
        isReady: false,
        hasResigned: false,
        timeRemaining: null,
      },
      status: 'waiting' as const,
      gameType,
      timeControl: null,
      createdAt: serverTimestamp(),
      currentTurn: 'red' as const,
      moveHistory: [],
      boardState: 'initial',
    };
    
    const gameDocRef = await addDoc(collection(firebaseDb, 'gameRooms'), gameData);
    console.log('Created new waiting game:', gameDocRef.id);
    return gameDocRef.id;
  }
}

export const gameService = new GameService();