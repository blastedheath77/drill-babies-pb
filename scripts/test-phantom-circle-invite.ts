#!/usr/bin/env tsx

/**
 * Test Script: Phantom Player Circle Invitation
 * 
 * This script tests the phantom player instant-add functionality
 * by attempting to invite a phantom player to a circle.
 * 
 * Run with: npx tsx scripts/test-phantom-circle-invite.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { sendCircleInvitation } from '../src/lib/enhanced-circle-invites';

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

async function testPhantomCircleInvite() {
  console.log('🧪 Testing phantom player circle invitation...');
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  try {
    // Find a phantom player
    console.log('🔍 Looking for phantom players...');
    const phantomQuery = query(
      collection(db, 'players'),
      where('isPhantom', '==', true),
      limit(1)
    );
    
    const phantomSnapshot = await getDocs(phantomQuery);
    
    if (phantomSnapshot.empty) {
      console.log('❌ No phantom players found for testing');
      return;
    }
    
    const phantomPlayer = phantomSnapshot.docs[0];
    const phantomData = phantomPlayer.data();
    
    console.log('👻 Found phantom player:', phantomData.name, '(' + phantomPlayer.id + ')');
    console.log('   - isPhantom:', phantomData.isPhantom);
    console.log('   - claimedByUserId:', phantomData.claimedByUserId || 'N/A');
    
    // Find an existing circle
    console.log('\n🔍 Looking for test circle...');
    const circleQuery = query(collection(db, 'circles'), limit(1));
    const circleSnapshot = await getDocs(circleQuery);
    
    if (circleSnapshot.empty) {
      console.log('❌ No circles found for testing');
      return;
    }
    
    const testCircle = circleSnapshot.docs[0];
    const circleData = testCircle.data();
    
    console.log('🔵 Found test circle:', circleData.name, '(' + testCircle.id + ')');
    
    // Find the circle owner/admin to use as inviter
    const inviterId = circleData.createdBy || '5LwBK8p58iNmErBQcDzITzhq5UD3'; // Fallback to Andreas
    
    // Test the phantom player invitation
    console.log('\n🚀 Testing phantom player invitation...');
    console.log('   Inviter:', inviterId);
    
    const result = await sendCircleInvitation({
      circleId: testCircle.id,
      invitedUserId: phantomPlayer.id, // Use phantom player ID as user ID
      invitedBy: inviterId,
      message: 'Testing phantom player instant add'
    });
    
    console.log('\n📊 Test Results:');
    console.log('   Success:', result.success);
    console.log('   Message:', result.message);
    console.log('   InviteType:', result.inviteType || 'N/A');
    console.log('   InviteId:', result.inviteId || 'N/A');
    
    if (result.success && result.inviteType === 'phantom_instant') {
      console.log('✅ Phantom player instant-add test PASSED!');
      console.log('   The phantom player should now be a member of the circle');
    } else if (result.success && result.inviteType !== 'phantom_instant') {
      console.log('⚠️ Test completed but unexpected invite type');
      console.log('   Expected: phantom_instant, Got:', result.inviteType);
    } else {
      console.log('❌ Test FAILED');
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testPhantomCircleInvite()
    .then(() => {
      console.log('\n🏁 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testPhantomCircleInvite };