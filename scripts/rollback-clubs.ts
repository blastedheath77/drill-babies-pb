#!/usr/bin/env tsx

/**
 * Rollback Script: Remove Multi-Club Support
 *
 * This script rolls back the multi-club migration by:
 * 1. Removing clubId from all entities
 * 2. Removing club memberships from users
 * 3. Optionally deleting the DLWest club
 *
 * Usage: npx tsx scripts/rollback-clubs.ts
 *
 * IMPORTANT: This is a destructive operation. Make sure you have a backup!
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Rollback statistics
interface RollbackStats {
  clubsDeleted: number;
  playersRolledBack: number;
  gamesRolledBack: number;
  tournamentsRolledBack: number;
  circlesRolledBack: number;
  boxLeaguesRolledBack: number;
  boxesRolledBack: number;
  boxLeagueRoundsRolledBack: number;
  boxLeagueMatchesRolledBack: number;
  boxLeaguePlayerStatsRolledBack: number;
  usersRolledBack: number;
  errors: string[];
}

const stats: RollbackStats = {
  clubsDeleted: 0,
  playersRolledBack: 0,
  gamesRolledBack: 0,
  tournamentsRolledBack: 0,
  circlesRolledBack: 0,
  boxLeaguesRolledBack: 0,
  boxesRolledBack: 0,
  boxLeagueRoundsRolledBack: 0,
  boxLeagueMatchesRolledBack: 0,
  boxLeaguePlayerStatsRolledBack: 0,
  usersRolledBack: 0,
  errors: [],
};

/**
 * Remove clubId field from a collection
 */
async function rollbackCollection(
  collectionName: string,
  statKey: keyof RollbackStats
): Promise<void> {
  console.log(`\n📍 Rolling back ${collectionName}...`);

  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);

    if (snapshot.empty) {
      console.log(`   ℹ️  No documents found in ${collectionName}`);
      return;
    }

    console.log(`   📊 Found ${snapshot.size} documents`);

    // Filter documents that have clubId
    const docsToUpdate = snapshot.docs.filter(doc => doc.data().clubId);

    if (docsToUpdate.length === 0) {
      console.log(`   ✅ No documents have clubId field`);
      return;
    }

    console.log(`   🔄 Removing clubId from ${docsToUpdate.length} documents...`);

    // Update documents in batches
    const batchSize = 500;
    for (let i = 0; i < docsToUpdate.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docsToUpdate.slice(i, i + batchSize);

      for (const document of batchDocs) {
        const docRef = doc(db, collectionName, document.id);
        batch.update(docRef, { clubId: deleteField() });
      }

      await batch.commit();

      const updatedCount = Math.min(i + batchSize, docsToUpdate.length);
      console.log(`   ⏳ Progress: ${updatedCount}/${docsToUpdate.length}`);
    }

    // Update statistics
    (stats[statKey] as number) += docsToUpdate.length;

    console.log(`   ✅ Successfully rolled back ${docsToUpdate.length} documents`);
  } catch (error: any) {
    const errorMsg = `Failed to rollback ${collectionName}: ${error.message}`;
    stats.errors.push(errorMsg);
    console.error(`   ❌ ${errorMsg}`);
    throw error;
  }
}

/**
 * Remove club memberships from users
 */
async function rollbackUsers(): Promise<void> {
  console.log('\n📍 Rolling back users...');

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    if (snapshot.empty) {
      console.log('   ℹ️  No users found');
      return;
    }

    console.log(`   📊 Found ${snapshot.size} users`);

    // Filter users that have club memberships
    const usersToUpdate = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.clubMemberships || data.clubRoles || data.selectedClubId;
    });

    if (usersToUpdate.length === 0) {
      console.log('   ✅ No users have club memberships');
      return;
    }

    console.log(`   🔄 Removing club memberships from ${usersToUpdate.length} users...`);

    // Update users in batches
    const batchSize = 500;
    for (let i = 0; i < usersToUpdate.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchUsers = usersToUpdate.slice(i, i + batchSize);

      for (const userDoc of batchUsers) {
        const userRef = doc(db, 'users', userDoc.id);
        batch.update(userRef, {
          clubMemberships: deleteField(),
          clubRoles: deleteField(),
          selectedClubId: deleteField(),
        });
      }

      await batch.commit();

      const updatedCount = Math.min(i + batchSize, usersToUpdate.length);
      console.log(`   ⏳ Progress: ${updatedCount}/${usersToUpdate.length}`);
    }

    stats.usersRolledBack = usersToUpdate.length;

    console.log(`   ✅ Successfully rolled back ${usersToUpdate.length} users`);
  } catch (error: any) {
    const errorMsg = `Failed to rollback users: ${error.message}`;
    stats.errors.push(errorMsg);
    console.error(`   ❌ ${errorMsg}`);
    throw error;
  }
}

/**
 * Delete the DLWest club
 */
async function deleteClub(clubName: string): Promise<void> {
  console.log(`\n📍 Deleting "${clubName}" club...`);

  try {
    const clubsRef = collection(db, 'clubs');
    const q = query(clubsRef, where('name', '==', clubName));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(`   ℹ️  Club "${clubName}" not found`);
      return;
    }

    for (const clubDoc of snapshot.docs) {
      await deleteDoc(doc(db, 'clubs', clubDoc.id));
      stats.clubsDeleted++;
      console.log(`   ✅ Deleted club "${clubName}" (${clubDoc.id})`);
    }
  } catch (error: any) {
    const errorMsg = `Failed to delete club: ${error.message}`;
    stats.errors.push(errorMsg);
    console.error(`   ❌ ${errorMsg}`);
    throw error;
  }
}

/**
 * Verify rollback results
 */
async function verifyRollback(): Promise<void> {
  console.log('\n📍 Verifying rollback...');

  try {
    const collections = [
      'players',
      'games',
      'tournaments',
      'circles',
      'boxLeagues',
      'boxes',
      'boxLeagueRounds',
      'boxLeagueMatches',
      'boxLeaguePlayerStats',
    ];

    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);

      if (snapshot.empty) continue;

      const docsWithClubId = snapshot.docs.filter(doc => doc.data().clubId);

      if (docsWithClubId.length > 0) {
        console.log(`   ⚠️  Warning: ${docsWithClubId.length} documents in ${collectionName} still have clubId`);
        stats.errors.push(`${collectionName}: ${docsWithClubId.length} documents still have clubId`);
      } else {
        console.log(`   ✅ ${collectionName}: All clubId fields removed`);
      }
    }

    // Verify users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    if (!usersSnapshot.empty) {
      const usersWithClubFields = usersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.clubMemberships || data.clubRoles || data.selectedClubId;
      });

      if (usersWithClubFields.length > 0) {
        console.log(`   ⚠️  Warning: ${usersWithClubFields.length} users still have club fields`);
        stats.errors.push(`${usersWithClubFields.length} users still have club fields`);
      } else {
        console.log(`   ✅ users: All club fields removed`);
      }
    }
  } catch (error: any) {
    console.error(`   ⚠️  Verification error: ${error.message}`);
  }
}

/**
 * Print rollback summary
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 ROLLBACK SUMMARY');
  console.log('='.repeat(60));

  console.log('\n✅ SUCCESSFUL OPERATIONS:');
  console.log(`   Clubs deleted:                ${stats.clubsDeleted}`);
  console.log(`   Players rolled back:          ${stats.playersRolledBack}`);
  console.log(`   Games rolled back:            ${stats.gamesRolledBack}`);
  console.log(`   Tournaments rolled back:      ${stats.tournamentsRolledBack}`);
  console.log(`   Circles rolled back:          ${stats.circlesRolledBack}`);
  console.log(`   Box Leagues rolled back:      ${stats.boxLeaguesRolledBack}`);
  console.log(`   Boxes rolled back:            ${stats.boxesRolledBack}`);
  console.log(`   Box League Rounds rolled back: ${stats.boxLeagueRoundsRolledBack}`);
  console.log(`   Box League Matches rolled back: ${stats.boxLeagueMatchesRolledBack}`);
  console.log(`   Box League Stats rolled back:  ${stats.boxLeaguePlayerStatsRolledBack}`);
  console.log(`   Users rolled back:            ${stats.usersRolledBack}`);

  const totalRollbacks = stats.playersRolledBack + stats.gamesRolledBack +
                         stats.tournamentsRolledBack + stats.circlesRolledBack +
                         stats.boxLeaguesRolledBack + stats.boxesRolledBack +
                         stats.boxLeagueRoundsRolledBack + stats.boxLeagueMatchesRolledBack +
                         stats.boxLeaguePlayerStatsRolledBack + stats.usersRolledBack;

  console.log(`\n   Total documents rolled back:  ${totalRollbacks}`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️  ERRORS ENCOUNTERED:');
    stats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Main rollback function
 */
async function runRollback(): Promise<void> {
  console.log('🔄 Starting Multi-Club Rollback');
  console.log('='.repeat(60));
  console.log('⚠️  WARNING: This will remove all multi-club data!');
  console.log('⚠️  Make sure you have a database backup!');
  console.log('='.repeat(60));

  try {
    // Step 1: Remove clubId from all collections
    await rollbackCollection('players', 'playersRolledBack');
    await rollbackCollection('games', 'gamesRolledBack');
    await rollbackCollection('tournaments', 'tournamentsRolledBack');
    await rollbackCollection('circles', 'circlesRolledBack');
    await rollbackCollection('boxLeagues', 'boxLeaguesRolledBack');
    await rollbackCollection('boxes', 'boxesRolledBack');
    await rollbackCollection('boxLeagueRounds', 'boxLeagueRoundsRolledBack');
    await rollbackCollection('boxLeagueMatches', 'boxLeagueMatchesRolledBack');
    await rollbackCollection('boxLeaguePlayerStats', 'boxLeaguePlayerStatsRolledBack');

    // Step 2: Remove club memberships from users
    await rollbackUsers();

    // Step 3: Delete the DLWest club
    await deleteClub('DLWest');

    // Step 4: Verify rollback
    await verifyRollback();

    // Print summary
    printSummary();

    if (stats.errors.length === 0) {
      console.log('\n✅ Rollback completed successfully!');
      console.log('ℹ️  All multi-club data has been removed');
      process.exit(0);
    } else {
      console.log('\n⚠️  Rollback completed with warnings');
      console.log('ℹ️  Please review the errors above');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Rollback failed:', error.message);
    console.error(error);
    printSummary();
    process.exit(1);
  }
}

// Run the rollback
runRollback();
