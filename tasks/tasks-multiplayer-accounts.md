# Task List: User Accounts & Online Multiplayer

Based on `prd-multiplayer-accounts.md` and `tdd-multiplayer-accounts.md`

## Relevant Files

- `client/src/services/auth.ts` - Firebase Authentication service with Google OAuth integration
- `client/src/services/auth.test.ts` - Unit tests for authentication service
- `client/src/services/game.ts` - Firebase game state management and ELO calculations
- `client/src/services/game.test.ts` - Unit tests for game service
- `client/src/services/matchmaking.ts` - Matchmaking queue and opponent pairing logic
- `client/src/services/matchmaking.test.ts` - Unit tests for matchmaking service
- `client/src/services/database.ts` - Firestore document operations and real-time listeners
- `client/src/services/database.test.ts` - Unit tests for database service
- `client/src/lib/firebase.ts` - Firebase configuration and initialization (production mode)
- `client/src/main.tsx` - Updated to initialize Firebase on app start
- `client/src/services/auth.ts` - Firebase authentication service with Google OAuth and user management
- `client/src/contexts/AuthContext.tsx` - React context for authentication state management
- `client/src/App.tsx` - Updated to include AuthProvider wrapper and AuthHeader
- `client/src/components/auth/LoginButton.tsx` - Google OAuth login component with remember me option
- `client/src/components/auth/UserProfile.tsx` - User profile display with stats and logout functionality
- `client/src/components/auth/AuthModal.tsx` - Modal wrapper for authentication components
- `client/src/components/auth/AuthHeader.tsx` - Header component integrating authentication UI
- `client/src/components/auth/ProtectedRoute.tsx` - Protected route wrapper and HOC for authenticated access
- `client/src/components/auth/DisplayNameSetup.tsx` - First-time user display name setup component
- `.env.example` - Environment variables template for Firebase configuration
- `.env.development` - Development environment settings for Firebase emulators
- `firebase.json` - Firebase hosting and emulator configuration
- `client/src/contexts/AuthContext.tsx` - React context for authentication state management
- `client/src/contexts/AuthContext.test.tsx` - Unit tests for auth context
- `client/src/components/profile/UserProfile.tsx` - User profile display component
- `client/src/components/profile/ProfileStats.tsx` - Statistics visualization component
- `client/src/components/profile/GameHistory.tsx` - Game history display component
- `client/src/components/friends/FriendsList.tsx` - Friends list with online status
- `client/src/components/friends/FriendRequests.tsx` - Friend request management
- `client/src/components/friends/AddFriend.tsx` - Add friend search interface
- `client/src/components/matchmaking/MatchmakingQueue.tsx` - Queue joining interface
- `client/src/components/matchmaking/GameInvitation.tsx` - Game invitation management
- `client/src/components/game/OnlineBoard.tsx` - Online multiplayer game board
- `client/src/stores/useOnlineGameStore.ts` - Zustand store for online game state
- `client/src/stores/useAuthStore.ts` - Zustand store for authentication state
- `client/src/lib/types/firebase.ts` - TypeScript interfaces for Firestore documents
- `firestore.rules` - Firestore security rules for data validation
- `firestore.indexes.json` - Composite indexes for efficient queries
- `firebase.json` - Firebase project configuration
- `.env.example` - Environment variables template for Firebase config

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use production Firebase for testing Firestore operations
- Run tests with `npm test` or `npm run test:firebase` for Firebase-specific tests
- Firestore security rules testing uses production Firebase with test data

## Tasks

- [x] 1.0 Firebase Project Setup and Configuration
  - [x] 1.1 Install Firebase SDK and dependencies (firebase, @firebase/auth, @firebase/firestore)
  - [x] 1.2 Create Firebase project configuration file with environment variables
  - [x] 1.3 Initialize Firebase app instance in client application
  - [x] 1.4 Configure Firebase Hosting for deployment
  - [x] 1.5 Configure production Firebase for development (emulators removed)
  - [x] 1.6 Create Firestore database in production mode (Manual: Firebase Console)
  - [x] 1.7 Enable Google OAuth provider in Firebase Authentication console (Manual: Firebase Console)
  - [x] 1.8 Create Firebase authentication service foundation
  - [x] 1.9 Configure secure Firebase secrets integration via API endpoint

- [ ] 2.0 Authentication System Implementation
  - [x] 2.1 Create Firebase authentication service with Google OAuth integration
  - [x] 2.2 Implement user session management and persistence
  - [x] 2.3 Create authentication context provider for React state management
  - [x] 2.4 Build login/logout UI components with Google sign-in button
  - [x] 2.5 Implement protected route wrapper for authenticated pages
  - [x] 2.6 Handle first-time user registration and display name setup
  - [x] 2.7 Create user document in Firestore on initial authentication
  - [x] 2.8 Add authentication state management to Zustand store
  - [x] 2.9 Write unit tests for authentication service and components

- [x] 3.0 User Profile and Statistics System
  - [x] 3.1 Create Firestore document structure for user profiles with ELO ratings
  - [x] 3.2 Implement user profile display component with stats (wins, losses, games played)
  - [x] 3.3 Build profile editing interface for display name updates
  - [x] 3.4 Create game history component with pagination support
  - [x] 3.5 Implement ELO rating calculation system with proper K-factors
  - [x] 3.6 Add statistics visualization components (win percentage, rating progression)
  - [x] 3.7 Create public profile view for other players
  - [x] 3.8 Implement user search functionality by display name
  - [x] 3.9 Write unit tests for profile components and ELO calculations

- [x] 4.0 Friend System Implementation
  - [x] 4.1 Create Firestore subcollection structure for friendships
  - [x] 4.2 Implement friend request sending functionality
  - [x] 4.3 Build friend request management interface (accept/decline)
  - [x] 4.4 Create friends list component with real-time online status
  - [x] 4.5 Add friend search and invitation system
  - [x] 4.6 Implement friend removal functionality
  - [x] 4.7 Create real-time listeners for friend status updates
  - [x] 4.8 Add friend notifications for requests and status changes
  - [x] 4.9 Write unit tests for friend system components and logic

- [x] 5.0 Matchmaking and Game Invitation System
  - [x] 5.1 Create matchmaking queue Firestore collection and management
  - [x] 5.2 Implement ELO-based opponent pairing algorithm (±100 rating points)
  - [x] 5.3 Build matchmaking queue UI with join/leave functionality
  - [x] 5.4 Create game invitation system for friend-to-friend matches
  - [x] 5.5 Implement real-time matchmaking status updates and notifications
  - [x] 5.6 Add matchmaking timeout handling (60 seconds maximum wait)
  - [x] 5.7 Create private game room creation and joining
  - [x] 5.8 Implement game invitation acceptance/decline workflow
  - [x] 5.9 Write unit tests for matchmaking algorithms and invitation logic

- [ ] 6.0 Online Multiplayer Game Implementation
  - [x] 6.1 Create Firestore game document structure with board state and move history
  - [x] 6.2 Extend existing Board component for online multiplayer support
  - [x] 6.3 Implement real-time game state synchronization using Firestore listeners
  - [x] 6.4 Add move validation with Firestore transactions for atomic updates
  - [x] 6.5 Create turn management system with clear turn indicators
  - [x] 6.6 Implement player disconnection handling and timeout detection
  - [x] 6.7 Add game completion workflow with ELO rating updates
  - [ ] 6.8 Create online game store for state management with Zustand
  - [ ] 6.9 Implement move history tracking in Firestore subcollection
  - [ ] 6.10 Add game abandonment and forfeit functionality
  - [ ] 6.11 Write unit tests for online game logic and state management

- [ ] 7.0 Firestore Security Rules and Data Validation
  - [ ] 7.1 Create comprehensive Firestore security rules for user data protection
  - [ ] 7.2 Implement game document validation rules to prevent cheating
  - [ ] 7.3 Add friend system security rules for privacy protection
  - [ ] 7.4 Create matchmaking queue access control rules
  - [ ] 7.5 Implement move validation rules in Firestore for server-side checking
  - [ ] 7.6 Add ELO rating protection rules to prevent manipulation
  - [ ] 7.7 Create composite indexes for efficient queries (ELO ranges, timestamps)
  - [ ] 7.8 Test security rules using Firebase Emulator and security rules testing
  - [ ] 7.9 Deploy security rules and indexes to production Firestore