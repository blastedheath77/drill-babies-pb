'use server';

import { collection, doc, addDoc, writeBatch, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Tournament, TournamentMatch } from '@/lib/types';
import { logger } from '@/lib/logger';
import { createTournamentSchema, validateData } from '@/lib/validations';

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

interface CreateTournamentData {
  name: string;
  description: string;
  format: 'singles' | 'doubles';
  type: 'round-robin' | 'single-elimination' | 'double-elimination';
  playerIds: string[];
}

export async function createTournament(data: CreateTournamentData) {
  try {
    // Comprehensive validation using Zod schema
    const validatedData = validateData(createTournamentSchema, data);

    // Create tournament document using validated data
    const tournament: Omit<Tournament, 'id'> = {
      name: validatedData.name.trim(),
      description: (validatedData.description || '').trim(),
      format: validatedData.format,
      type: validatedData.type,
      status: 'active',
      playerIds: validatedData.playerIds,
      createdDate: new Date().toISOString(),
      createdBy: 'admin', // TODO: Replace with actual user ID
    };

    const tournamentRef = await addDoc(collection(db, 'tournaments'), tournament);
    const tournamentId = tournamentRef.id;

    // Generate matches based on tournament type
    await generateMatches(tournamentId, validatedData.type, validatedData.format, validatedData.playerIds);

    revalidatePath('/tournaments');

    // Return success instead of redirect (let the client handle navigation)
    return { success: true, tournamentId };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error('Error creating tournament', error);
    throw new Error('Failed to create tournament');
  }
}

async function generateMatches(
  tournamentId: string,
  type: Tournament['type'],
  format: Tournament['format'],
  playerIds: string[]
) {
  const batch = writeBatch(db);

  if (type === 'round-robin') {
    await generateRoundRobinMatches(batch, tournamentId, format, playerIds);
  } else if (type === 'single-elimination') {
    await generateEliminationMatches(batch, tournamentId, format, playerIds, false);
  } else if (type === 'double-elimination') {
    await generateEliminationMatches(batch, tournamentId, format, playerIds, true);
  }

  await batch.commit();
}

async function generateRoundRobinMatches(
  batch: any,
  tournamentId: string,
  format: Tournament['format'],
  playerIds: string[]
) {
  let matchNumber = 1;
  logger.debug(`Generating round-robin matches for ${format} with ${playerIds.length} players`);

  if (format === 'singles') {
    // Singles round-robin: everyone plays everyone
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        const match: Omit<TournamentMatch, 'id'> = {
          tournamentId,
          round: 1,
          matchNumber: matchNumber++,
          player1Id: playerIds[i],
          player2Id: playerIds[j],
          status: 'pending',
        };

        logger.debug(`Creating match ${matchNumber - 1}: ${playerIds[i]} vs ${playerIds[j]}`);

        const matchRef = doc(collection(db, 'tournamentMatches'));
        batch.set(matchRef, match);
      }
    }
  } else {
    // Doubles partner rotation format: Much more manageable
    // Each player partners with each other player exactly once
    await generatePartnerRotationMatches(batch, tournamentId, playerIds, matchNumber);
  }
}

async function generatePartnerRotationMatches(
  batch: any,
  tournamentId: string,
  playerIds: string[],
  startingMatchNumber: number
) {
  let matchNumber = startingMatchNumber;
  const n = playerIds.length;
  
  // For a fair doubles round-robin, each player should partner with each other player exactly once
  // This means each player plays (n-1) games total
  // We need to ensure balanced scheduling
  
  const playerGamesCount = new Map<string, number>();
  const allPartnerships: string[][] = [];
  const matches: Array<[string[], string[]]> = [];
  
  // Initialize game counts
  playerIds.forEach(player => playerGamesCount.set(player, 0));
  
  // Generate all unique partnerships
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      allPartnerships.push([playerIds[i], playerIds[j]]);
    }
  }
  
  // Shuffle partnerships to avoid bias
  const shuffledPartnerships = [...allPartnerships].sort(() => Math.random() - 0.5);
  
  // Track which partnerships have been used
  const usedPartnerships = new Set<string>();
  
  // For each partnership, try to find a suitable opponent
  for (const partnership of shuffledPartnerships) {
    const partnershipKey = partnership.sort().join('-');
    
    if (usedPartnerships.has(partnershipKey)) continue;
    
    const [player1, player2] = partnership;
    const currentGames1 = playerGamesCount.get(player1) || 0;
    const currentGames2 = playerGamesCount.get(player2) || 0;
    
    // Only proceed if both players haven't reached their game limit
    // Each player should play approximately (n-1) games
    const gameLimit = n - 1;
    if (currentGames1 >= gameLimit || currentGames2 >= gameLimit) continue;
    
    // Find the best opponent partnership
    let bestOpponent: string[] | null = null;
    let bestScore = -1;
    
    for (const opponentPartnership of shuffledPartnerships) {
      const opponentKey = opponentPartnership.sort().join('-');
      
      if (usedPartnerships.has(opponentKey)) continue;
      if (partnership.some(p => opponentPartnership.includes(p))) continue; // Can't play against yourself
      
      const [opp1, opp2] = opponentPartnership;
      const oppGames1 = playerGamesCount.get(opp1) || 0;
      const oppGames2 = playerGamesCount.get(opp2) || 0;
      
      // Skip if opponents have reached their limit
      if (oppGames1 >= gameLimit || oppGames2 >= gameLimit) continue;
      
      // Score based on how much each player needs games (prefer players with fewer games)
      const needScore = (gameLimit - oppGames1) + (gameLimit - oppGames2) + (gameLimit - currentGames1) + (gameLimit - currentGames2);
      
      if (needScore > bestScore) {
        bestScore = needScore;
        bestOpponent = opponentPartnership;
      }
    }
    
    // Create the match if we found a suitable opponent
    if (bestOpponent) {
      matches.push([partnership, bestOpponent]);
      
      // Mark both partnerships as used
      usedPartnerships.add(partnershipKey);
      usedPartnerships.add(bestOpponent.sort().join('-'));
      
      // Update game counts
      [...partnership, ...bestOpponent].forEach(player => {
        const current = playerGamesCount.get(player) || 0;
        playerGamesCount.set(player, current + 1);
      });
    }
  }
  
  // Create the actual match documents
  let currentRound = 1;
  const matchesPerRound = Math.floor(n / 4); // Each match uses 4 players
  
  for (let i = 0; i < matches.length; i++) {
    if (i > 0 && i % matchesPerRound === 0) {
      currentRound++;
    }
    
    const [team1, team2] = matches[i];
    const match: Omit<TournamentMatch, 'id'> = {
      tournamentId,
      round: currentRound,
      matchNumber: matchNumber++,
      team1PlayerIds: team1,
      team2PlayerIds: team2,
      status: 'pending',
    };

    const matchRef = doc(collection(db, 'tournamentMatches'));
    batch.set(matchRef, match);
  }
  
  // Log game distribution for debugging
  const gameDistribution: { [playerId: string]: number } = {};
  playerIds.forEach(player => {
    gameDistribution[player] = playerGamesCount.get(player) || 0;
  });
  
  logger.info(`Generated ${matches.length} matches with game distribution:`, gameDistribution);
}

