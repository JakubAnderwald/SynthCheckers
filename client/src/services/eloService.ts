import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { GameRecord } from '@/types/firestore';

export interface EloCalculationResult {
  redEloChange: number;
  blueEloChange: number;
  redNewRating: number;
  blueNewRating: number;
}

export interface GameCompletionData {
  gameId: string;
  winner: 'red' | 'blue' | 'draw';
  endReason: 'checkmate' | 'timeout' | 'resignation' | 'draw' | 'abandonment';
  totalMoves: number;
  gameDuration: number; // milliseconds
  playerPerformance: {
    red: PlayerPerformance;
    blue: PlayerPerformance;
  };
}

export interface PlayerPerformance {
  averageMoveTime: number;
  timeUsed: number;
  capturesMade: number;
  kingsPromoted: number;
}

export class EloService {
  private readonly K_FACTOR_BASE = 32;
  private readonly K_FACTOR_PROVISIONAL = 40; // For players with < 20 games
  private readonly RATING_FLOOR = 100;
  private readonly RATING_CEILING = 3000;
  private readonly PROVISIONAL_GAMES = 20;

  /**
   * Calculate ELO rating changes for both players
   */
  calculateEloChanges(
    redRating: number,
    blueRating: number,
    redGames: number,
    blueGames: number,
    result: 'red' | 'blue' | 'draw'
  ): EloCalculationResult {
    // Determine K-factors based on game count
    const redKFactor = redGames < this.PROVISIONAL_GAMES ? this.K_FACTOR_PROVISIONAL : this.K_FACTOR_BASE;
    const blueKFactor = blueGames < this.PROVISIONAL_GAMES ? this.K_FACTOR_PROVISIONAL : this.K_FACTOR_BASE;

    // Calculate expected scores
    const redExpected = this.calculateExpectedScore(redRating, blueRating);
    const blueExpected = this.calculateExpectedScore(blueRating, redRating);

    // Determine actual scores
    let redScore: number;
    let blueScore: number;

    switch (result) {
      case 'red':
        redScore = 1;
        blueScore = 0;
        break;
      case 'blue':
        redScore = 0;
        blueScore = 1;
        break;
      case 'draw':
        redScore = 0.5;
        blueScore = 0.5;
        break;
    }

    // Calculate rating changes
    const redChange = Math.round(redKFactor * (redScore - redExpected));
    const blueChange = Math.round(blueKFactor * (blueScore - blueExpected));

    // Apply rating bounds
    const redNewRating = this.clampRating(redRating + redChange);
    const blueNewRating = this.clampRating(blueRating + blueChange);

    return {
      redEloChange: redNewRating - redRating,
      blueEloChange: blueNewRating - blueRating,
      redNewRating,
      blueNewRating
    };
  }

  /**
   * Calculate expected score using ELO formula
   */
  private calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  /**
   * Clamp rating within allowed bounds
   */
  private clampRating(rating: number): number {
    return Math.max(this.RATING_FLOOR, Math.min(this.RATING_CEILING, rating));
  }

