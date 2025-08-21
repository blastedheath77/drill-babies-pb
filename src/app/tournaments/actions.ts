'use server';

import { collection, doc, addDoc, writeBatch, deleteDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { Tournament, TournamentMatch } from '@/lib/types';
import { logger } from '@/lib/logger';
import { createTournamentSchema, validateData } from '@/lib/validations';
import { getCurrentUser, requireAuthentication } from '@/lib/server-auth';
import { requirePermission } from '@/lib/permissions';

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
  maxRounds?: number;
  availableCourts?: number;
}


export async function createTournament(data: CreateTournamentData) {
  try {
    // Check authentication and permissions
    const currentUser = await getCurrentUser();
    requireAuthentication(currentUser);
    requirePermission(currentUser, 'canCreateTournaments');
    
    // Comprehensive validation using Zod schema
    const validatedData = validateData(createTournamentSchema, data);

    // Calculate estimated duration
    const estimatedDuration = calculateTournamentDuration(
      validatedData.playerIds.length,
      validatedData.format,
      validatedData.type,
      validatedData.maxRounds,
      validatedData.availableCourts || 2
    );

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
      availableCourts: validatedData.availableCourts || 2,
      estimatedDuration,
    };

    // Only include optional fields if they have values
    if (validatedData.maxRounds !== undefined) {
      tournament.maxRounds = validatedData.maxRounds;
    }

    const tournamentRef = await addDoc(collection(db, 'tournaments'), tournament);
    const tournamentId = tournamentRef.id;

    // Generate matches based on tournament type
    await generateMatches(
      tournamentId, 
      validatedData.type, 
      validatedData.format, 
      validatedData.playerIds,
      validatedData.maxRounds,
      validatedData.availableCourts || 2
    );

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


// Calculate estimated tournament duration in minutes
function calculateTournamentDuration(
  playerCount: number,
  format: Tournament['format'],
  type: Tournament['type'],
  maxRounds?: number,
  courtsAvailable: number = 2
): number {
  if (type !== 'round-robin') {
    // For elimination tournaments, use existing logic
    const estimatedMatches = format === 'singles' ? playerCount - 1 : Math.floor(playerCount / 2) - 1;
    return estimatedMatches * 10; // 10 minutes per match
  }

  let totalMatches: number;
  
  if (format === 'singles') {
    // Singles: n(n-1)/2 total possible matches
    const totalPossible = (playerCount * (playerCount - 1)) / 2;
    totalMatches = maxRounds ? Math.min(maxRounds, totalPossible) : totalPossible;
  } else {
    // Doubles: optimized generation with max rounds
    if (maxRounds) {
      // Max matches per round is limited by both players and courts
      const maxMatchesByPlayers = Math.floor(playerCount / 4); // Each match needs 4 players
      const matchesPerRound = Math.min(maxMatchesByPlayers, courtsAvailable);
      totalMatches = maxRounds * matchesPerRound;
    } else {
      // Full round-robin: each partnership appears once
      const totalPartnerships = (playerCount * (playerCount - 1)) / 2;
      // Max matches per round is limited by both players and courts
      const maxMatchesByPlayers = Math.floor(playerCount / 4); // Each match needs 4 players
      const matchesPerRound = Math.min(maxMatchesByPlayers, courtsAvailable);
      const estimatedRounds = Math.ceil(totalPartnerships / matchesPerRound);
      totalMatches = estimatedRounds * matchesPerRound;
    }
  }

  // Estimate 8-10 minutes per match
  return totalMatches * 9;
}

async function generateMatches(
  tournamentId: string,
  type: Tournament['type'],
  format: Tournament['format'],
  playerIds: string[],
  maxRounds?: number,
  courtsAvailable: number = 2
) {
  const batch = writeBatch(db);

  if (type === 'round-robin') {
    await generateRoundRobinMatches(batch, tournamentId, format, playerIds, maxRounds, courtsAvailable);
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
  playerIds: string[],
  maxRounds?: number,
  courtsAvailable: number = 2
) {
  let matchNumber = 1;
  logger.debug(`Generating round-robin matches for ${format} with ${playerIds.length} players`);

  if (format === 'singles') {
    // Singles round-robin: everyone plays everyone
    // First shuffle the player order to randomize match pairings
    const shuffledPlayerIds = [...playerIds].sort(() => Math.random() - 0.5);
    
    const allMatches: Array<{player1Id: string, player2Id: string}> = [];
    
    // Generate all possible pairings
    for (let i = 0; i < shuffledPlayerIds.length; i++) {
      for (let j = i + 1; j < shuffledPlayerIds.length; j++) {
        allMatches.push({
          player1Id: shuffledPlayerIds[i],
          player2Id: shuffledPlayerIds[j]
        });
      }
    }
    
    // Shuffle the matches to randomize the order they're played
    const shuffledMatches = allMatches.sort(() => Math.random() - 0.5);
    
    // Create tournament match documents
    for (const matchData of shuffledMatches) {
      const match: Omit<TournamentMatch, 'id'> = {
        tournamentId,
        round: 1,
        matchNumber: matchNumber++,
        player1Id: matchData.player1Id,
        player2Id: matchData.player2Id,
        status: 'pending',
      };

      logger.debug(`Creating match ${matchNumber - 1}: ${matchData.player1Id} vs ${matchData.player2Id}`);

      const matchRef = doc(collection(db, 'tournamentMatches'));
      batch.set(matchRef, match);
    }
  } else {
    // Doubles: use optimized generation for limited or full round-robin
    if (maxRounds) {
      await generateOptimizedDoublesMatches(batch, tournamentId, playerIds, maxRounds, courtsAvailable);
    } else {
      // Full partner rotation (existing logic)
      await generatePartnerRotationMatches(batch, tournamentId, playerIds, matchNumber);
    }
  }
}

// Optimized doubles match generation that maximizes partner diversity within round/court constraints
async function generateOptimizedDoublesMatches(
  batch: any,
  tournamentId: string,
  playerIds: string[],
  maxRounds: number,
  courtsAvailable: number
) {
  const n = playerIds.length;
  const matches: Array<{ team1: string[]; team2: string[]; round: number }> = [];
  
  logger.debug(`Generating optimized doubles matches: ${n} players, ${maxRounds} rounds, ${courtsAvailable} courts`);
  
  // Track partnerships and oppositions to maximize fairness
  const partnershipCount = new Map<string, number>();
  const oppositionCount = new Map<string, number>();
  const playerGameCount = new Map<string, number>();
  
  // Initialize tracking
  for (let i = 0; i < n; i++) {
    playerGameCount.set(playerIds[i], 0);
    for (let j = i + 1; j < n; j++) {
      const partnerKey = [playerIds[i], playerIds[j]].sort().join('-');
      partnershipCount.set(partnerKey, 0);
      oppositionCount.set(partnerKey, 0);
    }
  }
  
  // Generate matches for each round
  for (let round = 1; round <= maxRounds; round++) {
    const roundMatches = generateRoundMatches(playerIds, partnershipCount, oppositionCount, playerGameCount, courtsAvailable);
    
    // Add round number to matches
    roundMatches.forEach(match => {
      matches.push({ ...match, round });
    });
    
    // Update tracking counts
    roundMatches.forEach(match => {
      // Update partnership counts
      const partnership1 = match.team1.sort().join('-');
      const partnership2 = match.team2.sort().join('-');
      partnershipCount.set(partnership1, (partnershipCount.get(partnership1) || 0) + 1);
      partnershipCount.set(partnership2, (partnershipCount.get(partnership2) || 0) + 1);
      
      // Update opposition counts
      for (const p1 of match.team1) {
        for (const p2 of match.team2) {
          const oppKey = [p1, p2].sort().join('-');
          oppositionCount.set(oppKey, (oppositionCount.get(oppKey) || 0) + 1);
        }
      }
      
      // Update player game counts
      [...match.team1, ...match.team2].forEach(playerId => {
        playerGameCount.set(playerId, (playerGameCount.get(playerId) || 0) + 1);
      });
    });
  }
  
  // Create tournament match documents
  let matchNumber = 1;
  for (const match of matches) {
    const tournamentMatch: Omit<TournamentMatch, 'id'> = {
      tournamentId,
      round: match.round,
      matchNumber: matchNumber++,
      team1PlayerIds: match.team1,
      team2PlayerIds: match.team2,
      status: 'pending',
    };

    const matchRef = doc(collection(db, 'tournamentMatches'));
    batch.set(matchRef, tournamentMatch);
  }
  
  // Log fairness statistics
  const partnerCounts = Array.from(partnershipCount.values());
  const gameCounts = Array.from(playerGameCount.values());
  logger.info(`Generated ${matches.length} optimized matches:`, {
    averagePartnershipsPerPair: partnerCounts.reduce((a, b) => a + b, 0) / partnerCounts.length,
    gamesPerPlayer: gameCounts,
    partnershipDistribution: Object.fromEntries(
      playerIds.map(id => [
        id, 
        Array.from(partnershipCount.entries())
          .filter(([key]) => key.includes(id))
          .reduce((sum, [, count]) => sum + count, 0)
      ])
    )
  });
}

// Generate matches for a single round, maximizing partner diversity
function generateRoundMatches(
  playerIds: string[],
  partnershipCount: Map<string, number>,
  oppositionCount: Map<string, number>, 
  playerGameCount: Map<string, number>,
  courtsAvailable: number
): Array<{ team1: string[]; team2: string[] }> {
  const n = playerIds.length;
  const matchesThisRound: Array<{ team1: string[]; team2: string[] }> = [];
  const usedThisRound = new Set<string>();
  
  // Randomize the player order at the start to avoid bias
  const shuffledPlayerIds = [...playerIds].sort(() => Math.random() - 0.5);
  
  // Find optimal pairings for this round
  for (let court = 0; court < courtsAvailable && usedThisRound.size < n - 3; court++) {
    const availablePlayers = shuffledPlayerIds.filter(id => !usedThisRound.has(id));
    
    if (availablePlayers.length < 4) break;
    
    // Shuffle available players to add randomness to the selection process
    const randomizedAvailable = [...availablePlayers].sort(() => Math.random() - 0.5);
    
    let bestMatch: { team1: string[]; team2: string[]; score: number } | null = null;
    
    // Try all possible 4-player combinations from randomized available players
    for (let i = 0; i < randomizedAvailable.length; i++) {
      for (let j = i + 1; j < randomizedAvailable.length; j++) {
        for (let k = j + 1; k < randomizedAvailable.length; k++) {
          for (let l = k + 1; l < randomizedAvailable.length; l++) {
            const players = [randomizedAvailable[i], randomizedAvailable[j], randomizedAvailable[k], randomizedAvailable[l]];
            
            // Try both possible team combinations
            const teamCombos = [
              { team1: [players[0], players[1]], team2: [players[2], players[3]] },
              { team1: [players[0], players[2]], team2: [players[1], players[3]] },
              { team1: [players[0], players[3]], team2: [players[1], players[2]] }
            ];
            
            for (const combo of teamCombos) {
              const score = calculateMatchScore(combo, partnershipCount, oppositionCount, playerGameCount);
              
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = { ...combo, score };
              }
            }
          }
        }
      }
    }
    
    if (bestMatch) {
      matchesThisRound.push({ team1: bestMatch.team1, team2: bestMatch.team2 });
      bestMatch.team1.forEach(id => usedThisRound.add(id));
      bestMatch.team2.forEach(id => usedThisRound.add(id));
    }
  }
  
  return matchesThisRound;
}

// Score a potential match based on fairness criteria (higher is better)
function calculateMatchScore(
  match: { team1: string[]; team2: string[] },
  partnershipCount: Map<string, number>,
  oppositionCount: Map<string, number>,
  playerGameCount: Map<string, number>
): number {
  let score = 0;
  
  // Prefer partnerships that haven't been used much
  const partnership1 = match.team1.sort().join('-');
  const partnership2 = match.team2.sort().join('-');
  score += 100 - (partnershipCount.get(partnership1) || 0) * 10;
  score += 100 - (partnershipCount.get(partnership2) || 0) * 10;
  
  // Prefer oppositions that haven't happened much
  for (const p1 of match.team1) {
    for (const p2 of match.team2) {
      const oppKey = [p1, p2].sort().join('-');
      score += 50 - (oppositionCount.get(oppKey) || 0) * 5;
    }
  }
  
  // Prefer players who have played fewer games
  [...match.team1, ...match.team2].forEach(playerId => {
    score += 25 - (playerGameCount.get(playerId) || 0) * 2;
  });
  
  return score;
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
  
  // Randomize player order first to avoid positional bias
  const randomizedPlayerIds = [...playerIds].sort(() => Math.random() - 0.5);
  
  // Generate all unique partnerships from randomized player order
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      allPartnerships.push([randomizedPlayerIds[i], randomizedPlayerIds[j]]);
    }
  }
  
  // Shuffle partnerships to avoid bias in pairing order
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
    
    // Shuffle the teams to randomize which teams play first
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const match: Omit<TournamentMatch, 'id'> = {
          tournamentId,
          round,
          matchNumber: matchNumber++,
          team1PlayerIds: shuffledTeams[i],
          team2PlayerIds: shuffledTeams[i + 1],
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
    // Check authentication and permissions
    const currentUser = await getCurrentUser();
    requireAuthentication(currentUser);
    requirePermission(currentUser, 'canDeleteTournaments');
    
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