async function generateEliminationMatches(
  batch: any,
  tournamentId: string,
  format: Tournament['format'],
  playerIds: string[],
  isDouble: boolean
) {
  // For now, implement single elimination
  // TODO: Implement proper elimination brackets
  let matchNumber = 1;
  const round = 1;

  if (format === 'singles') {
    // Pair up players randomly for first round
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const match: Omit<TournamentMatch, 'id'> = {
          tournamentId,
          round,
          matchNumber: matchNumber++,
          player1Id: shuffled[i],
          player2Id: shuffled[i + 1],
          status: 'pending',
        };

        const matchRef = doc(collection(db, 'tournamentMatches'));
        batch.set(matchRef, match);
      }
    }
  } else {
    // Doubles elimination - create fixed teams and pair them up
    const teams = generateFixedDoubleTeams(playerIds);

    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        const match: Omit<TournamentMatch, 'id'> = {
          tournamentId,
          round,
          matchNumber: matchNumber++,
          team1PlayerIds: teams[i],
          team2PlayerIds: teams[i + 1],
          status: 'pending',
        };

        const matchRef = doc(collection(db, 'tournamentMatches'));
        batch.set(matchRef, match);
      }
    }
  }
}

function generateDoubleTeams(playerIds: string[]): string[][] {
  const teams: string[][] = [];

  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      teams.push([playerIds[i], playerIds[j]]);
    }
  }

  return teams;
}

function generateFixedDoubleTeams(playerIds: string[]): string[][] {
  const teams: string[][] = [];
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      teams.push([shuffled[i], shuffled[i + 1]]);
    }
  }

  return teams;
}

export async function deleteTournament(tournamentId: string) {
  try {
    logger.info('Deleting tournament', { tournamentId });

    // Use a batch to ensure all deletions happen together
    const batch = writeBatch(db);

    // Delete the tournament document
    batch.delete(doc(db, 'tournaments', tournamentId));

    // Get all matches for this tournament
    const matchesQuery = query(
      collection(db, 'tournamentMatches'),
      where('tournamentId', '==', tournamentId)
    );
    const matchesSnapshot = await getDocs(matchesQuery);

    // Delete all tournament matches
    matchesSnapshot.forEach((matchDoc) => {
      batch.delete(doc(db, 'tournamentMatches', matchDoc.id));
    });

    // Get all games associated with this tournament
    const gamesQuery = query(
      collection(db, 'games'),
      where('tournamentId', '==', tournamentId)
    );
    const gamesSnapshot = await getDocs(gamesQuery);

    // Delete all tournament games (this will affect player stats)
    // Note: In a production system, you might want to handle this differently
    // to preserve historical data or revert player rating changes
    gamesSnapshot.forEach((gameDoc) => {
      batch.delete(doc(db, 'games', gameDoc.id));
    });

    // Commit all deletions
    await batch.commit();

    logger.info('Tournament deleted successfully', { 
      tournamentId, 
      matchesDeleted: matchesSnapshot.size,
      gamesDeleted: gamesSnapshot.size 
    });

    // Revalidate relevant pages
    revalidatePath('/tournaments');
    revalidatePath('/');
    revalidatePath('/statistics');

    return { success: true };

  } catch (error) {
    logger.error('Error deleting tournament', error, { tournamentId });
    throw new Error('Failed to delete tournament');
  }
}
