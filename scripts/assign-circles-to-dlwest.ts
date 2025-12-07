#!/usr/bin/env tsx
/**
 * Migration Script: Assign all existing circles to DLWest club
 *
 * This script updates all circles that don't have a clubId
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

async function assignCirclesToClub() {
  console.log('🔄 Starting circles migration to DLWest club...\n');

  try {
    // Get all circles
    const circlesRef = collection(db, 'circles');
    const circlesSnapshot = await getDocs(circlesRef);

    console.log(`📊 Found ${circlesSnapshot.size} total circles\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each circle
    for (const circleDoc of circlesSnapshot.docs) {
      const circleData = circleDoc.data();
      const circleId = circleDoc.id;
      const circleName = circleData.name || 'Unknown';

      // Check if circle already has a clubId
      if (circleData.clubId) {
        console.log(`⏭️  Skipping ${circleName} - already has clubId: ${circleData.clubId}`);
        skippedCount++;
        continue;
      }

      try {
        // Update circle with DLWest clubId
        const circleRef = doc(db, 'circles', circleId);
        await updateDoc(circleRef, {
          clubId: DLWEST_CLUB_ID
        });

        console.log(`✅ Updated ${circleName} (${circleId}) - assigned to DLWest`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${circleName}:`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total circles found:     ${circlesSnapshot.size}`);
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
assignCirclesToClub()
  .then(() => {
    console.log('\n👋 Migration script finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });
