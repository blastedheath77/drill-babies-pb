#!/usr/bin/env tsx

/**
 * Migration Script: Convert all existing Players to Phantom Players
 * 
 * This script marks all current Player records as phantom players since
 * they were created before the user-centric system was implemented.
 * 
 * Run with: npx tsx scripts/migrate-players-to-phantom.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

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
  [key: string]: any;
}

async function migratePlayersToPhantom() {
  console.log('🚀 Starting player migration to phantom status...');
  
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
    
    console.log(`📊 Found ${players.length} players to migrate`);
    
    // Analyze current state
    let alreadyPhantom = 0;
    let alreadyClaimed = 0;
    let needsMigration = 0;
    
    players.forEach((player) => {
      if (player.isPhantom === true) {
        alreadyPhantom++;
      } else if (player.claimedByUserId) {
        alreadyClaimed++;
      } else {
        needsMigration++;
      }
    });
    
    console.log('📈 Current state analysis:');
    console.log(`   - Already phantom: ${alreadyPhantom}`);
    console.log(`   - Already claimed: ${alreadyClaimed}`);
    console.log(`   - Needs migration: ${needsMigration}`);
    
    if (needsMigration === 0) {
      console.log('✅ All players are already properly configured!');
      return;
    }
    
    // Confirm migration
    console.log(`\n⚠️ About to migrate ${needsMigration} players to phantom status...`);
    console.log('This will:');
    console.log('- Set isPhantom: true for unclaimed players');
    console.log('- Set createdAt timestamp if missing');
    console.log('- Leave claimed players unchanged');
    
    // For production, you might want to add a confirmation prompt here
    // For now, proceeding automatically
    
    // Perform migration in batches
    const batchSize = 500; // Firestore batch limit
    let updatedCount = 0;
    
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchPlayers = players.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}...`);
      
      for (const player of batchPlayers) {
        // Skip if already properly configured
        if (player.isPhantom === true || player.claimedByUserId) {
          continue;
        }
        
        const playerRef = doc(db, 'players', player.id);
        const updateData: Partial<Player> = {
          isPhantom: true,
        };
        
        // Add createdAt if missing
        if (!player.createdAt) {
          updateData.createdAt = new Date().toISOString();
        }
        
        // Add createdBy if missing (set to 'migration' to indicate it was migrated)
        if (!player.createdBy) {
          updateData.createdBy = 'migration';
        }
        
        batch.update(playerRef, updateData);
        updatedCount++;
        
        console.log(`   ✓ Queued ${player.name} (${player.id}) for phantom migration`);
      }
      
      if (updatedCount > 0) {
        console.log(`💾 Committing batch with ${Math.min(batchSize, updatedCount - (i))} updates...`);
        await batch.commit();
        console.log('   ✅ Batch committed successfully');
      }
    }
    
    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`   - ${updatedCount} players migrated to phantom status`);
    console.log(`   - ${alreadyPhantom} players were already phantom`);
    console.log(`   - ${alreadyClaimed} players were already claimed (unchanged)`);
    
    // Final verification
    console.log('\n🔍 Verifying migration...');
    const verificationSnapshot = await getDocs(playersRef);
    let phantomCount = 0;
    let claimedCount = 0;
    let unknownCount = 0;
    
    verificationSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.isPhantom === true) {
        phantomCount++;
      } else if (data.claimedByUserId) {
        claimedCount++;
      } else {
        unknownCount++;
        console.log(`⚠️ Player ${data.name} (${doc.id}) has unclear status`);
      }
    });
    
    console.log('📊 Final verification:');
    console.log(`   - Phantom players: ${phantomCount}`);
    console.log(`   - Claimed players: ${claimedCount}`);
    console.log(`   - Unknown status: ${unknownCount}`);
    
    if (unknownCount === 0) {
      console.log('✅ All players properly categorized!');
    } else {
      console.log('⚠️ Some players may need manual review');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  migratePlayersToPhantom()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migratePlayersToPhantom };