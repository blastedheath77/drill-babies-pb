#!/usr/bin/env tsx

/**
 * Verification Script: Check Phantom Player Circle Membership
 * 
 * This script verifies that the phantom player was successfully added
 * to the circle by checking the circleMemberships collection.
 * 
 * Run with: npx tsx scripts/verify-phantom-membership.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function verifyPhantomMembership() {
  console.log('🔍 Verifying phantom player circle membership...');
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  try {
    const testPhantomId = '6QO6l2OoaROrN6yRhzuO'; // Mhari McNaught
    const testCircleId = 'MQlhirgI0GPOXI8IawWa'; // DL Simon Tester circle
    
    console.log('👻 Checking membership for phantom player:', testPhantomId);
    console.log('🔵 In circle:', testCircleId);
    
    // Check if phantom player is now a member
    const membershipQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', testCircleId),
      where('userId', '==', testPhantomId)
    );
    
    const membershipSnapshot = await getDocs(membershipQuery);
    
    if (membershipSnapshot.empty) {
      console.log('❌ No membership found for phantom player');
      return;
    }
    
    console.log(`✅ Found ${membershipSnapshot.size} membership(s) for phantom player:`);
    
    membershipSnapshot.docs.forEach((doc, index) => {
      const membership = doc.data();
      console.log(`\n   Membership ${index + 1}:`);
      console.log('     - Document ID:', doc.id);
      console.log('     - Circle ID:', membership.circleId);
      console.log('     - User ID:', membership.userId);
      console.log('     - Role:', membership.role);
      console.log('     - Joined At:', membership.joinedAt?.toDate?.() || membership.joinedAt);
      console.log('     - Added By:', membership.addedBy);
      console.log('     - Is Phantom Player:', membership.isPhantomPlayer);
    });
    
    // Also check all phantom player memberships
    console.log('\n🔍 Checking all phantom player memberships...');
    const allPhantomMemberships = query(
      collection(db, 'circleMemberships'),
      where('isPhantomPlayer', '==', true)
    );
    
    const allPhantomSnapshot = await getDocs(allPhantomMemberships);
    
    console.log(`📊 Found ${allPhantomSnapshot.size} total phantom player memberships:`);
    
    allPhantomSnapshot.docs.forEach((doc, index) => {
      const membership = doc.data();
      console.log(`   ${index + 1}. Player ${membership.userId} in circle ${membership.circleId}`);
    });
    
    console.log('\n✅ Verification completed successfully!');
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
    throw error;
  }
}

// Run the verification
if (require.main === module) {
  verifyPhantomMembership()
    .then(() => {
      console.log('🏁 Verification completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

export { verifyPhantomMembership };