#!/usr/bin/env tsx

/**
 * Inspection Script: Check Andreas Jonsson duplicate players
 * 
 * This script inspects the two Andreas Jonsson players to understand
 * why there are duplicates and their current states.
 * 
 * Run with: npx tsx scripts/inspect-andreas-players.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Firebase config - using the same config as the app
const firebaseConfig = {
  apiKey: 'AIzaSyCV123UIMDamipkXE5uysd2D1s4LWInUKs',
  authDomain: 'pbstats-claude.firebaseapp.com',
  projectId: 'pbstats-claude',
  storageBucket: 'pbstats-claude.firebasestorage.app',
  messagingSenderId: '415172729595',
  appId: '1:415172729595:web:1d91bcbaeb20823976ee5e',
  measurementId: 'G-S6Z2GMJ2QR',
};

async function inspectAndreasPlayers() {
  console.log('🔍 Inspecting Andreas Jonsson players...');
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  try {
    const phantomAndreasId = 'dJ5QVOmFcWhWvF3LeIlh';
    const claimedAndreasId = 'w6fTLGeDgIPfFQl9n9KZ';
    
    // Get both players
    const phantomDoc = await getDoc(doc(db, 'players', phantomAndreasId));
    const claimedDoc = await getDoc(doc(db, 'players', claimedAndreasId));
    
    console.log('\n👻 PHANTOM Andreas Jonsson:', phantomAndreasId);
    if (phantomDoc.exists()) {
      const data = phantomDoc.data();
      console.log('   Name:', data.name);
      console.log('   Email:', data.email || 'N/A');
      console.log('   isPhantom:', data.isPhantom);
      console.log('   claimedByUserId:', data.claimedByUserId || 'N/A');
      console.log('   createdBy:', data.createdBy || 'N/A');
      console.log('   createdAt:', data.createdAt || 'N/A');
      console.log('   claimedAt:', data.claimedAt || 'N/A');
      console.log('   Stats:', `${data.wins || 0}W-${data.losses || 0}L, Rating: ${data.rating || 1000}`);
      console.log('   Avatar:', data.avatar || 'N/A');
    } else {
      console.log('   ❌ Document not found');
    }
    
    console.log('\n🔗 CLAIMED Andreas Jonsson:', claimedAndreasId);
    if (claimedDoc.exists()) {
      const data = claimedDoc.data();
      console.log('   Name:', data.name);
      console.log('   Email:', data.email || 'N/A');
      console.log('   isPhantom:', data.isPhantom);
      console.log('   claimedByUserId:', data.claimedByUserId || 'N/A');
      console.log('   createdBy:', data.createdBy || 'N/A');
      console.log('   createdAt:', data.createdAt || 'N/A');
      console.log('   claimedAt:', data.claimedAt || 'N/A');
      console.log('   Stats:', `${data.wins || 0}W-${data.losses || 0}L, Rating: ${data.rating || 1000}`);
      console.log('   Avatar:', data.avatar || 'N/A');
    } else {
      console.log('   ❌ Document not found');
    }
    
    console.log('\n💡 Analysis:');
    if (phantomDoc.exists() && claimedDoc.exists()) {
      const phantomData = phantomDoc.data();
      const claimedData = claimedDoc.data();
      
      console.log('   - Two separate Andreas Jonsson players exist');
      console.log('   - Phantom has email:', phantomData.email ? 'YES' : 'NO');
      console.log('   - Claimed has email:', claimedData.email ? 'YES' : 'NO');
      
      if (phantomData.email && claimedData.email && phantomData.email === claimedData.email) {
        console.log('   ⚠️ Both players have the SAME email! This could cause confusion.');
      } else if (phantomData.email && claimedData.email && phantomData.email !== claimedData.email) {
        console.log('   ℹ️ Players have different emails');
      }
      
      if (phantomData.email === 'dreas.jonsson@gmail.com') {
        console.log('   🎯 Phantom player has the email shown in UI: dreas.jonsson@gmail.com');
      }
      
      console.log('   - Games played - Phantom:', (phantomData.wins || 0) + (phantomData.losses || 0));
      console.log('   - Games played - Claimed:', (claimedData.wins || 0) + (claimedData.losses || 0));
    }
    
  } catch (error) {
    console.error('❌ Inspection failed:', error);
    throw error;
  }
}

// Run the inspection
if (require.main === module) {
  inspectAndreasPlayers()
    .then(() => {
      console.log('🏁 Inspection completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Inspection failed:', error);
      process.exit(1);
    });
}

export { inspectAndreasPlayers };