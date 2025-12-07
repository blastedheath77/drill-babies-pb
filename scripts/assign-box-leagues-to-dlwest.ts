#!/usr/bin/env tsx
/**
 * Migration Script: Assign all existing box leagues to DLWest club
 *
 * This script updates all box leagues that don't have a clubId
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

async function assignBoxLeaguesToClub() {
  console.log('🔄 Starting box leagues migration to DLWest club...\n');

  try {
    // Get all box leagues
    const boxLeaguesRef = collection(db, 'boxLeagues');
    const boxLeaguesSnapshot = await getDocs(boxLeaguesRef);

    console.log(`📊 Found ${boxLeaguesSnapshot.size} total box leagues\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each box league
    for (const boxLeagueDoc of boxLeaguesSnapshot.docs) {
      const boxLeagueData = boxLeagueDoc.data();
      const boxLeagueId = boxLeagueDoc.id;
      const boxLeagueName = boxLeagueData.name || 'Unknown';

      // Check if box league already has a clubId
      if (boxLeagueData.clubId) {
        console.log(`⏭️  Skipping ${boxLeagueName} - already has clubId: ${boxLeagueData.clubId}`);
        skippedCount++;
        continue;
      }

      try {
        // Update box league with DLWest clubId
        const boxLeagueRef = doc(db, 'boxLeagues', boxLeagueId);
        await updateDoc(boxLeagueRef, {
          clubId: DLWEST_CLUB_ID
        });

        console.log(`✅ Updated ${boxLeagueName} (${boxLeagueId}) - assigned to DLWest`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${boxLeagueName}:`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total box leagues found: ${boxLeaguesSnapshot.size}`);
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
assignBoxLeaguesToClub()
  .then(() => {
    console.log('\n👋 Migration script finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });
