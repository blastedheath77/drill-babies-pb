#!/usr/bin/env tsx
/**
 * Migration Script: Assign all existing games to DLWest club
 *
 * This script updates all games that don't have a clubId
 * and assigns them to the DLWest club.
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DLWEST_CLUB_ID = 'N2M9BCBuEdE1JKbC93IK';

async function assignGamesToClub() {
  console.log('🔄 Starting games migration to DLWest club...\n');

  try {
    // Get all games
    const gamesRef = collection(db, 'games');
    const gamesSnapshot = await getDocs(gamesRef);

    console.log(`📊 Found ${gamesSnapshot.size} total games\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each game
    for (const gameDoc of gamesSnapshot.docs) {
      const gameData = gameDoc.data();
      const gameId = gameDoc.id;
      const gameDate = gameData.date ? new Date(gameData.date).toLocaleDateString() : 'Unknown date';
      const gameType = gameData.type || 'Unknown';

      // Check if game already has a clubId
      if (gameData.clubId) {
        console.log(`⏭️  Skipping ${gameType} game from ${gameDate} - already has clubId`);
        skippedCount++;
        continue;
      }

      try {
        // Update game with DLWest clubId
        const gameRef = doc(db, 'games', gameId);
        await updateDoc(gameRef, {
          clubId: DLWEST_CLUB_ID
        });

        console.log(`✅ Updated ${gameType} game from ${gameDate} (${gameId}) - assigned to DLWest`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating game ${gameId}:`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total games found:       ${gamesSnapshot.size}`);
    console.log(`✅ Successfully updated:  ${updatedCount}`);
    console.log(`⏭️  Skipped (had clubId): ${skippedCount}`);
    console.log(`❌ Errors:                ${errorCount}`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n✨ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review the output above.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
assignGamesToClub()
  .then(() => {
    console.log('\n👋 Migration script finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });
