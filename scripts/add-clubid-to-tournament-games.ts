#!/usr/bin/env tsx
/**
 * Migration Script: Add clubId to tournament games
 *
 * This script updates all games that have a tournamentId but no clubId.
 * It looks up each tournament to get the clubId and assigns it to the game.
 *
 * Usage:
 *   npx tsx scripts/add-clubid-to-tournament-games.ts          # Dry run (preview)
 *   npx tsx scripts/add-clubid-to-tournament-games.ts --run    # Actually update
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Check if --run flag is provided
const isDryRun = !process.argv.includes('--run');

async function addClubIdToTournamentGames() {
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('💡 Run with --run flag to apply changes\n');
  } else {
    console.log('⚠️  LIVE MODE - Changes will be applied to the database\n');
  }

  console.log('🔄 Starting migration to add clubId to tournament games...\n');

  try {
    // Get all games
    const gamesRef = collection(db, 'games');
    const gamesSnapshot = await getDocs(gamesRef);

    console.log(`📊 Found ${gamesSnapshot.size} total games\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let noTournamentCount = 0;
    let tournamentNotFoundCount = 0;

    // Cache for tournament data to avoid repeated lookups
    const tournamentCache = new Map<string, { clubId: string; name: string }>();

    // Process each game
    for (const gameDoc of gamesSnapshot.docs) {
      const gameData = gameDoc.data();
      const gameId = gameDoc.id;
      const gameDate = gameData.date?.toDate ? gameData.date.toDate().toLocaleDateString() : 'Unknown date';
      const gameType = gameData.type || 'Unknown';
      const tournamentId = gameData.tournamentId;

      // Skip if game already has a clubId
      if (gameData.clubId) {
        console.log(`⏭️  Skipping ${gameType} game from ${gameDate} - already has clubId`);
        skippedCount++;
        continue;
      }

      // Skip if game doesn't have a tournamentId
      if (!tournamentId) {
        console.log(`⏭️  Skipping ${gameType} game from ${gameDate} - not a tournament game`);
        noTournamentCount++;
        continue;
      }

      try {
        // Get tournament data (use cache if available)
        let tournament = tournamentCache.get(tournamentId);

        if (!tournament) {
          const tournamentRef = doc(db, 'tournaments', tournamentId);
          const tournamentSnap = await getDoc(tournamentRef);

          if (!tournamentSnap.exists()) {
            console.log(`⚠️  Tournament ${tournamentId} not found for game ${gameId}`);
            tournamentNotFoundCount++;
            continue;
          }

          const tournamentData = tournamentSnap.data();
          tournament = {
            clubId: tournamentData.clubId,
            name: tournamentData.name || 'Unknown'
          };

          // Cache the tournament data
          tournamentCache.set(tournamentId, tournament);
        }

        if (!tournament.clubId) {
          console.log(`⚠️  Tournament "${tournament.name}" (${tournamentId}) has no clubId - skipping game ${gameId}`);
          errorCount++;
          continue;
        }

        // Update game with tournament's clubId
        if (isDryRun) {
          console.log(`[DRY RUN] Would update ${gameType} game from ${gameDate} - assign clubId from tournament "${tournament.name}"`);
        } else {
          const gameRef = doc(db, 'games', gameId);
          await updateDoc(gameRef, {
            clubId: tournament.clubId
          });
          console.log(`✅ Updated ${gameType} game from ${gameDate} - assigned clubId from tournament "${tournament.name}"`);
        }

        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating game ${gameId}:`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total games found:                    ${gamesSnapshot.size}`);
    console.log(`✅ ${isDryRun ? 'Would update' : 'Successfully updated'}:               ${updatedCount}`);
    console.log(`⏭️  Skipped (already had clubId):      ${skippedCount}`);
    console.log(`⏭️  Skipped (not tournament games):    ${noTournamentCount}`);
    console.log(`⚠️  Tournament not found:              ${tournamentNotFoundCount}`);
    console.log(`❌ Errors:                             ${errorCount}`);
    console.log('='.repeat(70));

    if (isDryRun) {
      console.log('\n💡 This was a DRY RUN - no changes were made');
      console.log('   Run with --run flag to apply these changes:');
      console.log('   npx tsx scripts/add-clubid-to-tournament-games.ts --run');
    } else if (errorCount === 0) {
      console.log('\n✨ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review the output above.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
addClubIdToTournamentGames()
  .then(() => {
    console.log('\n👋 Migration script finished. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });
