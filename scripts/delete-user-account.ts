#!/usr/bin/env tsx
/**
 * Delete User Account Script
 *
 * Deletes a user account (login data only) without affecting any player data.
 *
 * Usage:
 *   npx tsx scripts/delete-user-account.ts <userEmail>
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

async function deleteUserAccount(email: string) {
  console.log('🔍 USER ACCOUNT DELETION');
  console.log('='.repeat(60));
  console.log(`Email: ${email}`);
  console.log('='.repeat(60));

  // Find user
  console.log('\n📋 Finding user...');
  const user = await findUserByEmail(email);

  if (!user) {
    console.log('❌ User not found with email:', email);
    process.exit(1);
  }

  console.log('✅ Found user:');
  console.log(`  ID: ${user.id}`);
  console.log(`  Name: ${user.data.name || 'N/A'}`);
  console.log(`  Email: ${user.data.email || email}`);
  console.log(`  Role: ${user.data.role || 'user'}`);
  console.log(`  Clubs: ${user.data.clubMemberships?.length || 0}`);

  // Check for claimed players
  const playersRef = collection(db, 'players');
  const playersQuery = query(playersRef, where('claimedByUserId', '==', user.id));
  const playersSnapshot = await getDocs(playersQuery);

  if (playersSnapshot.size > 0) {
    console.log(`\n⚠️  WARNING: This user has ${playersSnapshot.size} claimed players:`);
    playersSnapshot.docs.forEach(doc => {
      const player = doc.data();
      console.log(`  - ${player.name} (${doc.id})`);
    });
    console.log('\n❌ Cannot delete user account while players are claimed.');
    console.log('Options:');
    console.log('  1. Convert players to phantom first using remove-user.ts script');
    console.log('  2. Transfer player ownership to another user');
    console.log('  3. Delete the players first');
    process.exit(1);
  }

  console.log('\n✅ No claimed players found - safe to delete');

  // Delete user document
  console.log('\n🗑️  Deleting user account...');
  const userRef = doc(db, 'users', user.id);
  await deleteDoc(userRef);
  console.log('✅ User account deleted');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ USER ACCOUNT DELETION COMPLETE');
  console.log('='.repeat(60));
  console.log(`User: ${email}`);
  console.log('User document: Deleted');
  console.log('Player data: Not affected');
  console.log('='.repeat(60));
}

// Parse command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email address required');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/delete-user-account.ts <userEmail>');
  console.log('\nExample:');
  console.log('  npx tsx scripts/delete-user-account.ts user@example.com');
  process.exit(1);
}

// Confirmation prompt
console.log('⚠️  WARNING: This will delete the user account from the database!');
console.log('Email:', email);
console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  deleteUserAccount(email)
    .then(() => {
      console.log('\n👋 Deletion complete. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error during deletion:', error);
      process.exit(1);
    });
}, 3000);
