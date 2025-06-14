# Technical Design Document: User Accounts & Online Multiplayer

## Introduction & Purpose

This Technical Design Document outlines the technical implementation approach for adding user accounts, authentication, and online multiplayer functionality to Synth Checkers. The document serves as a bridge between the product requirements and the detailed implementation tasks, providing developers with the architectural decisions, data models, and technical specifications needed to build these features.

## PRD Reference

**Based on:** `prd-multiplayer-accounts.md`

## Technical Goals

- Achieve sub-200ms API response times for game moves and matchmaking requests
- Support concurrent gameplay for up to 100 simultaneous matches (200 active users)
- Ensure 99.9% uptime for authentication and game session management
- Implement secure user data handling with OAuth 2.0 compliance
- Design extensible database schema for future features (tournaments, advanced stats)
- Maintain real-time synchronization with <100ms latency between players
- Enable horizontal scaling of WebSocket connections through clustering

## Technical Overview & Architecture

### High-Level Architecture
The implementation will leverage Firebase Spark plan services with the following architecture:

1. **Authentication Layer**: Firebase Authentication with Google OAuth provider
2. **Database**: Firestore (NoSQL) for all persistent data storage
3. **Real-time Communication**: Firestore real-time listeners for game state synchronization
4. **Frontend Hosting**: Firebase Hosting for static React app deployment
5. **Game Logic**: Client-side validation with Firestore security rules for server-side validation

### Firebase Spark Plan Constraints & Solutions
- **No Cloud Functions**: All game logic runs client-side with Firestore security rules for validation
- **No Custom Backend**: Replace Express.js server with Firebase SDK integration
- **Firestore Limitations**: 1 GB storage, 50K reads/day, 20K writes/day - sufficient for initial user base
- **No WebSockets**: Use Firestore real-time listeners for live game updates

### Alignment with PRD Constraints
- **Turn-based gameplay**: Firestore document listeners provide real-time turn updates
- **Firebase authentication**: Full Firebase Auth integration with Google OAuth
- **Scalability**: Firebase auto-scales within Spark plan limits, can upgrade to Blaze when needed

### Key Architectural Decisions
- **Firestore real-time listeners over WebSockets**: Ensures real-time experience within Firebase constraints
- **Client-side game validation + Firestore rules**: Prevents cheating through database security rules
- **Document-based storage**: Game state stored as Firestore documents with atomic updates
- **ELO calculation**: Client-side calculation with Firestore transaction validation

## Data Model Design

### Firestore Collections Structure

```typescript
// users collection
interface User {
  uid: string; // Firebase Auth UID (document ID)
  email: string;
  displayName: string;
  eloRating: number; // default: 1200
  totalGames: number; // default: 0
  wins: number; // default: 0
  losses: number; // default: 0
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastOnline: Timestamp;
  isOnline: boolean; // default: false
}

// friendships subcollection under users/{uid}/friendships/{friendUid}
interface Friendship {
  friendUid: string;
  friendDisplayName: string;
  status: 'pending' | 'accepted' | 'declined';
  requestedBy: string; // UID of requester
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// games collection
interface Game {
  id: string; // Firestore auto-generated ID
  player1Uid: string;
  player2Uid: string;
  player1DisplayName: string;
  player2DisplayName: string;
  currentTurn: string; // UID of current player
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  winner?: string; // UID of winner
  boardState: {
    pieces: Array<{
      id: string;
      color: 'red' | 'blue';
      type: 'normal' | 'king';
      position: { row: number; col: number };
    }>;
  };
  player1EloBefore: number;
  player2EloBefore: number;
  player1EloAfter?: number;
  player2EloAfter?: number;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  totalMoves: number;
  lastActivity: Timestamp; // for timeout detection
}

// moves subcollection under games/{gameId}/moves/{moveId}
interface GameMove {
  id: string;
  playerUid: string;
  moveNumber: number;
  from: { row: number; col: number };
  to: { row: number; col: number };
  capturedPieces: Array<{ row: number; col: number }>;
  piecePromoted: boolean;
  timestamp: Timestamp;
}

// matchmaking collection
interface MatchmakingEntry {
  id: string; // Firestore auto-generated ID
  userUid: string;
  displayName: string;
  eloRating: number;
  joinedAt: Timestamp;
  preferences: {
    timeControl?: string; // future feature
  };
}

// gameInvitations collection
interface GameInvitation {
  id: string;
  fromUid: string;
  toUid: string;
  fromDisplayName: string;
  toDisplayName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp; // 5 minutes from creation
}
```

