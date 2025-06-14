import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs, 
  getDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import type { Friendship, FriendRequest } from '../types/firestore';

export interface FriendshipStatus {
  uid: string;
  displayName: string;
  photoURL?: string;
  isOnline: boolean;
  lastOnline: Date;
  eloRating: number;
  status: 'pending' | 'accepted' | 'blocked';
  friendshipId: string;
  createdAt: Date;
}

export interface PendingFriendRequest {
  requestId: string;
  fromUid: string;
  fromDisplayName: string;
  fromPhotoURL?: string;
  toUid: string;
  message?: string;
  createdAt: Date;
  type: 'incoming' | 'outgoing';
}

class FriendService {
  /**
   * Send a friend request to another user
   */
  async sendFriendRequest(
    fromUid: string, 
    toUid: string, 
    message?: string
  ): Promise<string> {
    if (fromUid === toUid) {
      throw new Error('Cannot send friend request to yourself');
    }

    const firebaseDb = await getFirebaseDb();
    
    // Check if friendship or pending request already exists
    const existingFriendship = await this.checkExistingRelationship(fromUid, toUid);
    if (existingFriendship) {
      throw new Error('Friendship or pending request already exists');
    }

    // Create friend request document
    const requestData = {
      fromUid,
      toUid,
      message: message || '',
      status: 'pending' as const,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firebaseDb, 'friendRequests'), requestData);
    return docRef.id;
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(requestId: string, currentUserUid: string): Promise<void> {
    const firebaseDb = await getFirebaseDb();
    
    // Get the friend request
    const requestDoc = await getDoc(doc(firebaseDb, 'friendRequests', requestId));
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }

    const requestData = requestDoc.data();
    if (requestData.toUid !== currentUserUid) {
      throw new Error('Not authorized to accept this request');
    }

    if (requestData.status !== 'pending') {
      throw new Error('Request is no longer pending');
    }

    // Create friendship document
    const friendshipData = {
      user1Uid: requestData.fromUid,
      user2Uid: requestData.toUid,
      status: 'accepted' as const,
      initiatedBy: requestData.fromUid,
      createdAt: requestData.createdAt,
      acceptedAt: serverTimestamp(),
    };

    // Add friendship and update request status
    await addDoc(collection(firebaseDb, 'friendships'), friendshipData);
    await updateDoc(doc(firebaseDb, 'friendRequests', requestId), {
      status: 'accepted',
      respondedAt: serverTimestamp(),
    });
  }

  /**
   * Decline a friend request
   */
  async declineFriendRequest(requestId: string, currentUserUid: string): Promise<void> {
    const firebaseDb = await getFirebaseDb();
    
    const requestDoc = await getDoc(doc(firebaseDb, 'friendRequests', requestId));
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }

    const requestData = requestDoc.data();
    if (requestData.toUid !== currentUserUid) {
      throw new Error('Not authorized to decline this request');
    }

    await updateDoc(doc(firebaseDb, 'friendRequests', requestId), {
      status: 'declined',
      respondedAt: serverTimestamp(),
    });
  }

  /**
   * Cancel a sent friend request
   */
  async cancelFriendRequest(requestId: string, currentUserUid: string): Promise<void> {
    const firebaseDb = await getFirebaseDb();
    
    const requestDoc = await getDoc(doc(firebaseDb, 'friendRequests', requestId));
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }

    const requestData = requestDoc.data();
    if (requestData.fromUid !== currentUserUid) {
      throw new Error('Not authorized to cancel this request');
    }

    await updateDoc(doc(firebaseDb, 'friendRequests', requestId), {
      status: 'cancelled',
      respondedAt: serverTimestamp(),
    });
  }

  /**
   * Remove a friend (delete friendship)
   */
  async removeFriend(friendshipId: string, currentUserUid: string): Promise<void> {
    const firebaseDb = await getFirebaseDb();
    
    const friendshipDoc = await getDoc(doc(firebaseDb, 'friendships', friendshipId));
    if (!friendshipDoc.exists()) {
      throw new Error('Friendship not found');
    }

    const friendshipData = friendshipDoc.data();
    if (friendshipData.user1Uid !== currentUserUid && friendshipData.user2Uid !== currentUserUid) {
      throw new Error('Not authorized to remove this friendship');
    }

    await deleteDoc(doc(firebaseDb, 'friendships', friendshipId));
  }

  /**
   * Get all friends for a user
   */
  async getFriends(userUid: string): Promise<FriendshipStatus[]> {
    const firebaseDb = await getFirebaseDb();
    
    const friendshipsQuery = query(
      collection(firebaseDb, 'friendships'),
      where('user1Uid', '==', userUid)
    );
    
    const friendshipsQuery2 = query(
      collection(firebaseDb, 'friendships'),
      where('user2Uid', '==', userUid)
    );

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(friendshipsQuery),
      getDocs(friendshipsQuery2)
    ]);

    const friendships = [...snapshot1.docs, ...snapshot2.docs];
    const friends: FriendshipStatus[] = [];

    for (const friendshipDoc of friendships) {
      const friendshipData = friendshipDoc.data();
      const friendUid = friendshipData.user1Uid === userUid 
        ? friendshipData.user2Uid 
        : friendshipData.user1Uid;

      // Get friend's profile
      const userDoc = await getDoc(doc(firebaseDb, 'users', friendUid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        friends.push({
          uid: friendUid,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          isOnline: userData.isOnline || false,
          lastOnline: userData.lastOnline?.toDate() || new Date(),
          eloRating: userData.eloRating || 1200,
          status: 'accepted',
          friendshipId: friendshipDoc.id,
          createdAt: friendshipData.createdAt?.toDate() || new Date(),
        });
      }
    }

    return friends.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Get pending friend requests (incoming and outgoing)
   */
  async getPendingRequests(userUid: string): Promise<{
    incoming: PendingFriendRequest[];
    outgoing: PendingFriendRequest[];
  }> {
    const firebaseDb = await getFirebaseDb();
    
    // Get incoming requests
    const incomingQuery = query(
      collection(firebaseDb, 'friendRequests'),
      where('toUid', '==', userUid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    // Get outgoing requests
    const outgoingQuery = query(
      collection(firebaseDb, 'friendRequests'),
      where('fromUid', '==', userUid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
      getDocs(incomingQuery),
      getDocs(outgoingQuery)
    ]);

    const incoming: PendingFriendRequest[] = [];
    const outgoing: PendingFriendRequest[] = [];

    // Process incoming requests
    for (const requestDoc of incomingSnapshot.docs) {
      const requestData = requestDoc.data();
      const fromUserDoc = await getDoc(doc(firebaseDb, 'users', requestData.fromUid));
      
      if (fromUserDoc.exists()) {
        const fromUserData = fromUserDoc.data();
        incoming.push({
          requestId: requestDoc.id,
          fromUid: requestData.fromUid,
          fromDisplayName: fromUserData.displayName,
          fromPhotoURL: fromUserData.photoURL,
          toUid: requestData.toUid,
          message: requestData.message,
          createdAt: requestData.createdAt?.toDate() || new Date(),
          type: 'incoming',
        });
      }
    }

    // Process outgoing requests
    for (const requestDoc of outgoingSnapshot.docs) {
      const requestData = requestDoc.data();
      const toUserDoc = await getDoc(doc(firebaseDb, 'users', requestData.toUid));
      
      if (toUserDoc.exists()) {
        const toUserData = toUserDoc.data();
        outgoing.push({
          requestId: requestDoc.id,
          fromUid: requestData.fromUid,
          fromDisplayName: toUserData.displayName,
          fromPhotoURL: toUserData.photoURL,
          toUid: requestData.toUid,
          message: requestData.message,
          createdAt: requestData.createdAt?.toDate() || new Date(),
          type: 'outgoing',
        });
      }
    }

    return { incoming, outgoing };
  }

  /**
   * Check if friendship or pending request exists between two users
   */
  private async checkExistingRelationship(user1Uid: string, user2Uid: string): Promise<boolean> {
    const firebaseDb = await getFirebaseDb();
    
    // Check for existing friendship
    const friendshipQuery1 = query(
      collection(firebaseDb, 'friendships'),
      where('user1Uid', '==', user1Uid),
      where('user2Uid', '==', user2Uid)
    );
    
    const friendshipQuery2 = query(
      collection(firebaseDb, 'friendships'),
      where('user1Uid', '==', user2Uid),
      where('user2Uid', '==', user1Uid)
    );

    // Check for pending requests
    const requestQuery1 = query(
      collection(firebaseDb, 'friendRequests'),
      where('fromUid', '==', user1Uid),
      where('toUid', '==', user2Uid),
      where('status', '==', 'pending')
    );
    
    const requestQuery2 = query(
      collection(firebaseDb, 'friendRequests'),
      where('fromUid', '==', user2Uid),
      where('toUid', '==', user1Uid),
      where('status', '==', 'pending')
    );

    const [friendship1, friendship2, request1, request2] = await Promise.all([
      getDocs(friendshipQuery1),
      getDocs(friendshipQuery2),
      getDocs(requestQuery1),
      getDocs(requestQuery2)
    ]);

    return !friendship1.empty || !friendship2.empty || !request1.empty || !request2.empty;
  }

  /**
   * Set up real-time listener for friends list
   */
  async onFriendsChange(userUid: string, callback: (friends: FriendshipStatus[]) => void): Promise<() => void> {
    const firebaseDb = await getFirebaseDb();
    
    // Listen to friendships where user is user1
    const unsubscribe1 = onSnapshot(
      query(
        collection(firebaseDb, 'friendships'),
        where('user1Uid', '==', userUid)
      ),
      () => this.getFriends(userUid).then(callback)
    );

    // Listen to friendships where user is user2
    const unsubscribe2 = onSnapshot(
      query(
        collection(firebaseDb, 'friendships'),
        where('user2Uid', '==', userUid)
      ),
      () => this.getFriends(userUid).then(callback)
    );

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }

  /**
   * Set up real-time listener for friend requests
   */
  async onFriendRequestsChange(
    userUid: string, 
    callback: (requests: { incoming: PendingFriendRequest[]; outgoing: PendingFriendRequest[] }) => void
  ): Promise<() => void> {
    const firebaseDb = await getFirebaseDb();
    
    // Listen to incoming requests
    const unsubscribe1 = onSnapshot(
      query(
        collection(firebaseDb, 'friendRequests'),
        where('toUid', '==', userUid),
        where('status', '==', 'pending')
      ),
      () => this.getPendingRequests(userUid).then(callback)
    );

    // Listen to outgoing requests
    const unsubscribe2 = onSnapshot(
      query(
        collection(firebaseDb, 'friendRequests'),
        where('fromUid', '==', userUid),
        where('status', '==', 'pending')
      ),
      () => this.getPendingRequests(userUid).then(callback)
    );

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }
}

export const friendService = new FriendService();