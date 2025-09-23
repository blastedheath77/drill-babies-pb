import {
  createBoxLeagueRound,
  createBoxLeagueMatch,
  getBoxesByLeague,
  updateBoxLeague,
} from './box-leagues';
import type {
  BoxLeague,
  Box,
  BoxLeagueMatch,
  BoxLeaguePlayerStats,
  BoxLeagueStanding
} from './types';

// Box League Match Pairing Logic
export interface MatchPairing {
  matchNumber: 1 | 2 | 3;
  team1PlayerIds: string[];
  team2PlayerIds: string[];
  description: string;
}

/**
 * Generate the standard box league match pairings for 4 players
 * Ensures each player partners with each other exactly once
 * and opposes each other exactly twice
 */
export function generateBoxMatchPairings(playerIds: string[]): MatchPairing[] {
  if (playerIds.length !== 4) {
    throw new Error('Box must contain exactly 4 players');
  }

  const [p1, p2, p3, p4] = playerIds;

  return [
    {
      matchNumber: 1,
      team1PlayerIds: [p1, p2],
      team2PlayerIds: [p3, p4],
      description: 'Players 1&2 vs Players 3&4'
    },
    {
      matchNumber: 2,
      team1PlayerIds: [p1, p3],
      team2PlayerIds: [p2, p4],
      description: 'Players 1&3 vs Players 2&4'
    },
    {
      matchNumber: 3,
      team1PlayerIds: [p1, p4],
      team2PlayerIds: [p2, p3],
      description: 'Players 1&4 vs Players 2&3'
    }
  ];
}

/**
 * Create a new round for a box league with all matches
 */
