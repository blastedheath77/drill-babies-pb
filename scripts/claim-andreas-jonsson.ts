#!/usr/bin/env tsx

/**
 * Script to claim Andreas Jonsson player for dreas.jonsson@gmail.com
 * This is a migration script to help existing players get claimed by users
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

// Initialize Firebase (using environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Player {
  id: string;
  name: string;
  email?: string;
  isPhantom?: boolean;
  claimedByUserId?: string;
  rating?: number;
  wins?: number;
  losses?: number;
  [key: string]: any;
}

interface User {
  id: string;
  name?: string;
  email: string;
  [key: string]: any;
}

async function findAndreasJonssonPlayer(): Promise<Player | null> {
  console.log('🔍 Searching for Andreas Jonsson player...');
  
  try {
    // First, let's get ALL players and search through them
    const playersRef = collection(db, 'players');
    
    console.log('📡 Connecting to Firestore...');
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firestore query timeout')), 30000);
    });
    
    const snapshot = await Promise.race([
      getDocs(playersRef),
      timeoutPromise
    ]) as any;
    
    console.log(`📊 Total players found: ${snapshot.docs.length}`);
    
    const candidates: Player[] = [];
    const allPlayers: Player[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const player = { id: doc.id, ...data } as Player;
      allPlayers.push(player);
      
      if (data.name) {
        const nameLC = data.name.toLowerCase();
        // Look for various forms of Andreas Jonsson
        if ((nameLC.includes('andreas') && nameLC.includes('jonsson')) ||
            (nameLC.includes('andre') && nameLC.includes('jonsson')) ||
            nameLC === 'andreas jonsson' ||
            nameLC === 'andreas' ||
            nameLC.includes('dreas')) {
          candidates.push(player);
        }
      }
    });
    
    // Show some sample players for debugging
    console.log('📋 Sample players (first 10):');
    allPlayers.slice(0, 10).forEach(player => {
      console.log(`  - ${player.name} (ID: ${player.id}) - Games: ${(player.wins || 0) + (player.losses || 0)}`);
    });
    
    console.log(`\n🎯 Found ${candidates.length} potential Andreas candidates:`);
    candidates.forEach((player, index) => {
      console.log(`  ${index + 1}. "${player.name}" (ID: ${player.id}) - Games: ${(player.wins || 0) + (player.losses || 0)}, Rating: ${player.rating}`);
    });
    
    if (candidates.length === 0) {
      console.log('❌ No Andreas Jonsson player found');
      console.log('💡 Try looking at the sample players above - maybe the name is different?');
      return null;
    }
    
    if (candidates.length === 1) {
      console.log('✅ Found Andreas Jonsson player:', {
        id: candidates[0].id,
        name: candidates[0].name,
        email: candidates[0].email,
        isPhantom: candidates[0].isPhantom,
        claimedByUserId: candidates[0].claimedByUserId,
        rating: candidates[0].rating,
        wins: candidates[0].wins,
        losses: candidates[0].losses
      });
      return candidates[0];
    }
    
    // Multiple candidates found
    console.log('🤔 Multiple Andreas Jonsson candidates found:');
    candidates.forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.name} (ID: ${player.id}) - Rating: ${player.rating}, Games: ${(player.wins || 0) + (player.losses || 0)}`);
    });
    
    // Return the one with the most games played (likely the main one)
    const mainPlayer = candidates.reduce((prev, current) => {
      const prevGames = (prev.wins || 0) + (prev.losses || 0);
      const currentGames = (current.wins || 0) + (current.losses || 0);
      return currentGames > prevGames ? current : prev;
    });
    
    console.log('🎯 Selecting player with most games:', mainPlayer.name, `(${(mainPlayer.wins || 0) + (mainPlayer.losses || 0)} games)`);
    return mainPlayer;
    
  } catch (error) {
    console.error('❌ Error finding Andreas Jonsson player:', error);
    return null;
  }
}

async function findOrCreateUser(email: string): Promise<User | null> {
  console.log(`🔍 Looking for user with email: ${email}`);
  
  try {
    // Check if user already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const user = { id: userDoc.id, ...userDoc.data() } as User;
      console.log('✅ Found existing user:', {
        id: user.id,
        name: user.name,
        email: user.email
      });
      return user;
    }
    
    console.log('❌ User not found. You need to create the user account first.');
    console.log('   Please sign up at the application with this email address first, then run this script again.');
    return null;
    
  } catch (error) {
    console.error('❌ Error finding user:', error);
    return null;
  }
}

async function makePlayerPhantomAndClaimable(player: Player, targetEmail: string): Promise<boolean> {
  console.log(`🔄 Making player ${player.name} a phantom player with email ${targetEmail}...`);
  
  try {
    const playerRef = doc(db, 'players', player.id);
    
    const updateData = {
      isPhantom: true,
      email: targetEmail.toLowerCase().trim(),
      // Don't change the name or stats, just make it claimable
    };
    
    await updateDoc(playerRef, updateData);
    console.log('✅ Player updated to be phantom and claimable');
    return true;
    
  } catch (error) {
    console.error('❌ Error making player phantom:', error);
    return false;
  }
}

async function claimPlayerForUser(player: Player, user: User): Promise<boolean> {
  console.log(`🎯 Claiming player ${player.name} for user ${user.email}...`);
  
  try {
    const playerRef = doc(db, 'players', player.id);
    
    const claimData = {
      claimedByUserId: user.id,
      claimedAt: new Date().toISOString(),
      isPhantom: false, // No longer phantom once claimed
      // Keep the original name - don't change it to user's name
    };
    
    await updateDoc(playerRef, claimData);
    
    // Create audit log
    const auditLog = {
      playerId: player.id,
      playerName: player.name,
      claimedByUserId: user.id,
      claimedByUserName: user.name || user.email,
      claimedAt: new Date().toISOString(),
      originalEmail: player.email,
      migrationClaim: true, // Mark this as a migration claim
    };
    
    await addDoc(collection(db, 'playerClaimLogs'), auditLog);
    
    console.log('✅ Player successfully claimed and audit log created');
    return true;
    
  } catch (error) {
    console.error('❌ Error claiming player:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Andreas Jonsson player claiming process...\n');
  
  const targetEmail = 'dreas.jonsson@gmail.com';
  
  // Step 1: Find Andreas Jonsson player
  const player = await findAndreasJonssonPlayer();
  if (!player) {
    console.log('❌ Cannot continue without finding Andreas Jonsson player');
    return;
  }
  
  // Step 2: Find the target user
  const user = await findOrCreateUser(targetEmail);
  if (!user) {
    console.log('❌ Cannot continue without target user account');
    return;
  }
  
  // Step 3: Check if player is already claimed
  if (player.claimedByUserId) {
    console.log('⚠️  Player is already claimed by user:', player.claimedByUserId);
    if (player.claimedByUserId === user.id) {
      console.log('✅ Player is already claimed by the target user. Nothing to do!');
      return;
    } else {
      console.log('❌ Player is claimed by a different user. Manual intervention required.');
      return;
    }
  }
  
  // Step 4: Check if player is already phantom with the correct email
  if (player.isPhantom && player.email === targetEmail.toLowerCase().trim()) {
    console.log('✅ Player is already phantom with correct email, proceeding to claim...');
  } else {
    // Step 5: Make player phantom and claimable
    console.log('\n📝 Making player phantom and claimable...');
    const success = await makePlayerPhantomAndClaimable(player, targetEmail);
    if (!success) {
      console.log('❌ Failed to make player phantom. Cannot continue.');
      return;
    }
  }
  
  // Step 6: Claim the player
  console.log('\n🎯 Claiming player for user...');
  const claimSuccess = await claimPlayerForUser(player, user);
  if (!claimSuccess) {
    console.log('❌ Failed to claim player.');
    return;
  }
  
  console.log('\n🎉 SUCCESS! Andreas Jonsson player has been claimed by dreas.jonsson@gmail.com');
  console.log(`   Player ID: ${player.id}`);
  console.log(`   Player Name: ${player.name}`);
  console.log(`   User ID: ${user.id}`);
  console.log(`   Games Played: ${(player.wins || 0) + (player.losses || 0)}`);
  console.log(`   Current Rating: ${player.rating || 3.5}`);
}

// Run the script
main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});