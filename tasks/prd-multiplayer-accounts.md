# Product Requirements Document: User Accounts & Online Multiplayer

## Introduction/Overview

Currently, Synth Checkers supports local gameplay where two players must share the same computer. This limits the game's accessibility as users rarely sit together to play. This feature will enable players to create accounts, find opponents online, and play turn-based checkers matches over the internet, significantly expanding the game's reach and engagement.

The goal is to transform Synth Checkers from a local-only game into a connected multiplayer experience while maintaining the synthwave aesthetic and smooth gameplay.

## Goals

1. Enable remote multiplayer gameplay between any two users with internet access
2. Provide user account system with Google authentication for easy onboarding
3. Implement skill-based matchmaking using ELO ranking system
4. Create friend system for playing with known opponents
5. Track comprehensive game statistics and match history
6. Maintain the existing synthwave aesthetic and 3D game experience

## User Stories

**Account Creation & Authentication:**
- As a new player, I want to sign up with my Google account so that I can quickly create an account without filling forms
- As a returning player, I want to log in and see my profile with my stats and game history

**Finding Opponents:**
- As a player, I want to add friends so that I can play against people I know
- As a player, I want to be matched with opponents of similar skill level so that games are competitive and fair
- As a player, I want to see if my friends are online so that I can invite them to a game

**Multiplayer Gameplay:**
- As a player, I want to start an online match and wait for an opponent to join
- As a player, I want to make my move and see my opponent's move in real-time
- As a player, I want to see whose turn it is clearly during the game

**Progress Tracking:**
- As a player, I want to see my wins, losses, and ELO rating so that I can track my improvement
- As a player, I want to view my game history so that I can review past matches
- As a player, I want to see my friend's stats so that I can compare our performance

## Functional Requirements

### Authentication System
1. The system must allow users to sign up using Google OAuth authentication
2. The system must allow users to log in using their Google account
3. The system must require users to set a display name during first login
4. The system must store user email and display name in the database
5. The system must maintain user sessions across browser refreshes

### User Profiles
6. The system must display user profiles showing: display name, ELO rating, total games played, wins, losses, and win percentage
7. The system must allow users to view other players' public profile information
8. The system must calculate and update ELO ratings after each completed game
9. The system must maintain a complete game history for each user

### Friend System
10. The system must allow users to send friend requests by display name or email
11. The system must allow users to accept or decline friend requests
12. The system must display a friends list showing online/offline status
13. The system must allow users to invite friends to a game directly

### Matchmaking
14. The system must provide skill-based matchmaking that pairs players with similar ELO ratings (±100 points preferred)
15. The system must allow users to join a matchmaking queue and be automatically paired
16. The system must allow users to create private game rooms that friends can join
17. The system must handle matchmaking timeouts gracefully (60 seconds maximum wait)

### Online Gameplay
18. The system must support real-time, turn-based checkers gameplay between two remote players
19. The system must clearly indicate whose turn it is to move
20. The system must validate moves server-side to prevent cheating
21. The system must handle player disconnections gracefully (declare opponent winner after 60 seconds of inactivity)
22. The system must update both players' screens immediately when a move is made
23. The system must apply the same game rules as the current local multiplayer mode

### Game Statistics
24. The system must track and store: game start time, end time, winner, loser, and all moves made
25. The system must calculate ELO rating changes using standard ELO formulas
26. The system must display game history with date, opponent, result, and rating change
27. The system must show leaderboards of top-rated players

## Non-Goals (Out of Scope)

- Spectator mode for watching ongoing games
- In-game chat functionality
- Tournament system or bracket management
- Game replay/analysis features
- Mobile app development (web-based only)
- Save/resume game functionality for disconnections
- Multiple game variants beyond standard checkers
- Social features beyond basic friend system (groups, clans, etc.)

## Design Considerations

- Maintain the existing synthwave aesthetic with neon colors and 3D styling
- Integrate authentication flows seamlessly with the current main menu design
- Display online status and multiplayer options in the existing game interface
- Use consistent UI components from the current Radix UI + shadcn/ui system
- Ensure friend lists and matchmaking interfaces match the game's visual theme

## Technical Considerations

- Leverage existing Firebase authentication infrastructure mentioned in the stack
- Use WebSocket connections for real-time game state synchronization
- Implement server-side game logic validation to prevent cheating
- Store game data in the existing PostgreSQL database with Drizzle ORM
- Maintain compatibility with existing game state management (Zustand stores)
- ELO rating system should start new players at 1200 rating
- WebSocket events needed: move_made, game_start, game_end, player_disconnect

## Success Metrics

- 80% of new users successfully complete account creation process
- Average matchmaking time under 30 seconds during peak hours
- 90% of games complete without technical issues (disconnections, sync errors)
- Player retention: 60% of users play at least 3 online games within first week
- Friend system adoption: 40% of active users add at least one friend within 2 weeks

## Open Questions

1. Should there be a minimum number of games before ELO rating is displayed publicly?
2. What should happen to a player's rating if their opponent disconnects?
3. Should there be different ELO pools for different time controls (if we add timers later)?
4. How should we handle users who abandon games frequently?