  /**
   * Process game completion with atomic ELO updates
   */
  async processGameCompletion(gameData: GameRecord, completionData: GameCompletionData): Promise<void> {
    try {
      const db = await getFirebaseDb();

      await runTransaction(db, async (transaction) => {
        // Get player documents
        const redPlayerRef = doc(db, 'users', gameData.playerRed.uid);
        const bluePlayerRef = doc(db, 'users', gameData.playerBlue.uid);
        const gameRef = doc(db, 'gameRooms', gameData.gameId);

        // Read current player data
        const redPlayerDoc = await transaction.get(redPlayerRef);
        const bluePlayerDoc = await transaction.get(bluePlayerRef);

        if (!redPlayerDoc.exists() || !bluePlayerDoc.exists()) {
          throw new Error('Player documents not found');
        }

        const redPlayerData = redPlayerDoc.data();
        const bluePlayerData = bluePlayerDoc.data();

        // Calculate ELO changes
        const eloResult = this.calculateEloChanges(
          redPlayerData.eloRating || 1200,
          bluePlayerData.eloRating || 1200,
          redPlayerData.totalGames || 0,
          bluePlayerData.totalGames || 0,
          completionData.winner
        );

        // Determine win/loss counts
        const redWon = completionData.winner === 'red';
        const blueWon = completionData.winner === 'blue';
        const isDraw = completionData.winner === 'draw';

        // Update red player
        transaction.update(redPlayerRef, {
          eloRating: eloResult.redNewRating,
          totalGames: increment(1),
          wins: redWon ? increment(1) : redPlayerData.wins || 0,
          losses: blueWon ? increment(1) : redPlayerData.losses || 0,
          draws: isDraw ? increment(1) : redPlayerData.draws || 0,
          lastGameAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Update blue player
        transaction.update(bluePlayerRef, {
          eloRating: eloResult.blueNewRating,
          totalGames: increment(1),
          wins: blueWon ? increment(1) : bluePlayerData.wins || 0,
          losses: redWon ? increment(1) : bluePlayerData.losses || 0,
          draws: isDraw ? increment(1) : bluePlayerData.draws || 0,
          lastGameAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Update game record with final data
        transaction.update(gameRef, {
          status: 'completed',
          winner: completionData.winner === 'draw' ? undefined : completionData.winner,
          endReason: completionData.endReason,
          completedAt: serverTimestamp(),
          eloChanges: {
            red: eloResult.redEloChange,
            blue: eloResult.blueEloChange
          },
          finalRatings: {
            red: eloResult.redNewRating,
            blue: eloResult.blueNewRating
          },
          gameStats: {
            totalMoves: completionData.totalMoves,
            gameDuration: completionData.gameDuration,
            playerPerformance: completionData.playerPerformance
          }
        });

        console.log('Game completion processed:', {
          gameId: gameData.gameId,
          winner: completionData.winner,
          eloChanges: eloResult
        });
      });

      // Emit completion event
      this.emitGameCompletionEvent(gameData.gameId, completionData, {
        redEloChange: 0, // Will be updated in transaction
        blueEloChange: 0,
        redNewRating: 0,
        blueNewRating: 0
      });

    } catch (error) {
      console.error('Failed to process game completion:', error);
      throw error;
    }
  }

  /**
   * Calculate performance statistics from game data
   */
  calculatePerformanceStats(gameData: GameRecord): {
    red: PlayerPerformance;
    blue: PlayerPerformance;
  } {
    const redMoves = gameData.moveHistory.filter(move => move.player === 'red');
    const blueMoves = gameData.moveHistory.filter(move => move.player === 'blue');

    const calculatePlayerStats = (moves: typeof gameData.moveHistory): PlayerPerformance => {
      if (moves.length === 0) {
        return {
          averageMoveTime: 0,
          timeUsed: 0,
          capturesMade: 0,
          kingsPromoted: 0
        };
      }

      const totalTime = moves.reduce((sum, move) => sum + (move.timeSpent || 0), 0);
      const averageTime = totalTime / moves.length;
      const captures = moves.filter(move => move.captures && move.captures.length > 0).length;
      const promotions = moves.filter(move => move.promotedToKing).length;

      return {
        averageMoveTime: Math.round(averageTime),
        timeUsed: totalTime,
        capturesMade: captures,
        kingsPromoted: promotions
      };
    };

    return {
      red: calculatePlayerStats(redMoves),
      blue: calculatePlayerStats(blueMoves)
    };
  }

  /**
   * Handle resignation
   */
  async handleResignation(gameId: string, resigningPlayerId: string): Promise<void> {
    try {
      const db = await getFirebaseDb();
      const gameRef = doc(db, 'gameRooms', gameId);

      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) {
          throw new Error('Game not found');
        }

        const gameData = gameDoc.data() as GameRecord;
        
        // Determine winner (opposite of resigning player)
        const winner = gameData.playerRed.uid === resigningPlayerId ? 'blue' : 'red';
        
        // Calculate performance stats
        const performanceStats = this.calculatePerformanceStats(gameData);
        
        // Calculate game duration
        const startTime = gameData.startedAt?.toDate?.() || gameData.createdAt.toDate();
        const gameDuration = Date.now() - startTime.getTime();

        const completionData: GameCompletionData = {
          gameId,
          winner,
          endReason: 'resignation',
          totalMoves: gameData.totalMoves,
          gameDuration,
          playerPerformance: performanceStats
        };

        await this.processGameCompletion(gameData, completionData);
      });

      console.log('Resignation processed for game:', gameId);
    } catch (error) {
      console.error('Failed to handle resignation:', error);
      throw error;
    }
  }

  /**
   * Handle timeout completion
   */
  async handleTimeout(gameId: string, timedOutPlayerId: string): Promise<void> {
    try {
      const db = await getFirebaseDb();
      const gameRef = doc(db, 'gameRooms', gameId);

      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) {
          throw new Error('Game not found');
        }

        const gameData = gameDoc.data() as GameRecord;
        
        // Determine winner (opposite of timed out player)
        const winner = gameData.playerRed.uid === timedOutPlayerId ? 'blue' : 'red';
        
        const performanceStats = this.calculatePerformanceStats(gameData);
        const startTime = gameData.startedAt?.toDate?.() || gameData.createdAt.toDate();
        const gameDuration = Date.now() - startTime.getTime();

        const completionData: GameCompletionData = {
          gameId,
          winner,
          endReason: 'timeout',
          totalMoves: gameData.totalMoves,
          gameDuration,
          playerPerformance: performanceStats
        };

        await this.processGameCompletion(gameData, completionData);
      });