### Data Lifecycle & Integrity

**User Account Deletion:**
- Games remain in database with NULL player references for historical data
- Friend relationships are cascade deleted
- Matchmaking queue entries are cascade deleted
- ELO history is preserved for opponents (games table remains)

**Game Completion:**
- Move validation occurs before database persistence
- ELO ratings are calculated and updated atomically using database transactions
- Game state transitions: active → completed/abandoned

**Complex Data Handling:**
- **ELO Calculation**: Standard ELO formula with K-factor of 32 for new players (<10 games), 16 for established players
- **Game State Synchronization**: In-memory game state is source of truth during active games, persisted to database on each move
- **Friend Status**: Real-time updates via WebSocket when friends come online/offline

## Firebase SDK Operations

### Authentication Operations
```typescript
// Firebase Auth with Google Provider
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';

// Sign in with Google
const googleProvider = new GoogleAuthProvider();
await signInWithPopup(auth, googleProvider);

// Sign out
await signOut(auth);

// Listen to auth state changes
onAuthStateChanged(auth, (user) => {
  // Handle user state
});
```

### User Management Operations
```typescript
// Get user profile (public data)
const userDoc = await getDoc(doc(db, 'users', userId));

// Update own profile  
await updateDoc(doc(db, 'users', currentUser.uid), {
  displayName: newDisplayName,
  updatedAt: serverTimestamp()
});

// Search users by display name
const usersQuery = query(
  collection(db, 'users'),
  where('displayName', '>=', searchTerm),
  where('displayName', '<=', searchTerm + '\uf8ff'),
  limit(10)
);
```

### Friend System Operations
```typescript
// Get friends list with real-time updates
const friendsRef = collection(db, 'users', currentUser.uid, 'friendships');
onSnapshot(friendsRef, (snapshot) => {
  // Handle friends list updates
});

// Send friend request
await setDoc(doc(db, 'users', currentUser.uid, 'friendships', friendUid), {
  friendUid,
  friendDisplayName,
  status: 'pending',
  requestedBy: currentUser.uid,
  createdAt: serverTimestamp()
});

// Accept/decline friend request (Firestore transaction)
await runTransaction(db, async (transaction) => {
  // Update both users' friendship documents
});
```

### Matchmaking Operations
```typescript
// Join matchmaking queue
await addDoc(collection(db, 'matchmaking'), {
  userUid: currentUser.uid,
  displayName: currentUser.displayName,
  eloRating: userProfile.eloRating,
  joinedAt: serverTimestamp()
});

// Listen for matchmaking updates
const matchmakingQuery = query(
  collection(db, 'matchmaking'),
  where('eloRating', '>=', userElo - 100),
  where('eloRating', '<=', userElo + 100),
  orderBy('joinedAt')
);
onSnapshot(matchmakingQuery, (snapshot) => {
  // Handle potential matches
});
```

### Game Management Operations
```typescript
// Get user's game history
const gamesQuery = query(
  collection(db, 'games'),
  where('player1Uid', '==', currentUser.uid),
  orderBy('startedAt', 'desc'),
  limit(20)
);

// Listen to active game updates
const gameRef = doc(db, 'games', gameId);
onSnapshot(gameRef, (doc) => {
  // Handle game state changes
});

// Make a move (Firestore transaction)
await runTransaction(db, async (transaction) => {
  const gameDoc = await transaction.get(gameRef);
  // Validate move and update game state
  transaction.update(gameRef, newGameState);
});
```

### Real-time Data Synchronization
```typescript
// Real-time listeners replace WebSocket events
// Game state updates
onSnapshot(doc(db, 'games', gameId), (doc) => {
  const gameData = doc.data();
  // Update local game state
});

// Friend online status
onSnapshot(collection(db, 'users', currentUser.uid, 'friendships'), (snapshot) => {
  // Check lastOnline timestamps for friend status
});

// Matchmaking notifications
onSnapshot(collection(db, 'gameInvitations'), (snapshot) => {
  // Handle game invitations
});
```

## Module/Component Breakdown

### Firebase Services Layer

