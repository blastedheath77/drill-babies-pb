'use server';

import { revalidatePath } from 'next/cache';
import {
  collection,
  writeBatch,
  doc,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  documentId,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Player } from '@/lib/types';
import { RATING_K_FACTOR, DEFAULT_RATING, MIN_RATING, MAX_RATING } from '@/lib/constants';
import { ValidationError, handleDatabaseError } from '@/lib/errors';
import { validateData } from '@/lib/validations';
import { z } from 'zod';

const logGameSchema = z.object({
  gameType: z.enum(['singles', 'doubles']),
  team1Player1: z.string().min(1, 'Player is required'),
  team1Player2: z.string().optional(),
  team1Score: z.coerce.number().min(0).max(50, 'Score cannot exceed 50'),
  team2Player1: z.string().min(1, 'Player is required'),
  team2Player2: z.string().optional(),
  team2Score: z.coerce.number().min(0).max(50, 'Score cannot exceed 50'),
  clubId: z.string().min(1, 'Club ID is required'),
})
  .refine(
    (data) => {
      // For doubles, must have second players
      if (data.gameType === 'doubles') {
        return data.team1Player2 && data.team2Player2;
      }
      return true;
    },
    {
      message: 'Doubles games require 2 players per team',
    }
  )
  .refine(
    (data) => {
      // For singles, must not have second players
      if (data.gameType === 'singles') {
        return !data.team1Player2 && !data.team2Player2;
      }
      return true;
    },
    {
      message: 'Singles games require exactly 1 player per team',
    }
  );

// DUPR-style rating calculation functions

function getExpectedScore(rating1: number, rating2: number) {
  // Convert DUPR ratings to probability using a scaled logistic function
  const ratingDiff = rating2 - rating1;
  return 1 / (1 + Math.pow(10, ratingDiff / 2)); // Scale factor of 2 for DUPR range
}

function getScoreMarginMultiplier(winnerScore: number, loserScore: number) {
  // Calculate score margin multiplier - closer games have smaller swings
  const scoreDifference = winnerScore - loserScore;
  
  // Base multiplier starts at 1.0, increases with margin
  // Close games (1-point difference) = 0.7x multiplier
  // Blowouts (8+ point difference) = 1.3x multiplier
  const multiplier = 0.7 + (scoreDifference - 1) * 0.075;
  
  // Clamp between 0.5x and 1.5x to prevent extreme swings
  return Math.max(0.5, Math.min(1.5, multiplier));
}

