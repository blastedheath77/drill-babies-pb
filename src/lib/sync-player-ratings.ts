// Script to sync player ratings with their final rating from game history
import { collection, getDocs, writeBatch, doc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { logError } from './errors';

export async function syncPlayerRatings(): Promise<void> {
  console.log('Syncing player ratings with game history...');

  try {
    // Get all players
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players: { [id: string]: any } = {};

    playersSnapshot.forEach((doc) => {
      players[doc.id] = { id: doc.id, ...doc.data() };
    });

    console.log(`Found ${Object.keys(players).length} players`);

    // Get all games ordered by date (most recent first to get final ratings)
    const gamesSnapshot = await getDocs(query(collection(db, 'games'), orderBy('date', 'desc')));

    if (gamesSnapshot.empty) {
      console.log('No games found.');
      return;
    }

    // Track the most recent rating for each player
    const finalRatings: { [playerId: string]: number } = {};

    // Process games from most recent to oldest, capturing the latest rating for each player
    gamesSnapshot.docs.forEach((gameDoc) => {
      const gameData = gameDoc.data();
      const ratingChanges = gameData.ratingChanges;

      if (ratingChanges) {
        Object.keys(ratingChanges).forEach((playerId) => {
          // Only set if we haven't seen this player yet (most recent game)
          if (!finalRatings.hasOwnProperty(playerId)) {
            finalRatings[playerId] = ratingChanges[playerId].after;
          }
        });
      }
    });

    console.log('Final ratings from game history:');
    Object.entries(finalRatings).forEach(([playerId, rating]) => {
      const playerName = players[playerId]?.name || playerId;
      const currentRating = players[playerId]?.rating || 'unknown';
      console.log(`  ${playerName}: ${currentRating} → ${rating.toFixed(2)}`);
    });

    // Update player documents with correct ratings
    const batch = writeBatch(db);
    let updated = 0;

    Object.entries(finalRatings).forEach(([playerId, finalRating]) => {
      const currentRating = players[playerId]?.rating;

      if (currentRating !== finalRating) {
        batch.update(doc(db, 'players', playerId), {
          rating: finalRating,
        });
        updated++;
      }
    });

    if (updated > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updated} player ratings to match game history.`);
    } else {
      console.log('All player ratings were already in sync.');
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'syncPlayerRatings');
    throw error;
  }
}