**FirebaseAuthService** (`client/src/services/auth.ts`)
- Firebase Auth integration with Google provider
- User session management and persistence
- User profile creation and updates in Firestore

**FirebaseGameService** (`client/src/services/game.ts`)
- Game state management with Firestore transactions
- Move validation logic (client-side + Firestore rules)
- ELO calculation with atomic updates

**FirebaseMatchmakingService** (`client/src/services/matchmaking.ts`)
- Matchmaking queue management
- ELO-based opponent pairing
- Game invitation system

**FirebaseDataService** (`client/src/services/database.ts`)
- Firestore document operations
- Real-time listener management
- Data validation and type safety

**FirestoreSecurityRules** (`firestore.rules`)
- Server-side validation to prevent cheating
- User permission enforcement
- Data integrity constraints

### Frontend Components

**AuthProvider** (`client/src/contexts/AuthContext.tsx`)
- Google OAuth integration on frontend
- User state management
- Protected route handling

**UserProfile** (`client/src/components/profile/`)
- Profile display and editing
- Statistics visualization
- Game history components

**FriendSystem** (`client/src/components/friends/`)
- Friends list with online indicators
- Friend request management
- Friend invitation flows

**MatchmakingUI** (`client/src/components/matchmaking/`)
- Queue joining interface
- Match found notifications
- Private game creation

**OnlineGameBoard** (`client/src/components/game/OnlineBoard.tsx`)
- Extension of existing Board component
- WebSocket integration for move synchronization
- Turn indicators and opponent information

**GameStore** (`client/src/stores/useOnlineGameStore.ts`)
- WebSocket connection management
- Online game state synchronization
- Move validation and submission

## Error Handling & Logging Strategy

### Error Categories
1. **Authentication Errors**: Firebase Auth failures, token expiration
2. **Validation Errors**: Invalid moves, Firestore rule violations
3. **Network Errors**: Firestore connection issues, listener failures
4. **Game Logic Errors**: Illegal game states, transaction conflicts

### Error Response Format
```typescript
interface FirebaseError {
  code: string; // Firebase error code (e.g., 'auth/user-not-found')
  message: string;
  details?: any;
}
```

### Logging Strategy (Firebase Analytics)
- **Game Events**: Move attempts, game completions, user engagement
- **Authentication**: Login success/failure, user registration
- **Performance**: Firestore read/write latency, offline behavior
- **Errors**: Client-side error tracking with Firebase Crashlytics

### Client Error Handling
- Toast notifications for user-facing errors
- Graceful degradation for offline scenarios
- Automatic retry for failed Firestore operations
- Error boundaries for React component crashes
- Firebase offline persistence for better UX

## Security Considerations

### Authentication Security
- Firebase Authentication with Google OAuth 2.0 provider
- Automatic token refresh and secure session management
- Built-in CSRF protection through Firebase Auth
- Firebase App Check for app attestation (optional upgrade from Spark)

### Game Security (Firestore Security Rules)
```javascript
// Prevent cheating through server-side validation
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Game documents validation
    match /games/{gameId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.player1Uid || 
         request.auth.uid == resource.data.player2Uid);
      
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.currentTurn &&
        validateMove(request.auth.uid, gameId);
    }
  }
}
```

### Data Protection
- User emails managed securely by Firebase Auth
- Firestore security rules enforce data access permissions
- ELO ratings and game statistics are publicly readable
- Friend relationships require mutual acceptance
- No sensitive data stored in client-accessible documents

## Performance & Scalability Considerations

### Firestore Optimization (Spark Plan Limits)
- Composite indexes for complex queries (ELO + timestamp for matchmaking)
- Pagination using startAfter() for game history and leaderboards
- Efficient query structure to minimize read operations
- Document denormalization to reduce query complexity

### Real-time Listener Management
- Selective listener attachment/detachment to minimize bandwidth
- Local state caching to reduce redundant Firestore reads
- Batch writes for multiple document updates
- Offline persistence for better user experience

### Firebase Spark Plan Constraints
- **Daily Limits**: 50K document reads, 20K writes, 20K deletes
- **Storage**: 1GB total database size
- **Concurrent Connections**: 100 simultaneous connections
- **Bandwidth**: 10GB/month outbound data transfer

