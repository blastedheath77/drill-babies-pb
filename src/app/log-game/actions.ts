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
})
  .refine(
    (data) => {
      // Games cannot end in a tie
      return data.team1Score !== data.team2Score;
    },
    {
      message: 'Games cannot end in a tie',
    }
  )
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

function getPerformanceMultiplier(playerRating: number, opposingTeamRating: number, gameType: string, isWinner: boolean) {
  // Individual performance weighting for doubles games
  if (gameType === 'singles') {
    return 1.0; // No adjustment for singles
  }
  
  // In doubles, adjust based on player strength relative to opposing team
  const ratingDifference = playerRating - opposingTeamRating;
  
  if (isWinner) {
    // For WINS: Weaker players (below opponent average) get larger bonuses
    // Stronger players (above opponent average) get smaller bonuses
    // Formula: 1.0 - (playerRating - opposingTeamAvg) * 0.15
    const multiplier = 1.0 - ratingDifference * 0.15;
    return Math.max(0.7, Math.min(1.3, multiplier));
  } else {
    // For LOSSES: Stronger players (above opponent average) get larger penalties
    // Weaker players (below opponent average) get smaller penalties  
    // Formula: 1.0 + (playerRating - opposingTeamAvg) * 0.15
    const multiplier = 1.0 + ratingDifference * 0.15;
    return Math.max(0.7, Math.min(1.3, multiplier));
  }
}

function getNewRating(rating: number, expectedScore: number, actualScore: number, marginMultiplier: number = 1.0, performanceMultiplier: number = 1.0) {
  // Calculate rating change with DUPR-appropriate scaling, margin adjustment, and performance weighting
  const baseChange = RATING_K_FACTOR * (actualScore - expectedScore) * 2;
  const ratingChange = baseChange * marginMultiplier * performanceMultiplier;
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

    // 4. Determine actual scores (1 for win, 0 for loss)
    const team1Won = team1Score > team2Score;
    const actualScoreTeam1 = team1Won ? 1 : 0;
    const actualScoreTeam2 = team1Won ? 0 : 1;

    // 5. Calculate margin and performance multipliers
    const winnerScore = team1Won ? team1Score : team2Score;
    const loserScore = team1Won ? team2Score : team1Score;
    const marginMultiplier = getScoreMarginMultiplier(winnerScore, loserScore);

    // 6. Update player stats and ratings, track rating changes
    const ratingChanges: { [playerId: string]: { before: number; after: number } } = {};

    for (const playerId of allPlayerIds) {
      const playerRef = doc(db, 'players', playerId);
      const player = players[playerId];

      if (player) {
        const isTeam1 = team1PlayerIds.includes(playerId);
        const oldRating = player.rating;
        
        // Calculate individual performance multiplier against opposing team
        const opposingTeamRating = isTeam1 ? team2Rating : team1Rating;
        const isWinner = (isTeam1 && team1Won) || (!isTeam1 && !team1Won);
        const performanceMultiplier = getPerformanceMultiplier(player.rating, opposingTeamRating, gameType, isWinner);
        
        const newRating = getNewRating(
          player.rating,
          isTeam1 ? expectedScoreTeam1 : expectedScoreTeam2,
          isTeam1 ? actualScoreTeam1 : actualScoreTeam2,
          marginMultiplier,
          performanceMultiplier
        );

        // Track rating change
        ratingChanges[playerId] = { before: oldRating, after: newRating };

        const wins = player.wins + ((isTeam1 && team1Won) || (!isTeam1 && !team1Won) ? 1 : 0);
        const losses = player.losses + ((isTeam1 && !team1Won) || (!isTeam1 && team1Won) ? 1 : 0);
        const pointsFor = player.pointsFor + (isTeam1 ? team1Score : team2Score);
        const pointsAgainst = player.pointsAgainst + (isTeam1 ? team2Score : team1Score);

        batch.update(playerRef, {
          wins,
          losses,
          pointsFor,
          pointsAgainst,
          rating: newRating,
        });
      }
    }

    // 7. Add the game document with rating changes
    await addDoc(collection(db, 'games'), {
      type: gameType === 'singles' ? 'Singles' : 'Doubles',
      date: serverTimestamp(),
      team1: { playerIds: team1PlayerIds, score: team1Score },
      team2: { playerIds: team2PlayerIds, score: team2Score },
      playerIds: allPlayerIds,
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
