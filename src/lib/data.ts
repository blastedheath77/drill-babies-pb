import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  query,
  orderBy,
  limit,
  where,
  addDoc,
  serverTimestamp,
  Timestamp,
  documentId,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Player,
  Game,
  Partnership,
  HeadToHead,
  RatingHistoryPoint,
  Tournament,
  TournamentMatch,
  TournamentStanding,
  Circle,
  FormMetric,
} from './types';
import { DEFAULT_RATING, DEFAULT_AVATAR_URL, FIRESTORE_BATCH_LIMIT } from './constants';
import { handleDatabaseError, logError } from './errors';
import { logger } from './logger';

export async function getPlayers(clubId?: string): Promise<Player[]> {
  try {
    const playersCollection = collection(db, 'players');

    // Try query with orderBy first
    let q = clubId
      ? query(playersCollection, where('clubId', '==', clubId), orderBy('rating', 'desc'))
      : query(playersCollection, orderBy('rating', 'desc'));

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firebase request timeout')), 10000); // 10 second timeout
    });

    let snapshot: any;
    try {
      snapshot = await Promise.race([
        getDocs(q),
        timeoutPromise
      ]) as any;
    } catch (indexError: any) {
      // If index error, fall back to query without orderBy and sort client-side
      if (indexError?.code === 'failed-precondition' || indexError?.message?.includes('index')) {
        logger.warn('Index not ready, falling back to client-side sorting for players');
        q = clubId
          ? query(playersCollection, where('clubId', '==', clubId))
          : query(playersCollection);

        snapshot = await Promise.race([
          getDocs(q),
          timeoutPromise
        ]) as any;
      } else {
        throw indexError;
      }
    }

    // Clean data to remove Firestore-specific objects that cause hydration issues
    const players = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Remove problematic fields like createdAt that have toJSON methods
      const { createdAt, nameLower, ...cleanData } = data;
      return { id: doc.id, ...cleanData } as Player;
    });

    // Sort by rating on client side (in case we fell back to simple query)
    return players.sort((a, b) => b.rating - a.rating);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getPlayers');

    // Return empty array with specific error handling
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('UNAVAILABLE')) {
        logger.warn('Firebase connection timeout, returning empty players list');
      }
    }

    return [];
  }
}

export async function getPlayerById(id: string): Promise<Player | undefined> {
  try {
    const playerDoc = await getDoc(doc(db, 'players', id));
    if (playerDoc.exists()) {
      const data = playerDoc.data();
      // Remove problematic fields that cause hydration issues
      const { createdAt, nameLower, ...cleanData } = data;
      return { id: playerDoc.id, ...cleanData } as Player;
    }
    return undefined;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getPlayerById');
    return undefined;
  }
}

export async function getPlayersByIds(playerIds: string[]): Promise<Player[]> {
  try {
    const playerMap = await fetchPlayersByIds(playerIds);
    // Return players in the same order as the input IDs
    return playerIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getPlayersByIds');
    return [];
  }
}

async function fetchPlayersByIds(playerIds: string[]): Promise<Map<string, Player>> {
  const playerMap = new Map<string, Player>();
  if (playerIds.length === 0) {
    return playerMap;
  }

  const playerBatches: string[][] = [];
  // Firestore 'in' query supports a maximum of FIRESTORE_BATCH_LIMIT elements
  for (let i = 0; i < playerIds.length; i += FIRESTORE_BATCH_LIMIT) {
    playerBatches.push(playerIds.slice(i, i + FIRESTORE_BATCH_LIMIT));
  }

  await Promise.all(
    playerBatches.map(async (batch) => {
      const playersSnapshot = await getDocs(
        query(collection(db, 'players'), where(documentId(), 'in', batch))
      );
      playersSnapshot.forEach((doc) => {
        const data = doc.data();
        // Remove problematic fields that cause hydration issues
        const { createdAt, nameLower, ...cleanData } = data;
        playerMap.set(doc.id, { id: doc.id, ...cleanData } as Player);
      });
    })
  );

  return playerMap;
}

export async function getTotalGamesCount(clubId?: string): Promise<number> {
  try {
    const gamesCollection = collection(db, 'games');
    const q = clubId
      ? query(gamesCollection, where('clubId', '==', clubId))
      : gamesCollection;
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error fetching total games count: ', error);
    return 0;
  }
}

export async function getRecentGames(count: number = 5, clubId?: string): Promise<Game[]> {
  try {
    const gamesCollection = collection(db, 'games');

    // Try query with orderBy first
    let q = clubId
      ? query(gamesCollection, where('clubId', '==', clubId), orderBy('date', 'desc'), limit(count))
      : query(gamesCollection, orderBy('date', 'desc'), limit(count));

    let snapshot: any;
    try {
      snapshot = await getDocs(q);
    } catch (indexError: any) {
      // If index error, fall back to query without orderBy and sort client-side
      if (indexError?.code === 'failed-precondition' || indexError?.message?.includes('index')) {
        logger.warn('Index not ready, falling back to client-side sorting for recent games');
        q = clubId
          ? query(gamesCollection, where('clubId', '==', clubId), limit(count * 2)) // Get more to compensate for sorting
          : query(gamesCollection, limit(count * 2));

        snapshot = await getDocs(q);
      } else {
        throw indexError;
      }
    }

    const allPlayerIds = new Set<string>();
    const gameDocsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any);

    gameDocsData.forEach((gameData) => {
      if (gameData.playerIds) {
        gameData.playerIds.forEach((id: string) => allPlayerIds.add(id));
      }
    });

    const playerMap = await fetchPlayersByIds(Array.from(allPlayerIds));

    const games = gameDocsData.map((gameData) => {
      const team1Players = gameData.team1.playerIds
        .map((id: string) => playerMap.get(id))
        .filter(Boolean) as Player[];
      const team2Players = gameData.team2.playerIds
        .map((id: string) => playerMap.get(id))
        .filter(Boolean) as Player[];

      return {
        ...gameData,
        date: (gameData.date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        team1: { ...gameData.team1, players: team1Players },
        team2: { ...gameData.team2, players: team2Players },
      } as Game;
    });

    // Sort by date descending and limit to requested count
    return games
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count);
  } catch (error) {
    console.error('Error fetching recent games: ', error);
    return [];
  }
}

export async function getAllGames(clubId?: string): Promise<Game[]> {
  try {
    const gamesCollection = collection(db, 'games');

    // Try query with orderBy first
    let q = clubId
      ? query(gamesCollection, where('clubId', '==', clubId), orderBy('date', 'desc'))
      : query(gamesCollection, orderBy('date', 'desc'));

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firebase request timeout')), 15000); // 15 second timeout for games
    });

    let snapshot: any;
    try {
      snapshot = await Promise.race([
        getDocs(q),
        timeoutPromise
      ]) as any;
    } catch (indexError: any) {
      // If index error, fall back to query without orderBy and sort client-side
      if (indexError?.code === 'failed-precondition' || indexError?.message?.includes('index')) {
        logger.warn('Index not ready, falling back to client-side sorting for all games');
        q = clubId
          ? query(gamesCollection, where('clubId', '==', clubId))
          : query(gamesCollection);

        snapshot = await Promise.race([
          getDocs(q),
          timeoutPromise
        ]) as any;
      } else {
        throw indexError;
      }
    }

    const allPlayerIds = new Set<string>();
    const gameDocsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any);

    gameDocsData.forEach((gameData) => {
      if (gameData.playerIds) {
        gameData.playerIds.forEach((id: string) => allPlayerIds.add(id));
      }
    });

    const playerMap = await fetchPlayersByIds(Array.from(allPlayerIds));

    const games = gameDocsData.map((gameData) => {
      // Handle missing players gracefully by creating placeholder objects
      const team1Players = gameData.team1.playerIds
        .map((id: string) => {
          const player = playerMap.get(id);
          if (!player) {
            console.warn(`Player ${id} not found for game ${gameData.id}, using placeholder`);
            return {
              id,
              name: `Unknown Player (${id})`,
              avatar: '',
              rating: 1000,
              wins: 0,
              losses: 0,
              pointsFor: 0,
              pointsAgainst: 0,
            } as Player;
          }
          return player;
        });
      
      const team2Players = gameData.team2.playerIds
        .map((id: string) => {
          const player = playerMap.get(id);
          if (!player) {
            console.warn(`Player ${id} not found for game ${gameData.id}, using placeholder`);
            return {
              id,
              name: `Unknown Player (${id})`,
              avatar: '',
              rating: 1000,
              wins: 0,
              losses: 0,
              pointsFor: 0,
              pointsAgainst: 0,
            } as Player;
          }
          return player;
        });

      return {
        ...gameData,
        date: (gameData.date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        team1: { ...gameData.team1, players: team1Players },
        team2: { ...gameData.team2, players: team2Players },
      } as Game;
    });

    // Sort by date descending (in case we fell back to simple query)
    return games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error fetching all games: ', error);
    return [];
  }
}

