'use server';

import { collection, doc, addDoc, writeBatch, getDocs, query, where, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import { checkTournamentCompletion } from './match-actions';
import type { Tournament, TournamentMatch } from '@/lib/types';
import { logger } from '@/lib/logger';
import { getCurrentUser, requireAuthentication } from '@/lib/server-auth';
import { requirePermission } from '@/lib/permissions';
import { getOptimalRound, calculateMaxUniqueRounds, clearTournamentScheduleCache } from '@/lib/pairing-algorithms';

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

interface CreateQuickPlayData {
  name: string;
  description: string;
  format: 'singles' | 'doubles';
  playerIds: string[];
  clubId: string;
  availableCourts: number;
  maxRounds: number;
  isQuickPlay: boolean;
  currentRound: number;
}

export async function createQuickPlayTournament(data: CreateQuickPlayData) {
  try {
    // Clear tournament schedule cache for fresh pairings
    clearTournamentScheduleCache();

    // Check authentication and permissions
    const currentUser = await getCurrentUser();
    requireAuthentication(currentUser);
    requirePermission(currentUser, 'canCreateTournaments');
    
    // Validate player count based on format
    if (data.format === 'singles' && data.playerIds.length < 2) {
      throw new ValidationError('Singles Quick Play requires at least 2 players');
    }
    if (data.format === 'doubles' && data.playerIds.length < 4) {
      throw new ValidationError('Doubles Quick Play requires at least 4 players');
    }

    // Calculate estimated duration for all rounds
    const roundDuration = calculateQuickPlayRoundDuration(
      data.playerIds.length,
      data.format,
      data.availableCourts
    );
    const estimatedDuration = roundDuration * data.maxRounds;

    // Create Quick Play tournament document
    const tournament: Omit<Tournament, 'id'> = {
      name: data.name.trim(),
      description: data.description.trim(),
      format: data.format,
      type: 'round-robin', // Quick Play is always round-robin
      status: 'active',
      playerIds: data.playerIds,
      clubId: data.clubId,
      createdDate: new Date().toISOString(),
      createdBy: 'admin', // TODO: Replace with actual user ID
      availableCourts: data.availableCourts,
      maxRounds: data.maxRounds,
      estimatedDuration,
      isQuickPlay: true,
      currentRound: data.maxRounds, // Set to maxRounds since we'll generate all rounds
    };

    const tournamentRef = await addDoc(collection(db, 'tournaments'), tournament);
    const tournamentId = tournamentRef.id;

    // Generate all rounds of matches using smart round generation
    for (let roundNumber = 1; roundNumber <= data.maxRounds; roundNumber++) {
      await generateQuickPlayRound(
        tournamentId, 
        data.format, 
        data.playerIds,
        roundNumber,
        data.availableCourts
      );
    }

    revalidatePath('/tournaments');

    return { success: true, tournamentId };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error('Error creating Quick Play tournament', error);
    throw new Error('Failed to create Quick Play tournament');
  }
}

// Calculate duration for one Quick Play round
function calculateQuickPlayRoundDuration(
  playerCount: number,
  format: Tournament['format'],
  courtsAvailable: number
): number {
  if (format === 'singles') {
    const matches = Math.min(Math.floor(playerCount / 2), courtsAvailable);
    return matches > 0 ? 8 : 0; // 8 minutes per singles round
  } else {
    const maxMatchesByPlayers = Math.floor(playerCount / 4);
    const matches = Math.min(maxMatchesByPlayers, courtsAvailable);
    return matches > 0 ? 10 : 0; // 10 minutes per doubles round
  }
}

// Generate a single round for Quick Play with optimal pairing rotation
async function generateQuickPlayRound(
  tournamentId: string,
  format: Tournament['format'],
  playerIds: string[],
  roundNumber: number,
  courtsAvailable: number
) {
  const batch = writeBatch(db);
  let matchNumber = 1;
  
  // Get existing matches to use for optimal pairing
  const existingMatchesQuery = query(
    collection(db, 'tournamentMatches'),
    where('tournamentId', '==', tournamentId)
  );
  const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
  
  const existingMatches = existingMatchesSnapshot.docs.map(doc => doc.data());

  logger.debug(`Generating Quick Play round ${roundNumber} for ${format} with ${playerIds.length} players`);

  // Try to use optimal pairing algorithm first
  try {
    const optimalResult = getOptimalRound(playerIds, format, roundNumber, courtsAvailable);
    
    if (optimalResult.matches.length > 0) {
      logger.info(`Using optimal pairing algorithm for round ${roundNumber}: ${optimalResult.matches.length} matches, ${optimalResult.restingPlayers.length} players resting`);
      
      // Create tournament match documents from optimal pairing
      for (const match of optimalResult.matches) {
        if (format === 'singles') {
          const tournamentMatch: Omit<TournamentMatch, 'id'> = {
            tournamentId,
            round: roundNumber,
            matchNumber: matchNumber++,
            player1Id: match.team1[0],
            player2Id: match.team2[0],
            status: 'pending',
          };
          
          const matchRef = doc(collection(db, 'tournamentMatches'));
          batch.set(matchRef, tournamentMatch);
        } else {
          const tournamentMatch: Omit<TournamentMatch, 'id'> = {
            tournamentId,
            round: roundNumber,
            matchNumber: matchNumber++,
            team1PlayerIds: match.team1,
            team2PlayerIds: match.team2,
            status: 'pending',
          };
          
          const matchRef = doc(collection(db, 'tournamentMatches'));
          batch.set(matchRef, tournamentMatch);
        }
      }
      
      await batch.commit();
      return;
    }
  } catch (error) {
    logger.warn(`Optimal pairing failed for round ${roundNumber}, falling back to legacy algorithm: ${error}`);
  }
  
  // Fallback to legacy algorithm if optimal pairing fails
  await generateLegacyQuickPlayRound(batch, tournamentId, format, playerIds, roundNumber, courtsAvailable, existingMatches, matchNumber);
  await batch.commit();
}

// Legacy algorithm as fallback
async function generateLegacyQuickPlayRound(
  batch: any,
  tournamentId: string,
  format: Tournament['format'],
  playerIds: string[],
  roundNumber: number,
  courtsAvailable: number,
  existingMatches: any[],
  startingMatchNumber: number
) {
  // Track partnerships and oppositions from previous rounds
  const partnershipCount = new Map<string, number>();
  const oppositionCount = new Map<string, number>();
  const playerGameCount = new Map<string, number>();
  
  // Initialize tracking
  playerIds.forEach(playerId => playerGameCount.set(playerId, 0));
  
  // Analyze existing matches to understand current state
  existingMatches.forEach(match => {
    if (format === 'singles' && match.player1Id && match.player2Id) {
      // Singles match
      const oppKey = [match.player1Id, match.player2Id].sort().join('-');
      oppositionCount.set(oppKey, (oppositionCount.get(oppKey) || 0) + 1);
      playerGameCount.set(match.player1Id, (playerGameCount.get(match.player1Id) || 0) + 1);
      playerGameCount.set(match.player2Id, (playerGameCount.get(match.player2Id) || 0) + 1);
    } else if (format === 'doubles' && match.team1PlayerIds && match.team2PlayerIds) {
      // Doubles match
      const team1 = match.team1PlayerIds.sort();
      const team2 = match.team2PlayerIds.sort();
      
      // Track partnerships
      const partnership1 = team1.join('-');
      const partnership2 = team2.join('-');
      partnershipCount.set(partnership1, (partnershipCount.get(partnership1) || 0) + 1);
      partnershipCount.set(partnership2, (partnershipCount.get(partnership2) || 0) + 1);
      
      // Track oppositions
      for (const p1 of team1) {
        for (const p2 of team2) {
          const oppKey = [p1, p2].sort().join('-');
          oppositionCount.set(oppKey, (oppositionCount.get(oppKey) || 0) + 1);
        }
      }
      
      // Track game counts
      [...team1, ...team2].forEach(playerId => {
        playerGameCount.set(playerId, (playerGameCount.get(playerId) || 0) + 1);
      });
    }
  });

  if (format === 'singles') {
    await generateQuickPlaySinglesRound(batch, tournamentId, playerIds, roundNumber, courtsAvailable, oppositionCount, playerGameCount, startingMatchNumber);
  } else {
    await generateQuickPlayDoublesRound(batch, tournamentId, playerIds, roundNumber, courtsAvailable, partnershipCount, oppositionCount, playerGameCount, startingMatchNumber);
  }
}

// Generate singles round with smart opponent selection
async function generateQuickPlaySinglesRound(
  batch: any,
  tournamentId: string,
  playerIds: string[],
  roundNumber: number,
  courtsAvailable: number,
  oppositionCount: Map<string, number>,
  playerGameCount: Map<string, number>,
  startingMatchNumber: number
) {
  const n = playerIds.length;
  const usedThisRound = new Set<string>();
  const matches: Array<{player1: string, player2: string}> = [];
  let matchNumber = startingMatchNumber;

  // Randomize player order to avoid bias
  const shuffledPlayers = [...playerIds].sort(() => Math.random() - 0.5);
  
  // Generate matches prioritizing players with fewer games and fewer recent oppositions
  for (let court = 0; court < courtsAvailable && usedThisRound.size < n - 1; court++) {
    const availablePlayers = shuffledPlayers.filter(id => !usedThisRound.has(id));
    
    if (availablePlayers.length < 2) break;
    
    let bestMatch: {player1: string, player2: string, score: number} | null = null;
    
    // Find the best pairing based on game balance and opposition diversity
    for (let i = 0; i < availablePlayers.length; i++) {
      for (let j = i + 1; j < availablePlayers.length; j++) {
        const player1 = availablePlayers[i];
        const player2 = availablePlayers[j];
        const oppKey = [player1, player2].sort().join('-');
        
        // Score based on:
        // - Players who have played fewer games get priority
        // - Players who haven't played each other get priority
        const gameBalance = 100 - (playerGameCount.get(player1) || 0) * 5 - (playerGameCount.get(player2) || 0) * 5;
        const oppositionDiversity = 50 - (oppositionCount.get(oppKey) || 0) * 20;
        const score = gameBalance + oppositionDiversity;
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {player1, player2, score};
        }
      }
    }
    
    if (bestMatch) {
      matches.push({player1: bestMatch.player1, player2: bestMatch.player2});
      usedThisRound.add(bestMatch.player1);
      usedThisRound.add(bestMatch.player2);
      
      // Update tracking
      const oppKey = [bestMatch.player1, bestMatch.player2].sort().join('-');
      oppositionCount.set(oppKey, (oppositionCount.get(oppKey) || 0) + 1);
      playerGameCount.set(bestMatch.player1, (playerGameCount.get(bestMatch.player1) || 0) + 1);
      playerGameCount.set(bestMatch.player2, (playerGameCount.get(bestMatch.player2) || 0) + 1);
    }
  }
  
  // Create tournament match documents
  for (const match of matches) {
    const tournamentMatch: Omit<TournamentMatch, 'id'> = {
      tournamentId,
      round: roundNumber,
      matchNumber: matchNumber++,
      player1Id: match.player1,
      player2Id: match.player2,
      status: 'pending',
    };

    const matchRef = doc(collection(db, 'tournamentMatches'));
    batch.set(matchRef, tournamentMatch);
  }
  
  const playersResting = n - usedThisRound.size;
  logger.info(`Generated ${matches.length} singles matches for round ${roundNumber}, ${playersResting} players resting`);
}

// Generate doubles round with smart team selection
async function generateQuickPlayDoublesRound(
  batch: any,
  tournamentId: string,
  playerIds: string[],
  roundNumber: number,
  courtsAvailable: number,
  partnershipCount: Map<string, number>,
  oppositionCount: Map<string, number>,
  playerGameCount: Map<string, number>,
  startingMatchNumber: number
) {
  const n = playerIds.length;
  const usedThisRound = new Set<string>();
  const matches: Array<{team1: string[], team2: string[]}> = [];
  let matchNumber = startingMatchNumber;

  // Randomize player order to avoid bias
  const shuffledPlayers = [...playerIds].sort(() => Math.random() - 0.5);
  
  // Generate matches for available courts
  for (let court = 0; court < courtsAvailable && usedThisRound.size < n - 3; court++) {
    const availablePlayers = shuffledPlayers.filter(id => !usedThisRound.has(id));
    
    if (availablePlayers.length < 4) break;
    
    let bestMatch: {team1: string[], team2: string[], score: number} | null = null;
    
    // Try different 4-player combinations to find the best match
    for (let i = 0; i < availablePlayers.length; i++) {
      for (let j = i + 1; j < availablePlayers.length; j++) {
        for (let k = j + 1; k < availablePlayers.length; k++) {
          for (let l = k + 1; l < availablePlayers.length; l++) {
            const players = [availablePlayers[i], availablePlayers[j], availablePlayers[k], availablePlayers[l]];
            
            // Try all possible team combinations
            const teamCombos = [
              { team1: [players[0], players[1]], team2: [players[2], players[3]] },
              { team1: [players[0], players[2]], team2: [players[1], players[3]] },
              { team1: [players[0], players[3]], team2: [players[1], players[2]] }
            ];
            
            for (const combo of teamCombos) {
              const score = calculateQuickPlayMatchScore(combo, partnershipCount, oppositionCount, playerGameCount);
              
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = { ...combo, score };
              }
            }
          }
        }
      }
    }
    
    if (bestMatch) {
      matches.push({team1: bestMatch.team1, team2: bestMatch.team2});
      bestMatch.team1.forEach(id => usedThisRound.add(id));
      bestMatch.team2.forEach(id => usedThisRound.add(id));
      
      // Update tracking
      const partnership1 = bestMatch.team1.sort().join('-');
      const partnership2 = bestMatch.team2.sort().join('-');
      partnershipCount.set(partnership1, (partnershipCount.get(partnership1) || 0) + 1);
      partnershipCount.set(partnership2, (partnershipCount.get(partnership2) || 0) + 1);
      
      for (const p1 of bestMatch.team1) {
        for (const p2 of bestMatch.team2) {
          const oppKey = [p1, p2].sort().join('-');
          oppositionCount.set(oppKey, (oppositionCount.get(oppKey) || 0) + 1);
        }
      }
      
      [...bestMatch.team1, ...bestMatch.team2].forEach(playerId => {
        playerGameCount.set(playerId, (playerGameCount.get(playerId) || 0) + 1);
      });
    }
  }
  
  // Create tournament match documents
  for (const match of matches) {
    const tournamentMatch: Omit<TournamentMatch, 'id'> = {
      tournamentId,
      round: roundNumber,
      matchNumber: matchNumber++,
      team1PlayerIds: match.team1,
      team2PlayerIds: match.team2,
      status: 'pending',
    };

    const matchRef = doc(collection(db, 'tournamentMatches'));
    batch.set(matchRef, tournamentMatch);
  }
  
  const playersResting = n - usedThisRound.size;
  logger.info(`Generated ${matches.length} doubles matches for round ${roundNumber}, ${playersResting} players resting`);
}

