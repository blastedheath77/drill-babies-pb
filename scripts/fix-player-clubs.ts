#!/usr/bin/env tsx
/**
 * Fix Player Club IDs
 *
 * Updates Billy Simmons and Pam McBAM to belong to the BAM club
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// BAM club ID from the check script
const BAM_CLUB_ID = 'lChzHxnPaNgfLzpnf7YT';

async function fixPlayerClubs() {
  console.log('🔧 Fixing player club assignments...\n');

  // Get all players
  const playersRef = collection(db, 'players');
  const snapshot = await getDocs(playersRef);

  const billySimmons = snapshot.docs.find(doc => doc.data().name === 'Billy Simmons');
  const pamMcBAM = snapshot.docs.find(doc => doc.data().name === 'Pam McBAM');

  const updates: Promise<void>[] = [];

  if (billySimmons) {
    console.log(`Updating Billy Simmons (${billySimmons.id}) to BAM club...`);
    const playerDoc = doc(db, 'players', billySimmons.id);
    updates.push(updateDoc(playerDoc, { clubId: BAM_CLUB_ID }));
  } else {
    console.log('❌ Billy Simmons not found');
  }

  if (pamMcBAM) {
    console.log(`Updating Pam McBAM (${pamMcBAM.id}) to BAM club...`);
    const playerDoc = doc(db, 'players', pamMcBAM.id);
    updates.push(updateDoc(playerDoc, { clubId: BAM_CLUB_ID }));
  } else {
    console.log('❌ Pam McBAM not found');
  }

  if (updates.length > 0) {
    await Promise.all(updates);
    console.log(`\n✅ Updated ${updates.length} player(s) successfully!`);
  } else {
    console.log('\n⚠️  No players found to update');
  }
}

fixPlayerClubs()
  .then(() => {
    console.log('✅ Fix complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
