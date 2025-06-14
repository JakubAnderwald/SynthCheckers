# Synth Checkers

## Overview

Synth Checkers is a modern, synthwave-themed 3D checkers game built with React, Three.js, and TypeScript. The application features an immersive neon aesthetic optimized for mobile play, with both single-player AI modes and two-player gameplay.

## System Architecture

The application follows a client-server architecture with a focus on frontend-heavy game logic:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **3D Rendering**: Three.js with React Three Fiber for WebGL-based 3D graphics
- **State Management**: Zustand for global game state management
- **Styling**: Tailwind CSS with custom synthwave color palette
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM (configured but minimal usage)
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **Development**: Hot module replacement via Vite middleware integration

## Key Components

### Game Engine
- **Rules Engine** (`client/src/lib/checkers/rules.ts`): Core checkers game logic including move validation, capture detection, and king promotion
- **AI System** (`client/src/lib/checkers/ai.ts`): Minimax algorithm with alpha-beta pruning for single-player mode
- **Game State** (`client/src/lib/stores/useCheckersStore.ts`): Centralized game state management using Zustand

### 3D Rendering
- **Board Rendering** (`client/src/components/game/Board.tsx`): 3D checkerboard with interactive pieces
- **Lighting System** (`client/src/components/game/Lighting.tsx`): Dynamic lighting for synthwave aesthetic
- **Grid Effects** (`client/src/components/game/GridFloor.tsx`): Animated grid floor with neon effects

### User Interface
- **Main Menu** (`client/src/components/ui/MainMenu.tsx`): Game mode selection and settings
- **Game Controls** (`client/src/components/ui/GameControls.tsx`): In-game UI for turn indicators and actions
- **Settings System** (`client/src/components/ui/SettingsMenu.tsx`): Audio, difficulty, and game preferences

### Audio System
- **Audio Management** (`client/src/lib/stores/useAudio.tsx`): Sound effect and background music control
- **Sound Hooks** (`client/src/lib/hooks/useSound.ts`): Reusable sound effect utilities

## Data Flow

1. **Game Initialization**: User selects game mode, state is initialized in Zustand store
2. **Move Processing**: User clicks trigger piece selection, valid moves calculated, moves executed through rules engine
3. **AI Turn Processing**: For single-player mode, AI calculates optimal move using minimax algorithm
4. **State Updates**: All game state changes flow through Zustand store, triggering React re-renders
5. **3D Rendering**: Three.js components subscribe to state changes and update 3D scene accordingly

## External Dependencies

### UI Libraries
- **Radix UI**: Accessible component primitives
- **React Three Fiber**: React bindings for Three.js
- **React Three Drei**: Useful helpers for React Three Fiber
- **Lucide React**: Icon system

### Development Tools
- **Drizzle Kit**: Database migration management
- **TanStack Query**: Server state management (minimal usage)
- **TypeScript**: Static type checking

### Audio
- Custom synthwave background music and sound effects loaded via HTML5 Audio API

## Deployment Strategy

### Development
- **Local Development**: Vite dev server with hot module replacement
- **Replit Integration**: Configured for Replit's cloud development environment

### Production
- **Build Process**: Vite builds optimized client bundle, esbuild compiles server
- **Deployment Target**: Google Cloud Run (configured in .replit)
- **Static Assets**: Client built to `dist/public`, served by Express in production

### Database
- **PostgreSQL**: Neon Database configured via environment variables
- **Migrations**: Managed through Drizzle Kit with `npm run db:push`

## Recent Changes

- **June 14, 2025 - Complete Authentication System Implementation**: Finished Section 2.0 authentication infrastructure
  - Implemented Firebase authentication service with Google OAuth sign-in
  - Built comprehensive authentication context with session management
  - Created authentication UI components (LoginButton, UserProfile, AuthModal, AuthHeader)
  - Added protected route wrapper and HOC for authenticated access
  - Implemented first-time user registration with display name setup
  - Integrated Zustand store for centralized authentication state management
  - Created unit tests for authentication service and components
  - Established user document creation in Firestore on initial authentication

- **June 14, 2025 - Firebase Integration Setup**: Completed Firebase project setup for multiplayer accounts and online gameplay
  - Installed Firebase SDK (firebase, firebase-admin, firebase-tools)
  - Created secure Firebase configuration using Replit secrets
  - Configured production Firebase for all development (emulators removed)
  - Implemented comprehensive authentication service with Google OAuth
  - Added Firestore integration for user profiles and game data
  - Configured Firebase Hosting for deployment
  - Established async initialization pattern for client-side Firebase services

## Changelog

- June 14, 2025. Initial setup
- June 14, 2025. Firebase integration architecture implemented

## User Preferences

Preferred communication style: Simple, everyday language.