      console.log('Timeout processed for game:', gameId);
    } catch (error) {
      console.error('Failed to handle timeout:', error);
      throw error;
    }
  }

  /**
   * Handle abandonment
   */
  async handleAbandonment(gameId: string, abandoningPlayerId: string): Promise<void> {
    try {
      const db = await getFirebaseDb();
      const gameRef = doc(db, 'gameRooms', gameId);

      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) {
          throw new Error('Game not found');
        }

        const gameData = gameDoc.data() as GameRecord;
        
        // Determine winner (opposite of abandoning player)
        const winner = gameData.playerRed.uid === abandoningPlayerId ? 'blue' : 'red';
        
        const performanceStats = this.calculatePerformanceStats(gameData);
        const startTime = gameData.startedAt?.toDate?.() || gameData.createdAt.toDate();
        const gameDuration = Date.now() - startTime.getTime();

        const completionData: GameCompletionData = {
          gameId,
          winner,
          endReason: 'abandonment',
          totalMoves: gameData.totalMoves,
          gameDuration,
          playerPerformance: performanceStats
        };

        await this.processGameCompletion(gameData, completionData);
      });

      console.log('Abandonment processed for game:', gameId);
    } catch (error) {
      console.error('Failed to handle abandonment:', error);
      throw error;
    }
  }

  /**
   * Emit game completion event for UI updates
   */
  private emitGameCompletionEvent(
    gameId: string, 
    completionData: GameCompletionData, 
    eloResult: EloCalculationResult
  ): void {
    window.dispatchEvent(new CustomEvent('game:completed', {
      detail: {
        gameId,
        winner: completionData.winner,
        endReason: completionData.endReason,
        eloChanges: eloResult,
        gameStats: completionData
      }
    }));
  }

  /**
   * Get rating category for display purposes
   */
  getRatingCategory(rating: number): {
    name: string;
    color: string;
    range: string;
  } {
    if (rating >= 2200) {
      return { name: 'Expert', color: 'text-purple-400', range: '2200+' };
    } else if (rating >= 1800) {
      return { name: 'Advanced', color: 'text-blue-400', range: '1800-2199' };
    } else if (rating >= 1400) {
      return { name: 'Intermediate', color: 'text-green-400', range: '1400-1799' };
    } else if (rating >= 1000) {
      return { name: 'Beginner', color: 'text-yellow-400', range: '1000-1399' };
    } else {
      return { name: 'Novice', color: 'text-gray-400', range: '100-999' };
    }
  }

  /**
   * Calculate rating confidence based on games played
   */
  getRatingConfidence(totalGames: number): {
    level: 'low' | 'medium' | 'high';
    percentage: number;
    description: string;
  } {
    if (totalGames >= 50) {
      return {
        level: 'high',
        percentage: 95,
        description: 'Highly accurate rating'
      };
    } else if (totalGames >= 20) {
      return {
        level: 'medium',
        percentage: 80,
        description: 'Moderately accurate rating'
      };
    } else {
      return {
        level: 'low',
        percentage: 60,
        description: 'Provisional rating'
      };
    }
  }
}

export const eloService = new EloService();