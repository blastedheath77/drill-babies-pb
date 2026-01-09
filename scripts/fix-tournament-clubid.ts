#!/usr/bin/env tsx
/**
 * Fix tournaments missing clubId by inferring from their players
 * Usage:
 *   tsx scripts/fix-tournament-clubid.ts [tournamentId]
 *   - If tournamentId provided: fixes that specific tournament
 *   - If no argument: fixes all tournaments without clubId
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixTournament(tournamentId: string) {
  console.log(`\n🔧 Fixing tournament: ${tournamentId}`);

  try {
    // Get the tournament
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) {
      console.error(`❌ Tournament ${tournamentId} not found`);
      return false;
    }

    const tournament = tournamentSnap.data();

    // Check if it already has a clubId
    if (tournament.clubId) {
      console.log(`ℹ️  Tournament already has clubId: ${tournament.clubId}`);
      return true;
    }

    // Get the first player to infer the clubId
    if (!tournament.playerIds || tournament.playerIds.length === 0) {
      console.error(`❌ Tournament has no players`);
      return false;
    }

    const firstPlayerId = tournament.playerIds[0];
    console.log(`   Looking up player: ${firstPlayerId}`);

    const playerRef = doc(db, 'players', firstPlayerId);
    const playerSnap = await getDoc(playerRef);

    if (!playerSnap.exists()) {
      console.error(`❌ Player ${firstPlayerId} not found`);
      return false;
    }

    const player = playerSnap.data();

    if (!player.clubId) {
      console.error(`❌ Player has no clubId`);
      return false;
    }

    // Update the tournament with the clubId
    await updateDoc(tournamentRef, {
      clubId: player.clubId
    });

    console.log(`✅ Successfully added clubId: ${player.clubId}`);
    return true;

  } catch (error) {
    console.error(`❌ Error fixing tournament:`, error);
    return false;
  }
}

async function fixAllTournaments() {
  console.log('🔍 Finding all tournaments without clubId...\n');

  try {
    const tournamentsSnap = await getDocs(collection(db, 'tournaments'));
    const tournamentsToFix = tournamentsSnap.docs.filter(doc => !doc.data().clubId);

    if (tournamentsToFix.length === 0) {
      console.log('✅ No tournaments found without clubId');
      return;
    }

    console.log(`📋 Found ${tournamentsToFix.length} tournament(s) without clubId`);

    let fixed = 0;
    for (const tournamentDoc of tournamentsToFix) {
      const success = await fixTournament(tournamentDoc.id);
      if (success) fixed++;
    }

    console.log(`\n✅ Fixed ${fixed}/${tournamentsToFix.length} tournaments`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length > 0) {
  // Fix specific tournament ID
  const tournamentId = args[0];
  fixTournament(tournamentId)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Unhandled error:', error);
      process.exit(1);
    });
} else {
  // Fix all tournaments without clubId
  fixAllTournaments()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Unhandled error:', error);
      process.exit(1);
    });
}
