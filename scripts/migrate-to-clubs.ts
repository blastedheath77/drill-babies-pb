#!/usr/bin/env tsx

/**
 * Migration Script: Add Multi-Club Support
 *
 * This script migrates the database to support multi-club architecture by:
 * 1. Creating a default "DLWest" club
 * 2. Adding clubId to all existing entities (players, games, tournaments, circles, box leagues)
 * 3. Updating all user accounts with DLWest membership
 *
 * Usage: npx tsx scripts/migrate-to-clubs.ts
 *
 * IMPORTANT: Always backup your database before running this script!
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Migration configuration
const DEFAULT_CLUB = {
  name: 'DLWest',
  description: 'Default club for existing data migration',
  isActive: true,
  settings: {
    allowPublicJoin: false,
    defaultPlayerRating: 1000,
  },
};

// Track migration statistics
interface MigrationStats {
  clubsCreated: number;
  playersUpdated: number;
  gamesUpdated: number;
  tournamentsUpdated: number;
  circlesUpdated: number;
  boxLeaguesUpdated: number;
  boxesUpdated: number;
  boxLeagueRoundsUpdated: number;
  boxLeagueMatchesUpdated: number;
  boxLeaguePlayerStatsUpdated: number;
  usersUpdated: number;
  errors: string[];
}

const stats: MigrationStats = {
  clubsCreated: 0,
  playersUpdated: 0,
  gamesUpdated: 0,
  tournamentsUpdated: 0,
  circlesUpdated: 0,
  boxLeaguesUpdated: 0,
  boxesUpdated: 0,
  boxLeagueRoundsUpdated: 0,
  boxLeagueMatchesUpdated: 0,
  boxLeaguePlayerStatsUpdated: 0,
  usersUpdated: 0,
  errors: [],
};

/**
 * Create the default DLWest club
 */
async function createDefaultClub(): Promise<string> {
  console.log('\n📍 Step 1: Creating default club...');

  try {
    // Check if DLWest club already exists
    const clubsRef = collection(db, 'clubs');
    const q = query(clubsRef, where('name', '==', DEFAULT_CLUB.name));
    const existingClubs = await getDocs(q);

    if (!existingClubs.empty) {
      const clubId = existingClubs.docs[0].id;
      console.log(`   ⚠️  Club "${DEFAULT_CLUB.name}" already exists with ID: ${clubId}`);
      console.log('   ℹ️  Using existing club for migration');
      return clubId;
    }

    // Create new club
    const clubData = {
      ...DEFAULT_CLUB,
      createdDate: serverTimestamp(),
      createdBy: 'migration-script',
    };

    const clubRef = await addDoc(clubsRef, clubData);
    stats.clubsCreated++;

    console.log(`   ✅ Created club "${DEFAULT_CLUB.name}" with ID: ${clubRef.id}`);
    return clubRef.id;
  } catch (error: any) {
    const errorMsg = `Failed to create default club: ${error.message}`;
    stats.errors.push(errorMsg);
    console.error(`   ❌ ${errorMsg}`);
    throw error;
  }
}

/**
 * Update a collection to add clubId to documents that don't have it
 */
async function migrateCollection(
  collectionName: string,
  clubId: string,
  statKey: keyof MigrationStats
): Promise<void> {
  console.log(`\n📍 Migrating ${collectionName}...`);

  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);

    if (snapshot.empty) {
      console.log(`   ℹ️  No documents found in ${collectionName}`);
      return;
    }

    console.log(`   📊 Found ${snapshot.size} documents`);

    // Filter documents that don't have clubId
    const docsToUpdate = snapshot.docs.filter(doc => !doc.data().clubId);

    if (docsToUpdate.length === 0) {
      console.log(`   ✅ All documents already have clubId`);
      return;
    }

    console.log(`   🔄 Updating ${docsToUpdate.length} documents...`);

    // Update documents in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    for (let i = 0; i < docsToUpdate.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docsToUpdate.slice(i, i + batchSize);

      for (const document of batchDocs) {
        const docRef = doc(db, collectionName, document.id);
        batch.update(docRef, { clubId });
      }

      await batch.commit();

      const updatedCount = Math.min(i + batchSize, docsToUpdate.length);
      console.log(`   ⏳ Progress: ${updatedCount}/${docsToUpdate.length}`);
    }

    // Update statistics
    (stats[statKey] as number) += docsToUpdate.length;

    console.log(`   ✅ Successfully updated ${docsToUpdate.length} documents`);
  } catch (error: any) {
    const errorMsg = `Failed to migrate ${collectionName}: ${error.message}`;
    stats.errors.push(errorMsg);
    console.error(`   ❌ ${errorMsg}`);
    throw error;
  }
}

/**
 * Update all users to add DLWest to their club memberships
 */
async function migrateUsers(clubId: string): Promise<void> {
  console.log('\n📍 Migrating users...');

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    if (snapshot.empty) {
      console.log('   ℹ️  No users found');
      return;
    }

    console.log(`   📊 Found ${snapshot.size} users`);

    // Filter users that don't have club memberships
    const usersToUpdate = snapshot.docs.filter(doc => {
      const data = doc.data();
      const clubMemberships = data.clubMemberships || [];
      return !clubMemberships.includes(clubId);
    });

    if (usersToUpdate.length === 0) {
      console.log('   ✅ All users already have club memberships');
      return;
    }

    console.log(`   🔄 Updating ${usersToUpdate.length} users...`);

    // Update users in batches
    const batchSize = 500;
    for (let i = 0; i < usersToUpdate.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchUsers = usersToUpdate.slice(i, i + batchSize);

      for (const userDoc of batchUsers) {
        const userData = userDoc.data();
        const clubMemberships = userData.clubMemberships || [];
        const clubRoles = userData.clubRoles || {};

        // Add club to memberships
        if (!clubMemberships.includes(clubId)) {
          clubMemberships.push(clubId);
        }

        // Set as member if no role exists
        if (!clubRoles[clubId]) {
          clubRoles[clubId] = 'member';
        }

        // Set as selected club if user has no selected club
        const selectedClubId = userData.selectedClubId || clubId;

        const userRef = doc(db, 'users', userDoc.id);
        batch.update(userRef, {
          clubMemberships,
          clubRoles,
          selectedClubId,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      const updatedCount = Math.min(i + batchSize, usersToUpdate.length);
      console.log(`   ⏳ Progress: ${updatedCount}/${usersToUpdate.length}`);
    }

    stats.usersUpdated = usersToUpdate.length;

    console.log(`   ✅ Successfully updated ${usersToUpdate.length} users`);
  } catch (error: any) {
    const errorMsg = `Failed to migrate users: ${error.message}`;
    stats.errors.push(errorMsg);
    console.error(`   ❌ ${errorMsg}`);
    throw error;
  }
}

/**
 * Verify migration results
 */
async function verifyMigration(clubId: string): Promise<void> {
  console.log('\n📍 Verifying migration...');

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

      const docsWithoutClubId = snapshot.docs.filter(doc => !doc.data().clubId);

      if (docsWithoutClubId.length > 0) {
        console.log(`   ⚠️  Warning: ${docsWithoutClubId.length} documents in ${collectionName} still missing clubId`);
        stats.errors.push(`${collectionName}: ${docsWithoutClubId.length} documents missing clubId`);
      } else {
        console.log(`   ✅ ${collectionName}: All documents have clubId`);
      }
    }

    // Verify users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    if (!usersSnapshot.empty) {
      const usersWithoutClub = usersSnapshot.docs.filter(doc => {
        const data = doc.data();
        const clubMemberships = data.clubMemberships || [];
        return clubMemberships.length === 0;
      });

      if (usersWithoutClub.length > 0) {
        console.log(`   ⚠️  Warning: ${usersWithoutClub.length} users have no club memberships`);
        stats.errors.push(`${usersWithoutClub.length} users have no club memberships`);
      } else {
        console.log(`   ✅ users: All users have club memberships`);
      }
    }
  } catch (error: any) {
    console.error(`   ⚠️  Verification error: ${error.message}`);
  }
}

/**
 * Print migration summary
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));

  console.log('\n✅ SUCCESSFUL OPERATIONS:');
  console.log(`   Clubs created:                ${stats.clubsCreated}`);
  console.log(`   Players updated:              ${stats.playersUpdated}`);
  console.log(`   Games updated:                ${stats.gamesUpdated}`);
  console.log(`   Tournaments updated:          ${stats.tournamentsUpdated}`);
  console.log(`   Circles updated:              ${stats.circlesUpdated}`);
  console.log(`   Box Leagues updated:          ${stats.boxLeaguesUpdated}`);
  console.log(`   Boxes updated:                ${stats.boxesUpdated}`);
  console.log(`   Box League Rounds updated:    ${stats.boxLeagueRoundsUpdated}`);
  console.log(`   Box League Matches updated:   ${stats.boxLeagueMatchesUpdated}`);
  console.log(`   Box League Stats updated:     ${stats.boxLeaguePlayerStatsUpdated}`);
  console.log(`   Users updated:                ${stats.usersUpdated}`);

  const totalUpdates = stats.playersUpdated + stats.gamesUpdated +
                       stats.tournamentsUpdated + stats.circlesUpdated +
                       stats.boxLeaguesUpdated + stats.boxesUpdated +
                       stats.boxLeagueRoundsUpdated + stats.boxLeagueMatchesUpdated +
                       stats.boxLeaguePlayerStatsUpdated + stats.usersUpdated;

  console.log(`\n   Total documents updated:      ${totalUpdates}`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️  ERRORS ENCOUNTERED:');
    stats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
  console.log('🚀 Starting Multi-Club Migration');
  console.log('='.repeat(60));
  console.log('⚠️  IMPORTANT: Make sure you have a database backup!');
  console.log('='.repeat(60));

  try {
    // Step 1: Create default club
    const clubId = await createDefaultClub();

    // Step 2: Migrate all collections
    await migrateCollection('players', clubId, 'playersUpdated');
    await migrateCollection('games', clubId, 'gamesUpdated');
    await migrateCollection('tournaments', clubId, 'tournamentsUpdated');
    await migrateCollection('circles', clubId, 'circlesUpdated');
    await migrateCollection('boxLeagues', clubId, 'boxLeaguesUpdated');
    await migrateCollection('boxes', clubId, 'boxesUpdated');
    await migrateCollection('boxLeagueRounds', clubId, 'boxLeagueRoundsUpdated');
    await migrateCollection('boxLeagueMatches', clubId, 'boxLeagueMatchesUpdated');
    await migrateCollection('boxLeaguePlayerStats', clubId, 'boxLeaguePlayerStatsUpdated');

    // Step 3: Migrate users
    await migrateUsers(clubId);

    // Step 4: Verify migration
    await verifyMigration(clubId);

    // Print summary
    printSummary();

    if (stats.errors.length === 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('ℹ️  All existing data has been assigned to the "DLWest" club');
      console.log('ℹ️  All users have been added to the "DLWest" club');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration completed with warnings');
      console.log('ℹ️  Please review the errors above');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    printSummary();
    process.exit(1);
  }
}

// Run the migration
runMigration();
