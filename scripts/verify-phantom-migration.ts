#!/usr/bin/env tsx

/**
 * Verification Script: Check Player Phantom Migration Status
 * 
 * This script verifies the status of all players after phantom migration
 * and provides a detailed breakdown of the current state.
 * 
 * Run with: npx tsx scripts/verify-phantom-migration.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

interface Player {
  id: string;
  name: string;
  isPhantom?: boolean;
  claimedByUserId?: string;
  createdBy?: string;
  createdAt?: string;
  claimedAt?: string;
  [key: string]: any;
}

async function verifyPhantomMigration() {
  console.log('🔍 Verifying phantom migration status...');
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  try {
    // Get all players
    console.log('📖 Fetching all players...');
    const playersRef = collection(db, 'players');
    const playersSnapshot = await getDocs(playersRef);
    
    if (playersSnapshot.empty) {
      console.log('ℹ️ No players found in database.');
      return;
    }
    
    const players: Player[] = [];
    playersSnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() } as Player);
    });
    
    console.log(`📊 Found ${players.length} total players\n`);
    
    // Categorize players
    const phantomPlayers: Player[] = [];
    const claimedPlayers: Player[] = [];
    const unknownPlayers: Player[] = [];
    
    players.forEach((player) => {
      if (player.isPhantom === true) {
        phantomPlayers.push(player);
      } else if (player.claimedByUserId) {
        claimedPlayers.push(player);
      } else {
        unknownPlayers.push(player);
      }
    });
    
    // Display results
    console.log('📈 Player Status Summary:');
    console.log(`   🆔 Phantom Players: ${phantomPlayers.length}`);
    console.log(`   👤 Claimed Players: ${claimedPlayers.length}`);
    console.log(`   ❓ Unknown Status: ${unknownPlayers.length}\n`);
    
    // Show phantom players
    if (phantomPlayers.length > 0) {
      console.log('👻 Phantom Players:');
      phantomPlayers.forEach((player) => {
        console.log(`   - ${player.name} (${player.id})`);
        if (player.createdBy) {
          console.log(`     Created by: ${player.createdBy}`);
        }
        if (player.createdAt) {
          console.log(`     Created at: ${new Date(player.createdAt).toLocaleDateString()}`);
        }
      });
      console.log('');
    }
    
    // Show claimed players
    if (claimedPlayers.length > 0) {
      console.log('🔗 Claimed Players:');
      claimedPlayers.forEach((player) => {
        console.log(`   - ${player.name} (${player.id})`);
        console.log(`     Claimed by user: ${player.claimedByUserId}`);
        if (player.claimedAt) {
          console.log(`     Claimed at: ${new Date(player.claimedAt).toLocaleDateString()}`);
        }
      });
      console.log('');
    }
    
    // Show unknown status players (should be none)
    if (unknownPlayers.length > 0) {
      console.log('⚠️ Players with Unknown Status:');
      unknownPlayers.forEach((player) => {
        console.log(`   - ${player.name} (${player.id})`);
        console.log(`     isPhantom: ${player.isPhantom}`);
        console.log(`     claimedByUserId: ${player.claimedByUserId}`);
      });
      console.log('');
    }
    
    // Final status
    if (unknownPlayers.length === 0) {
      console.log('✅ Migration verified successfully! All players are properly categorized.');
    } else {
      console.log('⚠️ Some players may need manual review.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run the verification
if (require.main === module) {
  verifyPhantomMigration()
    .then(() => {
      console.log('🏁 Verification completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

export { verifyPhantomMigration };