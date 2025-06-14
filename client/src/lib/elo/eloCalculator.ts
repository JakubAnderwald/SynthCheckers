import { ELO_CONSTANTS } from '../../types/firestore';

export interface EloResult {
  newRating: number;
  ratingChange: number;
  kFactor: number;
}

export interface PlayerRating {
  rating: number;
  totalGames: number;
}

export type GameResult = 'win' | 'loss' | 'draw';

/**
 * Calculate expected score for a player against an opponent
 * @param playerRating Player's current rating
 * @param opponentRating Opponent's current rating
 * @returns Expected score (0-1, where 1 = certain win, 0.5 = even match)
 */
export function calculateExpectedScore(playerRating: number, opponentRating: number): number {
  const ratingDifference = opponentRating - playerRating;
  return 1 / (1 + Math.pow(10, ratingDifference / 400));
}

/**
 * Determine K-factor based on player rating and experience
 * @param rating Player's current rating
 * @param totalGames Total games played by the player
 * @returns K-factor for rating calculation
 */
export function getKFactor(rating: number, totalGames: number): number {
  // New players (< 30 games) get higher K-factor for faster adjustment
  if (totalGames < 30) {
    return ELO_CONSTANTS.K_FACTOR_DEFAULT;
  }
  
  // Masters (2000+ rating) get lower K-factor for stability
  if (rating >= 2000) {
    return ELO_CONSTANTS.K_FACTOR_MASTER;
  }
  
  // Experienced players get medium K-factor
  return ELO_CONSTANTS.K_FACTOR_EXPERIENCED;
}

/**
 * Convert game result to actual score
 * @param result Game result from player's perspective
 * @returns Actual score (1 = win, 0.5 = draw, 0 = loss)
 */
export function getActualScore(result: GameResult): number {
  switch (result) {
    case 'win':
      return 1.0;
    case 'draw':
      return 0.5;
    case 'loss':
      return 0.0;
    default:
      throw new Error(`Invalid game result: ${result}`);
  }
}

/**
 * Calculate new ELO rating after a game
 * @param player Player's current rating and game count
 * @param opponent Opponent's current rating and game count
 * @param result Game result from player's perspective
 * @returns New rating calculation result
 */
export function calculateNewRating(
  player: PlayerRating,
  opponent: PlayerRating,
  result: GameResult
): EloResult {
  // Validate inputs
  if (player.rating < ELO_CONSTANTS.RATING_FLOOR || player.rating > ELO_CONSTANTS.RATING_CEILING) {
    throw new Error(`Player rating ${player.rating} is outside valid range`);
  }
  
  if (opponent.rating < ELO_CONSTANTS.RATING_FLOOR || opponent.rating > ELO_CONSTANTS.RATING_CEILING) {
    throw new Error(`Opponent rating ${opponent.rating} is outside valid range`);
  }

  // Calculate expected and actual scores
  const expectedScore = calculateExpectedScore(player.rating, opponent.rating);
  const actualScore = getActualScore(result);
  
  // Determine K-factor
  const kFactor = getKFactor(player.rating, player.totalGames);
  
  // Calculate rating change
  const ratingChange = Math.round(kFactor * (actualScore - expectedScore));
  
  // Calculate new rating with bounds checking
  let newRating = player.rating + ratingChange;
  newRating = Math.max(ELO_CONSTANTS.RATING_FLOOR, newRating);
  newRating = Math.min(ELO_CONSTANTS.RATING_CEILING, newRating);
  
  return {
    newRating,
    ratingChange: newRating - player.rating,
    kFactor
  };
}

/**
 * Calculate rating changes for both players after a game
 * @param redPlayer Red player's rating data
 * @param bluePlayer Blue player's rating data
 * @param winner Game winner ('red', 'blue', or 'draw')
 * @returns Rating changes for both players
 */
export function calculateGameRatingChanges(
  redPlayer: PlayerRating,
  bluePlayer: PlayerRating,
  winner: 'red' | 'blue' | 'draw'
): {
  red: EloResult;
  blue: EloResult;
} {
  // Determine results from each player's perspective
  let redResult: GameResult;
  let blueResult: GameResult;
  
  switch (winner) {
    case 'red':
      redResult = 'win';
      blueResult = 'loss';
      break;
    case 'blue':
      redResult = 'loss';
      blueResult = 'win';
      break;
    case 'draw':
      redResult = 'draw';
      blueResult = 'draw';
      break;
    default:
      throw new Error(`Invalid winner: ${winner}`);
  }
  
  // Calculate new ratings
  const redResult_calc = calculateNewRating(redPlayer, bluePlayer, redResult);
  const blueResult_calc = calculateNewRating(bluePlayer, redPlayer, blueResult);
  
  return {
    red: redResult_calc,
    blue: blueResult_calc
  };
}

/**
 * Calculate rating statistics for performance analysis
 * @param ratingHistory Array of rating entries
 * @returns Statistical analysis of rating performance
 */
export function calculateRatingStatistics(
  ratingHistory: Array<{ rating: number; change: number; timestamp: Date }>
): {
  currentRating: number;
  peakRating: number;
  lowestRating: number;
  totalGames: number;
  averageChange: number;
  volatility: number;
  trend: 'improving' | 'declining' | 'stable';
  last30DaysChange: number;
} {
  if (ratingHistory.length === 0) {
    return {
      currentRating: ELO_CONSTANTS.DEFAULT_RATING,
      peakRating: ELO_CONSTANTS.DEFAULT_RATING,
      lowestRating: ELO_CONSTANTS.DEFAULT_RATING,
      totalGames: 0,
      averageChange: 0,
      volatility: 0,
      trend: 'stable',
      last30DaysChange: 0
    };
  }
  
  const currentRating = ratingHistory[ratingHistory.length - 1].rating;
  const peakRating = Math.max(...ratingHistory.map(entry => entry.rating));
  const lowestRating = Math.min(...ratingHistory.map(entry => entry.rating));
  const totalGames = ratingHistory.length;
  
  // Calculate average change
  const changes = ratingHistory.map(entry => entry.change);
  const averageChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  
  // Calculate volatility (standard deviation of changes)
  const variance = changes.reduce((sum, change) => sum + Math.pow(change - averageChange, 2), 0) / changes.length;
  const volatility = Math.sqrt(variance);
  
  // Determine trend (last 10 games or all if fewer)
  const recentGames = ratingHistory.slice(-Math.min(10, ratingHistory.length));
  const recentTrend = recentGames.length > 1 
    ? (recentGames[recentGames.length - 1].rating - recentGames[0].rating) / recentGames.length
    : 0;
  
  let trend: 'improving' | 'declining' | 'stable';
  if (recentTrend > 2) trend = 'improving';
  else if (recentTrend < -2) trend = 'declining';
  else trend = 'stable';
  
  // Calculate 30-day change
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentEntries = ratingHistory.filter(entry => entry.timestamp > thirtyDaysAgo);
  const last30DaysChange = recentEntries.length > 0 
    ? currentRating - recentEntries[0].rating 
    : 0;
  
  return {
    currentRating,
    peakRating,
    lowestRating,
    totalGames,
    averageChange,
    volatility,
    trend,
    last30DaysChange
  };
}