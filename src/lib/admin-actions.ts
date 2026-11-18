import {
  collection,
  doc,
  deleteDoc,
  addDoc,
  writeBatch,
  query,
  where,
  getDocs,
  serverTimestamp,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Player, Game } from './types';
import { DEFAULT_RATING, DEFAULT_AVATAR_URL } from './constants';
import { logError } from './errors';
import { getIdToken } from './id-token';
import { addPlayer } from '@/app/players/add/actions';
import { removeGame } from '@/app/log-game/actions';

export async function deletePlayer(playerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if player exists in any games
    const gamesQuery = query(
      collection(db, 'games'),
      where('playerIds', 'array-contains', playerId)
    );
    const gamesSnapshot = await getDocs(gamesQuery);
    
    if (!gamesSnapshot.empty) {
      return {
        success: false,
        error: `Cannot delete player: they have ${gamesSnapshot.docs.length} recorded game(s). Exclude them from rankings instead, or delete their games first.`
      };
    }

    // Check if player exists in any tournament
    const tournamentsQuery = query(
      collection(db, 'tournaments'),
      where('playerIds', 'array-contains', playerId)
    );
    const tournamentsSnapshot = await getDocs(tournamentsQuery);
    
    if (!tournamentsSnapshot.empty) {
      return {
        success: false,
        error: 'Cannot delete player: they are registered in active tournaments.'
      };
    }

    // Delete the player
    await deleteDoc(doc(db, 'players', playerId));
    
    return { success: true };
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'deletePlayer');
    return { 
      success: false, 
      error: 'Failed to delete player. Please try again.' 
    };
  }
}

export async function createPlayer(playerData: {
  name: string;
  email?: string;
  avatar?: string;
  gender?: 'he' | 'she' | 'they';
}): Promise<{ success: boolean; playerId?: string; error?: string }> {
  try {
    const result = await addPlayer(await getIdToken(), { name: playerData.name, gender: playerData.gender });
    return { success: true, playerId: result.playerId };
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'createPlayer');
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create player.' };
  }
}

/** Deletes a game on the server and replays ratings for every later game. */
export async function deleteGame(gameId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await removeGame(await getIdToken(), gameId);
    return { success: true };
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'deleteGame');
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete game.' };
  }
}

export async function getPlayersWithGameCount(): Promise<Array<Player & { gameCount: number }>> {
  try {
    // Get all players
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Player);
    
    // Get game counts for each player
    const playersWithGameCount = await Promise.all(
      players.map(async (player) => {
        const gamesQuery = query(
          collection(db, 'games'),
          where('playerIds', 'array-contains', player.id)
        );
        const gamesSnapshot = await getDocs(gamesQuery);
        
        return {
          ...player,
          gameCount: gamesSnapshot.docs.length
        };
      })
    );
    
    return playersWithGameCount.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getPlayersWithGameCount');
    return [];
  }
}

export async function getAllGamesWithPlayerNames(): Promise<Array<Game & { 
  team1Names: string[];
  team2Names: string[]; 
  canDelete: boolean;
}>> {
  try {
    // Get all games
    const gamesSnapshot = await getDocs(collection(db, 'games'));
    const games = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Game);
    
    // Get all player names
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const playerMap = new Map<string, string>();
    playersSnapshot.docs.forEach(doc => {
      const playerData = doc.data() as Player;
      playerMap.set(doc.id, playerData.name);
    });
    
    // Enhance games with player names
    const enhancedGames = games.map(game => ({
      ...game,
      team1Names: game.team1.playerIds.map(id => playerMap.get(id) || 'Unknown Player'),
      team2Names: game.team2.playerIds.map(id => playerMap.get(id) || 'Unknown Player'),
      canDelete: !game.tournamentId, // Can't delete tournament games
    }));
    
    // Sort by date (newest first)
    return enhancedGames.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getAllGamesWithPlayerNames');
    return [];
  }
}

export async function updatePlayerDuprId(
  playerId: string,
  duprId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!playerId) {
      return { success: false, error: 'Player ID is required' };
    }

    const playerRef = doc(db, 'players', playerId);
    await updateDoc(playerRef, {
      duprId: duprId || null,
    });

    return { success: true };
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'updatePlayerDuprId');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update DUPR ID',
    };
  }
}

export async function updatePlayerGender(
  playerId: string,
  gender: 'he' | 'she' | 'they' | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!playerId) {
      return { success: false, error: 'Player ID is required' };
    }

    const playerRef = doc(db, 'players', playerId);
    await updateDoc(playerRef, {
      gender: gender || null,
    });

    return { success: true };
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'updatePlayerGender');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update gender',
    };
  }
}

