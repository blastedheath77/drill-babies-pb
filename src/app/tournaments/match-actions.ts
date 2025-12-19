'use server';

import { collection, doc, updateDoc, addDoc, serverTimestamp, writeBatch, getDocs, query, where, documentId, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import { validateData, scoreSchema, quickPlayMatchResultSchema } from '@/lib/validations';
import { getTournamentMatchById } from '@/lib/data';
import { logger } from '@/lib/logger';
import { RATING_K_FACTOR, DEFAULT_RATING, MIN_RATING, MAX_RATING } from '@/lib/constants';
import { z } from 'zod';
import type { Player, Tournament } from '@/lib/types';

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

interface MatchResultData {
  matchId: string;
  team1Score: number;
  team2Score: number;
  tournamentId: string;
}

export async function recordTournamentMatchResult(data: MatchResultData) {
  try {
    // Get tournament details first to determine validation schema
    const tournamentRef = doc(db, 'tournaments', data.tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) {
      throw new Error('Tournament not found');
    }

    const tournament = { id: data.tournamentId, ...tournamentSnap.data() } as Tournament;

    // Use appropriate validation schema based on tournament type
    const schema = tournament.isQuickPlay ? quickPlayMatchResultSchema : matchResultSchema;
    const validatedData = validateData(schema, data);
    const { matchId, team1Score, team2Score, tournamentId } = validatedData;

    logger.info('Recording tournament match result', { matchId, team1Score, team2Score, isQuickPlay: tournament.isQuickPlay });

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
    const isDraw = team1Score === team2Score;
    const actualScoreTeam1 = isDraw ? 0.5 : (team1Won ? 1 : 0);
    const actualScoreTeam2 = isDraw ? 0.5 : (team1Won ? 0 : 1);

    // Calculate margin and performance multipliers
    const marginMultiplier = isDraw ? 1.0 : getScoreMarginMultiplier(
      team1Won ? team1Score : team2Score,
      team1Won ? team2Score : team1Score
    );

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
        const opponentTeamRating = isTeam1 ? team2Rating : team1Rating;
        const gameType = team1PlayerIds.length === 1 ? 'singles' : 'doubles';
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
      clubId: tournament.clubId,
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

    // Check if the tournament is now complete
    await checkTournamentCompletionInternal(tournamentId);

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

// Helper function to check if tournament is complete and update status accordingly
async function checkTournamentCompletionInternal(tournamentId: string) {
  try {
    // Get tournament details
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);
    
    if (!tournamentSnap.exists()) {
      logger.error('Tournament not found for completion check', { tournamentId });
      return;
    }
    
    const tournament = { id: tournamentId, ...tournamentSnap.data() } as Tournament;
    
    // Skip if already completed
    if (tournament.status === 'completed') {
      return;
    }
    
    // Get all matches for this tournament
    const matchesQuery = query(
      collection(db, 'tournamentMatches'),
      where('tournamentId', '==', tournamentId)
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    
    if (matchesSnapshot.empty) {
      logger.info('No matches found for tournament', { tournamentId });
      return;
    }
    
    // Check if all matches are completed
    const matches = matchesSnapshot.docs.map(doc => doc.data());
    const totalMatches = matches.length;
    const completedMatches = matches.filter(match => match.status === 'completed').length;
    const pendingMatches = matches.filter(match => match.status === 'pending').length;
    const inProgressMatches = matches.filter(match => match.status === 'in-progress').length;
    
    logger.info('Tournament completion check', {
      tournamentId,
      totalMatches,
      completedMatches,
      pendingMatches,
      inProgressMatches
    });
    
    // Tournament is complete if:
    // 1. All matches are completed OR
    // 2. There are no pending or in-progress matches (only completed and potentially bye matches)
    const isComplete = (completedMatches === totalMatches) || (pendingMatches === 0 && inProgressMatches === 0);
    
    if (isComplete) {
      logger.info('Tournament is complete, updating status', { tournamentId });
      
      await updateDoc(tournamentRef, {
        status: 'completed',
        completedDate: serverTimestamp(),
      });
      
      logger.info('Tournament status updated to completed', { tournamentId });
    } else {
      logger.info('Tournament not yet complete', {
        tournamentId,
        remainingPendingMatches: pendingMatches,
        remainingInProgressMatches: inProgressMatches
      });
    }
    
  } catch (error) {
    logger.error('Error checking tournament completion', { tournamentId, error });
  }
}

// Export the completion checker for use in other places
export async function checkTournamentCompletion(tournamentId: string) {
  return checkTournamentCompletionInternal(tournamentId);
}