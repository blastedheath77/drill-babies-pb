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
}): Promise<{ success: boolean; playerId?: string; error?: string }> {
  try {
    const newPlayer: Omit<Player, 'id'> = {
      name: playerData.name.trim(),
      avatar: playerData.avatar || DEFAULT_AVATAR_URL,
      rating: DEFAULT_RATING,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
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