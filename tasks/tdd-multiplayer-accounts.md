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
The implementation will extend the existing React + Express + PostgreSQL stack with the following additions:

1. **Authentication Layer**: Google OAuth integration using Passport.js (already partially configured)
2. **Real-time Communication**: WebSocket server using Socket.IO for game state synchronization
3. **Game Session Management**: In-memory game state management with database persistence
4. **Matchmaking Service**: ELO-based algorithm with queue management
5. **Friend System**: Relational database design with real-time status updates

### Alignment with PRD Constraints
- **Turn-based gameplay**: WebSocket events will handle move validation and turn management
- **Firebase authentication**: While mentioned in PRD, we'll use Google OAuth with Passport.js for consistency with existing Express.js architecture
- **Scalability**: Design supports clustering for future growth while maintaining session stickiness

### Key Architectural Decisions
- **WebSocket over HTTP polling**: Ensures real-time experience with minimal latency
- **Server-side game validation**: Prevents cheating by validating all moves on the backend
- **Hybrid session storage**: Critical game state in memory, persistent data in PostgreSQL
- **ELO calculation**: Server-side to prevent manipulation and ensure consistency

## Data Model Design

### New Database Tables

```sql
-- Enhanced users table (extends existing)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  elo_rating INTEGER DEFAULT 1200,
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_online TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friend relationships
CREATE TABLE friendships (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(requester_id, addressee_id)
);

-- Game sessions
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  player2_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  player1_elo_before INTEGER,
  player2_elo_before INTEGER,
  player1_elo_after INTEGER,
  player2_elo_after INTEGER,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  total_moves INTEGER DEFAULT 0
);

-- Game moves for replay/analysis
CREATE TABLE game_moves (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  move_number INTEGER NOT NULL,
  from_row INTEGER NOT NULL,
  from_col INTEGER NOT NULL,
  to_row INTEGER NOT NULL,
  to_col INTEGER NOT NULL,
  captured_pieces JSONB, -- Array of captured piece positions
  piece_promoted BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matchmaking queue
CREATE TABLE matchmaking_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  elo_rating INTEGER NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  preferences JSONB -- Future: time controls, game variants
);
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

## API Design

### Authentication Endpoints
```
GET  /auth/google          - Initiate Google OAuth flow
GET  /auth/google/callback - Handle OAuth callback
POST /auth/logout          - Logout current user
GET  /auth/me              - Get current user profile
```

### User Management
```
GET    /api/users/profile/:userId    - Get user profile (public data)
PUT    /api/users/profile            - Update own profile
GET    /api/users/stats/:userId      - Get user statistics
GET    /api/users/search?q=name      - Search users by display name
```

### Friend System
```
GET    /api/friends                  - Get friends list with online status
POST   /api/friends/request          - Send friend request
PUT    /api/friends/:requestId       - Accept/decline friend request
DELETE /api/friends/:friendshipId    - Remove friend
```

### Matchmaking
```
POST   /api/matchmaking/join         - Join matchmaking queue
DELETE /api/matchmaking/leave        - Leave matchmaking queue
GET    /api/matchmaking/status       - Get queue status
POST   /api/games/invite/:friendId   - Invite friend to private game
```

### Game Management
```
GET    /api/games/history            - Get user's game history
GET    /api/games/:gameId            - Get specific game details
GET    /api/games/:gameId/moves      - Get game move history
```

### WebSocket Events
```
// Client → Server
'join_game'         - Join specific game room
'make_move'         - Submit a move
'leave_game'        - Leave current game
'heartbeat'         - Keep connection alive

