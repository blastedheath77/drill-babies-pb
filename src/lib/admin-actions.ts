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

export async function deletePlayer(playerId: string, forceDelete: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if player exists in any games
    const gamesQuery = query(
      collection(db, 'games'),
      where('playerIds', 'array-contains', playerId)
    );
    const gamesSnapshot = await getDocs(gamesQuery);
    
    if (!gamesSnapshot.empty && !forceDelete) {
      return {
        success: false,
        error: `Cannot delete player: they have ${gamesSnapshot.docs.length} recorded game(s). Delete their games first.`
      };
    }

    // If force delete is enabled, delete all games first
    if (!gamesSnapshot.empty && forceDelete) {
      const batch = writeBatch(db);
      
      // Delete all games for this player
      gamesSnapshot.docs.forEach((gameDoc) => {
        batch.delete(doc(db, 'games', gameDoc.id));
      });
      
      // Also check tournament matches that might reference this player
      const tournamentMatchesQuery = query(
        collection(db, 'tournamentMatches'),
        where('playerIds', 'array-contains', playerId)
      );
      const tournamentMatchesSnapshot = await getDocs(tournamentMatchesQuery);
      
      tournamentMatchesSnapshot.docs.forEach((matchDoc) => {
        batch.delete(doc(db, 'tournamentMatches', matchDoc.id));
      });
      
      await batch.commit();
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
    const newPlayer = {
      name: playerData.name.trim(),
      avatar: playerData.avatar || DEFAULT_AVATAR_URL,
      rating: DEFAULT_RATING,
      wins: 0,
      losses: 0,
      draws: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      ...(playerData.gender && { gender: playerData.gender }),
    };

    const docRef = await addDoc(collection(db, 'players'), newPlayer);
    
    return { 
      success: true, 
      playerId: docRef.id 
    };
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'createPlayer');
    return { 
      success: false, 
      error: 'Failed to create player. Please try again.' 
    };
  }
}

export async function deleteGame(gameId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the game data first to update player stats
    const gameDoc = await getDoc(doc(db, 'games', gameId));
    
    if (!gameDoc.exists()) {
      return { success: false, error: 'Game not found.' };
    }

    const gameData = { id: gameDoc.id, ...gameDoc.data() } as Game;
    
    // Create batch to update player stats and delete game
    const batch = writeBatch(db);
    
    // Delete the game
    batch.delete(doc(db, 'games', gameId));
    
    // Update player statistics (reverse the game effects)
    for (const playerId of gameData.playerIds) {
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await getDoc(playerRef);
      
      if (playerDoc.exists()) {
        const playerData = playerDoc.data() as Player;
        
        // Determine which team this player was on
        const playerTeam = gameData.team1.playerIds.includes(playerId) ? gameData.team1 : gameData.team2;
        const opponentTeam = gameData.team1.playerIds.includes(playerId) ? gameData.team2 : gameData.team1;
        
        const wasWinner = playerTeam.score > opponentTeam.score;
        
        // Get the original rating before this game (if rating changes were tracked)
        let revertedRating = playerData.rating;
        if (gameData.ratingChanges && gameData.ratingChanges[playerId]) {
          // Use the "before" rating from when the game was logged
          revertedRating = gameData.ratingChanges[playerId].before;
        }
        
        // Reverse the stats including rating
        const updatedStats = {
          wins: Math.max(0, playerData.wins - (wasWinner ? 1 : 0)),
          losses: Math.max(0, playerData.losses - (wasWinner ? 0 : 1)),
          pointsFor: Math.max(0, playerData.pointsFor - playerTeam.score),
          pointsAgainst: Math.max(0, playerData.pointsAgainst - opponentTeam.score),
          rating: revertedRating,
        };
        
        batch.update(playerRef, updatedStats);
      }
    }
    
    // Check if this game is part of a tournament and remove the reference
    if (gameData.tournamentId) {
      const tournamentMatchesQuery = query(
        collection(db, 'tournamentMatches'),
        where('gameId', '==', gameId)
      );
      const matchesSnapshot = await getDocs(tournamentMatchesQuery);
      
      matchesSnapshot.forEach((matchDoc) => {
        batch.update(doc(db, 'tournamentMatches', matchDoc.id), {
          gameId: null,
          status: 'pending'
        });
      });
    }
    
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'deleteGame');
    return { 
      success: false, 
      error: 'Failed to delete game. Please try again.' 
    };
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