function getPerformanceMultiplier(playerRating: number, teamRating: number, gameType: string, isWinner: boolean) {
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
const UNDERDOG_COEFFICIENT = 0.10; // Team-level underdog bonus/penalty
const INDIVIDUAL_COEFFICIENT = 0.45; // Individual rating adjustment

function getUnderdogMultiplier(
  playerRating: number,
  ownTeamRating: number,
  opponentTeamRating: number,
  isWinner: boolean
): number {
  // Team rating difference: positive means player's team is favored
  const teamRatingDiff = ownTeamRating - opponentTeamRating;

  // Player's rating relative to global average (DEFAULT_RATING = 3.5)
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

function getNewRating(
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

export async function logGame(values: z.infer<typeof logGameSchema>) {
  const validatedData = validateData(logGameSchema, values);

  const {
    gameType,
    team1Player1,
    team1Player2,
    team1Score,
    team2Player1,
    team2Player2,
    team2Score,
    clubId,
  } = validatedData;

  const team1PlayerIds = [team1Player1];
  if (gameType === 'doubles' && team1Player2) {
    team1PlayerIds.push(team1Player2);
  }

  const team2PlayerIds = [team2Player1];
  if (gameType === 'doubles' && team2Player2) {
    team2PlayerIds.push(team2Player2);
  }

  const allPlayerIds = [...team1PlayerIds, ...team2PlayerIds];
  const uniquePlayerIds = [...new Set(allPlayerIds)];

  if (uniquePlayerIds.length !== allPlayerIds.length) {
    throw new ValidationError('Each player can only be selected once.');
  }

  try {
    const batch = writeBatch(db);

    // 1. Fetch all players involved
    const playersQuery = query(collection(db, 'players'), where(documentId(), 'in', allPlayerIds));
    const playersSnapshot = await getDocs(playersQuery);
    const players: { [id: string]: Player } = {};
    playersSnapshot.forEach((doc) => {
      players[doc.id] = { id: doc.id, ...doc.data() } as Player;
    });

    // 2. Calculate average team ratings
    const getTeamRating = (ids: string[]) => {
      return ids.reduce((sum, id) => sum + (players[id]?.rating || DEFAULT_RATING), 0) / ids.length;
    };
    const team1Rating = getTeamRating(team1PlayerIds);
    const team2Rating = getTeamRating(team2PlayerIds);

    // 3. Calculate expected scores
    const expectedScoreTeam1 = getExpectedScore(team1Rating, team2Rating);
    const expectedScoreTeam2 = getExpectedScore(team2Rating, team1Rating);

    // 4. Determine actual scores (1 for win, 0 for loss, 0.5 for draw)
    const team1Won = team1Score > team2Score;
    const isDraw = team1Score === team2Score;
    const actualScoreTeam1 = isDraw ? 0.5 : (team1Won ? 1 : 0);
    const actualScoreTeam2 = isDraw ? 0.5 : (team1Won ? 0 : 1);

    // 5. Calculate margin and performance multipliers
    const marginMultiplier = isDraw ? 1.0 : getScoreMarginMultiplier(
      team1Won ? team1Score : team2Score,
      team1Won ? team2Score : team1Score
    );

    // 6. Update player stats and ratings, track rating changes
    const ratingChanges: { [playerId: string]: { before: number; after: number } } = {};

    for (const playerId of allPlayerIds) {
      const playerRef = doc(db, 'players', playerId);
      const player = players[playerId];

      if (player) {
        const isTeam1 = team1PlayerIds.includes(playerId);
        const oldRating = player.rating;

        // Calculate individual performance multiplier relative to own team
        const teamRating = isTeam1 ? team1Rating : team2Rating;
        const opponentTeamRating = isTeam1 ? team2Rating : team1Rating;
        const isWinner = isDraw ? false : ((isTeam1 && team1Won) || (!isTeam1 && !team1Won));
        const performanceMultiplier = isDraw ? 1.0 : getPerformanceMultiplier(player.rating, teamRating, gameType, isWinner);

        // Calculate underdog multiplier based on team matchup and individual rating
        const underdogMultiplier = isDraw ? 1.0 : getUnderdogMultiplier(
          player.rating,
          teamRating,
          opponentTeamRating,
          isWinner
        );

        const newRating = getNewRating(
          player.rating,
          isTeam1 ? expectedScoreTeam1 : expectedScoreTeam2,
          isTeam1 ? actualScoreTeam1 : actualScoreTeam2,
          marginMultiplier,
          performanceMultiplier,
          underdogMultiplier
        );

        // Track rating change
        ratingChanges[playerId] = { before: oldRating, after: newRating };

        const wins = player.wins + (isDraw ? 0 : ((isTeam1 && team1Won) || (!isTeam1 && !team1Won) ? 1 : 0));
        const losses = player.losses + (isDraw ? 0 : ((isTeam1 && !team1Won) || (!isTeam1 && team1Won) ? 1 : 0));
        const draws = (player.draws || 0) + (isDraw ? 1 : 0);
        const pointsFor = player.pointsFor + (isTeam1 ? team1Score : team2Score);
        const pointsAgainst = player.pointsAgainst + (isTeam1 ? team2Score : team1Score);

        batch.update(playerRef, {
          wins,
          losses,
          draws,
          pointsFor,
          pointsAgainst,
          rating: newRating,
        });
      }
    }

    // 7. Add the game document with rating changes and clubId
    await addDoc(collection(db, 'games'), {
      type: gameType === 'singles' ? 'Singles' : 'Doubles',
      date: serverTimestamp(),
      team1: { playerIds: team1PlayerIds, score: team1Score },
      team2: { playerIds: team2PlayerIds, score: team2Score },
      playerIds: allPlayerIds,
      clubId,
      ratingChanges,
    });

    await batch.commit();

    revalidatePath('/');
    revalidatePath('/log-game');
    revalidatePath('/players');
    revalidatePath('/statistics');
    allPlayerIds.forEach((id) => revalidatePath(`/players/${id}`));
  } catch (error) {
    handleDatabaseError(error, 'log game');
  }
}