const maleFirstNames = new Set([
  'james', 'john', 'robert', 'david', 'michael', 'william', 'andrew', 'mark', 'peter', 'paul',
  'stephen', 'richard', 'neil', 'colin', 'alan', 'brian', 'kevin', 'simon', 'martin', 'philip',
  'tony', 'rob', 'tom', 'dave', 'craig', 'grant', 'gary', 'barry', 'ross', 'lee', 'dean', 'wayne',
  'luke', 'ben', 'harry', 'charlie', 'oliver', 'noah', 'max', 'theo', 'oscar', 'finlay', 'callum',
  'malcolm', 'rory', 'angus', 'lachlan', 'iain', 'ewan', 'graeme', 'gordon', 'fraser', 'fergus',
  'hamish', 'alastair', 'alasdair', 'ruairidh', 'dougal', 'ruari', 'calum', 'donal', 'ramsay',
  'lennox', 'glen', 'ian', 'alistair', 'jon', 'dan', 'sam', 'joe', 'bob', 'andy', 'adam', 'josh',
  'jake', 'liam', 'ethan', 'lewis', 'ryan', 'sean', 'owen', 'lloyd', 'tim', 'nick', 'scott', 'alex',
  'chris', 'matt', 'greg', 'steve', 'mike', 'phil', 'eric', 'derek', 'nigel', 'clive', 'darren',
  'graham', 'gavin',
]);

const femaleFirstNames = new Set([
  'mary', 'patricia', 'jennifer', 'linda', 'barbara', 'elizabeth', 'susan', 'jessica', 'sarah',
  'karen', 'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily',
  'donna', 'michelle', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon',
  'laura', 'helen', 'samantha', 'katherine', 'christine', 'rachel', 'janet', 'catherine', 'maria',
  'heather', 'diane', 'julie', 'victoria', 'kelly', 'christina', 'evelyn', 'kathryn', 'alice',
  'teresa', 'sara', 'janice', 'julia', 'grace', 'judy', 'charlotte', 'amber', 'claire', 'abigail',
  'sophie', 'ella', 'chloe', 'lucy', 'eleanor', 'isobel', 'isla', 'fiona', 'morag', 'eilidh',
  'catriona', 'kirsty', 'aileen', 'anne', 'elspeth', 'mairi', 'rhona', 'shona', 'alison', 'lesley',
  'lindsay', 'lorraine', 'pamela', 'gillian', 'tracey', 'jackie', 'pauline', 'elaine', 'sheila',
  'cathleen', 'marie', 'siobhan', 'niamh', 'aisling', 'orla', 'sinead', 'aoife', 'maeve', 'brigid',
  'nora', 'bridget', 'zoe', 'holly', 'imogen', 'poppy', 'bella', 'freya', 'phoebe', 'rose', 'ruby',
  'natasha', 'natalie', 'tara', 'leah', 'stacey', 'jade', 'gemma', 'hayley', 'louise', 'joanne',
  'jo', 'kat', 'kate', 'katie', 'liz', 'beth', 'sue', 'jan', 'wendy', 'penny', 'polly', 'sandy',
  'pat', 'maggie', 'milly', 'millie', 'lottie', 'rosie', 'nicola', 'iona', 'emma', 'anna', 'eva',
  'tina', 'ingrid', 'andrea', 'frances', 'kathleen', 'joan', 'gloria', 'jean', 'diana', 'doris',
  'cheryl', 'megan', 'martha', 'jacqueline', 'ann', 'olga', 'yvonne', 'caroline', 'lynne', 'lynda',
  'jill', 'debbie', 'mandy', 'vera',
]);

export async function bulkAutoDetectGender(): Promise<{
  success: boolean;
  updated: number;
  skipped: number;
  error?: string;
}> {
  try {
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players = playersSnapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as { name: string; gender?: string }),
    }));

    const updates: { id: string; gender: 'he' | 'she' }[] = [];

    for (const player of players) {
      if (player.gender) continue; // Already has gender set

      const firstName = player.name.trim().split(/\s+/)[0].toLowerCase();
      if (maleFirstNames.has(firstName)) {
        updates.push({ id: player.id, gender: 'he' });
      } else if (femaleFirstNames.has(firstName)) {
        updates.push({ id: player.id, gender: 'she' });
      }
      // else: ambiguous/unknown — skip
    }

    // Write in batches of 499
    const BATCH_SIZE = 499;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = updates.slice(i, i + BATCH_SIZE);
      for (const { id, gender } of chunk) {
        batch.update(doc(db, 'players', id), { gender });
      }
      await batch.commit();
    }

    return {
      success: true,
      updated: updates.length,
      skipped: players.filter((p) => !p.gender).length - updates.length,
    };
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'bulkAutoDetectGender');
    return {
      success: false,
      updated: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : 'Failed to auto-detect gender',
    };
  }
}

export async function togglePlayerRankingExclusion(
  playerId: string,
  exclude: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!playerId) {
      return {
        success: false,
        error: 'Player ID is required'
      };
    }

    const playerRef = doc(db, 'players', playerId);
    await updateDoc(playerRef, {
      excludeFromRankings: exclude
    });

    return { success: true };
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'togglePlayerRankingExclusion');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update player ranking exclusion'
    };
  }
}