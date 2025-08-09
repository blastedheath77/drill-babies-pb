// Script to sync all player stats (rating, wins, losses, points) with actual game history
import { collection, getDocs, writeBatch, doc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { logError } from './errors';
import type { Game, Player } from './types';

interface PlayerStats {
  rating: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

export async function syncAllPlayerStats(): Promise<void> {
  console.log('Syncing all player stats with game history...');

  try {
    // Get all players
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players: { [id: string]: Player } = {};

    playersSnapshot.forEach((doc) => {
      players[doc.id] = { id: doc.id, ...doc.data() } as Player;
    });

    console.log(`Found ${Object.keys(players).length} players`);

    // Initialize stats for all players
    const playerStats: { [playerId: string]: PlayerStats } = {};
    Object.keys(players).forEach((playerId) => {
      playerStats[playerId] = {
        rating: 3.5, // Default starting rating
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };
    });

    // Get all games ordered by date (oldest first) to process chronologically
    const gamesSnapshot = await getDocs(query(collection(db, 'games'), orderBy('date', 'asc')));

    if (gamesSnapshot.empty) {
      console.log('No games found.');
      return;
    }

    console.log(`Processing ${gamesSnapshot.size} games chronologically...`);

    // Process each game to accumulate stats
    gamesSnapshot.docs.forEach((gameDoc, index) => {
      const gameData = gameDoc.data();

      console.log(`Processing game ${index + 1}/${gamesSnapshot.size}`);

      // Extract game info
      const team1PlayerIds = gameData.team1.playerIds;
      const team2PlayerIds = gameData.team2.playerIds;
      const team1Score = gameData.team1.score;
      const team2Score = gameData.team2.score;
      const team1Won = team1Score > team2Score;

      // Update wins/losses and points for all players in this game
      [...team1PlayerIds, ...team2PlayerIds].forEach((playerId) => {
        if (playerStats[playerId]) {
          const isTeam1 = team1PlayerIds.includes(playerId);
          const playerScore = isTeam1 ? team1Score : team2Score;
          const opponentScore = isTeam1 ? team2Score : team1Score;
          const playerWon = (isTeam1 && team1Won) || (!isTeam1 && !team1Won);

          // Update stats
          if (playerWon) {
            playerStats[playerId].wins++;
          } else {
            playerStats[playerId].losses++;
          }

          playerStats[playerId].pointsFor += playerScore;
          playerStats[playerId].pointsAgainst += opponentScore;
        }
      });

      // Update ratings from ratingChanges if available
      const ratingChanges = gameData.ratingChanges;
      if (ratingChanges) {
        Object.entries(ratingChanges).forEach(([playerId, changes]) => {
          if (playerStats[playerId]) {
            playerStats[playerId].rating = (changes as any).after;
          }
        });
      }
    });

    // Display the recalculated stats
    console.log('\nRecalculated stats from game history:');
    Object.entries(playerStats).forEach(([playerId, stats]) => {
      const playerName = players[playerId]?.name || playerId;
      const current = players[playerId];
      console.log(`${playerName}:`);
      console.log(`  Rating: ${current?.rating?.toFixed(2) || 'N/A'} → ${stats.rating.toFixed(2)}`);
      console.log(
        `  Record: ${current?.wins || 0}/${current?.losses || 0} → ${stats.wins}/${stats.losses}`
      );
      console.log(
        `  Points: ${current?.pointsFor || 0}/${current?.pointsAgainst || 0} → ${stats.pointsFor}/${stats.pointsAgainst}`
      );
      console.log('');
    });

    // Update all player documents
    const batch = writeBatch(db);
    let updated = 0;

    Object.entries(playerStats).forEach(([playerId, stats]) => {
      const current = players[playerId];

      // Check if any stats need updating
      const needsUpdate =
        !current ||
        current.rating !== stats.rating ||
        current.wins !== stats.wins ||
        current.losses !== stats.losses ||
        current.pointsFor !== stats.pointsFor ||
        current.pointsAgainst !== stats.pointsAgainst;

      if (needsUpdate) {
        batch.update(doc(db, 'players', playerId), {
          rating: stats.rating,
          wins: stats.wins,
          losses: stats.losses,
          pointsFor: stats.pointsFor,
          pointsAgainst: stats.pointsAgainst,
        });
        updated++;
      }
    });

    if (updated > 0) {
      await batch.commit();
      console.log(`Successfully updated stats for ${updated} players.`);
      console.log('All player stats now match their actual game history!');
    } else {
      console.log('All player stats were already in sync.');
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'syncAllPlayerStats');
    throw error;
  }
}
