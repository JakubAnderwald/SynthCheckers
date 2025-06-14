import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { friendService } from '../services/friendService';
import * as firebase from '../lib/firebase';

// Mock Firebase
vi.mock('../lib/firebase');
const mockGetFirebaseDb = vi.mocked(firebase.getFirebaseDb);

// Mock Firestore functions
const mockAddDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ seconds: Date.now() / 1000 }));

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: any[]) => mockAddDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

describe('FriendService', () => {
  const mockDb = { collection: mockCollection };
  const mockUserData = {
    displayName: 'Test User',
    photoURL: 'test-photo.jpg',
    isOnline: true,
    lastOnline: { toDate: () => new Date() },
    eloRating: 1500,
  };

  beforeEach(() => {
    mockGetFirebaseDb.mockResolvedValue(mockDb as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('sendFriendRequest', () => {
    it('should send a friend request successfully', async () => {
      const mockDocRef = { id: 'request123' };
      mockAddDoc.mockResolvedValue(mockDocRef);
      
      // Mock existing relationship check (should return false)
      mockGetDocs.mockResolvedValue({ empty: true });

      const result = await friendService.sendFriendRequest('user1', 'user2', 'Hello!');

      expect(result).toBe('request123');
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fromUid: 'user1',
          toUid: 'user2',
          message: 'Hello!',
          status: 'pending',
        })
      );
    });

    it('should prevent sending request to self', async () => {
      await expect(
        friendService.sendFriendRequest('user1', 'user1', 'Hello!')
      ).rejects.toThrow('Cannot send friend request to yourself');
    });

    it('should prevent duplicate friend requests', async () => {
      // Mock existing relationship (not empty)
      mockGetDocs.mockResolvedValue({ empty: false });

      await expect(
        friendService.sendFriendRequest('user1', 'user2', 'Hello!')
      ).rejects.toThrow('Friendship or pending request already exists');
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept a friend request successfully', async () => {
      const mockRequestData = {
        fromUid: 'user1',
        toUid: 'user2',
        status: 'pending',
        createdAt: mockServerTimestamp(),
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockRequestData,
      });

      await friendService.acceptFriendRequest('request123', 'user2');

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          user1Uid: 'user1',
          user2Uid: 'user2',
          status: 'accepted',
          initiatedBy: 'user1',
        })
      );
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'accepted',
        })
      );
    });

    it('should reject unauthorized acceptance', async () => {
      const mockRequestData = {
        fromUid: 'user1',
        toUid: 'user2',
        status: 'pending',
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockRequestData,
      });

      await expect(
        friendService.acceptFriendRequest('request123', 'user3')
      ).rejects.toThrow('Not authorized to accept this request');
    });
  });

  describe('getFriends', () => {
    it('should retrieve friends list successfully', async () => {
      const mockFriendshipDocs = [
        {
          id: 'friendship1',
          data: () => ({
            user1Uid: 'currentUser',
            user2Uid: 'friend1',
            status: 'accepted',
            createdAt: { toDate: () => new Date() },
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockFriendshipDocs });
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockUserData,
      });

      const friends = await friendService.getFriends('currentUser');

      expect(friends).toHaveLength(1);
      expect(friends[0]).toMatchObject({
        uid: 'friend1',
        displayName: 'Test User',
        eloRating: 1500,
        status: 'accepted',
        friendshipId: 'friendship1',
      });
    });

    it('should return empty array when no friends exist', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const friends = await friendService.getFriends('currentUser');

      expect(friends).toHaveLength(0);
    });
  });

  describe('removeFriend', () => {
    it('should remove a friend successfully', async () => {
      const mockFriendshipData = {
        user1Uid: 'user1',
        user2Uid: 'user2',
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockFriendshipData,
      });

      await friendService.removeFriend('friendship123', 'user1');

      expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything());
    });

    it('should reject unauthorized removal', async () => {
      const mockFriendshipData = {
        user1Uid: 'user1',
        user2Uid: 'user2',
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockFriendshipData,
      });

      await expect(
        friendService.removeFriend('friendship123', 'user3')
      ).rejects.toThrow('Not authorized to remove this friendship');
    });
  });

  describe('getPendingRequests', () => {
    it('should retrieve pending requests successfully', async () => {
      const mockIncomingRequest = {
        id: 'request1',
        data: () => ({
          fromUid: 'sender1',
          toUid: 'currentUser',
          message: 'Hello!',
          status: 'pending',
          createdAt: { toDate: () => new Date() },
        }),
      };

      const mockOutgoingRequest = {
        id: 'request2',
        data: () => ({
          fromUid: 'currentUser',
          toUid: 'recipient1',
          message: 'Hi there!',
          status: 'pending',
          createdAt: { toDate: () => new Date() },
        }),
      };

      // Mock incoming requests query
      mockGetDocs
        .mockResolvedValueOnce({ docs: [mockIncomingRequest] })
        .mockResolvedValueOnce({ docs: [mockOutgoingRequest] });

      // Mock user data for display names
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockUserData,
      });

      const requests = await friendService.getPendingRequests('currentUser');

      expect(requests.incoming).toHaveLength(1);
      expect(requests.outgoing).toHaveLength(1);
      expect(requests.incoming[0].type).toBe('incoming');
      expect(requests.outgoing[0].type).toBe('outgoing');
    });
  });

  describe('real-time listeners', () => {
    it('should set up friends change listener', async () => {
      const mockUnsubscribe = vi.fn();
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      const callback = vi.fn();
      const unsubscribe = await friendService.onFriendsChange('user1', callback);

      expect(mockOnSnapshot).toHaveBeenCalledTimes(2); // Two queries for user1 and user2
      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    });

    it('should set up friend requests change listener', async () => {
      const mockUnsubscribe = vi.fn();
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      const callback = vi.fn();
      const unsubscribe = await friendService.onFriendRequestsChange('user1', callback);

      expect(mockOnSnapshot).toHaveBeenCalledTimes(2); // Incoming and outgoing
      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    });
  });
});