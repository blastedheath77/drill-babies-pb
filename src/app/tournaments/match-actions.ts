'use server';

import { collection, doc, updateDoc, addDoc, serverTimestamp, writeBatch, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import { validateData, scoreSchema } from '@/lib/validations';
import { getTournamentMatchById } from '@/lib/data';
import { logger } from '@/lib/logger';
import { RATING_K_FACTOR, DEFAULT_RATING, MIN_RATING, MAX_RATING } from '@/lib/constants';
import { z } from 'zod';
import type { Player } from '@/lib/types';

const matchResultSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  team1Score: scoreSchema,
  team2Score: scoreSchema,
  tournamentId: z.string().min(1, 'Tournament ID is required'),
})
  .refine(
    (data) => data.team1Score !== data.team2Score,
    {
      message: 'Match cannot end in a tie',
    }
  );

// Enhanced rating calculation functions with score margin and individual performance weighting

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

function getPerformanceMultiplier(playerRating: number, teamRating: number, gameType: string) {
  // Individual performance weighting for doubles games
  if (gameType === 'singles') {
    return 1.0; // No adjustment for singles
  }
  
  // In doubles, adjust based on relative strength within team
  const ratingDifference = playerRating - teamRating;
  
  // Stronger player (above team average) gets smaller changes
  // Weaker player (below team average) gets larger changes
  // Formula: 1.0 + (teamAvg - playerRating) * 0.15
  const multiplier = 1.0 - ratingDifference * 0.15;
  
  // Clamp between 0.7x and 1.3x
  return Math.max(0.7, Math.min(1.3, multiplier));
}

function getNewRating(rating: number, expectedScore: number, actualScore: number, marginMultiplier: number = 1.0, performanceMultiplier: number = 1.0) {
  // Calculate rating change with DUPR-appropriate scaling, margin adjustment, and performance weighting
  const baseChange = RATING_K_FACTOR * (actualScore - expectedScore) * 2;
  const ratingChange = baseChange * marginMultiplier * performanceMultiplier;
  const newRating = rating + ratingChange;

  // Clamp rating within DUPR bounds
  return Math.max(MIN_RATING, Math.min(MAX_RATING, newRating));
}

interface MatchResultData {
  matchId: string;
  team1Score: number;
  team2Score: number;
  tournamentId: string;
}

export async function recordTournamentMatchResult(data: MatchResultData) {
  try {
    // Validate input data
    const validatedData = validateData(matchResultSchema, data);
    const { matchId, team1Score, team2Score, tournamentId } = validatedData;

    logger.info('Recording tournament match result', { matchId, team1Score, team2Score });

    // Get the match details to get player information
    const match = await getTournamentMatchById(matchId);
    if (!match) {
      throw new Error('Tournament match not found');
    }

    if (match.status === 'completed') {
      throw new Error('Match is already completed');
    }

    // Prepare player IDs for both teams
    let team1PlayerIds: string[] = [];
    let team2PlayerIds: string[] = [];

    if (match.player1Id && match.player2Id) {
      // Singles match
      team1PlayerIds = [match.player1Id];
      team2PlayerIds = [match.player2Id];
    } else if (match.team1PlayerIds && match.team2PlayerIds) {
      // Doubles match
      team1PlayerIds = match.team1PlayerIds;
      team2PlayerIds = match.team2PlayerIds;
    } else {
      throw new Error('Invalid match configuration');
    }

    const allPlayerIds = [...team1PlayerIds, ...team2PlayerIds];

    // Use a batch to ensure all updates happen together
    const batch = writeBatch(db);

    // Fetch all players involved
    const playersQuery = query(collection(db, 'players'), where(documentId(), 'in', allPlayerIds));
    const playersSnapshot = await getDocs(playersQuery);
    const players: { [id: string]: Player } = {};
    playersSnapshot.forEach((doc) => {
      players[doc.id] = { id: doc.id, ...doc.data() } as Player;
    });

    // Calculate team ratings for expected score calculation
    const getTeamRating = (ids: string[]) => {
      return ids.reduce((sum, id) => sum + (players[id]?.rating || DEFAULT_RATING), 0) / ids.length;
    };
    const team1Rating = getTeamRating(team1PlayerIds);
    const team2Rating = getTeamRating(team2PlayerIds);

    // Calculate expected and actual scores
    const expectedScoreTeam1 = getExpectedScore(team1Rating, team2Rating);
    const expectedScoreTeam2 = getExpectedScore(team2Rating, team1Rating);
    
    const team1Won = team1Score > team2Score;
    const actualScoreTeam1 = team1Won ? 1 : 0;
    const actualScoreTeam2 = team1Won ? 0 : 1;

    // Calculate margin and performance multipliers
    const winnerScore = team1Won ? team1Score : team2Score;
    const loserScore = team1Won ? team2Score : team1Score;
    const marginMultiplier = getScoreMarginMultiplier(winnerScore, loserScore);

    // Track rating changes for game record
    const ratingChanges: { [playerId: string]: { before: number; after: number } } = {};

    // Update each player's stats and ratings
    for (const playerId of allPlayerIds) {
      const playerRef = doc(db, 'players', playerId);
      const player = players[playerId];

      if (player) {
        const isTeam1 = team1PlayerIds.includes(playerId);
        const oldRating = player.rating;
        
        // Calculate individual performance multiplier
        const teamRating = isTeam1 ? team1Rating : team2Rating;
        const gameType = team1PlayerIds.length === 1 ? 'singles' : 'doubles';
        const performanceMultiplier = getPerformanceMultiplier(player.rating, teamRating, gameType);
        
        const newRating = getNewRating(
          player.rating,
          isTeam1 ? expectedScoreTeam1 : expectedScoreTeam2,
          isTeam1 ? actualScoreTeam1 : actualScoreTeam2,
          marginMultiplier,
          performanceMultiplier
        );

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

    // Create the game record with rating changes
    const gameData = {
      type: team1PlayerIds.length === 1 ? 'Singles' : 'Doubles',
      date: serverTimestamp(),
      team1: {
        playerIds: team1PlayerIds,
        score: team1Score,
      },
      team2: {
        playerIds: team2PlayerIds,
        score: team2Score,
      },
      playerIds: allPlayerIds,
      tournamentId: tournamentId,
      ratingChanges,
    };

    // Add the game to the games collection
    const gameRef = await addDoc(collection(db, 'games'), gameData);
    logger.info('Created game record for tournament match', { gameId: gameRef.id, matchId });

    // Update the match status and link to the game (add to batch)
    batch.update(doc(db, 'tournamentMatches', matchId), {
      status: 'completed',
      gameId: gameRef.id,
    });

    // Commit all updates together
    await batch.commit();
    logger.info('Updated match status to completed and player stats', { matchId, gameId: gameRef.id });

    // Check if this completes a round and if we need to generate next round matches
    // This is a simplified version - in a full implementation, you'd need more complex bracket logic
    await checkAndGenerateNextRoundMatches(tournamentId, match.round);

    // Revalidate the tournament page and related pages
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath('/tournaments');
    revalidatePath('/');
    revalidatePath('/statistics');

    return { success: true, gameId: gameRef.id };

  } catch (error) {
    logger.error('Error recording tournament match result', error);
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to record match result');
  }
}

// Helper function to check if we need to generate next round matches
async function checkAndGenerateNextRoundMatches(tournamentId: string, currentRound: number) {
  // This is a simplified implementation
  // In a full tournament system, you'd need to:
  // 1. Check if all matches in current round are completed
  // 2. Determine winners and advance them to next round
  // 3. Generate new matches for the next round
  // 4. Handle different tournament types (single-elimination, double-elimination, etc.)
  
  logger.info('Checking for next round generation', { tournamentId, currentRound });
  
  // For now, we'll just log that this functionality needs to be implemented
  // This would be a complex feature requiring bracket management logic
}