### Expected Load within Spark Limits
- Target: 20-30 concurrent games (40-60 active players)
- Database: <1,000 registered users initially
- Firestore reads: ~40K/day (within 50K limit)
- Firestore writes: ~15K/day (within 20K limit)

### Optimization Strategies
- Cache user profiles locally to reduce reads
- Batch game moves to minimize write operations
- Use compound queries to reduce document reads
- Implement efficient pagination for large collections

## Testing Strategy

### Unit Tests
- Game logic validation (move rules, ELO calculations)
- Firebase Auth integration and state management
- Firestore transaction handling and error scenarios
- Client-side validation and security rule testing

### Integration Tests
- Complete Firebase Auth flow with Google OAuth
- Game session lifecycle using Firestore listeners
- Friend system workflows with real-time updates
- Matchmaking algorithm with Firestore queries

### E2E Tests (Firebase Emulator Suite)
- Two-player game completion with Firestore real-time sync
- Friend request and game invitation flows
- Authentication persistence across browser sessions
- Offline behavior and reconnection scenarios

### Performance Tests
- Firestore listener performance under load
- Query optimization with large document collections
- ELO calculation accuracy with concurrent transactions
- Memory usage during active real-time listeners

## Deployment Considerations

### Firebase Configuration
```typescript
// Firebase config (stored in environment variables)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};
```

### Firebase Hosting Setup
```bash
# Deploy to Firebase Hosting
npm run build
firebase deploy --only hosting

# Deploy Firestore rules and indexes
firebase deploy --only firestore
```

### Required Firebase Services (Spark Plan)
- **Authentication**: Google OAuth provider enabled
- **Firestore Database**: Production mode with security rules
- **Hosting**: Static site hosting for React build
- **Analytics**: Basic usage tracking (optional)

### Monitoring (Firebase Console)
- Authentication success/failure rates
- Firestore usage metrics (reads/writes/storage)
- Hosting traffic and performance
- Real-time active user count

## Technical Risks & Mitigation Plan

### High-Risk Areas

**Firebase Spark Plan Limitations**
- *Risk*: Exceeding daily read/write limits disrupting service
- *Mitigation*: Implement usage monitoring, local caching, efficient query patterns, upgrade path to Blaze plan

**Firestore Real-time Listener Stability**
- *Risk*: Connection drops causing game desynchronization
- *Mitigation*: Offline persistence, automatic reconnection, local state validation

**Client-side Security Vulnerabilities**
- *Risk*: Move validation bypass or data manipulation
- *Mitigation*: Comprehensive Firestore security rules, transaction-based updates, server-side validation

**ELO Rating Manipulation**
- *Risk*: Users creating multiple accounts to farm ratings
- *Mitigation*: Google OAuth prevents easy account creation, Firebase Auth phone verification (future)

**Firestore Transaction Conflicts**
- *Risk*: Concurrent moves causing game state corruption
- *Mitigation*: Atomic transactions, optimistic locking, proper error handling

### Architecture Changes from Original PRD
The TDD has been updated to use Firebase services instead of Express.js + PostgreSQL to ensure compatibility with Firebase Spark hosting. This provides equivalent functionality while leveraging Firebase's integrated ecosystem.

## Out of Scope (Technical Non-Goals)

- Real-time spectator mode for ongoing games
- Native mobile app development (PWA sufficient)
- Advanced tournament bracket management
- Machine learning-based matchmaking optimization
- Backend server infrastructure (Firebase handles this)
- Cloud Functions or server-side compute (Spark plan restriction)
- Video/voice chat integration
- Custom game variants beyond standard checkers
- Advanced analytics beyond Firebase Analytics

## Open Technical Questions

1. **Firestore Usage Optimization**: Should we implement read caching strategies immediately or monitor usage first?
2. **Game State Persistence**: How frequently should we sync local game state with Firestore during active games?
3. **ELO Volatility**: Should we implement provisional ratings for new players with < 10 games?
4. **Connection Recovery**: What's the acceptable timeout for Firestore reconnection before declaring a player forfeit?
5. **Matchmaking Algorithm**: Should we implement time-based ELO constraint relaxation for faster matching?
6. **Spark Plan Scaling**: At what usage threshold should we recommend upgrading to Firebase Blaze plan?
7. **Security Rules Complexity**: How detailed should our Firestore rules be for move validation vs. client-side validation?