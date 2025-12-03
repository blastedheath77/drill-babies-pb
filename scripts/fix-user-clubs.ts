#!/usr/bin/env tsx

/**
 * Script to add all users to DLWest club if they don't have club memberships
 * Usage: npx tsx scripts/fix-user-clubs.ts
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixUserClubs() {
  console.log('🔧 Fixing user club memberships...\n');

  try {
    // Get the DLWest club ID
    const clubsRef = collection(db, 'clubs');
    const clubQuery = query(clubsRef, where('name', '==', 'DLWest'));
    const clubSnapshot = await getDocs(clubQuery);

    if (clubSnapshot.empty) {
      console.error('❌ DLWest club not found!');
      console.log('ℹ️  Please run the migration script first: npx tsx scripts/migrate-to-clubs.ts');
      process.exit(1);
    }

    const clubId = clubSnapshot.docs[0].id;
    console.log(`✅ Found DLWest club: ${clubId}\n`);

    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    console.log(`📊 Found ${usersSnapshot.size} users\n`);

    let fixedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const clubMemberships = userData.clubMemberships || [];

      if (!clubMemberships.includes(clubId)) {
        console.log(`🔄 Adding ${userData.name || userData.email} to DLWest club...`);

        // Add club membership
        clubMemberships.push(clubId);

        const clubRoles = userData.clubRoles || {};
        clubRoles[clubId] = 'member';

        const selectedClubId = userData.selectedClubId || clubId;

        await updateDoc(doc(db, 'users', userDoc.id), {
          clubMemberships,
          clubRoles,
          selectedClubId,
          updatedAt: serverTimestamp(),
        });

        console.log(`   ✅ Updated ${userData.name || userData.email}`);
        fixedCount++;
      } else {
        console.log(`✓ ${userData.name || userData.email} already has club membership`);
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} users`);
    console.log(`✅ All users now have access to DLWest club\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixUserClubs();
