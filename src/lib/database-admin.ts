'use server';

import {
  collection,
  doc,
  getDocs,
  writeBatch,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_RATING, DEFAULT_AVATAR_URL } from './constants';
import { logger } from './logger';

/**
 * DANGEROUS: Completely wipe the database clean
 * Only use this for fixing corrupted data
 */
export async function nukeDatabaseCompletely(): Promise<{ success: boolean; message: string }> {
  try {
    logger.warn('Starting complete database wipe...');
    
    // Delete all players
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const playerDeletes = playersSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(playerDeletes);
    
    // Delete all games  
    const gamesSnapshot = await getDocs(collection(db, 'games'));
    const gameDeletes = gamesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(gameDeletes);
    
    // Delete all tournaments
    const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
    const tournamentDeletes = tournamentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(tournamentDeletes);
    
    // Delete all tournament matches
    const matchesSnapshot = await getDocs(collection(db, 'tournamentMatches'));
    const matchDeletes = matchesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(matchDeletes);

    logger.info('Database completely wiped clean');
    return { 
      success: true, 
      message: `Database wiped: ${playersSnapshot.size} players, ${gamesSnapshot.size} games deleted` 
    };
  } catch (error) {
    logger.error('Failed to wipe database:', error);
    return { success: false, message: `Failed to wipe database: ${error}` };
  }
}

/**
 * Remove duplicate players by name (keeps the first one found)
 */
export async function deduplicatePlayers(): Promise<{ success: boolean; message: string }> {
  try {
    logger.info('Starting player deduplication...');
    
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const seenNames = new Set<string>();
    const duplicates: string[] = [];
    
    for (const player of players) {
      const name = (player.name as string).toLowerCase().trim();
      if (seenNames.has(name)) {
        duplicates.push(player.id);
      } else {
        seenNames.add(name);
      }
    }
    
    // Delete duplicates
    const deletePromises = duplicates.map(id => deleteDoc(doc(db, 'players', id)));
    await Promise.all(deletePromises);
    
    logger.info(`Removed ${duplicates.length} duplicate players`);
    return { 
      success: true, 
      message: `Removed ${duplicates.length} duplicate players. Kept ${seenNames.size} unique players.` 
    };
  } catch (error) {
    logger.error('Failed to deduplicate players:', error);
    return { success: false, message: `Failed to deduplicate: ${error}` };
  }
}

/**
 * Check if a player with this name already exists
 */
