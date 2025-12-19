#!/usr/bin/env tsx
/**
 * Quick fix: Add clubId to tournament "Thu 18 Dec"
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TOURNAMENT_ID = 'JCjLGgFCbawhzYGR0tKC';
const CLUB_ID = 'N2M9BCBuEdE1JKbC93IK';

async function fixTournament() {
  console.log('🔧 Updating tournament "Thu 18 Dec" with clubId...\n');
  
  try {
    const tournamentRef = doc(db, 'tournaments', TOURNAMENT_ID);
    await updateDoc(tournamentRef, { clubId: CLUB_ID });
    
    console.log('✅ Successfully updated tournament with clubId:', CLUB_ID);
    console.log('\n👍 Now you can run the game migration script!');
  } catch (error) {
    console.error('❌ Error updating tournament:', error);
    process.exit(1);
  }
}

fixTournament()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
