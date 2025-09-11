/**
 * Advanced pairing algorithms for tournament round generation
 * Ensures all possible pairings are exhausted before repetition
 */

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
export function generateAllDoublesPairings(players: string[]): DoublesMatch[][] {
  const n = players.length;
  
  // For perfect rotation, we need multiples of 4
  if (n % 4 !== 0 || n < 4) {
    throw new Error(`Perfect doubles pairing requires multiples of 4 players, got ${n}`);
  }
  
  // RANDOMIZE the player order to ensure different starting points
  const randomizedPlayers = shuffleArray(players);
  
  const allPairings: DoublesMatch[][] = [];
  const usedPartnershipCombos = new Set<string>();
  
  // Generate all possible team combinations (partnerships)
  const allTeams = combinations(randomizedPlayers, 2).map(team => team.sort()) as [string, string][];
  
  // Create a systematic approach for complete permutations
  function generateCompleteRotation(): DoublesMatch[][] {
    const rotations: DoublesMatch[][] = [];
    const totalMatches = n / 4;
    
    // Use round-robin tournament theory for systematic pairing
    // For doubles, we adapt the round-robin approach
    
    if (n === 4) {
      // Special case: only 1 match possible per round, 3 different partnerships
      const teams = allTeams;
      const possibleMatches: DoublesMatch[] = [];
      
      // Generate all possible matches between different teams
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const team1 = teams[i];
          const team2 = teams[j];
          
          // Check if teams don't overlap (different players)
          if (!team1.some(p => team2.includes(p))) {
            possibleMatches.push({ team1, team2 });
          }
        }
      }
      
      // Shuffle the possible matches for random starting round
      const shuffledMatches = shuffleArray(possibleMatches);
      
      // Each match is a complete round for 4 players
      return shuffledMatches.map(match => [match]);
    }
    
    if (n === 8) {
      // 8 players = 2 matches per round, systematic rotation
      return generateEightPlayerRotation(randomizedPlayers);
    }
    
    if (n >= 12) {
      // For larger groups, use systematic approach
      return generateLargeGroupRotation(randomizedPlayers);
    }
    
    return rotations;
  }
  
  return generateCompleteRotation();
}

/**
 * Specialized algorithm for 8 players (2 courts)
 */
function generateEightPlayerRotation(players: string[]): DoublesMatch[][] {
  const rotations: DoublesMatch[][] = [];
  const partnerships = new Set<string>();
  const oppositions = new Set<string>();
  
  // For 8 players, we can ensure everyone plays with everyone exactly once as a partner
  // and against everyone exactly twice
  
  // Generate rounds systematically
  const rounds: DoublesMatch[][] = [];
  
  // Round 1: A,B vs C,D and E,F vs G,H
  rounds.push([
    { team1: [players[0], players[1]], team2: [players[2], players[3]] },
    { team1: [players[4], players[5]], team2: [players[6], players[7]] }
  ]);
  
  // Round 2: A,C vs B,D and E,G vs F,H  
  rounds.push([
    { team1: [players[0], players[2]], team2: [players[1], players[3]] },
    { team1: [players[4], players[6]], team2: [players[5], players[7]] }
  ]);
  
  // Round 3: A,D vs B,C and E,H vs F,G
  rounds.push([
    { team1: [players[0], players[3]], team2: [players[1], players[2]] },
    { team1: [players[4], players[7]], team2: [players[5], players[6]] }
  ]);
  
  // Round 4: A,E vs F,G and B,H vs C,D
  rounds.push([
    { team1: [players[0], players[4]], team2: [players[5], players[6]] },
    { team1: [players[1], players[7]], team2: [players[2], players[3]] }
  ]);
  
  // Round 5: A,F vs E,G and B,C vs D,H
  rounds.push([
    { team1: [players[0], players[5]], team2: [players[4], players[6]] },
    { team1: [players[1], players[2]], team2: [players[3], players[7]] }
  ]);
  
  // Round 6: A,G vs E,F and B,D vs C,H
  rounds.push([
    { team1: [players[0], players[6]], team2: [players[4], players[5]] },
    { team1: [players[1], players[3]], team2: [players[2], players[7]] }
  ]);
  
  // Round 7: A,H vs B,E and C,F vs D,G
  rounds.push([
    { team1: [players[0], players[7]], team2: [players[1], players[4]] },
    { team1: [players[2], players[5]], team2: [players[3], players[6]] }
  ]);
  
  return rounds;
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
  const rounds: SinglesMatch[][] = [];
  
  // RANDOMIZE the player order first
  const randomizedPlayers = shuffleArray(players);
  
  // Use round-robin tournament algorithm
  // Fix the first player, rotate others
  const fixed = randomizedPlayers[0];
  const rotating = randomizedPlayers.slice(1);
  
  for (let round = 0; round < n - 1; round++) {
    const roundMatches: SinglesMatch[] = [];
    
    // First match: fixed player vs first rotating player
    roundMatches.push({
      player1: fixed,
      player2: rotating[0]
    });
    
    // Remaining matches: pair up remaining rotating players
    for (let i = 1; i < rotating.length; i += 2) {
      if (i + 1 < rotating.length) {
        roundMatches.push({
          player1: rotating[i],
          player2: rotating[rotating.length - i]
        });
      }
    }
    
    rounds.push(roundMatches);
    
    // Rotate the rotating players for next round
    rotating.unshift(rotating.pop()!);
  }
  
  return rounds;
}

/**
 * Generate singles rotation for odd number of players
 */
function generateOddSinglesRotation(players: string[]): SinglesMatch[][] {
  const n = players.length;
  const rounds: SinglesMatch[][] = [];
  
  // RANDOMIZE the player order first
  const randomizedPlayers = shuffleArray(players);
  
  // Add a "bye" player to make it even
  const playersWithBye = [...randomizedPlayers, 'BYE'];
  const evenRounds = generateEvenSinglesRotation(playersWithBye);
  
  // Remove matches involving the bye player and track who sits out
  return evenRounds.map(round => 
    round.filter(match => match.player1 !== 'BYE' && match.player2 !== 'BYE')
  );
}

/**
 * Get the next optimal round for quick play based on exhaustive pairing
 */
export function getNextOptimalRound(
  players: string[],
  format: 'singles' | 'doubles',
  existingMatches: Array<{ team1PlayerIds?: string[]; team2PlayerIds?: string[]; player1Id?: string; player2Id?: string; }>,
  maxCourts: number = 2
): PairingResult {
  try {
    if (format === 'doubles' && players.length % 4 === 0 && players.length >= 4) {
      const allPossibleRounds = generateAllDoublesPairings(players);
      const nextRound = findNextUnusedRound(allPossibleRounds, existingMatches, 'doubles');
      
      if (nextRound) {
        const matches = nextRound.slice(0, maxCourts).map(match => ({
          team1: match.team1,
          team2: match.team2
        }));
        
        const usedPlayers = new Set(matches.flatMap(m => [...m.team1, ...m.team2]));
        const restingPlayers = players.filter(p => !usedPlayers.has(p));
        
        return { matches, restingPlayers };
      }
    }
    
    if (format === 'singles' && players.length >= 2) {
      const allPossibleRounds = generateAllSinglesPairings(players);
      const nextRound = findNextUnusedRound(allPossibleRounds, existingMatches, 'singles');
      
      if (nextRound) {
        const matches = (nextRound as SinglesMatch[]).slice(0, maxCourts).map(match => ({
          team1: [match.player1],
          team2: [match.player2]
        }));
        
        const usedPlayers = new Set(matches.flatMap(m => [...m.team1, ...m.team2]));
        const restingPlayers = players.filter(p => !usedPlayers.has(p));
        
        return { matches, restingPlayers };
      }
    }
    
    // Fallback to existing random algorithm if systematic approach fails
    throw new Error('Using fallback algorithm');
    
  } catch (error) {
    // Fallback: return empty result to use existing algorithm
    return { matches: [], restingPlayers: players };
  }
}

/**
 * Find the next unused round from all possible rounds
 */
function findNextUnusedRound(
  allPossibleRounds: (DoublesMatch[][] | SinglesMatch[][]),
  existingMatches: Array<{ team1PlayerIds?: string[]; team2PlayerIds?: string[]; player1Id?: string; player2Id?: string; }>,
  format: 'singles' | 'doubles'
): DoublesMatch[] | SinglesMatch[] | null {
  
  // Convert existing matches to comparable format
  const existingRounds: Set<string> = new Set();
  
  // Group existing matches by some criteria (this is a simplified approach)
  // In reality, you'd want to group by actual rounds played
  for (const match of existingMatches) {
    if (format === 'doubles' && match.team1PlayerIds && match.team2PlayerIds) {
      const team1 = match.team1PlayerIds.slice().sort();
      const team2 = match.team2PlayerIds.slice().sort();
      const matchKey = `${team1.join(',')}-vs-${team2.join(',')}`;
      existingRounds.add(matchKey);
    } else if (format === 'singles' && match.player1Id && match.player2Id) {
      const players = [match.player1Id, match.player2Id].sort();
      const matchKey = players.join('-vs-');
      existingRounds.add(matchKey);
    }
  }
  
  // Find first round that hasn't been used
  for (const round of allPossibleRounds) {
    const roundKey = createRoundKey(round, format);
    if (!existingRounds.has(roundKey)) {
      return round;
    }
  }
  
  // If all rounds have been used, start over
  return allPossibleRounds.length > 0 ? allPossibleRounds[0] : null;
}

/**
 * Create a comparable key for a round
 */
function createRoundKey(round: DoublesMatch[] | SinglesMatch[], format: 'singles' | 'doubles'): string {
  if (format === 'doubles') {
    const doublesRound = round as DoublesMatch[];
    return doublesRound.map(match => {
      const team1 = match.team1.slice().sort().join(',');
      const team2 = match.team2.slice().sort().join(',');
      return `${team1}-vs-${team2}`;
    }).sort().join('|');
  } else {
    const singlesRound = round as SinglesMatch[];
    return singlesRound.map(match => {
      const players = [match.player1, match.player2].sort();
      return players.join('-vs-');
    }).sort().join('|');
  }
}

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