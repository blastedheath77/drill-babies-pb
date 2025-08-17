// Script to convert existing ELO ratings (1200-1700) to DUPR scale (2.0-8.0)
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';
import type { Player } from './types';

function convertEloToDupr(eloRating: number): number {
  // Map ELO range (1000-2000) to DUPR range (2.0-8.0)
  const minElo = 1000;
  const maxElo = 2000;
  const minDupr = 2.0;
  const maxDupr = 8.0;

  // Clamp ELO to expected range
  const clampedElo = Math.max(minElo, Math.min(maxElo, eloRating));

  // Linear conversion
  const duprRating = minDupr + ((clampedElo - minElo) / (maxElo - minElo)) * (maxDupr - minDupr);

  // Round to 1 decimal place
  return Math.round(duprRating * 10) / 10;
}

export async function convertExistingRatings(): Promise<void> {
  console.log('Converting existing ELO ratings to DUPR scale...');

  try {
    const playersCollection = collection(db, 'players');
    const snapshot = await getDocs(playersCollection);

    if (snapshot.empty) {
      console.log('No players found to convert.');
      return;
    }

    const batch = writeBatch(db);
    let converted = 0;

    snapshot.forEach((playerDoc) => {
      const playerData = playerDoc.data() as Player;
      const currentRating = playerData.rating;

      // Only convert if rating looks like ELO (> 10, since DUPR is 2.0-8.0)
      if (currentRating > 10) {
        const newRating = convertEloToDupr(currentRating);
        console.log(`Converting ${playerData.name}: ${currentRating} → ${newRating}`);

        batch.update(doc(db, 'players', playerDoc.id), {
          rating: newRating,
        });
        converted++;
      }
    });

    if (converted > 0) {
      await batch.commit();
      console.log(`Successfully converted ${converted} player ratings to DUPR scale.`);
    } else {
      console.log('No ratings needed conversion.');
    }
  } catch (error) {
    console.error('Error converting ratings:', error);
    throw error;
  }
}
