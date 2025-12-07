#!/usr/bin/env tsx
/**
 * Migration Script: Assign all existing tournaments to DLWest club
 *
 * This script updates all tournaments that don't have a clubId
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

async function assignTournamentsToClub() {
  console.log('🔄 Starting tournament migration to DLWest club...\n');

  try {
    // Get all tournaments
    const tournamentsRef = collection(db, 'tournaments');
    const tournamentsSnapshot = await getDocs(tournamentsRef);

    console.log(`📊 Found ${tournamentsSnapshot.size} total tournaments\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each tournament
    for (const tournamentDoc of tournamentsSnapshot.docs) {
      const tournamentData = tournamentDoc.data();
      const tournamentId = tournamentDoc.id;
      const tournamentName = tournamentData.name || 'Unknown';

      // Check if tournament already has a clubId
      if (tournamentData.clubId) {
        console.log(`⏭️  Skipping ${tournamentName} - already has clubId: ${tournamentData.clubId}`);
        skippedCount++;
        continue;
      }

      try {
        // Update tournament with DLWest clubId
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        await updateDoc(tournamentRef, {
          clubId: DLWEST_CLUB_ID
        });

        console.log(`✅ Updated ${tournamentName} (${tournamentId}) - assigned to DLWest`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${tournamentName}:`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total tournaments found: ${tournamentsSnapshot.size}`);
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
assignTournamentsToClub()
  .then(() => {
    console.log('\n👋 Migration script finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });
