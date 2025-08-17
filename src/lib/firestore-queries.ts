import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  documentId,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Player, Game, Tournament } from './types';
import { logger } from './logger';
import { FIRESTORE_BATCH_LIMIT } from './constants';

// Optimized player queries with pagination
export async function getPlayersWithPagination(params: {
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
  orderByField?: 'rating' | 'name' | 'wins';
  orderDirection?: 'asc' | 'desc';
}) {
  try {
    const {
      limit: queryLimit = 10,
      startAfter: startAfterDoc,
      orderByField = 'rating',
      orderDirection = 'desc',
    } = params;

    let playersQuery = query(
      collection(db, 'players'),
      orderBy(orderByField, orderDirection),
      limit(queryLimit)
    );

    if (startAfterDoc) {
      playersQuery = query(
        collection(db, 'players'),
        orderBy(orderByField, orderDirection),
        startAfter(startAfterDoc),
        limit(queryLimit)
      );
    }

    const snapshot = await getDocs(playersQuery);
    
    const players: Player[] = [];
    let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

    snapshot.docs.forEach((docSnap) => {
      players.push({ id: docSnap.id, ...docSnap.data() } as Player);
      lastDoc = docSnap;
    });

    return {
      players,
      lastDoc,
      hasMore: snapshot.docs.length === queryLimit,
    };
  } catch (error) {
    logger.error('Error fetching players with pagination', error);
    return {
      players: [],
      lastDoc: null,
      hasMore: false,
    };
  }
}

// Optimized recent games query with pagination
export async function getRecentGamesWithPagination(params: {
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
}) {
  try {
    const { limit: queryLimit = 10, startAfter: startAfterDoc } = params;

    let gamesQuery = query(
      collection(db, 'games'),
      orderBy('date', 'desc'),
      limit(queryLimit)
    );

    if (startAfterDoc) {
      gamesQuery = query(
        collection(db, 'games'),
        orderBy('date', 'desc'),
        startAfter(startAfterDoc),
        limit(queryLimit)
      );
    }

    const snapshot = await getDocs(gamesQuery);
    
    // Collect all unique player IDs for efficient batch fetching
    const allPlayerIds = new Set<string>();
    const gameDocsData = snapshot.docs.map((docSnap) => {
      const gameData = { id: docSnap.id, ...docSnap.data() } as any;
      if (gameData.playerIds) {
        gameData.playerIds.forEach((id: string) => allPlayerIds.add(id));
      }
      return gameData;
    });

    // Batch fetch all players
    const playerMap = await fetchPlayersByIdsBatch(Array.from(allPlayerIds));

    // Process games with player data
    const games = gameDocsData.map((gameData) => {
      const team1Players = gameData.team1.playerIds
        .map((id: string) => playerMap.get(id))
        .filter(Boolean) as Player[];
      const team2Players = gameData.team2.playerIds
        .map((id: string) => playerMap.get(id))
        .filter(Boolean) as Player[];

      return {
        ...gameData,
        date: gameData.date?.toDate?.()?.toISOString() || new Date().toISOString(),
        team1: { ...gameData.team1, players: team1Players },
        team2: { ...gameData.team2, players: team2Players },
      } as Game;
    });

    return {
      games,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === queryLimit,
    };
  } catch (error) {
    logger.error('Error fetching recent games with pagination', error);
    return {
      games: [],
      lastDoc: null,
      hasMore: false,
    };
  }
}

// Optimized batch player fetching to avoid N+1 queries
export async function fetchPlayersByIdsBatch(playerIds: string[]): Promise<Map<string, Player>> {
  const playerMap = new Map<string, Player>();
  
  if (playerIds.length === 0) {
    return playerMap;
  }

  try {
    // Split into batches of FIRESTORE_BATCH_LIMIT (max 30 for 'in' queries)
    const batches: string[][] = [];
    for (let i = 0; i < playerIds.length; i += FIRESTORE_BATCH_LIMIT) {
      batches.push(playerIds.slice(i, i + FIRESTORE_BATCH_LIMIT));
    }

    // Execute all batches in parallel
    const batchPromises = batches.map(async (batch) => {
      const playersSnapshot = await getDocs(
        query(collection(db, 'players'), where(documentId(), 'in', batch))
      );
      
      playersSnapshot.forEach((docSnap) => {
        playerMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Player);
      });
    });

    await Promise.all(batchPromises);
  } catch (error) {
    logger.error('Error batch fetching players', error);
  }

  return playerMap;
}

// Cached player lookup for frequently accessed data
const playerCache = new Map<string, { player: Player; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getPlayerByIdCached(playerId: string): Promise<Player | null> {
  // Check cache first
  const cached = playerCache.get(playerId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.player;
  }

  try {
    const playerDoc = await getDoc(doc(db, 'players', playerId));
    if (!playerDoc.exists()) {
      return null;
    }

    const player = { id: playerDoc.id, ...playerDoc.data() } as Player;
    
    // Update cache
    playerCache.set(playerId, {
      player,
      timestamp: Date.now(),
    });

    return player;
  } catch (error) {
    logger.error(`Error fetching player ${playerId}`, error);
    return null;
  }
}

// Tournament queries with optimization
export async function getTournamentsWithPagination(params: {
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
  status?: 'active' | 'completed';
}) {
  try {
    const { limit: queryLimit = 10, startAfter: startAfterDoc, status } = params;

    let tournamentsQuery = query(
      collection(db, 'tournaments'),
      orderBy('createdDate', 'desc'),
      limit(queryLimit)
    );

    if (status) {
      tournamentsQuery = query(
        collection(db, 'tournaments'),
        where('status', '==', status),
        orderBy('createdDate', 'desc'),
        limit(queryLimit)
      );
    }

    if (startAfterDoc) {
      tournamentsQuery = query(
        collection(db, 'tournaments'),
        orderBy('createdDate', 'desc'),
        startAfter(startAfterDoc),
        limit(queryLimit)
      );
    }

    const snapshot = await getDocs(tournamentsQuery);
    
    const tournaments: Tournament[] = [];
    let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

    snapshot.docs.forEach((docSnap) => {
      tournaments.push({ id: docSnap.id, ...docSnap.data() } as Tournament);
      lastDoc = docSnap;
    });

    return {
      tournaments,
      lastDoc,
      hasMore: snapshot.docs.length === queryLimit,
    };
  } catch (error) {
    logger.error('Error fetching tournaments with pagination', error);
    return {
      tournaments: [],
      lastDoc: null,
      hasMore: false,
    };
  }
}

// Clear caches when needed
export function clearPlayerCache() {
  playerCache.clear();
}