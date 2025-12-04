#!/usr/bin/env tsx
/**
 * Check Player Club IDs
 *
 * Quick script to check which club specific players belong to
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPlayerClubs() {
  console.log('🔍 Checking player club assignments...\n');

  // Get Billy Simmons and Pam McBAM
  const playersRef = collection(db, 'players');
  const snapshot = await getDocs(playersRef);

  const billySimmons = snapshot.docs.find(doc => doc.data().name === 'Billy Simmons');
  const pamMcBAM = snapshot.docs.find(doc => doc.data().name === 'Pam McBAM');

  if (billySimmons) {
    const data = billySimmons.data();
    console.log('Billy Simmons:');
    console.log(`  ID: ${billySimmons.id}`);
    console.log(`  clubId: ${data.clubId || 'MISSING!'}`);
    console.log('');
  } else {
    console.log('Billy Simmons: NOT FOUND\n');
  }

  if (pamMcBAM) {
    const data = pamMcBAM.data();
    console.log('Pam McBAM:');
    console.log(`  ID: ${pamMcBAM.id}`);
    console.log(`  clubId: ${data.clubId || 'MISSING!'}`);
    console.log('');
  } else {
    console.log('Pam McBAM: NOT FOUND\n');
  }

  // Get all clubs
  console.log('📋 Available clubs:');
  const clubsRef = collection(db, 'clubs');
  const clubsSnapshot = await getDocs(clubsRef);
  clubsSnapshot.docs.forEach(doc => {
    const club = doc.data();
    console.log(`  - ${club.name} (ID: ${doc.id})`);
  });
}

checkPlayerClubs()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
