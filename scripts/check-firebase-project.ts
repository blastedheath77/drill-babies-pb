#!/usr/bin/env tsx
/**
 * Check which Firebase project has data
 * This helps determine production vs development
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  limit,
  query,
} from 'firebase/firestore';

// The project your app currently uses (pbstats-claude)
const currentAppConfig = {
  apiKey: 'AIzaSyCV123UIMDamipkXE5uysd2D1s4LWInUKs',
  authDomain: 'pbstats-claude.firebaseapp.com',
  projectId: 'pbstats-claude',
  storageBucket: 'pbstats-claude.firebasestorage.app',
  messagingSenderId: '415172729595',
  appId: '1:415172729595:web:1d91bcbaeb20823976ee5e',
};

async function checkProject() {
  console.log('🔍 Checking Firebase Project Data\n');
  console.log('Project: pbstats-claude');
  console.log('='.repeat(60));

  const app = initializeApp(currentAppConfig);
  const db = getFirestore(app);

  const collections = ['players', 'games', 'tournaments', 'circles', 'boxLeagues', 'clubs', 'users'];

  for (const collectionName of collections) {
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, limit(1));
      const snapshot = await getDocs(collectionRef);

      const count = snapshot.size;
      const hasData = count > 0;

      console.log(`${hasData ? '✓' : '✗'} ${collectionName.padEnd(15)} ${count.toString().padStart(4)} documents`);

      // Show a sample document name if exists
      if (hasData && snapshot.docs.length > 0) {
        const firstDoc = snapshot.docs[0].data();
        const name = firstDoc.name || firstDoc.email || firstDoc.id || 'unnamed';
        console.log(`  └─ Example: ${name}`);
      }
    } catch (error) {
      console.log(`❌ ${collectionName.padEnd(15)} Error accessing collection`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 This is the project your app is CURRENTLY using.');
  console.log('   If this has your real user data, this is PRODUCTION.\n');
}

checkProject()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
