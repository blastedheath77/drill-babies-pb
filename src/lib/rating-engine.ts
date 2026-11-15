/**
 * Rating engine (pure, no Firebase).
 *
 * The maths below is moved unchanged from the old copies in
 * src/app/log-game/actions.ts and src/app/tournaments/match-actions.ts.
 * Tests in rating-engine.test.ts pin the outputs so it can't drift.
 */
import { RATING_K_FACTOR, DEFAULT_RATING, MIN_RATING, MAX_RATING } from './constants';

// DUPR-style rating calculation functions

export function getExpectedScore(rating1: number, rating2: number) {
  // Convert DUPR ratings to probability using a scaled logistic function
  const ratingDiff = rating2 - rating1;
  return 1 / (1 + Math.pow(10, ratingDiff / 2)); // Scale factor of 2 for DUPR range
}

export function getScoreMarginMultiplier(winnerScore: number, loserScore: number) {
  // Calculate score margin multiplier - closer games have smaller swings
  const scoreDifference = winnerScore - loserScore;
  
  // Base multiplier starts at 1.0, increases with margin
  // Close games (1-point difference) = 0.7x multiplier
  // Blowouts (8+ point difference) = 1.3x multiplier
  const multiplier = 0.7 + (scoreDifference - 1) * 0.075;
  
  // Clamp between 0.5x and 1.5x to prevent extreme swings
  return Math.max(0.5, Math.min(1.5, multiplier));
}

export function getPerformanceMultiplier(playerRating: number, teamRating: number, gameType: string, isWinner: boolean) {
  // Individual performance weighting for doubles games
  if (gameType === 'singles') {
    return 1.0; // No adjustment for singles
  }

  // In doubles, adjust based on player strength relative to their own team
  const ratingDifference = playerRating - teamRating;

  if (isWinner) {
    // For WINS: Weaker players (below team average) get larger bonuses
    // Stronger players (above team average) get smaller bonuses
    // Formula: 1.0 - (playerRating - teamAvg) * 0.25
    const multiplier = 1.0 - ratingDifference * 0.25;
    return Math.max(0.6, Math.min(1.4, multiplier));
  } else {
    // For LOSSES: Weaker players (below team average) get smaller penalties
    // Stronger players (above team average) get larger penalties
    // Formula: 1.0 + (playerRating - teamAvg) * 0.25
    const multiplier = 1.0 + ratingDifference * 0.25;
    return Math.max(0.6, Math.min(1.4, multiplier));
  }
}

// Underdog multiplier: adjusts rating changes based on team matchup and individual rating
// - Underdogs who win get bonus, favorites who win get reduced gains
// - Low-rated players who lose get protection, high-rated losers get extra penalty
export const UNDERDOG_COEFFICIENT = 0.10; // Team-level underdog bonus/penalty
export const INDIVIDUAL_COEFFICIENT = 0.45; // Individual rating adjustment

export function getUnderdogMultiplier(
  playerRating: number,
  ownTeamRating: number,
  opponentTeamRating: number,
  isWinner: boolean
): number {
  // Team rating difference: positive means player's team is favored
  const teamRatingDiff = ownTeamRating - opponentTeamRating;

  // Player's rating relative to club starting rating (DEFAULT_RATING, currently 3.0)
  // Positive = above average (high-rated), Negative = below average (low-rated)
  const playerVsGlobal = playerRating - DEFAULT_RATING;

  if (isWinner) {
    // WINNERS get underdog bonus based on team comparison
    // Low-rated players on underdog teams get the biggest bonus
    const teamMultiplier = 1.0 - teamRatingDiff * UNDERDOG_COEFFICIENT;

    // Additional bonus for low-rated winners (they're proving themselves)
    // High-rated winners get slightly less (expected to win)
    const individualBonus = 1.0 - playerVsGlobal * 0.15;

    const combined = teamMultiplier * Math.max(0.8, Math.min(1.2, individualBonus));
    return Math.max(0.7, Math.min(1.5, combined));
  } else {
    // LOSERS:
    // Team-based: favorites who lose get penalized more (but smaller factor)
    const teamMultiplier = 1.0 + teamRatingDiff * UNDERDOG_COEFFICIENT;

    // Individual-based (STRONGER): HIGH-rated players who lose should lose MORE
    // LOW-rated players who lose should lose LESS (they're expected to struggle)
    const individualMultiplier = 1.0 + playerVsGlobal * INDIVIDUAL_COEFFICIENT;

    const combined = teamMultiplier * Math.max(0.5, Math.min(1.5, individualMultiplier));
    return Math.max(0.5, Math.min(1.6, combined));
  }
}

export function getNewRating(
  rating: number,
  expectedScore: number,
  actualScore: number,
  marginMultiplier: number = 1.0,
  performanceMultiplier: number = 1.0,
  underdogMultiplier: number = 1.0
) {
  // Calculate rating change with DUPR-appropriate scaling, margin adjustment, performance weighting, and underdog adjustment
  const baseChange = RATING_K_FACTOR * (actualScore - expectedScore) * 2;
  const ratingChange = baseChange * marginMultiplier * performanceMultiplier * underdogMultiplier;
  const newRating = rating + ratingChange;

  // Clamp rating within DUPR bounds
  return Math.max(MIN_RATING, Math.min(MAX_RATING, newRating));
}


// ---------------------------------------------------------------------------
// Whole-game helpers
// ---------------------------------------------------------------------------

export interface GameInput {
  team1PlayerIds: string[];
  team2PlayerIds: string[];
  team1Score: number;
  team2Score: number;
}

export interface PlayerTotals {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
}

export type RatingChanges = { [playerId: string]: { before: number; after: number } };

/**
 * Computes each player's new rating for one game, given their ratings going in.
 * Players missing from `ratings` are treated as DEFAULT_RATING for the team
 * average and are not given a rating change (matches the old behaviour).
 */
export function computeGameRatings(
  game: GameInput,
  ratings: { [playerId: string]: number }
): RatingChanges {
  const { team1PlayerIds, team2PlayerIds, team1Score, team2Score } = game;
  const gameType = team1PlayerIds.length === 1 ? 'singles' : 'doubles';

  const teamRating = (ids: string[]) =>
    ids.reduce((sum, id) => sum + (ratings[id] || DEFAULT_RATING), 0) / ids.length;
  const team1Rating = teamRating(team1PlayerIds);
  const team2Rating = teamRating(team2PlayerIds);

  const expectedScoreTeam1 = getExpectedScore(team1Rating, team2Rating);
  const expectedScoreTeam2 = getExpectedScore(team2Rating, team1Rating);

  const team1Won = team1Score > team2Score;
  const isDraw = team1Score === team2Score;
  const actualScoreTeam1 = isDraw ? 0.5 : team1Won ? 1 : 0;
  const actualScoreTeam2 = isDraw ? 0.5 : team1Won ? 0 : 1;

  const marginMultiplier = isDraw
    ? 1.0
    : getScoreMarginMultiplier(team1Won ? team1Score : team2Score, team1Won ? team2Score : team1Score);

  const changes: RatingChanges = {};
  for (const playerId of [...team1PlayerIds, ...team2PlayerIds]) {
    const rating = ratings[playerId];
    if (rating === undefined) continue;

    const isTeam1 = team1PlayerIds.includes(playerId);
    const ownTeam = isTeam1 ? team1Rating : team2Rating;
    const otherTeam = isTeam1 ? team2Rating : team1Rating;
    const isWinner = isDraw ? false : (isTeam1 && team1Won) || (!isTeam1 && !team1Won);
    const performanceMultiplier = isDraw ? 1.0 : getPerformanceMultiplier(rating, ownTeam, gameType, isWinner);
    const underdogMultiplier = isDraw ? 1.0 : getUnderdogMultiplier(rating, ownTeam, otherTeam, isWinner);

    const after = getNewRating(
      rating,
      isTeam1 ? expectedScoreTeam1 : expectedScoreTeam2,
      isTeam1 ? actualScoreTeam1 : actualScoreTeam2,
      marginMultiplier,
      performanceMultiplier,
      underdogMultiplier
    );
    changes[playerId] = { before: rating, after };
  }
  return changes;
}

/** Win/loss/draw/points deltas for one player in one game. */
export function gameStatDelta(game: GameInput, playerId: string) {
  const isTeam1 = game.team1PlayerIds.includes(playerId);
  const own = isTeam1 ? game.team1Score : game.team2Score;
  const other = isTeam1 ? game.team2Score : game.team1Score;
  return {
    wins: own > other ? 1 : 0,
    losses: own < other ? 1 : 0,
    draws: own === other ? 1 : 0,
    pointsFor: own,
    pointsAgainst: other,
  };
}

export interface ReplayGame extends GameInput {
  id: string;
  /** Ratings stored when the game was saved; used for ratings going into the replay window. */
  ratingChanges?: RatingChanges;
}

/**
 * Replays games in chronological order starting from `startIndex`.
 *
 * `timeline` is the (possibly edited) list of games; `original` is the stored
 * history before the edit (defaults to `timeline`). Games before `startIndex`
 * must be identical in both.
 *
 * Each player's rating going into the window is the `after` value of their
 * last game before `startIndex`. A player with no earlier game uses the stored
 * `before` of their first game at/after `startIndex` in the ORIGINAL history
 * (their starting rating, which no game can have changed), then
 * `fallbackRatings`, then DEFAULT_RATING. Games before the window keep their
 * stored ratings.
 *
 * Returns the recomputed ratingChanges for every game in the window and each
 * involved player's final rating.
 */
export function replayFrom(
  timeline: ReplayGame[],
  startIndex: number,
  fallbackRatings: { [playerId: string]: number } = {},
  original: ReplayGame[] = timeline
): { changes: { [gameId: string]: RatingChanges }; finalRatings: { [playerId: string]: number } } {
  const current: { [playerId: string]: number } = {};
  const games = timeline;

  const window = games.slice(startIndex);
  const involved = new Set(window.flatMap((g) => [...g.team1PlayerIds, ...g.team2PlayerIds]));

  for (const playerId of involved) {
    let rating: number | undefined;
    for (let i = startIndex - 1; i >= 0; i--) {
      const rc = games[i].ratingChanges?.[playerId];
      if (rc) {
        rating = rc.after;
        break;
      }
    }
    if (rating === undefined) {
      // No earlier game: their starting rating, from the unedited history
      const firstInWindow = original.slice(startIndex).find((g) => g.ratingChanges?.[playerId]);
      rating = firstInWindow?.ratingChanges?.[playerId]?.before ?? fallbackRatings[playerId] ?? DEFAULT_RATING;
    }
    current[playerId] = rating;
  }

  const changes: { [gameId: string]: RatingChanges } = {};
  for (const game of window) {
    const rc = computeGameRatings(game, current);
    for (const [playerId, { after }] of Object.entries(rc)) current[playerId] = after;
    changes[game.id] = rc;
  }

  return { changes, finalRatings: current };
}
