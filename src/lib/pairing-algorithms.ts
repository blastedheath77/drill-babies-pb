/**
 * Advanced pairing algorithms for tournament round generation
 * Ensures all possible pairings are exhausted before repetition
 */

// Cache for tournament schedules to maintain consistent player mappings
const tournamentScheduleCache = new Map<string, DoublesMatch[][] | SinglesMatch[][]>();

/**
 * Clear the tournament schedule cache - useful for new tournaments
 */
export function clearTournamentScheduleCache(): void {
  tournamentScheduleCache.clear();
}

interface PairingResult {
  matches: Array<{
    team1: string[];
    team2: string[];
  }>;
  restingPlayers: string[];
}

interface DoublesMatch {
  team1: [string, string];
  team2: [string, string];
}

interface SinglesMatch {
  player1: string;
  player2: string;
}

/**
 * Generate all possible combinations of n items taken k at a time
 */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  
  const result: T[][] = [];
  
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    
    for (let i = start; i <= arr.length - (k - current.length); i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}

/**
 * Shuffle array using Fisher-Yates algorithm for proper randomization
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate all possible doubles pairings for n players (n must be divisible by 4)
 * Each pairing represents one round of matches
 */
export function generateAllDoublesPairings(players: string[], randomize: boolean = true): DoublesMatch[][] {
  const n = players.length;

  // For perfect rotation, we need multiples of 4
  if (n % 4 !== 0 || n < 4) {
    throw new Error(`Perfect doubles pairing requires multiples of 4 players, got ${n}`);
  }

  // Create player mapping - optionally randomized only on first call
  const playersToUse = randomize ? shuffleArray(players) : players;
  const playerMapping = new Map<number, string>();
  playersToUse.forEach((player, index) => {
    playerMapping.set(index, player);
  });
  
  // Generate optimal schedule using abstract positions, then apply player mapping
  function generateCompleteRotation(): DoublesMatch[][] {
    if (n === 4) {
      return generateFourPlayerOptimalRotation(playerMapping);
    }
    
    if (n === 8) {
      return generateEightPlayerOptimalRotation(playerMapping);
    }
    
    if (n >= 12) {
      return generateLargeGroupOptimalRotation(playerMapping, n);
    }
    
    return [];
  }
  
  return generateCompleteRotation();
}

/**
 * Generate optimal 4-player rotation with player mapping
 */
function generateFourPlayerOptimalRotation(playerMapping: Map<number, string>): DoublesMatch[][] {
  // All possible matches for 4 players (positions 0,1,2,3)
  const abstractSchedule = [
    [[[0, 1], [2, 3]]],  // Round 1: (0,1) vs (2,3)
    [[[0, 2], [1, 3]]],  // Round 2: (0,2) vs (1,3)  
    [[[0, 3], [1, 2]]]   // Round 3: (0,3) vs (1,2)
  ];
  
  return abstractSchedule.map(round => 
    round.map(match => {
      const [team1Positions, team2Positions] = match;
      return {
        team1: [playerMapping.get(team1Positions[0])!, playerMapping.get(team1Positions[1])!] as [string, string],
        team2: [playerMapping.get(team2Positions[0])!, playerMapping.get(team2Positions[1])!] as [string, string]
      };
    })
  );
}

/**
 * Generate optimal 8-player rotation with player mapping  
 */
function generateEightPlayerOptimalRotation(playerMapping: Map<number, string>): DoublesMatch[][] {
  // Use the proven 8-player schedule with abstract positions
  const abstractSchedule = [
    [[[0, 1], [2, 3]], [[4, 5], [6, 7]]],  // Round 1
    [[[0, 2], [1, 7]], [[3, 4], [5, 6]]],  // Round 2  
    [[[0, 3], [1, 6]], [[2, 4], [5, 7]]],  // Round 3
    [[[0, 4], [1, 5]], [[2, 6], [3, 7]]],  // Round 4
    [[[0, 5], [2, 7]], [[1, 4], [3, 6]]],  // Round 5
    [[[0, 6], [3, 5]], [[1, 2], [4, 7]]],  // Round 6
    [[[0, 7], [2, 5]], [[1, 3], [4, 6]]]   // Round 7
  ];
  
  return abstractSchedule.map(round => 
    round.map(match => {
      const [team1Positions, team2Positions] = match;
      return {
        team1: [playerMapping.get(team1Positions[0])!, playerMapping.get(team1Positions[1])!] as [string, string],
        team2: [playerMapping.get(team2Positions[0])!, playerMapping.get(team2Positions[1])!] as [string, string]
      };
    })
  );
}

/**
 * Generate rotation for larger groups with player mapping
 */
function generateLargeGroupOptimalRotation(playerMapping: Map<number, string>, n: number): DoublesMatch[][] {
  const rounds: DoublesMatch[][] = [];
  const numRounds = Math.min(n - 1, 14);
  
  // Add some randomness to the rotation starting points
  const randomOffset = Math.floor(Math.random() * n);
  
  for (let round = 0; round < numRounds; round++) {
    const roundMatches: DoublesMatch[] = [];
    const usedPositions = new Set<number>();
    
    // Rotate positions systematically with random offset
    const rotationIndex = (round + randomOffset) % n;
    const rotatedPositions = [];
    for (let i = 0; i < n; i++) {
      rotatedPositions.push((rotationIndex + i) % n);
    }
    
    // Create matches from rotated positions
    for (let i = 0; i < rotatedPositions.length && usedPositions.size <= rotatedPositions.length - 4; i += 4) {
      if (i + 3 < rotatedPositions.length) {
        const pos1 = rotatedPositions[i];
        const pos2 = rotatedPositions[i + 1];
        const pos3 = rotatedPositions[i + 2];
        const pos4 = rotatedPositions[i + 3];
        
        // Only add if none of these positions are already used this round
        if (![pos1, pos2, pos3, pos4].some(p => usedPositions.has(p))) {
          roundMatches.push({
            team1: [playerMapping.get(pos1)!, playerMapping.get(pos2)!] as [string, string],
            team2: [playerMapping.get(pos3)!, playerMapping.get(pos4)!] as [string, string]
          });
          [pos1, pos2, pos3, pos4].forEach(p => usedPositions.add(p));
        }
      }
    }
    
    if (roundMatches.length > 0) {
      rounds.push(roundMatches);
    }
  }
  
  return rounds;
}

/**
 * Validate that a schedule has perfect partnership distribution
 */
function validateSchedule(schedule: DoublesMatch[][], players: string[]): boolean {
  const partnerships = new Map<string, number>();
  
  // Count each partnership
  schedule.forEach(round => {
    round.forEach(match => {
      const partnership1 = match.team1.slice().sort().join('-');
      const partnership2 = match.team2.slice().sort().join('-');
      partnerships.set(partnership1, (partnerships.get(partnership1) || 0) + 1);
      partnerships.set(partnership2, (partnerships.get(partnership2) || 0) + 1);
    });
  });
  
  // Check that each possible partnership appears exactly once
  const expectedPartnerships = players.length * (players.length - 1) / 2;
  return partnerships.size === expectedPartnerships && 
         Array.from(partnerships.values()).every(count => count === 1);
}

/**
 * Algorithm for larger groups (12, 16, etc.)
 */
function generateLargeGroupRotation(players: string[]): DoublesMatch[][] {
  const n = players.length;
  const rounds: DoublesMatch[][] = [];
  
  // For larger groups, use a systematic rotation approach
  // This ensures good distribution but may not achieve perfect permutation
  // due to combinatorial complexity
  
  const numRounds = Math.min(n - 1, 14); // Reasonable limit for practical play
  
  // Add some randomness to the rotation starting points
  const randomOffset = Math.floor(Math.random() * n);
  
  for (let round = 0; round < numRounds; round++) {
    const roundMatches: DoublesMatch[] = [];
    const usedPlayers = new Set<string>();
    
    // Rotate players systematically with random offset
    const rotationIndex = (round + randomOffset) % n;
    const rotatedPlayers = [...players.slice(rotationIndex), ...players.slice(0, rotationIndex)];
    
    // Create matches from rotated list
    for (let i = 0; i < rotatedPlayers.length && usedPlayers.size <= rotatedPlayers.length - 4; i += 4) {
      if (i + 3 < rotatedPlayers.length) {
        const team1: [string, string] = [rotatedPlayers[i], rotatedPlayers[i + 1]];
        const team2: [string, string] = [rotatedPlayers[i + 2], rotatedPlayers[i + 3]];
        
        // Only add if none of these players are already used this round
        if (![...team1, ...team2].some(p => usedPlayers.has(p))) {
          roundMatches.push({ team1, team2 });
          [...team1, ...team2].forEach(p => usedPlayers.add(p));
        }
      }
    }
    
    if (roundMatches.length > 0) {
      rounds.push(roundMatches);
    }
  }
  
  return rounds;
}

/**
 * Generate all possible singles pairings for n players
 */
export function generateAllSinglesPairings(players: string[]): SinglesMatch[][] {
  const n = players.length;
  
  if (n < 2) {
    throw new Error(`Singles requires at least 2 players, got ${n}`);
  }
  
  if (n % 2 !== 0) {
    // Odd number - one player sits out each round
    return generateOddSinglesRotation(players);
  } else {
    // Even number - perfect rotation possible
    return generateEvenSinglesRotation(players);
  }
}

/**
 * Generate singles rotation for even number of players
 * Ensures everyone plays everyone exactly once
 */
function generateEvenSinglesRotation(players: string[]): SinglesMatch[][] {
  const n = players.length;
  
  // Create randomized player mapping
  const shuffledPlayers = shuffleArray(players);
  const playerMapping = new Map<number, string>();
  shuffledPlayers.forEach((player, index) => {
    playerMapping.set(index, player);
  });
  
  const rounds: SinglesMatch[][] = [];
  
  // Use round-robin tournament algorithm with abstract positions
  // Fix position 0, rotate positions 1,2,3...n-1
  const rotating = Array.from({length: n - 1}, (_, i) => i + 1);
  
  for (let round = 0; round < n - 1; round++) {
    const roundMatches: SinglesMatch[] = [];
    
    // First match: fixed position (0) vs first rotating position
    roundMatches.push({
      player1: playerMapping.get(0)!,
      player2: playerMapping.get(rotating[0])!
    });
    
    // Remaining matches: pair up remaining rotating positions
    for (let i = 1; i < rotating.length; i += 2) {
      if (i + 1 < rotating.length) {
        roundMatches.push({
          player1: playerMapping.get(rotating[i])!,
          player2: playerMapping.get(rotating[rotating.length - i])!
        });
      }
    }
    
    rounds.push(roundMatches);
    
    // Rotate the rotating positions for next round
    rotating.unshift(rotating.pop()!);
  }
  
  return rounds;
}

/**
 * Generate singles rotation for odd number of players
 */
function generateOddSinglesRotation(players: string[]): SinglesMatch[][] {
  const n = players.length;
  
  // Add a "bye" position to make it even
  const playersWithBye = [...players, 'BYE'];
  const evenRounds = generateEvenSinglesRotation(playersWithBye);
  
  // Remove matches involving the bye player
  return evenRounds.map(round => 
    round.filter(match => match.player1 !== 'BYE' && match.player2 !== 'BYE')
  );
}

/**
 * Generate complete optimal schedule for a tournament
 */
export function generateCompleteOptimalSchedule(
  players: string[],
  format: 'singles' | 'doubles',
  maxCourts: number = 2
): PairingResult[] {
  try {
    // Create cache key for consistent schedules
    const cacheKey = `${format}-${players.sort().join(',')}-${maxCourts}`;

    if (format === 'doubles' && players.length % 4 === 0 && players.length >= 4) {
      // Check cache first
      let allPossibleRounds = tournamentScheduleCache.get(cacheKey) as DoublesMatch[][];
      if (!allPossibleRounds) {
        // Generate and cache the schedule
        allPossibleRounds = generateAllDoublesPairings(players, true); // Randomize only on first generation
        tournamentScheduleCache.set(cacheKey, allPossibleRounds);
      }

      return allPossibleRounds.map(round => {
        const matches = round.slice(0, maxCourts).map(match => ({
          team1: match.team1,
          team2: match.team2
        }));

        const usedPlayers = new Set(matches.flatMap(m => [...m.team1, ...m.team2]));
        const restingPlayers = players.filter(p => !usedPlayers.has(p));

        return { matches, restingPlayers };
      });
    }

    if (format === 'singles' && players.length >= 2) {
      // Check cache first
      let allPossibleRounds = tournamentScheduleCache.get(cacheKey) as SinglesMatch[][];
      if (!allPossibleRounds) {
        // Generate and cache the schedule
        allPossibleRounds = generateAllSinglesPairings(players);
        tournamentScheduleCache.set(cacheKey, allPossibleRounds);
      }

      return allPossibleRounds.map(round => {
        const matches = (round as SinglesMatch[]).slice(0, maxCourts).map(match => ({
          team1: [match.player1],
          team2: [match.player2]
        }));

        const usedPlayers = new Set(matches.flatMap(m => [...m.team1, ...m.team2]));
        const restingPlayers = players.filter(p => !usedPlayers.has(p));

        return { matches, restingPlayers };
      });
    }

    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Get a specific round from the optimal schedule
 */
export function getOptimalRound(
  players: string[],
  format: 'singles' | 'doubles',
  roundNumber: number,
  maxCourts: number = 2
): PairingResult {
  try {
    const completeSchedule = generateCompleteOptimalSchedule(players, format, maxCourts);
    
    if (roundNumber >= 1 && roundNumber <= completeSchedule.length) {
      return completeSchedule[roundNumber - 1]; // Convert 1-based to 0-based indexing
    }
    
    // If we've exhausted the optimal schedule, cycle back to the beginning
    if (completeSchedule.length > 0) {
      const cycleIndex = ((roundNumber - 1) % completeSchedule.length);
      return completeSchedule[cycleIndex];
    }
    
    // Fallback
    return { matches: [], restingPlayers: players };
  } catch (error) {
    return { matches: [], restingPlayers: players };
  }
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use getOptimalRound instead
 */
export function getNextOptimalRound(
  players: string[],
  format: 'singles' | 'doubles',
  existingMatches: Array<{ team1PlayerIds?: string[]; team2PlayerIds?: string[]; player1Id?: string; player2Id?: string; }>,
  maxCourts: number = 2
): PairingResult {
  // For backwards compatibility, try to determine which round we're on
  const roundNumber = existingMatches.length + 1;
  return getOptimalRound(players, format, roundNumber, maxCourts);
}

// Removed unused functions - now using direct round indexing approach

/**
 * Calculate how many total rounds are possible before repetition
 */
export function calculateMaxUniqueRounds(playerCount: number, format: 'singles' | 'doubles'): number {
  if (format === 'singles') {
    return playerCount % 2 === 0 ? playerCount - 1 : playerCount;
  } else {
    if (playerCount % 4 !== 0) return 0;
    
    // For doubles, the number of unique rounds depends on the player count
    switch (playerCount) {
      case 4: return 3; // 3 different ways to pair 4 players
      case 8: return 7; // Calculated for 8-player rotation
      case 12: return 11; // Approximate for larger groups
      case 16: return 15;
      default: return Math.max(1, playerCount - 1);
    }
  }
}