// Script to backfill rating changes for existing games to create realistic rating history
import { collection, getDocs, writeBatch, doc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { logError } from './errors';
import { RATING_K_FACTOR, MIN_RATING, MAX_RATING } from './constants';

// ELO-style calculation functions (copied from actions.ts)
function getExpectedScore(rating1: number, rating2: number) {
  const ratingDiff = rating2 - rating1;
  return 1 / (1 + Math.pow(10, ratingDiff / 2));
}

function getNewRating(rating: number, expectedScore: number, actualScore: number) {
  const ratingChange = RATING_K_FACTOR * (actualScore - expectedScore) * 2;
  const newRating = rating + ratingChange;
  return Math.max(MIN_RATING, Math.min(MAX_RATING, newRating));
}

export async function backfillRatingHistory(): Promise<void> {
  console.log('Backfilling rating changes for existing games...');

  try {
    // Get all players first
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players: { [id: string]: { rating: number; name: string } } = {};

    playersSnapshot.forEach((doc) => {
      const playerData = doc.data();
      players[doc.id] = {
        rating: playerData.rating,
        name: playerData.name,
      };
    });

    console.log(`Found ${Object.keys(players).length} players`);

    // Get all games ordered by date (oldest first)
    const gamesSnapshot = await getDocs(query(collection(db, 'games'), orderBy('date', 'asc')));

    if (gamesSnapshot.empty) {
      console.log('No games found to backfill.');
      return;
    }

    console.log(`Found ${gamesSnapshot.size} games to process`);

    // Track current ratings as we process games chronologically
    const currentRatings: { [playerId: string]: number } = {};

    // Initialize all players with their default starting rating (3.5)
    Object.keys(players).forEach((playerId) => {
      currentRatings[playerId] = 3.5; // Default DUPR starting rating
    });

    const batch = writeBatch(db);
    let updated = 0;

    // Process games in chronological order
    gamesSnapshot.docs.forEach((gameDoc, index) => {
      const gameData = gameDoc.data();

      // Skip if already has rating changes
      if (gameData.ratingChanges) {
        console.log(`Game ${index + 1} already has rating changes, skipping`);
        return;
      }

      const team1PlayerIds = gameData.team1.playerIds;
      const team2PlayerIds = gameData.team2.playerIds;
      const allPlayerIds = [...team1PlayerIds, ...team2PlayerIds];

      console.log(
        `Processing game ${index + 1}: ${team1PlayerIds.join(',')} vs ${team2PlayerIds.join(',')}`
      );

      // Calculate team ratings
      const team1Rating =
        team1PlayerIds.reduce((sum: number, id: string) => sum + (currentRatings[id] || 3.5), 0) /
        team1PlayerIds.length;
      const team2Rating =
        team2PlayerIds.reduce((sum: number, id: string) => sum + (currentRatings[id] || 3.5), 0) /
        team2PlayerIds.length;

      // Calculate expected scores
      const expectedScoreTeam1 = getExpectedScore(team1Rating, team2Rating);
      const expectedScoreTeam2 = getExpectedScore(team2Rating, team1Rating);

      // Determine winner
      const team1Won = gameData.team1.score > gameData.team2.score;
      const actualScoreTeam1 = team1Won ? 1 : 0;
      const actualScoreTeam2 = team1Won ? 0 : 1;

      // Calculate new ratings and track changes
      const ratingChanges: { [playerId: string]: { before: number; after: number } } = {};

      allPlayerIds.forEach((playerId) => {
        const oldRating = currentRatings[playerId] || 3.5;
        const isTeam1 = team1PlayerIds.includes(playerId);

        const newRating = getNewRating(
          oldRating,
          isTeam1 ? expectedScoreTeam1 : expectedScoreTeam2,
          isTeam1 ? actualScoreTeam1 : actualScoreTeam2
        );

        ratingChanges[playerId] = { before: oldRating, after: newRating };
        currentRatings[playerId] = newRating; // Update current rating for next game

        console.log(
          `  ${players[playerId]?.name || playerId}: ${oldRating.toFixed(2)} → ${newRating.toFixed(2)}`
        );
      });

      // Update the game document with rating changes
      batch.update(doc(db, 'games', gameDoc.id), {
        ratingChanges,
      });

      updated++;
    });

    if (updated > 0) {
      await batch.commit();
      console.log(`Successfully backfilled rating changes for ${updated} games.`);
      console.log('Rating history is now available for all games!');
    } else {
      console.log('No games needed rating changes backfill.');
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'backfillRatingHistory');
    throw error;
  }
}
