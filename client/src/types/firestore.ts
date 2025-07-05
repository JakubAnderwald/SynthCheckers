import { Timestamp } from 'firebase/firestore';

// User Profile Document Structure
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  
  // Game Statistics
  eloRating: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  
  // Rating History
  peakRating: number;
  lowestRating: number;
  ratingHistory: RatingHistoryEntry[];
  
  // Activity Tracking
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastOnline: Timestamp;
  isOnline: boolean;
  
  // Account Status
  isNewUser: boolean;
  isVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'banned';
  
  // Preferences
  gamePreferences: GamePreferences;
  privacySettings: PrivacySettings;
}

export interface RatingHistoryEntry {
  rating: number;
  change: number;
  gameId: string;
  timestamp: Timestamp;
  opponentUid: string;
  opponentRating: number;
  gameResult: 'win' | 'loss' | 'draw';
}

export interface GamePreferences {
  preferredDifficulty: 'easy' | 'medium' | 'hard';
  allowChallenges: boolean;
  autoAcceptFriends: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  animationsEnabled: boolean;
}

export interface PrivacySettings {
  profileVisible: boolean;
  statsVisible: boolean;
  onlineStatusVisible: boolean;
  allowDirectMessages: boolean;
  allowFriendRequests: boolean;
}

// Enhanced Game Board State Structure
export interface BoardStateSnapshot {
  pieces: PieceState[];
  currentPlayer: 'red' | 'blue';
  mustCapture: boolean;
  kingPromotions: KingPromotion[];
  gameStateHash: string; // For validation and sync
  timestamp: Timestamp;
}

export interface PieceState {
  id: string;
  color: 'red' | 'blue';
  type: 'normal' | 'king';
  position: [number, number]; // [row, col]
  canMove: boolean;
  threatLevel: number; // AI evaluation metric
}

export interface KingPromotion {
  pieceId: string;
  position: [number, number];
  moveNumber: number;
  timestamp: Timestamp;
}

// Game Rules Configuration
export interface GameRules {
  boardSize: number;
  forcedCapture: boolean;
  flyingKings: boolean;
  multipleJumps: boolean;
  backwardCaptures: boolean;
  drawAfterMoves: number; // Number of moves without capture before draw
}

// Reconnection and Synchronization
export interface ReconnectionData {
  lastKnownMoveNumber: number;
  playerTimestamps: {
    red: Timestamp;
    blue: Timestamp;
  };
  disconnectionEvents: DisconnectionEvent[];
  syncAttempts: number;
}

export interface DisconnectionEvent {
  playerId: string;
  timestamp: Timestamp;
  reason: 'network' | 'timeout' | 'manual';
  duration: number; // milliseconds
  recovered: boolean;
}

// Game Document Structure
export interface GameRecord {
  gameId: string;
  
  // Players
  playerRed: GamePlayer;
  playerBlue: GamePlayer;
  
  // Game State
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  currentTurn: 'red' | 'blue';
  moveHistory: GameMove[];
  boardState: BoardStateSnapshot; // Detailed board state
  
  // Game Rules & Configuration
  gameRules: GameRules;
  
  // Timing
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  lastMoveAt?: Timestamp;
  
  // Game Results
  winner?: 'red' | 'blue' | 'draw';
  endReason: 'checkmate' | 'timeout' | 'resignation' | 'draw' | 'abandonment';
  
  // Rating Changes
  eloChanges: {
    red: number;
    blue: number;
  };
  
  // Game Type
  gameType: 'ranked' | 'casual' | 'practice';
  timeControl?: TimeControl;
  
  // Game Metadata
  totalMoves: number;
  gameSession: string; // Unique session identifier
  reconnectionData?: ReconnectionData;
}

export interface GamePlayer {
  uid: string;
  displayName: string;
  eloRating: number;
  isReady: boolean;
  hasResigned: boolean;
  timeRemaining?: number; // milliseconds
}

export interface GameMove {
  moveNumber: number;
  player: 'red' | 'blue';
  from: [number, number];
  to: [number, number];
  captures?: [number, number][];
  promotedToKing?: boolean;
  timestamp: Timestamp;
  timeSpent: number; // milliseconds
  boardStateAfter: string; // Serialized board state hash for validation
  isValid: boolean;
  moveNotation: string; // Human-readable move notation
}

export interface TimeControl {
  initialTime: number; // minutes
  increment: number; // seconds per move
}

// Friend System Structure
export interface Friendship {
  friendshipId: string;
  user1Uid: string;
  user2Uid: string;
  status: 'pending' | 'accepted' | 'blocked';
  initiatedBy: string;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
}

export interface FriendRequest {
  requestId: string;
  fromUid: string;
  toUid: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
}

// Challenge System Structure
export interface GameChallenge {
  challengeId: string;
  fromUid: string;
  toUid: string;
  gameType: 'ranked' | 'casual';
  timeControl?: TimeControl;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  respondedAt?: Timestamp;
}

// Leaderboard Structure
export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  eloRating: number;
  totalGames: number;
  wins: number;
  losses: number;
  winPercentage: number;
  rank: number;
  lastGameAt: Timestamp;
}

// Statistics Aggregation
export interface UserStatistics {
  uid: string;
  
  // Overall Stats
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winPercentage: number;
  
  // Rating Stats
  currentRating: number;
  peakRating: number;
  lowestRating: number;
  ratingChange30d: number;
  
  // Activity Stats
  gamesThisWeek: number;
  gamesThisMonth: number;
  averageGameDuration: number; // minutes
  longestWinStreak: number;
  currentWinStreak: number;
  
  // Performance by Game Type
  rankedStats: GameTypeStats;
  casualStats: GameTypeStats;
  
  // Recent Activity
  lastGameAt: Timestamp;
  lastActiveAt: Timestamp;
  
  // Updated Timestamp
  updatedAt: Timestamp;
}

export interface GameTypeStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winPercentage: number;
  averageRating: number;
}

// Collection Paths
export const COLLECTIONS = {
  USERS: 'users',
  GAMES: 'games',
  GAME_MOVES: 'gameMoves', // Subcollection of games
  FRIENDSHIPS: 'friendships',
  FRIEND_REQUESTS: 'friendRequests',
  CHALLENGES: 'gameChallenges',
  LEADERBOARD: 'leaderboard',
  USER_STATISTICS: 'userStatistics',
  GAME_SESSIONS: 'gameSessions', // For active game tracking
} as const;

// ELO Rating Constants
export const ELO_CONSTANTS = {
  DEFAULT_RATING: 1200,
  K_FACTOR_DEFAULT: 32,
  K_FACTOR_EXPERIENCED: 16, // For players with 30+ games
  K_FACTOR_MASTER: 12, // For players with 2000+ rating
  RATING_FLOOR: 100,
  RATING_CEILING: 3000,
} as const;