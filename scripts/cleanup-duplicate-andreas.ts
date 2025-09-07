#!/usr/bin/env tsx

/**
 * Cleanup Script: Remove duplicate phantom Andreas Jonsson
 * 
 * This script removes the phantom Andreas Jonsson player since the user
 * has already properly claimed the other Andreas Jonsson player with games.
 * 
 * Run with: npx tsx scripts/cleanup-duplicate-andreas.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, getDoc } from 'firebase/firestore';

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

async function cleanupDuplicateAndreas() {
  console.log('🧹 Cleaning up duplicate Andreas Jonsson player...');
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  try {
    const phantomAndreasId = 'dJ5QVOmFcWhWvF3LeIlh'; // Phantom with 0 games
    const claimedAndreasId = 'w6fTLGeDgIPfFQl9n9KZ'; // Claimed with 25 games
    
    // Double-check both players exist and have expected states
    const phantomDoc = await getDoc(doc(db, 'players', phantomAndreasId));
    const claimedDoc = await getDoc(doc(db, 'players', claimedAndreasId));
    
    if (!phantomDoc.exists()) {
      console.log('❌ Phantom Andreas Jonsson not found');
      return;
    }
    
    if (!claimedDoc.exists()) {
      console.log('❌ Claimed Andreas Jonsson not found');
      return;
    }
    
    const phantomData = phantomDoc.data();
    const claimedData = claimedDoc.data();
    
    console.log('\n📊 Pre-cleanup verification:');
    console.log(`   Phantom: ${phantomData.name} - ${phantomData.wins || 0}W-${phantomData.losses || 0}L - isPhantom: ${phantomData.isPhantom}`);
    console.log(`   Claimed: ${claimedData.name} - ${claimedData.wins || 0}W-${claimedData.losses || 0}L - isPhantom: ${claimedData.isPhantom}`);
    
    // Verify this is safe to delete
    const phantomGames = (phantomData.wins || 0) + (phantomData.losses || 0);
    const claimedGames = (claimedData.wins || 0) + (claimedData.losses || 0);
    
    if (phantomGames > 0) {
      console.log('⚠️ Warning: Phantom player has games recorded. Aborting cleanup.');
      return;
    }
    
    if (!phantomData.isPhantom) {
      console.log('⚠️ Warning: Player to delete is not marked as phantom. Aborting cleanup.');
      return;
    }
    
    if (claimedData.isPhantom !== false) {
      console.log('⚠️ Warning: Claimed player is still marked as phantom. Aborting cleanup.');
      return;
    }
    
    console.log('\n✅ Safety checks passed. Proceeding with cleanup...');
    
    // Delete the phantom player
    await deleteDoc(doc(db, 'players', phantomAndreasId));
    
    console.log('🗑️ Phantom Andreas Jonsson deleted successfully');
    
    // Verify deletion
    const verifyDoc = await getDoc(doc(db, 'players', phantomAndreasId));
    if (!verifyDoc.exists()) {
      console.log('✅ Deletion confirmed');
    } else {
      console.log('❌ Deletion failed - player still exists');
    }
    
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('The phantom Andreas Jonsson (0 games) has been removed.');
    console.log(`The claimed Andreas Jonsson (${claimedGames} games) remains active.`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupDuplicateAndreas()
    .then(() => {
      console.log('🏁 Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup script failed:', error);
      process.exit(1);
    });
}

export { cleanupDuplicateAndreas };