// Score a Quick Play match based on fairness criteria
function calculateQuickPlayMatchScore(
  match: { team1: string[]; team2: string[] },
  partnershipCount: Map<string, number>,
  oppositionCount: Map<string, number>,
  playerGameCount: Map<string, number>
): number {
  let score = 0;
  
  // Prioritize new partnerships (higher score for unused partnerships)
  const partnership1 = match.team1.sort().join('-');
  const partnership2 = match.team2.sort().join('-');
  score += 100 - (partnershipCount.get(partnership1) || 0) * 15;
  score += 100 - (partnershipCount.get(partnership2) || 0) * 15;
  
  // Prioritize new oppositions
  for (const p1 of match.team1) {
    for (const p2 of match.team2) {
      const oppKey = [p1, p2].sort().join('-');
      score += 50 - (oppositionCount.get(oppKey) || 0) * 10;
    }
  }
  
  // Prioritize players who have played fewer games
  [...match.team1, ...match.team2].forEach(playerId => {
    score += 30 - (playerGameCount.get(playerId) || 0) * 3;
  });
  
  return score;
}

// Delete Round functionality for Quick Play tournaments
export async function deleteQuickPlayRound(tournamentId: string, roundNumber: number) {
  try {
    // Check authentication and permissions
    const currentUser = await getCurrentUser();
    requireAuthentication(currentUser);
    requirePermission(currentUser, 'canModifyTournaments');
    
    // Get tournament details
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);
    
    if (!tournamentSnap.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = { id: tournamentId, ...tournamentSnap.data() } as Tournament;
    
    if (!tournament.isQuickPlay) {
      throw new Error('Delete Round is only available for Quick Play tournaments');
    }
    
    // Get all matches in this round
    const matchesQuery = query(
      collection(db, 'tournamentMatches'),
      where('tournamentId', '==', tournamentId),
      where('round', '==', roundNumber)
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    
    // Check if any matches in this round have been completed
    const hasCompletedMatches = matchesSnapshot.docs.some(doc => {
      const match = doc.data();
      return match.status === 'completed';
    });
    
    if (hasCompletedMatches) {
      throw new Error('Cannot delete round with completed matches');
    }
    
    // Check if any matches have been started (in-progress)
    const hasInProgressMatches = matchesSnapshot.docs.some(doc => {
      const match = doc.data();
      return match.status === 'in-progress';
    });
    
    if (hasInProgressMatches) {
      throw new Error('Cannot delete round with matches in progress');
    }
    
    // Check if this is the only round (prevent deleting all rounds)
    const allMatchesQuery = query(
      collection(db, 'tournamentMatches'),
      where('tournamentId', '==', tournamentId)
    );
    const allMatchesSnapshot = await getDocs(allMatchesQuery);
    
    const uniqueRounds = new Set(allMatchesSnapshot.docs.map(doc => doc.data().round));
    if (uniqueRounds.size <= 1) {
      throw new Error('Cannot delete the only remaining round');
    }
    
    // Delete all matches in this round
    const batch = writeBatch(db);
    matchesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Update tournament currentRound if we're deleting the highest round
    const remainingRounds = Array.from(uniqueRounds).filter(r => r !== roundNumber);
    const newCurrentRound = Math.max(...remainingRounds);
    
    if (tournament.currentRound === roundNumber || tournament.currentRound > newCurrentRound) {
      batch.update(tournamentRef, {
        currentRound: newCurrentRound,
      });
    }
    
    await batch.commit();
    
    // Check if tournament is now complete after round deletion
    await checkTournamentCompletion(tournamentId);
    
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath('/tournaments');
    
    return { success: true, deletedRound: roundNumber };
    
  } catch (error) {
    logger.error('Error deleting Quick Play round', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete round');
  }
}

// Add Round functionality for Quick Play tournaments
export async function addQuickPlayRound(tournamentId: string) {
  try {
    // Check authentication and permissions
    const currentUser = await getCurrentUser();
    requireAuthentication(currentUser);
    requirePermission(currentUser, 'canModifyTournaments');
    
    // Get tournament details
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);
    
    if (!tournamentSnap.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = { id: tournamentId, ...tournamentSnap.data() } as Tournament;
    
    if (!tournament.isQuickPlay) {
      throw new Error('Add Round is only available for Quick Play tournaments');
    }
    
    // Find the highest existing round number and add 1
    const existingMatchesQuery = query(
      collection(db, 'tournamentMatches'),
      where('tournamentId', '==', tournamentId)
    );
    const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
    
    let highestRound = tournament.currentRound || 0;
    existingMatchesSnapshot.docs.forEach(doc => {
      const match = doc.data();
      if (match.round > highestRound) {
        highestRound = match.round;
      }
    });
    
    const nextRound = highestRound + 1;
    
    // Generate next round of matches
    await generateQuickPlayRound(
      tournamentId,
      tournament.format,
      tournament.playerIds,
      nextRound,
      tournament.availableCourts || 2
    );
    
    // Update tournament current round (reuse existing tournamentRef)
    await updateDoc(tournamentRef, {
      currentRound: nextRound,
    });
    
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath('/tournaments');
    
    return { success: true, roundNumber: nextRound };
    
  } catch (error) {
    logger.error('Error adding Quick Play round', error);
    throw new Error('Failed to add round');
  }
}