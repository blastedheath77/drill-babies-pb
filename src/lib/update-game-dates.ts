// Script to update existing game dates for testing rating history charts
import { collection, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { logError } from './errors';

export async function updateGameDatesForTesting(): Promise<void> {
  console.log('Updating game dates to create realistic rating history...');

  try {
    const gamesCollection = collection(db, 'games');
    const snapshot = await getDocs(gamesCollection);

    if (snapshot.empty) {
      console.log('No games found to update.');
      return;
    }

    const batch = writeBatch(db);
    let updated = 0;

    // Start from today and go back 2 days per game
    const baseDate = new Date();

    // Sort games by creation order (assuming doc IDs are chronological)
    const gameDocs = snapshot.docs.sort((a, b) => a.id.localeCompare(b.id));

    gameDocs.forEach((gameDoc, index) => {
      // Calculate date: today - (index * 2 days)
      const gameDate = new Date(baseDate);
      gameDate.setDate(baseDate.getDate() - index * 2);

      console.log(`Updating game ${index + 1}: ${gameDoc.id} → ${gameDate.toLocaleDateString()}`);

      batch.update(doc(db, 'games', gameDoc.id), {
        date: Timestamp.fromDate(gameDate),
      });

      updated++;
    });

    if (updated > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updated} game dates.`);
      console.log('Games now span from today backwards, 2 days apart each.');
    } else {
      console.log('No games needed date updates.');
    }
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      'updateGameDatesForTesting'
    );
    throw error;
  }
}
