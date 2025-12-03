#!/usr/bin/env tsx

/**
 * Script to check clubs in the database
 * Usage: npx tsx scripts/check-clubs.ts
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkClubs() {
  console.log('🔍 Checking clubs in database...\n');

  try {
    // Get all clubs (no filter)
    const clubsRef = collection(db, 'clubs');
    const allClubsSnapshot = await getDocs(clubsRef);

    console.log(`📊 Total clubs in database: ${allClubsSnapshot.size}\n`);

    if (allClubsSnapshot.empty) {
      console.log('❌ No clubs found in database!');
      process.exit(1);
    }

    allClubsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log('Club Details:');
      console.log(`  ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Description: ${data.description || 'N/A'}`);
      console.log(`  isActive: ${data.isActive}`);
      console.log(`  Created: ${data.createdDate?.toDate?.() || data.createdDate}`);
      console.log(`  Created By: ${data.createdBy}`);
      console.log(`  Settings:`, data.settings);
      console.log('');
    });

    // Get active clubs only
    const activeClubsQuery = query(clubsRef, where('isActive', '==', true));
    const activeClubsSnapshot = await getDocs(activeClubsQuery);

    console.log(`\n✅ Active clubs: ${activeClubsSnapshot.size}`);
    if (activeClubsSnapshot.size === 0) {
      console.log('⚠️  Warning: No active clubs found!');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkClubs();