async function playerExistsByName(name: string): Promise<boolean> {
  const normalizedName = name.toLowerCase().trim();
  const q = query(
    collection(db, 'players'), 
    where('nameLower', '==', normalizedName),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Safely add a player with uniqueness check
 */
export async function safeAddPlayer(playerData: {
  name: string;
  rating?: number;
  wins?: number;
  losses?: number;
  pointsFor?: number;
  pointsAgainst?: number;
}): Promise<{ success: boolean; playerId?: string; message: string }> {
  try {
    const normalizedName = playerData.name.toLowerCase().trim();
    
    // Check if player already exists
    if (await playerExistsByName(playerData.name)) {
      return { 
        success: false, 
        message: `Player "${playerData.name}" already exists` 
      };
    }
    
    // Add player with normalized name field for uniqueness
    const docRef = await addDoc(collection(db, 'players'), {
      name: playerData.name.trim(),
      nameLower: normalizedName, // For uniqueness queries
      avatar: DEFAULT_AVATAR_URL,
      rating: playerData.rating ?? DEFAULT_RATING,
      wins: playerData.wins ?? 0,
      losses: playerData.losses ?? 0,
      pointsFor: playerData.pointsFor ?? 0,
      pointsAgainst: playerData.pointsAgainst ?? 0,
      createdAt: serverTimestamp(),
    });
    
    logger.info(`Player added: ${playerData.name} (${docRef.id})`);
    return { 
      success: true, 
      playerId: docRef.id, 
      message: `Player "${playerData.name}" added successfully` 
    };
  } catch (error) {
    logger.error('Failed to add player:', error);
    return { success: false, message: `Failed to add player: ${error}` };
  }
}

/**
 * Initialize database with clean seed data
 * Only runs if database is completely empty
 */
export async function initializeFreshDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if database has any players
    const playersSnapshot = await getDocs(query(collection(db, 'players'), limit(1)));
    if (!playersSnapshot.empty) {
      return { 
        success: false, 
        message: 'Database is not empty. Use nuke function first if you want to reset.' 
      };
    }
    
    logger.info('Initializing fresh database with seed data...');
    
    // Seed players with proper uniqueness
    const initialPlayers = [
      { name: 'Diana Miller', rating: 5.2, wins: 18, losses: 2, pointsFor: 350, pointsAgainst: 220 },
      { name: 'Alice Johnson', rating: 4.8, wins: 15, losses: 5, pointsFor: 330, pointsAgainst: 250 },
      { name: 'Bob Williams', rating: 4.2, wins: 12, losses: 8, pointsFor: 310, pointsAgainst: 280 },
      { name: 'Fiona Garcia', rating: 3.7, wins: 10, losses: 10, pointsFor: 300, pointsAgainst: 300 },
      { name: 'Charlie Brown', rating: 3.1, wins: 8, losses: 12, pointsFor: 280, pointsAgainst: 310 },
      { name: 'Ethan Davis', rating: 2.8, wins: 5, losses: 15, pointsFor: 250, pointsAgainst: 330 },
    ];
    
    const playerIds: string[] = [];
    for (const playerData of initialPlayers) {
      const result = await safeAddPlayer(playerData);
      if (result.success && result.playerId) {
        playerIds.push(result.playerId);
      }
    }
    
    // Add some initial games
    const batch = writeBatch(db);
    const games = [
      {
        type: 'Doubles',
        team1: { playerIds: [playerIds[0], playerIds[1]], score: 11 },
        team2: { playerIds: [playerIds[2], playerIds[3]], score: 7 },
      },
      {
        type: 'Singles', 
        team1: { playerIds: [playerIds[0]], score: 11 },
        team2: { playerIds: [playerIds[1]], score: 9 },
      },
      {
        type: 'Doubles',
        team1: { playerIds: [playerIds[1], playerIds[2]], score: 11 },
        team2: { playerIds: [playerIds[4], playerIds[5]], score: 5 },
      },
    ];
    
    games.forEach((game) => {
      const gameRef = doc(collection(db, 'games'));
      const allPlayerIds = [...game.team1.playerIds, ...game.team2.playerIds];
      batch.set(gameRef, {
        ...game,
        date: serverTimestamp(),
        playerIds: allPlayerIds,
      });
    });
    
    await batch.commit();
    
    logger.info(`Database initialized with ${playerIds.length} players and ${games.length} games`);
    return { 
      success: true, 
      message: `Database initialized with ${playerIds.length} players and ${games.length} games` 
    };
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    return { success: false, message: `Failed to initialize database: ${error}` };
  }
}

/**
 * Get database stats
 */
export async function getDatabaseStats(): Promise<{
  players: number;
  games: number;
  tournaments: number;
  duplicateNames: string[];
}> {
  try {
    const [playersSnapshot, gamesSnapshot, tournamentsSnapshot] = await Promise.all([
      getDocs(collection(db, 'players')),
      getDocs(collection(db, 'games')),
      getDocs(collection(db, 'tournaments'))
    ]);
    
    // Find duplicate names
    const playerNames = playersSnapshot.docs.map(doc => (doc.data().name as string).toLowerCase());
    const nameCount = playerNames.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const duplicateNames = Object.entries(nameCount)
      .filter(([_, count]) => count > 1)
      .map(([name, count]) => `${name} (${count})`);
    
    return {
      players: playersSnapshot.size,
      games: gamesSnapshot.size,
      tournaments: tournamentsSnapshot.size,
      duplicateNames
    };
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    return { players: 0, games: 0, tournaments: 0, duplicateNames: [] };
  }
}