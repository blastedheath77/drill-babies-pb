#!/usr/bin/env tsx
/**
 * Migration Script: Assign all existing players to DLWest club
 *
 * This script updates all players that don't have a clubId
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

async function assignPlayersToClub() {
  console.log('🔄 Starting player migration to DLWest club...\n');

  try {
    // Get all players
    const playersRef = collection(db, 'players');
    const playersSnapshot = await getDocs(playersRef);

    console.log(`📊 Found ${playersSnapshot.size} total players\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each player
    for (const playerDoc of playersSnapshot.docs) {
      const playerData = playerDoc.data();
      const playerId = playerDoc.id;
      const playerName = playerData.name || 'Unknown';

      // Check if player already has a clubId
      if (playerData.clubId) {
        console.log(`⏭️  Skipping ${playerName} - already has clubId: ${playerData.clubId}`);
        skippedCount++;
        continue;
      }

      try {
        // Update player with DLWest clubId
        const playerRef = doc(db, 'players', playerId);
        await updateDoc(playerRef, {
          clubId: DLWEST_CLUB_ID
        });

        console.log(`✅ Updated ${playerName} (${playerId}) - assigned to DLWest`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${playerName}:`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total players found:     ${playersSnapshot.size}`);
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
assignPlayersToClub()
  .then(() => {
    console.log('\n👋 Migration script finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });
