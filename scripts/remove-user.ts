#!/usr/bin/env tsx
/**
 * User Removal Script
 *
 * Safely removes a user from the database with options to handle their data.
 *
 * Usage:
 *   npx tsx scripts/remove-user.ts <userEmail> [--delete-players]
 *
 * Options:
 *   --delete-players    Delete all players claimed by this user (default: convert to phantom)
 *   --keep-user-doc     Keep the user document but remove from all clubs
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface RemovalOptions {
  deletePlayers: boolean;
  keepUserDoc: boolean;
}

async function findUserByEmail(email: string) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    data: snapshot.docs[0].data()
  };
}

async function getPlayersByUser(userId: string) {
  const playersRef = collection(db, 'players');
  const q = query(playersRef, where('claimedByUserId', '==', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function convertPlayersToPhantom(playerIds: string[]) {
  console.log(`\n🔄 Converting ${playerIds.length} players to phantom...`);

  const batch = writeBatch(db);
  let count = 0;

  for (const playerId of playerIds) {
    const playerRef = doc(db, 'players', playerId);
    batch.update(playerRef, {
      isPhantom: true,
      claimedByUserId: null,
      claimedAt: null,
      convertedToPhantomAt: new Date().toISOString(),
      convertedToPhantomBy: 'admin-removal'
    });

    count++;

    // Firestore batch limit is 500 operations
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`  ✅ Converted ${count} players so far...`);
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`✅ Converted ${count} players to phantom`);
}

async function deletePlayers(playerIds: string[], playerNames: string[]) {
  console.log(`\n⚠️  DELETING ${playerIds.length} players...`);
  console.log('Players to delete:', playerNames.join(', '));

  const batch = writeBatch(db);
  let count = 0;

  for (const playerId of playerIds) {
    const playerRef = doc(db, 'players', playerId);
    batch.delete(playerRef);

    count++;

    if (count % 500 === 0) {
      await batch.commit();
      console.log(`  ✅ Deleted ${count} players so far...`);
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`✅ Deleted ${count} players`);
  console.log('⚠️  Note: Games involving these players will still exist with player references');
}

async function removeUserFromClubs(userId: string, clubMemberships: string[]) {
  console.log(`\n🔄 Removing user from ${clubMemberships.length} clubs...`);

  // No need to update club documents - clubs don't store member lists
  // Just removing from user document is sufficient
  console.log('✅ User will be removed from club memberships');
}

async function deleteUserDocument(userId: string) {
  console.log('\n🗑️  Deleting user document...');
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
  console.log('✅ User document deleted');
}

async function deactivateUser(userId: string) {
  console.log('\n🔒 Deactivating user (keeping document)...');
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    isActive: false,
    clubMemberships: [],
    clubRoles: {},
    selectedClubId: null,
    deactivatedAt: new Date().toISOString()
  });
  console.log('✅ User deactivated and removed from all clubs');
}

async function removeUser(email: string, options: RemovalOptions) {
  console.log('🔍 USER REMOVAL PROCESS');
  console.log('='.repeat(60));
  console.log(`Email: ${email}`);
  console.log(`Options:`, options);
  console.log('='.repeat(60));

  // 1. Find user
  console.log('\n📋 Step 1: Finding user...');
  const user = await findUserByEmail(email);

  if (!user) {
    console.log('❌ User not found with email:', email);
    process.exit(1);
  }

  console.log('✅ Found user:');
  console.log(`  ID: ${user.id}`);
  console.log(`  Name: ${user.data.name || 'N/A'}`);
  console.log(`  Role: ${user.data.role || 'user'}`);
  console.log(`  Clubs: ${user.data.clubMemberships?.length || 0}`);

  // 2. Find claimed players
  console.log('\n📋 Step 2: Finding claimed players...');
  const players = await getPlayersByUser(user.id);
  console.log(`✅ Found ${players.length} claimed players:`);
  players.forEach(p => console.log(`  - ${p.name} (${p.id})`));

  // 3. Handle players
  if (players.length > 0) {
    console.log('\n📋 Step 3: Handling players...');
    const playerIds = players.map(p => p.id);
    const playerNames = players.map(p => p.name);

    if (options.deletePlayers) {
      await deletePlayers(playerIds, playerNames);
    } else {
      await convertPlayersToPhantom(playerIds);
    }
  } else {
    console.log('\n📋 Step 3: No players to handle');
  }

  // 4. Remove from clubs
  const clubMemberships = user.data.clubMemberships || [];
  if (clubMemberships.length > 0) {
    console.log('\n📋 Step 4: Removing from clubs...');
    await removeUserFromClubs(user.id, clubMemberships);
  } else {
    console.log('\n📋 Step 4: No club memberships to remove');
  }

  // 5. Delete or deactivate user
  console.log('\n📋 Step 5: Handling user document...');
  if (options.keepUserDoc) {
    await deactivateUser(user.id);
  } else {
    await deleteUserDocument(user.id);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ USER REMOVAL COMPLETE');
  console.log('='.repeat(60));
  console.log(`User: ${email}`);
  console.log(`Players ${options.deletePlayers ? 'deleted' : 'converted to phantom'}: ${players.length}`);
  console.log(`Clubs removed from: ${clubMemberships.length}`);
  console.log(`User document: ${options.keepUserDoc ? 'Deactivated' : 'Deleted'}`);
  console.log('='.repeat(60));
}

// Parse command line arguments
const args = process.argv.slice(2);
const email = args[0];
const options: RemovalOptions = {
  deletePlayers: args.includes('--delete-players'),
  keepUserDoc: args.includes('--keep-user-doc')
};

if (!email) {
  console.error('❌ Error: Email address required');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/remove-user.ts <userEmail> [options]');
  console.log('\nOptions:');
  console.log('  --delete-players    Delete all players (default: convert to phantom)');
  console.log('  --keep-user-doc     Keep user document but deactivate (default: delete)');
  console.log('\nExamples:');
  console.log('  npx tsx scripts/remove-user.ts user@example.com');
  console.log('  npx tsx scripts/remove-user.ts user@example.com --delete-players');
  console.log('  npx tsx scripts/remove-user.ts user@example.com --keep-user-doc');
  process.exit(1);
}

// Confirmation prompt
console.log('⚠️  WARNING: This will remove user data from the database!');
console.log('Email:', email);
console.log('Options:', options);
console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  removeUser(email, options)
    .then(() => {
      console.log('\n👋 Removal complete. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error during removal:', error);
      process.exit(1);
    });
}, 5000);