export async function getGamesForPlayer(playerId: string, clubId?: string): Promise<Game[]> {
  try {
    const gamesCollection = collection(db, 'games');

    // First, try the optimized query with index (if available)
    try {
      // Build query with optional clubId filter
      const q = clubId
        ? query(
            gamesCollection,
            where('clubId', '==', clubId),
            where('playerIds', 'array-contains', playerId),
            orderBy('date', 'desc')
          )
        : query(
            gamesCollection,
            where('playerIds', 'array-contains', playerId),
            orderBy('date', 'desc')
          );

      const gamesSnapshot = await getDocs(q);

      const allPlayerIds = new Set<string>([playerId]);
      const gameDocsData = gamesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any);

      gameDocsData.forEach((gameData) => {
        gameData.playerIds.forEach((id: string) => allPlayerIds.add(id));
      });

      const playerMap = await fetchPlayersByIds(Array.from(allPlayerIds));

      const games = gameDocsData.map((gameData) => {
        const team1Players = gameData.team1.playerIds
          .map((id: string) => {
            const player = playerMap.get(id);
            if (!player) {
              console.warn(`Player ${id} not found for game ${gameData.id}, using placeholder`);
              return {
                id,
                name: `Unknown Player (${id})`,
                avatar: '',
                rating: 1000,
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
              } as Player;
            }
            return player;
          });
        
        const team2Players = gameData.team2.playerIds
          .map((id: string) => {
            const player = playerMap.get(id);
            if (!player) {
              console.warn(`Player ${id} not found for game ${gameData.id}, using placeholder`);
              return {
                id,
                name: `Unknown Player (${id})`,
                avatar: '',
                rating: 1000,
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
              } as Player;
            }
            return player;
          });

        return {
          ...gameData,
          date: (gameData.date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          team1: { ...gameData.team1, players: team1Players },
          team2: { ...gameData.team2, players: team2Players },
        } as Game;
      });

      return games;
    } catch (indexError) {
      // If the indexed query fails (missing index), fall back to getting all games and filtering
      console.warn(`Indexed query failed for player ${playerId}, falling back to client-side filtering:`, indexError);
      
      // Fallback: Get all games and filter client-side
      const allGamesSnapshot = await getDocs(query(gamesCollection, orderBy('date', 'desc')));
      
      const allPlayerIds = new Set<string>([playerId]);
      const filteredGameDocsData: any[] = [];
      
      // Filter games that contain the player
      allGamesSnapshot.docs.forEach((doc) => {
        const gameData = { id: doc.id, ...doc.data() } as any;
        if (gameData.playerIds && gameData.playerIds.includes(playerId)) {
          filteredGameDocsData.push(gameData);
          gameData.playerIds.forEach((id: string) => allPlayerIds.add(id));
        }
      });

      const playerMap = await fetchPlayersByIds(Array.from(allPlayerIds));

      const games = filteredGameDocsData.map((gameData) => {
        const team1Players = gameData.team1.playerIds
          .map((id: string) => {
            const player = playerMap.get(id);
            if (!player) {
              console.warn(`Player ${id} not found for game ${gameData.id}, using placeholder`);
              return {
                id,
                name: `Unknown Player (${id})`,
                avatar: '',
                rating: 1000,
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
              } as Player;
            }
            return player;
          });
        
        const team2Players = gameData.team2.playerIds
          .map((id: string) => {
            const player = playerMap.get(id);
            if (!player) {
              console.warn(`Player ${id} not found for game ${gameData.id}, using placeholder`);
              return {
                id,
                name: `Unknown Player (${id})`,
                avatar: '',
                rating: 1000,
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
              } as Player;
            }
            return player;
          });

        return {
          ...gameData,
          date: (gameData.date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          team1: { ...gameData.team1, players: team1Players },
          team2: { ...gameData.team2, players: team2Players },
        } as Game;
      });

      return games;
    }
  } catch (error) {
    console.error(`Error fetching games for player ${playerId}:`, error);
    return [];
  }
}

export function getHeadToHeadStats(
  playerId: string,
  opponentId: string,
  allGames: Game[]
): HeadToHead | null {
  let wins = 0;
  let losses = 0;
  let pointsDifference = 0;

  // Filter to games where both players participated
  const h2hGames = allGames.filter((game) => 
    game.playerIds.includes(playerId) && game.playerIds.includes(opponentId)
  );
  let gamesPlayed = 0;

  h2hGames.forEach((game) => {
    // Check if they are partners (on same team) - skip these games
    const playersOnTeam1 =
      game.team1.playerIds.includes(playerId) && game.team1.playerIds.includes(opponentId);
    const playersOnTeam2 =
      game.team2.playerIds.includes(playerId) && game.team2.playerIds.includes(opponentId);

    // Skip partnership games - we only want opponent games
    if (playersOnTeam1 || playersOnTeam2) return;

    // Ensure players are on opposite teams (redundant check for safety)
    const playerIsOnTeam1 = game.team1.playerIds.includes(playerId);
    const opponentIsOnTeam1 = game.team1.playerIds.includes(opponentId);

    // They must be on opposite teams for head-to-head (opponent) matchup
    if (playerIsOnTeam1 === opponentIsOnTeam1) return;

    const playerTeam = playerIsOnTeam1 ? game.team1 : game.team2;
    const opponentTeam = opponentIsOnTeam1 ? game.team1 : game.team2;

    // Count this as a valid head-to-head game
    gamesPlayed++;
    if (playerTeam.score > opponentTeam.score) {
      wins++;
    } else {
      losses++;
    }
    pointsDifference += playerTeam.score - opponentTeam.score;
  });

  return {
    opponentId,
    gamesPlayed,
    wins,
    losses,
    pointsDifference,
  };
}

export function getPartnershipStats(playerId: string, allGames: Game[], allPlayers?: Player[]): Partnership[] {
  const partnerships: {
    [partnerId: string]: { gamesPlayed: number; wins: number; losses: number; partner: Player };
  } = {};

  const doublesGames = allGames.filter((game) => game.type === 'Doubles');

  for (const game of doublesGames) {
    // Check if the player is actually in this game
    const isPlayerInGame = game.team1.playerIds.includes(playerId) || game.team2.playerIds.includes(playerId);
    if (!isPlayerInGame) {
      continue; // Skip games where this player didn't participate
    }
    
    const playerTeam = game.team1.playerIds.includes(playerId) ? game.team1 : game.team2;
    const partnerId = playerTeam.playerIds.find((id: string) => id !== playerId);

    if (partnerId) {
      if (!partnerships[partnerId]) {
        // First try to get partner info from the game data
        let partnerInfo = playerTeam.players?.find((p) => p.id === partnerId);
        
        // If not found in game data, try to find in the provided players list
        if (!partnerInfo && allPlayers) {
          partnerInfo = allPlayers.find((p) => p.id === partnerId);
        }
        
        // If still not found, skip this partnership
        if (!partnerInfo) {
          console.warn(`Partner ${partnerId} not found in game or players data for game ${game.id}`);
          continue;
        }
        
        partnerships[partnerId] = { gamesPlayed: 0, wins: 0, losses: 0, partner: partnerInfo };
      }

      partnerships[partnerId].gamesPlayed++;
      const opponentTeam = game.team1.playerIds.includes(playerId) ? game.team2 : game.team1;

      if (playerTeam.score > opponentTeam.score) {
        partnerships[partnerId].wins++;
      } else {
        partnerships[partnerId].losses++;
      }
    }
  }

  return Object.values(partnerships).sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

/**
 * Calculate expected win rate based on ELO rating differential
 * Uses standard ELO probability formula: 1 / (1 + 10^((opponentRating - playerRating) / 400))
 *
 * @param playerRating - The player's ELO rating
 * @param opponentRating - The opponent's ELO rating
 * @returns Expected win probability (0 to 1)
 */
export function calculateExpectedWinRate(playerRating: number, opponentRating: number): number {
  const ratingDiff = opponentRating - playerRating;
  return 1 / (1 + Math.pow(10, ratingDiff / 400));
}

export function getBiggestRivals(
  playerId: string,
  allPlayers: Player[],
  allGames: Game[]
): Array<HeadToHead & { opponent: Player }> {
  const rivals: Array<HeadToHead & { opponent: Player }> = [];

  // Calculate head-to-head stats against each opponent
  allPlayers.forEach((opponent) => {
    const stats = getHeadToHeadStats(playerId, opponent.id, allGames);
    if (stats && stats.gamesPlayed >= 2) {
      // Only include opponents with at least 2 games
      const winRate = stats.wins / stats.gamesPlayed;
      rivals.push({
        ...stats,
        opponent,
        winRate,
      } as any);
    }
  });

  // Sort by worst win rate (lowest win rate = biggest rival)
  return rivals.sort((a: any, b: any) => a.winRate - b.winRate).slice(0, 5); // Return top 5 biggest rivals
}

export async function getPlayerRatingHistory(
  playerId: string,
  days: number = 30
): Promise<RatingHistoryPoint[]> {
  try {
    // Get current player rating to use as starting point
    const player = await getPlayerById(playerId);
    if (!player) return [];

    // Calculate date cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get ALL games for this player (using existing index)
    const games = await getGamesForPlayer(playerId);

    const ratingHistory: RatingHistoryPoint[] = [];

    // Filter games by date and extract rating history
    const recentGames = games.filter((game) => {
      const gameDate = new Date(game.date);
      return gameDate >= cutoffDate;
    });

    // Sort by date ascending
    recentGames.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (recentGames.length === 0) {
      // No recent games, show current rating
      ratingHistory.push({
        date: new Date().toISOString(),
        rating: player.rating,
        gameId: 'current',
        opponent: 'Current Rating',
      });
      return ratingHistory;
    }

    // Process games to build rating history
    recentGames.forEach((game) => {
      // Check if this game has rating changes recorded
      const gameData = game as any;
      const ratingChanges = gameData.ratingChanges;

      if (ratingChanges && ratingChanges[playerId]) {
        // Get opponent names for context
        const opponentIds = game.playerIds.filter((id: string) => id !== playerId);
        const opponentPlayers = [
          ...game.team1.players.filter((p) => p.id !== playerId),
          ...game.team2.players.filter((p) => p.id !== playerId),
        ];
        const opponentName =
          opponentPlayers.length > 0
            ? `vs ${opponentPlayers.map((p) => p.name).join(' & ')}`
            : 'Unknown opponent';

        ratingHistory.push({
          date: game.date,
          rating: ratingChanges[playerId].after,
          gameId: game.id,
          opponent: opponentName,
        });
      }
    });

    // If we have rating history from games with ratingChanges, add starting point
    if (ratingHistory.length > 0) {
      const firstGame = recentGames[0] as any;
      const firstRatingChange = firstGame.ratingChanges?.[playerId];

      if (firstRatingChange) {
        ratingHistory.unshift({
          date: firstGame.date,
          rating: firstRatingChange.before,
          gameId: `${firstGame.id}-before`,
          opponent: 'Starting Rating',
        });
      }
    }

    // If no games have rating changes yet (old games), create a simple current rating point
    if (ratingHistory.length === 0) {
      ratingHistory.push({
        date: new Date().toISOString(),
        rating: player.rating,
        gameId: 'current',
        opponent: 'Current Rating',
      });
    }

    return ratingHistory;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getPlayerRatingHistory');
    return [];
  }
}

// Tournament-related functions
export async function getTournaments(clubId?: string): Promise<Tournament[]> {
  try {
    const tournamentsCollection = collection(db, 'tournaments');
    const q = clubId
      ? query(tournamentsCollection, where('clubId', '==', clubId), orderBy('createdDate', 'desc'))
      : query(tournamentsCollection, orderBy('createdDate', 'desc'));

    const tournamentsSnapshot = await getDocs(q);
    return tournamentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Tournament[];
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getTournaments');
    return [];
  }
}

export async function getTournamentById(tournamentId: string): Promise<Tournament | null> {
  try {
    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (tournamentDoc.exists()) {
      return { id: tournamentDoc.id, ...tournamentDoc.data() } as Tournament;
    }
    return null;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getTournamentById');
    return null;
  }
}

export async function getTournamentsByStatus(status: Tournament['status'], clubId?: string): Promise<Tournament[]> {
  try {
    const tournamentsCollection = collection(db, 'tournaments');
    const q = clubId
      ? query(tournamentsCollection, where('clubId', '==', clubId))
      : tournamentsCollection;
    const tournamentsSnapshot = await getDocs(q);

    if (tournamentsSnapshot.empty) {
      return [];
    }

    const allTournaments = tournamentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Tournament[];

    // Filter by status and sort by creation date (newest first)
    return allTournaments
      .filter((tournament) => tournament.status === status)
      .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  } catch (error) {
    console.warn(`Error getting tournaments by status ${status}:`, error);
    logError(error instanceof Error ? error : new Error(String(error)), 'getTournamentsByStatus');
    return [];
  }
}

export async function getTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
  try {
    // Get all matches for tournament and sort in memory (simpler for development)
    const matchesSnapshot = await getDocs(
      query(collection(db, 'tournamentMatches'), where('tournamentId', '==', tournamentId))
    );

    const allMatches = matchesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TournamentMatch[];

    // Sort by round, then by match number
    return allMatches.sort((a, b) => {
      if (a.round !== b.round) {
        return a.round - b.round;
      }
      return a.matchNumber - b.matchNumber;
    });
  } catch (error) {
    console.warn(`Error getting tournament matches for ${tournamentId}:`, error);
    logError(error instanceof Error ? error : new Error(String(error)), 'getTournamentMatches');
    return [];
  }
}

export async function getTournamentMatchById(matchId: string): Promise<TournamentMatch | null> {
  try {
    const matchDoc = await getDoc(doc(db, 'tournamentMatches', matchId));
    if (!matchDoc.exists()) {
      return null;
    }
    return { id: matchDoc.id, ...matchDoc.data() } as TournamentMatch;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getTournamentMatchById');
    return null;
  }
}

export async function getTournamentStandings(tournamentId: string): Promise<TournamentStanding[]> {
  try {
    const tournament = await getTournamentById(tournamentId);
    if (!tournament) return [];

    const standings: TournamentStanding[] = [];

    // Get all tournament games and matches
    const [tournamentGames, tournamentMatches] = await Promise.all([
      getDocs(query(collection(db, 'games'), where('tournamentId', '==', tournamentId))),
      getDocs(query(collection(db, 'tournamentMatches'), where('tournamentId', '==', tournamentId)))
    ]);

    // Calculate standings for each registered player
    for (const playerId of tournament.playerIds) {
      const player = await getPlayerById(playerId);
      if (!player) continue;

      let scheduledGames = 0;
      let gamesPlayed = 0;
      let wins = 0;
      let losses = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;

      // Count scheduled games from tournament matches
      tournamentMatches.forEach((matchDoc) => {
        const match = { id: matchDoc.id, ...matchDoc.data() } as TournamentMatch;
        
        // Check if this player is in this match (singles or doubles)
        const isInMatch = 
          match.player1Id === playerId ||
          match.player2Id === playerId ||
          (match.team1PlayerIds && match.team1PlayerIds.includes(playerId)) ||
          (match.team2PlayerIds && match.team2PlayerIds.includes(playerId));
          
        if (isInMatch) {
          scheduledGames++;
        }
      });

      tournamentGames.forEach((gameDoc) => {
        const game = { id: gameDoc.id, ...gameDoc.data() } as Game;

        // Check if this player participated in this game
        if (game.playerIds.includes(playerId)) {
          gamesPlayed++;

          const playerTeam = game.team1.playerIds.includes(playerId) ? game.team1 : game.team2;
          const opponentTeam = game.team1.playerIds.includes(playerId) ? game.team2 : game.team1;

          pointsFor += playerTeam.score;
          pointsAgainst += opponentTeam.score;

          if (playerTeam.score > opponentTeam.score) {
            wins++;
          } else {
            losses++;
          }
        }
      });

      standings.push({
        playerId,
        player,
        scheduledGames,
        gamesPlayed,
        wins,
        losses,
        pointsFor,
        pointsAgainst,
        pointsDifference: pointsFor - pointsAgainst,
        winPercentage: gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0,
      });
    }

    // Sort by win percentage, then by points difference
    return standings.sort((a, b) => {
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      return b.pointsDifference - a.pointsDifference;
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getTournamentStandings');
    return [];
  }
}

// Real-time tournament listeners for instant updates
export function subscribeTournamentsRealtime(
  callback: (tournaments: { active: Tournament[]; completed: Tournament[] }) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    // Set up real-time listener for all tournaments
    const unsubscribe = onSnapshot(
      query(collection(db, 'tournaments'), orderBy('createdDate', 'desc')),
      (snapshot) => {
        try {
          const allTournaments = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Tournament[];

          // Split into active and completed with no caching
          const active = allTournaments
            .filter((tournament) => tournament.status === 'active')
            .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

          const completed = allTournaments
            .filter((tournament) => tournament.status === 'completed')
            .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

          callback({ active, completed });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logError(err, 'subscribeTournamentsRealtime-callback');
          onError?.(err);
        }
      },
      (error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        logError(err, 'subscribeTournamentsRealtime-listener');
        onError?.(err);
      }
    );

    return unsubscribe;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(err, 'subscribeTournamentsRealtime');
    onError?.(err);
    return () => {}; // Return empty unsubscribe function
  }
}

// Form Metric Calculation

interface GameAnalysis {
  result: 'win' | 'loss' | 'draw';
  opponentAvgRating: number;
  scoreMargin: number;
  playerScore: number;
  opponentScore: number;
}

function analyzeGameForPlayer(
  game: Game,
  playerId: string,
  playerCurrentRating: number
): GameAnalysis {
  // Determine which team the player was on
  const isTeam1 = game.team1.playerIds.includes(playerId);
  const playerTeam = isTeam1 ? game.team1 : game.team2;
  const opponentTeam = isTeam1 ? game.team2 : game.team1;

  // Get ratings at time of game (from ratingChanges if available)
  const getPlayerRatingAtGame = (pid: string): number => {
    if (game.ratingChanges?.[pid]?.before) {
      return game.ratingChanges[pid].before;
    }
    // Fallback: use current rating (less accurate but better than nothing)
    return playerCurrentRating;
  };

  // Calculate opponent average rating
  const opponentRatings = opponentTeam.playerIds.map(getPlayerRatingAtGame);
  const opponentAvgRating = opponentRatings.reduce((sum, r) => sum + r, 0) / opponentRatings.length;

  // Determine result
  const playerScore = playerTeam.score;
  const opponentScore = opponentTeam.score;
  let result: 'win' | 'loss' | 'draw';

  if (playerScore > opponentScore) result = 'win';
  else if (playerScore < opponentScore) result = 'loss';
  else result = 'draw';

  // Calculate score margin (absolute difference)
  const scoreMargin = Math.abs(playerScore - opponentScore);

  return {
    result,
    opponentAvgRating,
    scoreMargin,
    playerScore,
    opponentScore
  };
}

/**
 * Calculate quality multiplier for form scoring
 * - For wins: Higher multiplier when beating stronger opponents
 * - For losses: Higher multiplier (penalty) when losing to weaker opponents
 */
function getQualityMultiplier(
  playerRating: number,
  opponentAvgRating: number,
  isWin: boolean
): number {
  const ratingDiff = opponentAvgRating - playerRating;

  if (isWin) {
    // WINS: Beating stronger opponents = higher multiplier
    // Examples (player rating 4.0):
    //   - Beat 5.0 opponent: diff = +1.0 → multiplier = 1.25 (25% bonus)
    //   - Beat 4.0 opponent: diff = 0.0  → multiplier = 1.00 (normal)
    //   - Beat 3.0 opponent: diff = -1.0 → multiplier = 0.75 (25% reduction)
    const multiplier = 1.0 + (ratingDiff * 0.25);
    return Math.max(0.5, Math.min(1.5, multiplier));
  } else {
    // LOSSES: Losing to weaker opponents = higher penalty
    // Examples (player rating 4.0):
    //   - Lost to 5.0 opponent: diff = +1.0 → multiplier = 0.75 (25% reduction in penalty)
    //   - Lost to 4.0 opponent: diff = 0.0  → multiplier = 1.00 (normal penalty)
    //   - Lost to 3.0 opponent: diff = -1.0 → multiplier = 1.25 (25% INCREASE in penalty)
    const multiplier = 1.0 - (ratingDiff * 0.25);
    return Math.max(0.5, Math.min(1.5, multiplier));
  }
}

export function calculatePlayerForm(
  playerId: string,
  allGames: Game[],
  playerRating: number
): FormMetric {
  const WINDOW_SIZE = 10;

  // Get player's recent games (sorted by date desc - already sorted from getAllGames)
  const recentGames = allGames
    .filter(g => g.playerIds.includes(playerId))
    .slice(0, WINDOW_SIZE);

  if (recentGames.length === 0) {
    return {
      score: 50,
      trend: 'neutral',
      recentWins: 0,
      recentLosses: 0,
      recentDraws: 0,
      winRate: 0,
      qualityScore: 0,
      gamesPlayed: 0
    };
  }

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let qualityPoints = 0;

  for (const game of recentGames) {
    const analysis = analyzeGameForPlayer(game, playerId, playerRating);

    // Skip draws (contribute 0 points)
    if (analysis.result === 'draw') {
      draws++;
      continue;
    }

    const isWin = analysis.result === 'win';

    // Base points: +1 for win, -1 for loss
    const basePoints = isWin ? 1 : -1;

    // Quality multiplier: uses OPPOSITE logic for wins vs losses
    // - Wins: Higher multiplier when beating stronger opponents
    // - Losses: Higher multiplier (penalty) when losing to weaker opponents
    const qualityMultiplier = getQualityMultiplier(
      playerRating,
      analysis.opponentAvgRating,
      isWin
    );

    // Margin factor: bigger wins/losses have more impact
    // Range: 0.7 (close game) to 1.0 (blowout)
    const marginFactor = 0.7 + Math.min(analysis.scoreMargin / 10, 0.3);

    // Combined game score
    const gameScore = basePoints * qualityMultiplier * marginFactor;

    qualityPoints += gameScore;

    if (isWin) wins++;
    else losses++;
  }

  // Calculate form score
  const winRate = (wins / recentGames.length) * 100;
  const avgQualityPerGame = qualityPoints / recentGames.length;

  // Form score: baseline 50 + quality-adjusted performance
  // avgQualityPerGame ranges roughly from -2 to +2
  // Scale by 25 to get score range of 0-100
  const formScore = Math.max(0, Math.min(100, 50 + avgQualityPerGame * 25));

  // Determine trend
  let trend: 'up' | 'neutral' | 'down' = 'neutral';
  if (formScore >= 65) trend = 'up';
  else if (formScore <= 35) trend = 'down';

  return {
    score: Math.round(formScore),
    trend,
    recentWins: wins,
    recentLosses: losses,
    recentDraws: draws,
    winRate: Math.round(winRate),
    qualityScore: avgQualityPerGame,
    gamesPlayed: recentGames.length
  };
}