export async function createNewRound(boxLeagueId: string): Promise<string> {
  try {
    // Get the box league details
    const { getBoxLeague } = await import('./box-leagues');
    const boxLeague = await getBoxLeague(boxLeagueId);
    if (!boxLeague) {
      throw new Error('Box league not found');
    }

    // Get all boxes in the league
    const boxes = await getBoxesByLeague(boxLeagueId);
    if (boxes.length === 0) {
      throw new Error('No boxes found in league');
    }

    // Validate that all boxes have exactly 4 players
    for (const box of boxes) {
      if (box.playerIds.length !== 4) {
        throw new Error(`Box ${box.boxNumber} does not have exactly 4 players`);
      }
    }

    // Calculate next round number
    const nextRoundNumber = boxLeague.currentRound + 1;
    const currentCycle = boxLeague.currentCycle;

    // Create the round
    const roundId = await createBoxLeagueRound({
      boxLeagueId,
      roundNumber: nextRoundNumber,
      cycleNumber: currentCycle,
      status: 'active'
    });

    // Create matches for each box
    const allMatchIds: string[] = [];

    for (const box of boxes) {
      const pairings = generateBoxMatchPairings(box.playerIds);

      for (const pairing of pairings) {
        const matchId = await createBoxLeagueMatch({
          boxLeagueId,
          boxLeagueRoundId: roundId,
          boxId: box.id,
          roundNumber: nextRoundNumber,
          cycleNumber: currentCycle,
          matchNumber: pairing.matchNumber,
          playerIds: box.playerIds,
          team1PlayerIds: pairing.team1PlayerIds,
          team2PlayerIds: pairing.team2PlayerIds,
          team1Score: 0,
          team2Score: 0,
          winnerTeamPlayerIds: [],
          status: 'pending'
        });

        allMatchIds.push(matchId);
      }
    }

    // Update the round with match IDs
    const { updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await updateDoc(doc(db, 'boxLeagueRounds', roundId), {
      matchIds: allMatchIds
    });

    // Update the box league current round
    await updateBoxLeague(boxLeagueId, {
      currentRound: nextRoundNumber
    });

    return roundId;
  } catch (error) {
    console.error('Error creating new round:', error);
    throw error;
  }
}

/**
 * Calculate if a cycle is complete and promotion/relegation should occur
 */
export function isCycleComplete(boxLeague: BoxLeague): boolean {
  return boxLeague.currentRound >= boxLeague.roundsPerCycle;
}

/**
 * Calculate box league standings for a specific box
 * Implements the tiebreaker hierarchy from specifications
 */
export function calculateBoxStandings(
  boxPlayerStats: BoxLeaguePlayerStats[],
  boxMatches: BoxLeagueMatch[]
): BoxLeagueStanding[] {
  if (boxPlayerStats.length !== 4) {
    throw new Error('Box must have exactly 4 players');
  }

  // Create standings with basic stats
  const standings: BoxLeagueStanding[] = boxPlayerStats.map(stats => ({
    playerId: stats.playerId,
    position: stats.currentPosition,
    matchesPlayed: stats.matchesPlayed,
    matchesWon: stats.matchesWon,
    matchesLost: stats.matchesLost,
    gamesWon: stats.gamesWon,
    gamesLost: stats.gamesLost,
    pointsFor: stats.pointsFor,
    pointsAgainst: stats.pointsAgainst,
    pointsDifference: stats.pointsFor - stats.pointsAgainst,
    totalPoints: stats.totalPoints,
    headToHeadRecord: { ...stats.opponentStats }
  }));

  // Sort by tiebreaker hierarchy
  standings.sort((a, b) => {
    // 1. Total points earned (higher is better)
    if (a.totalPoints !== b.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }

    // 2. Head-to-head record (only if exactly 2 players are tied)
    // For now, we'll skip this complex case and move to next tiebreaker

    // 3. Total games won (higher is better)
    if (a.gamesWon !== b.gamesWon) {
      return b.gamesWon - a.gamesWon;
    }

    // 4. Total point differential (higher is better)
    if (a.pointsDifference !== b.pointsDifference) {
      return b.pointsDifference - a.pointsDifference;
    }

    // 5. Fewest games lost (lower is better)
    if (a.gamesLost !== b.gamesLost) {
      return a.gamesLost - b.gamesLost;
    }

    return 0; // Complete tie
  });

  // Update positions
  standings.forEach((standing, index) => {
    standing.position = (index + 1) as 1 | 2 | 3 | 4;
  });

  return standings;
}

/**
 * Update player statistics after a match is completed
 */
export async function updatePlayerStatsAfterMatch(match: BoxLeagueMatch): Promise<void> {
  if (match.status !== 'completed' || match.winnerTeamPlayerIds.length === 0) {
    throw new Error('Match is not completed or has no winner');
  }

  const { getPlayerStatsByBox, createOrUpdatePlayerStats } = await import('./box-leagues');

  // Get current stats for all players in the box
  const currentStats = await getPlayerStatsByBox(match.boxId);

  // Update stats for each player
  for (const playerId of match.playerIds) {
    let playerStats = currentStats.find(s => s.playerId === playerId);

    if (!playerStats) {
      // Create new stats if they don't exist
      playerStats = {
        id: '',
        playerId,
        boxLeagueId: match.boxLeagueId,
        boxId: match.boxId,
        currentPosition: 4, // Default position, will be recalculated
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        totalPoints: 0,
        partnerStats: {},
        opponentStats: {},
        positionHistory: [],
        lastUpdated: ''
      };
    }

    // Determine if this player won or lost
    const isWinner = match.winnerTeamPlayerIds.includes(playerId);
    const isTeam1 = match.team1PlayerIds.includes(playerId);

    // Update match stats
    playerStats.matchesPlayed += 1;
    if (isWinner) {
      playerStats.matchesWon += 1;
      playerStats.totalPoints += 1; // Box league points: 1 for win, 0 for loss
    } else {
      playerStats.matchesLost += 1;
    }

    // Update game stats
    playerStats.gamesPlayed += 1;
    if (isWinner) {
      playerStats.gamesWon += 1;
      playerStats.pointsFor += isTeam1 ? match.team1Score : match.team2Score;
      playerStats.pointsAgainst += isTeam1 ? match.team2Score : match.team1Score;
    } else {
      playerStats.gamesLost += 1;
      playerStats.pointsFor += isTeam1 ? match.team1Score : match.team2Score;
      playerStats.pointsAgainst += isTeam1 ? match.team2Score : match.team1Score;
    }

    // Update partner stats
    const partnerId = isTeam1
      ? match.team1PlayerIds.find(id => id !== playerId)!
      : match.team2PlayerIds.find(id => id !== playerId)!;

    if (!playerStats.partnerStats[partnerId]) {
      playerStats.partnerStats[partnerId] = { wins: 0, losses: 0 };
    }

    if (isWinner) {
      playerStats.partnerStats[partnerId].wins += 1;
    } else {
      playerStats.partnerStats[partnerId].losses += 1;
    }

    // Update opponent stats
    const opponentIds = isTeam1 ? match.team2PlayerIds : match.team1PlayerIds;
    for (const opponentId of opponentIds) {
      if (!playerStats.opponentStats[opponentId]) {
        playerStats.opponentStats[opponentId] = { wins: 0, losses: 0 };
      }

      if (isWinner) {
        playerStats.opponentStats[opponentId].wins += 1;
      } else {
        playerStats.opponentStats[opponentId].losses += 1;
      }
    }

    // Save updated stats
    await createOrUpdatePlayerStats(playerStats);
  }
}

/**
 * Validate that a box league is ready to start a new round
 */
export function validateReadyForNewRound(
  boxLeague: BoxLeague,
  boxes: Box[],
  pendingMatches: BoxLeagueMatch[]
): { ready: boolean; reason?: string } {
  // Check if there are pending matches from current round
  if (pendingMatches.length > 0) {
    return {
      ready: false,
      reason: `${pendingMatches.length} matches from the current round are still pending`
    };
  }

  // Check if all boxes have exactly 4 players
  for (const box of boxes) {
    if (box.playerIds.length !== 4) {
      return {
        ready: false,
        reason: `Box ${box.boxNumber} has ${box.playerIds.length} players (needs exactly 4)`
      };
    }
  }

  // Check if we're at the end of a cycle
  if (isCycleComplete(boxLeague)) {
    return {
      ready: false,
      reason: 'Cycle is complete. Promotion/relegation must be performed before starting next cycle'
    };
  }

  return { ready: true };
}

// Promotion/Relegation Logic

export interface PromotionRelegationMove {
  playerId: string;
  fromBoxId: string;
  fromBoxNumber: number;
  toBoxId: string;
  toBoxNumber: number;
  moveType: 'promotion' | 'relegation' | 'stay';
  reason: string;
}

export interface PromotionRelegationResult {
  moves: PromotionRelegationMove[];
  newCycleNumber: number;
  updatedBoxes: Box[];
}

/**
 * Calculate promotion and relegation moves at the end of a cycle
 */
export async function calculatePromotionRelegation(
  boxLeagueId: string
): Promise<PromotionRelegationResult> {
  const { getBoxLeague, getPlayerStatsByLeague } = await import('./box-leagues');

  const boxLeague = await getBoxLeague(boxLeagueId);
  if (!boxLeague) {
    throw new Error('Box league not found');
  }

  const boxes = await getBoxesByLeague(boxLeagueId);
  const allPlayerStats = await getPlayerStatsByLeague(boxLeagueId);

  if (!isCycleComplete(boxLeague)) {
    throw new Error('Cycle is not complete. Cannot perform promotion/relegation.');
  }

  // Sort boxes by box number
  boxes.sort((a, b) => a.boxNumber - b.boxNumber);

  const moves: PromotionRelegationMove[] = [];
  const updatedBoxes: Box[] = boxes.map(box => ({ ...box, playerIds: [...box.playerIds] }));

  // Calculate final standings for each box
  const boxStandings: { [boxId: string]: BoxLeagueStanding[] } = {};

  for (const box of boxes) {
    const boxPlayerStats = allPlayerStats.filter(stats => stats.boxId === box.id);
    const boxMatches: BoxLeagueMatch[] = []; // We'd need to fetch these, but for standings calculation we have stats
    boxStandings[box.id] = calculateBoxStandings(boxPlayerStats, boxMatches);
  }

  // Process each box for promotion/relegation
  for (let i = 0; i < boxes.length; i++) {
    const currentBox = boxes[i];
    const standings = boxStandings[currentBox.id];

    if (standings.length !== 4) {
      throw new Error(`Box ${currentBox.boxNumber} does not have exactly 4 players`);
    }

    // Sort standings by position (1 = best, 4 = worst)
    standings.sort((a, b) => a.position - b.position);

    const topPlayer = standings[0]; // Position 1
    const secondPlayer = standings[1]; // Position 2
    const thirdPlayer = standings[2]; // Position 3
    const bottomPlayer = standings[3]; // Position 4

    // Top player promotes (unless in Box 1)
    if (i > 0) { // Not the top box
      const targetBox = updatedBoxes[i - 1]; // Box above

      // Remove from current box
      const currentBoxIndex = updatedBoxes.findIndex(b => b.id === currentBox.id);
      updatedBoxes[currentBoxIndex].playerIds = updatedBoxes[currentBoxIndex].playerIds
        .filter(id => id !== topPlayer.playerId);

      // Add to target box
      const targetBoxIndex = updatedBoxes.findIndex(b => b.id === targetBox.id);
      updatedBoxes[targetBoxIndex].playerIds.push(topPlayer.playerId);

      moves.push({
        playerId: topPlayer.playerId,
        fromBoxId: currentBox.id,
        fromBoxNumber: currentBox.boxNumber,
        toBoxId: targetBox.id,
        toBoxNumber: targetBox.boxNumber,
        moveType: 'promotion',
        reason: `Finished 1st in Box ${currentBox.boxNumber}`
      });
    } else {
      // Top player in Box 1 stays
      moves.push({
        playerId: topPlayer.playerId,
        fromBoxId: currentBox.id,
        fromBoxNumber: currentBox.boxNumber,
        toBoxId: currentBox.id,
        toBoxNumber: currentBox.boxNumber,
        moveType: 'stay',
        reason: 'Won Box 1 (top box)'
      });
    }

    // Bottom player relegates (unless in bottom box)
    if (i < boxes.length - 1) { // Not the bottom box
      const targetBox = updatedBoxes[i + 1]; // Box below

      // Remove from current box
      const currentBoxIndex = updatedBoxes.findIndex(b => b.id === currentBox.id);
      updatedBoxes[currentBoxIndex].playerIds = updatedBoxes[currentBoxIndex].playerIds
        .filter(id => id !== bottomPlayer.playerId);

      // Add to target box
      const targetBoxIndex = updatedBoxes.findIndex(b => b.id === targetBox.id);
      updatedBoxes[targetBoxIndex].playerIds.push(bottomPlayer.playerId);

      moves.push({
        playerId: bottomPlayer.playerId,
        fromBoxId: currentBox.id,
        fromBoxNumber: currentBox.boxNumber,
        toBoxId: targetBox.id,
        toBoxNumber: targetBox.boxNumber,
        moveType: 'relegation',
        reason: `Finished 4th in Box ${currentBox.boxNumber}`
      });
    } else {
      // Bottom player in bottom box stays
      moves.push({
        playerId: bottomPlayer.playerId,
        fromBoxId: currentBox.id,
        fromBoxNumber: currentBox.boxNumber,
        toBoxId: currentBox.id,
        toBoxNumber: currentBox.boxNumber,
        moveType: 'stay',
        reason: 'Bottom box (no relegation possible)'
      });
    }

    // Middle players stay in same box
    for (const player of [secondPlayer, thirdPlayer]) {
      moves.push({
        playerId: player.playerId,
        fromBoxId: currentBox.id,
        fromBoxNumber: currentBox.boxNumber,
        toBoxId: currentBox.id,
        toBoxNumber: currentBox.boxNumber,
        moveType: 'stay',
        reason: `Finished ${player.position === 2 ? '2nd' : '3rd'} in Box ${currentBox.boxNumber}`
      });
    }
  }

  return {
    moves,
    newCycleNumber: boxLeague.currentCycle + 1,
    updatedBoxes
  };
}

/**
 * Execute promotion and relegation moves
 */
export async function executePromotionRelegation(
  boxLeagueId: string,
  promotionRelegationResult: PromotionRelegationResult
): Promise<void> {
  const { updateBox, updateBoxLeague, createOrUpdatePlayerStats, getPlayerStatsByLeague } = await import('./box-leagues');

  try {
    // Update all boxes with new player assignments
    for (const updatedBox of promotionRelegationResult.updatedBoxes) {
      await updateBox(updatedBox.id, {
        playerIds: updatedBox.playerIds
      });
    }

    // Update player stats with new box assignments and position history
    const allPlayerStats = await getPlayerStatsByLeague(boxLeagueId);

    for (const move of promotionRelegationResult.moves) {
      const playerStats = allPlayerStats.find(s => s.playerId === move.playerId);
      if (playerStats) {
        // Add to position history
        const historyEntry = {
          cycle: promotionRelegationResult.newCycleNumber - 1, // Previous cycle
          round: 0, // End of cycle
          position: playerStats.currentPosition,
          boxNumber: move.fromBoxNumber
        };

        const updatedStats = {
          ...playerStats,
          boxId: move.toBoxId,
          positionHistory: [...playerStats.positionHistory, historyEntry],
          // Reset stats for new cycle
          matchesPlayed: 0,
          matchesWon: 0,
          matchesLost: 0,
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          totalPoints: 0,
          partnerStats: {},
          opponentStats: {}
        };

        await createOrUpdatePlayerStats(updatedStats);
      }
    }

    // Update box league for new cycle
    await updateBoxLeague(boxLeagueId, {
      currentCycle: promotionRelegationResult.newCycleNumber,
      currentRound: 0 // Reset round counter for new cycle
    });

  } catch (error) {
    console.error('Error executing promotion/relegation:', error);
    throw error;
  }
}

/**
 * Add a new player to the box league
 */
export async function addPlayerToBoxLeague(
  boxLeagueId: string,
  playerId: string,
  targetBoxNumber?: number
): Promise<void> {
  const { getBoxLeague, updateBox, createOrUpdatePlayerStats } = await import('./box-leagues');

  const boxLeague = await getBoxLeague(boxLeagueId);
  if (!boxLeague) {
    throw new Error('Box league not found');
  }

  const boxes = await getBoxesByLeague(boxLeagueId);

  // Determine target box
  const entryBoxNumber = targetBoxNumber || boxLeague.newPlayerEntryBox;
  const targetBox = boxes.find(box => box.boxNumber === entryBoxNumber);

  if (!targetBox) {
    throw new Error(`Target box ${entryBoxNumber} not found`);
  }

  if (targetBox.playerIds.length >= 4) {
    throw new Error(`Box ${entryBoxNumber} is already full (4 players)`);
  }

  // Add player to box
  await updateBox(targetBox.id, {
    playerIds: [...targetBox.playerIds, playerId]
  });

  // Create initial player stats
  await createOrUpdatePlayerStats({
    playerId,
    boxLeagueId,
    boxId: targetBox.id,
    currentPosition: 4, // Default to bottom position
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    totalPoints: 0,
    partnerStats: {},
    opponentStats: {},
    positionHistory: []
  });
}

/**
 * Remove a player from the box league
 */
export async function removePlayerFromBoxLeague(
  boxLeagueId: string,
  playerId: string
): Promise<void> {
  const { updateBox, deleteDoc, doc, collection, query, where, getDocs } = await import('firebase/firestore');
  const { db } = await import('./firebase');

  const boxes = await getBoxesByLeague(boxLeagueId);

  // Find which box the player is in
  const playerBox = boxes.find(box => box.playerIds.includes(playerId));
  if (!playerBox) {
    throw new Error('Player not found in any box');
  }

  // Remove player from box
  await updateBox(playerBox.id, {
    playerIds: playerBox.playerIds.filter(id => id !== playerId)
  });

  // Delete player stats
  const statsQuery = query(
    collection(db, 'boxLeaguePlayerStats'),
    where('playerId', '==', playerId),
    where('boxLeagueId', '==', boxLeagueId)
  );

  const statsSnapshot = await getDocs(statsQuery);
  for (const doc of statsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }
}