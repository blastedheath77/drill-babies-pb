#!/usr/bin/env tsx

/**
 * Script to simulate proposed ELO rating algorithm changes
 * Compares current algorithm vs proposed "underdog multiplier" approach
 * Usage: npx tsx scripts/simulate-rating-changes.ts
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  documentId,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Constants (same as in the app)
const RATING_K_FACTOR = 0.08;
const DEFAULT_RATING = 3.5;

// ============== CURRENT ALGORITHM ==============

function getExpectedScore(rating1: number, rating2: number): number {
  const ratingDiff = rating2 - rating1;
  return 1 / (1 + Math.pow(10, ratingDiff / 2));
}

function getScoreMarginMultiplier(winnerScore: number, loserScore: number): number {
  const scoreDifference = winnerScore - loserScore;
  const multiplier = 0.7 + (scoreDifference - 1) * 0.075;
  return Math.max(0.5, Math.min(1.5, multiplier));
}

function getPerformanceMultiplier(
  playerRating: number,
  teamRating: number,
  gameType: string,
  isWinner: boolean
): number {
  if (gameType === 'singles') {
    return 1.0;
  }

  const ratingDifference = playerRating - teamRating;

  if (isWinner) {
    const multiplier = 1.0 - ratingDifference * 0.25;
    return Math.max(0.6, Math.min(1.4, multiplier));
  } else {
    const multiplier = 1.0 + ratingDifference * 0.25;
    return Math.max(0.6, Math.min(1.4, multiplier));
  }
}

function getCurrentAlgorithmChange(
  playerRating: number,
  expectedScore: number,
  actualScore: number,
  marginMultiplier: number,
  performanceMultiplier: number
): number {
  const baseChange = RATING_K_FACTOR * (actualScore - expectedScore) * 2;
  return baseChange * marginMultiplier * performanceMultiplier;
}

// ============== PROPOSED ALGORITHM (with underdog multiplier + individual protection) ==============

const UNDERDOG_COEFFICIENT = 0.10; // Team-level underdog bonus/penalty
const GLOBAL_AVG_RATING = 3.5; // Reference point for "high" vs "low" rated players
const INDIVIDUAL_COEFFICIENT = 0.45; // Individual rating adjustment

function getUnderdogMultiplier(
  playerRating: number,
  ownTeamRating: number,
  opponentTeamRating: number,
  isWinner: boolean
): number {
  // Team rating difference: positive means player's team is favored
  const teamRatingDiff = ownTeamRating - opponentTeamRating;

  // Player's rating relative to global average
  // Positive = above average (high-rated), Negative = below average (low-rated)
  const playerVsGlobal = playerRating - GLOBAL_AVG_RATING;

  if (isWinner) {
    // WINNERS get underdog bonus based on team comparison
    // Low-rated players on underdog teams get the biggest bonus
    const teamMultiplier = 1.0 - teamRatingDiff * UNDERDOG_COEFFICIENT;

    // Additional bonus for low-rated winners (they're proving themselves)
    // High-rated winners get slightly less (expected to win)
    const individualBonus = 1.0 - playerVsGlobal * 0.15;

    const combined = teamMultiplier * Math.max(0.8, Math.min(1.2, individualBonus));
    return Math.max(0.7, Math.min(1.5, combined));
  } else {
    // LOSERS:
    // Team-based: favorites who lose get penalized more (but smaller factor)
    const teamMultiplier = 1.0 + teamRatingDiff * UNDERDOG_COEFFICIENT;

    // Individual-based (STRONGER): HIGH-rated players who lose should lose MORE
    // LOW-rated players who lose should lose LESS (they're expected to struggle)
    // Using stronger coefficient so individual protection can overcome team penalty
    const individualMultiplier = 1.0 + playerVsGlobal * INDIVIDUAL_COEFFICIENT;

    const combined = teamMultiplier * Math.max(0.5, Math.min(1.5, individualMultiplier));
    return Math.max(0.5, Math.min(1.6, combined));
  }
}

function getProposedAlgorithmChange(
  playerRating: number,
  expectedScore: number,
  actualScore: number,
  marginMultiplier: number,
  performanceMultiplier: number,
  underdogMultiplier: number
): number {
  const baseChange = RATING_K_FACTOR * (actualScore - expectedScore) * 2;
  return baseChange * marginMultiplier * performanceMultiplier * underdogMultiplier;
}

// ============== SIMULATION ==============

interface PlayerData {
  id: string;
  name: string;
  rating: number;
}

interface GameData {
  id: string;
  type: string;
  date: any;
  team1: { playerIds: string[]; score: number };
  team2: { playerIds: string[]; score: number };
  ratingChanges?: { [playerId: string]: { before: number; after: number } };
}

async function simulateRatingChanges() {
  console.log('='.repeat(60));
  console.log('      RATING ALGORITHM SIMULATION');
  console.log('      Comparing Current vs Proposed (with Underdog Multiplier)');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Fetch recent games
    const gamesRef = collection(db, 'games');
    const gamesQuery = query(gamesRef, orderBy('date', 'desc'), limit(20));
    const gamesSnapshot = await getDocs(gamesQuery);

    if (gamesSnapshot.empty) {
      console.log('No games found in database.');
      process.exit(0);
    }

    const games: GameData[] = [];
    const allPlayerIds = new Set<string>();

    gamesSnapshot.docs.forEach((doc) => {
      const data = doc.data() as any;
      games.push({
        id: doc.id,
        type: data.type,
        date: data.date,
        team1: data.team1,
        team2: data.team2,
        ratingChanges: data.ratingChanges,
      });

      // Collect player IDs
      data.team1.playerIds.forEach((id: string) => allPlayerIds.add(id));
      data.team2.playerIds.forEach((id: string) => allPlayerIds.add(id));
    });

    // Fetch all players
    const playerIdsArray = Array.from(allPlayerIds);
    const players: { [id: string]: PlayerData } = {};

    // Batch fetch players (Firestore limit is 30 per 'in' query)
    for (let i = 0; i < playerIdsArray.length; i += 30) {
      const batch = playerIdsArray.slice(i, i + 30);
      const playersQuery = query(
        collection(db, 'players'),
        where(documentId(), 'in', batch)
      );
      const playersSnapshot = await getDocs(playersQuery);
      playersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        players[doc.id] = {
          id: doc.id,
          name: data.name || 'Unknown',
          rating: data.rating || DEFAULT_RATING,
        };
      });
    }

    console.log(`Found ${games.length} games to analyze\n`);

    // Track overall statistics
    let totalGamesAnalyzed = 0;
    const differences: number[] = [];

    // Process each game
    for (const game of games) {
      if (!game.team1 || !game.team2 || !game.ratingChanges) {
        continue;
      }

      const team1Score = game.team1.score;
      const team2Score = game.team2.score;
      const team1Won = team1Score > team2Score;
      const isDraw = team1Score === team2Score;

      if (isDraw) {
        continue; // Skip draws for simplicity
      }

      // Get player names and ratings at time of game
      const team1Players = game.team1.playerIds.map((id) => {
        const ratingAtGame = game.ratingChanges![id]?.before || players[id]?.rating || DEFAULT_RATING;
        return {
          id,
          name: players[id]?.name || id.slice(0, 8),
          rating: ratingAtGame,
        };
      });

      const team2Players = game.team2.playerIds.map((id) => {
        const ratingAtGame = game.ratingChanges![id]?.before || players[id]?.rating || DEFAULT_RATING;
        return {
          id,
          name: players[id]?.name || id.slice(0, 8),
          rating: ratingAtGame,
        };
      });

      // Calculate team ratings
      const team1Rating = team1Players.reduce((sum, p) => sum + p.rating, 0) / team1Players.length;
      const team2Rating = team2Players.reduce((sum, p) => sum + p.rating, 0) / team2Players.length;

      // Calculate expected scores
      const expectedScoreTeam1 = getExpectedScore(team1Rating, team2Rating);
      const expectedScoreTeam2 = getExpectedScore(team2Rating, team1Rating);

      // Actual scores (1 for win, 0 for loss)
      const actualScoreTeam1 = team1Won ? 1 : 0;
      const actualScoreTeam2 = team1Won ? 0 : 1;

      // Margin multiplier
      const marginMultiplier = getScoreMarginMultiplier(
        team1Won ? team1Score : team2Score,
        team1Won ? team2Score : team1Score
      );

      const gameType = game.type === 'Singles' ? 'singles' : 'doubles';

      // Print game header
      console.log('-'.repeat(60));
      const dateStr = game.date?.toDate?.()?.toLocaleDateString() || 'Unknown date';
      console.log(`Game: ${dateStr} | Score: ${team1Score}-${team2Score} | ${game.type}`);
      console.log('');

      const team1Names = team1Players.map((p) => `${p.name} (${p.rating.toFixed(2)})`).join(' + ');
      const team2Names = team2Players.map((p) => `${p.name} (${p.rating.toFixed(2)})`).join(' + ');
      console.log(`Team 1${team1Won ? ' (W)' : ' (L)'}: ${team1Names}`);
      console.log(`Team 2${!team1Won ? ' (W)' : ' (L)'}: ${team2Names}`);
      console.log(`Team Avg: ${team1Rating.toFixed(2)} vs ${team2Rating.toFixed(2)} | Diff: ${(team1Rating - team2Rating).toFixed(2)}`);
      console.log('');

      // Calculate for each player
      console.log('Player          Current    Proposed   Diff       Notes');
      console.log(''.padEnd(75, '-'));

      const allPlayers = [
        ...team1Players.map((p) => ({ ...p, team: 1, isWinner: team1Won })),
        ...team2Players.map((p) => ({ ...p, team: 2, isWinner: !team1Won })),
      ];

      for (const player of allPlayers) {
        const teamRating = player.team === 1 ? team1Rating : team2Rating;
        const opponentTeamRating = player.team === 1 ? team2Rating : team1Rating;
        const expectedScore = player.team === 1 ? expectedScoreTeam1 : expectedScoreTeam2;
        const actualScore = player.team === 1 ? actualScoreTeam1 : actualScoreTeam2;

        // Current algorithm
        const performanceMultiplier = getPerformanceMultiplier(
          player.rating,
          teamRating,
          gameType,
          player.isWinner
        );
        const currentChange = getCurrentAlgorithmChange(
          player.rating,
          expectedScore,
          actualScore,
          marginMultiplier,
          performanceMultiplier
        );

        // Proposed algorithm
        const underdogMultiplier = getUnderdogMultiplier(
          player.rating,
          teamRating,
          opponentTeamRating,
          player.isWinner
        );
        const proposedChange = getProposedAlgorithmChange(
          player.rating,
          expectedScore,
          actualScore,
          marginMultiplier,
          performanceMultiplier,
          underdogMultiplier
        );

        const diff = proposedChange - currentChange;
        differences.push(Math.abs(diff));

        // Generate notes
        let notes = '';
        const teamDiff = teamRating - opponentTeamRating;
        if (player.isWinner && teamDiff < -0.3) {
          notes = 'underdog bonus';
        } else if (player.isWinner && teamDiff > 0.3) {
          notes = 'favorite reduced';
        } else if (!player.isWinner && teamDiff > 0.3) {
          notes = 'upset penalty';
        } else if (!player.isWinner && teamDiff < -0.3) {
          notes = 'expected loss';
        }

        const formatChange = (c: number) => (c >= 0 ? '+' : '') + c.toFixed(3);
        const formatDiff = (d: number) => (d >= 0 ? '+' : '') + d.toFixed(3);

        const name = player.name.slice(0, 14).padEnd(14);
        console.log(
          `${name}  ${formatChange(currentChange).padStart(8)}   ${formatChange(proposedChange).padStart(8)}   ${formatDiff(diff).padStart(6)}     ${notes}`
        );
      }

      console.log('');
      totalGamesAnalyzed++;
    }

    // Print summary
    console.log('='.repeat(60));
    console.log('                    SUMMARY');
    console.log('='.repeat(60));
    console.log(`Games analyzed: ${totalGamesAnalyzed}`);

    if (differences.length > 0) {
      const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
      const maxDiff = Math.max(...differences);
      console.log(`Average change difference: ${avgDiff.toFixed(4)}`);
      console.log(`Maximum change difference: ${maxDiff.toFixed(4)}`);
    }

    console.log('');
    console.log('Key changes with proposed algorithm:');
    console.log('- Underdogs who WIN get bonus (up to 1.5x)');
    console.log('- Favorites who WIN get reduced gains (down to 0.7x)');
    console.log('- Underdogs who LOSE get reduced penalty (down to 0.7x)');
    console.log('- Favorites who LOSE get increased penalty (up to 1.5x)');
    console.log('');

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

simulateRatingChanges();