// Server → Client
'game_joined'       - Confirmation of joining game
'move_made'         - Opponent made a move
'game_over'         - Game ended
'opponent_left'     - Opponent disconnected
'invalid_move'      - Move was rejected
'your_turn'         - Turn indicator
```

## Module/Component Breakdown

### Backend Modules

**AuthService** (`server/auth/`)
- Google OAuth integration with Passport.js
- Session management and validation
- User profile creation and updates

**GameEngine** (`server/game/`)
- Move validation logic (reuse from client-side rules)
- Game state management
- ELO calculation algorithms

**MatchmakingService** (`server/matchmaking/`)
- Queue management with ELO-based pairing
- Friend invitation system
- Game room creation

**WebSocketManager** (`server/websocket/`)
- Socket.IO connection handling
- Room management for game sessions
- Real-time event broadcasting

**DatabaseService** (`server/database/`)
- Drizzle ORM queries for all entities
- Transaction management for atomic operations
- Data validation and sanitization

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
1. **Authentication Errors**: OAuth failures, invalid sessions
2. **Validation Errors**: Invalid moves, malformed requests
3. **Network Errors**: WebSocket disconnections, API timeouts
4. **Game Logic Errors**: Illegal game states, synchronization issues

### Error Response Format
```typescript
interface APIError {
  error: string;
  message: string;
  code: number;
  details?: any;
}
```

### Logging Strategy
- **Game Events**: All moves, game starts/ends, player disconnections
- **Authentication**: Login attempts, OAuth failures, session creations
- **Performance**: API response times, WebSocket message latency
- **Errors**: Stack traces for server errors, client error boundaries

### Client Error Handling
- Toast notifications for user-facing errors
- Graceful degradation for network issues
- Automatic reconnection for WebSocket failures
- Error boundaries for React component crashes

## Security Considerations

### Authentication Security
- Google OAuth 2.0 with PKCE for secure authentication
- JWT tokens for session management with secure httpOnly cookies
- CSRF protection using SameSite cookie attributes
- Rate limiting on authentication endpoints

### Game Security
- Server-side move validation prevents cheating
- WebSocket authentication required for all game actions
- Input sanitization for all user-generated content
- SQL injection prevention through parameterized queries

### Data Protection
- User emails are private and only visible to the user
- ELO ratings and game statistics are public
- Friend relationships are bidirectional and require acceptance
- Game move history is public for completed games

## Performance & Scalability Considerations

### Database Optimization
- Indexes on frequently queried fields (user_id, game_id, elo_rating)
- Connection pooling with pg-pool for PostgreSQL
- Pagination for game history and leaderboards
- Efficient ELO-based matchmaking queries

### WebSocket Scaling
- Room-based message routing to minimize bandwidth
- Connection clustering with Redis adapter for multi-instance deployment
- Heartbeat mechanism to detect and clean up stale connections
- Message queue for reliable delivery of critical events

### Caching Strategy
- In-memory caching of active game states
- Redis caching for friend lists and user profiles
- CDN caching for static profile assets (future)

### Expected Load
- Target: 100 concurrent games (200 active players)
- Database: <10,000 registered users initially
- WebSocket: <1000 concurrent connections
- API: <100 requests/second during peak usage

## Testing Strategy

### Unit Tests
- Game logic validation (move rules, ELO calculations)
- Authentication flows and session management
- WebSocket event handling and room management
- Database operations and query optimization

### Integration Tests
- Complete OAuth flow end-to-end
- Game session lifecycle (start, moves, completion)
- Friend system workflows
- Matchmaking algorithm accuracy

### E2E Tests
- Two-player game completion with real WebSocket connections
- Friend request and game invitation flows
- Authentication persistence across browser sessions
- Error handling and recovery scenarios

### Performance Tests
- WebSocket connection limits and message throughput
- Database query performance under load
- ELO calculation accuracy with large datasets
- Memory usage during peak concurrent games

## Deployment Considerations

### Environment Variables
```
GOOGLE_CLIENT_ID=<oauth_client_id>
GOOGLE_CLIENT_SECRET=<oauth_secret>
SESSION_SECRET=<random_session_key>
DATABASE_URL=<postgresql_connection>
REDIS_URL=<redis_connection> (future)
NODE_ENV=production
```

### Database Migrations
- Use Drizzle migrations for schema updates
- Seed script for initial ELO ratings and test data
- Backup strategy for user data and game history

### Monitoring
- Health checks for WebSocket server responsiveness
- Database connection monitoring
- OAuth service availability checks
- Game completion rate tracking

## Technical Risks & Mitigation Plan

### High-Risk Areas

**WebSocket Connection Stability**
- *Risk*: Frequent disconnections disrupting games
- *Mitigation*: Implement automatic reconnection with game state recovery, heartbeat monitoring

**ELO Rating Manipulation**
- *Risk*: Users creating multiple accounts to farm ratings
- *Mitigation*: Google OAuth prevents easy account creation, monitor for suspicious patterns

**Database Performance**
- *Risk*: Slow queries affecting real-time gameplay
- *Mitigation*: Database indexing, query optimization, connection pooling

**Authentication Security**
- *Risk*: OAuth token compromise or session hijacking
- *Mitigation*: Secure cookie settings, token rotation, HTTPS enforcement

### Architecture Inconsistencies
The PRD suggests Firebase authentication, but the current architecture uses Express.js with Passport.js. This TDD maintains consistency with the existing stack while providing equivalent OAuth functionality through Google's OAuth 2.0 implementation.

## Out of Scope (Technical Non-Goals)

- Real-time spectator mode for ongoing games
- Mobile app development (native iOS/Android)
- Advanced tournament bracket management
- Machine learning-based matchmaking optimization
- Microservices architecture (monolith is sufficient for current scale)
- Automated cheating detection algorithms
- Video/voice chat integration
- Custom game variants beyond standard checkers

## Open Technical Questions

1. **WebSocket Scaling**: Should we implement Redis adapter immediately or wait for scale requirements?
2. **Game State Persistence**: How frequently should we persist in-memory game state to database?
3. **ELO Volatility**: Should we implement provisional ratings for new players?
4. **Connection Recovery**: What's the acceptable timeout for player reconnection before forfeiting?
5. **Matchmaking Algorithm**: Should we implement time-based relaxation of ELO constraints for faster matching?
6. **Database Sharding**: At what user count should we consider horizontal database scaling?