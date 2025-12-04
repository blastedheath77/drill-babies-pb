#!/usr/bin/env tsx
/**
 * Verification Script: Check DLWest players query
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DLWEST_CLUB_ID = 'N2M9BCBuEdE1JKbC93IK';

async function verifyDLWestPlayers() {
  console.log('🔍 Verifying DLWest players query...\n');

  try {
    // Test 1: Get all players with DLWest clubId (no ordering)
    console.log('Test 1: Simple query (where clubId == DLWest)');
    const simpleQuery = query(
      collection(db, 'players'),
      where('clubId', '==', DLWEST_CLUB_ID)
    );
    const simpleSnapshot = await getDocs(simpleQuery);
    console.log(`✅ Found ${simpleSnapshot.size} players with simple query\n`);

    // Test 2: Get all players with DLWest clubId AND ordering by rating
    console.log('Test 2: Complex query (where clubId == DLWest + orderBy rating)');
    try {
      const complexQuery = query(
        collection(db, 'players'),
        where('clubId', '==', DLWEST_CLUB_ID),
        orderBy('rating', 'desc')
      );
      const complexSnapshot = await getDocs(complexQuery);
      console.log(`✅ Found ${complexSnapshot.size} players with complex query`);

      if (complexSnapshot.size > 0) {
        console.log('\nTop 5 players:');
        complexSnapshot.docs.slice(0, 5).forEach((doc, index) => {
          const data = doc.data();
          console.log(`  ${index + 1}. ${data.name} - Rating: ${data.rating}`);
        });
      }
    } catch (error: any) {
      console.error('❌ Complex query failed:', error.message);
      console.log('\n⚠️  This might mean the index is still building. Wait a few minutes and try again.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  }
}

verifyDLWestPlayers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
