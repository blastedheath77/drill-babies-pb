#!/usr/bin/env tsx

/**
 * Script to analyze and breakdown a player's form score
 * Usage: npx tsx scripts/analyze-player-form.ts "Player Name"
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_RATING = 3.5;

interface GameAnalysis {
  result: 'win' | 'loss' | 'draw';
  opponentAvgRating: number;
  scoreMargin: number;
  playerScore: number;
  opponentScore: number;
}

/**
 * Calculate quality multiplier for form scoring
 * - For wins: Higher multiplier when beating stronger opponents
 * - For losses: Higher multiplier (penalty) when losing to weaker opponents
 */
function getQualityMultiplier(
  playerRating: number,
  opponentAvgRating: number,
  isWin: boolean
): number {
  const ratingDiff = opponentAvgRating - playerRating;

  if (isWin) {
    // WINS: Beating stronger opponents = higher multiplier
    const multiplier = 1.0 + (ratingDiff * 0.25);
    return Math.max(0.5, Math.min(1.5, multiplier));
  } else {
    // LOSSES: Losing to weaker opponents = higher penalty
    const multiplier = 1.0 - (ratingDiff * 0.25);
    return Math.max(0.5, Math.min(1.5, multiplier));
  }
}

function analyzeGameForPlayer(
  game: any,
  playerId: string,
  playerCurrentRating: number
): GameAnalysis {
  const isTeam1 = game.team1.playerIds.includes(playerId);
  const playerTeam = isTeam1 ? game.team1 : game.team2;
  const opponentTeam = isTeam1 ? game.team2 : game.team1;

  const getPlayerRatingAtGame = (pid: string): number => {
    if (game.ratingChanges?.[pid]?.before) {
      return game.ratingChanges[pid].before;
    }
    return playerCurrentRating;
  };

  const opponentRatings = opponentTeam.playerIds.map(getPlayerRatingAtGame);
  const opponentAvgRating = opponentRatings.reduce((sum: number, r: number) => sum + r, 0) / opponentRatings.length;

  const playerScore = playerTeam.score;
  const opponentScore = opponentTeam.score;
  let result: 'win' | 'loss' | 'draw';

  if (playerScore > opponentScore) result = 'win';
  else if (playerScore < opponentScore) result = 'loss';
  else result = 'draw';

  const scoreMargin = Math.abs(playerScore - opponentScore);

  return {
    result,
    opponentAvgRating,
    scoreMargin,
    playerScore,
    opponentScore
  };
}

async function analyzePlayerForm(playerName: string) {
  console.log('='.repeat(70));
  console.log(`  FORM SCORE BREAKDOWN FOR: ${playerName.toUpperCase()}`);
  console.log('='.repeat(70));
  console.log('');

  try {
    // Find player by name
    const playersRef = collection(db, 'players');
    const playersQuery = query(playersRef);
    const playersSnapshot = await getDocs(playersQuery);

    let player: any = null;
    playersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.name.toLowerCase().includes(playerName.toLowerCase())) {
        player = { id: doc.id, ...data };
      }
    });

    if (!player) {
      console.log(`❌ Player "${playerName}" not found.`);
      process.exit(1);
    }

    console.log(`Player: ${player.name}`);
    console.log(`Current Rating: ${player.rating.toFixed(2)}`);
    console.log(`Overall Record: ${player.wins}W - ${player.losses}L${player.draws ? ` - ${player.draws}D` : ''}`);
    console.log('');

    // Get all games and filter client-side (to avoid index requirement)
    const gamesRef = collection(db, 'games');
    const gamesSnapshot = await getDocs(gamesRef);

    const allGames = gamesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter for player's games and sort by date
    const games = allGames
      .filter(game => game.playerIds && game.playerIds.includes(player.id))
      .sort((a, b) => {
        const dateA = a.date?.toDate?.() || new Date(0);
        const dateB = b.date?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

    const WINDOW_SIZE = 10;
    const recentGames = games.slice(0, WINDOW_SIZE);

    console.log(`Analyzing last ${recentGames.length} games...\n`);
    console.log('─'.repeat(70));

    let totalQualityPoints = 0;
    let wins = 0;
    let losses = 0;
    let draws = 0;

    recentGames.forEach((game, index) => {
      const analysis = analyzeGameForPlayer(game, player.id, player.rating);

      // Skip draws (contribute 0 points)
      if (analysis.result === 'draw') {
        draws++;
        const date = game.date?.toDate?.()?.toLocaleDateString() || 'Unknown';
        console.log(`Game ${index + 1} (${date}) ➖`);
        console.log(`  Score: ${analysis.playerScore}-${analysis.opponentScore}`);
        console.log(`  Result: DRAW (contributes 0 points)`);
        console.log('─'.repeat(70));
        return;
      }

      const isWin = analysis.result === 'win';

      // Calculate components
      const basePoints = isWin ? 1 : -1;
      const qualityMultiplier = getQualityMultiplier(
        player.rating,
        analysis.opponentAvgRating,
        isWin
      );
      const marginFactor = 0.7 + Math.min(analysis.scoreMargin / 10, 0.3);
      const gameScore = basePoints * qualityMultiplier * marginFactor;

      totalQualityPoints += gameScore;
      if (isWin) wins++;
      else losses++;

      // Format date
      const date = game.date?.toDate?.()?.toLocaleDateString() || 'Unknown';

      // Result indicator
      const resultEmoji = isWin ? '✅' : '❌';

      // Calculate rating difference for display
      const ratingDiff = analysis.opponentAvgRating - player.rating;

      console.log(`Game ${index + 1} (${date}) ${resultEmoji}`);
      console.log(`  Score: ${analysis.playerScore}-${analysis.opponentScore}`);
      console.log(`  Opponent Avg Rating: ${analysis.opponentAvgRating.toFixed(2)}`);
      console.log(`  Rating Difference: ${ratingDiff > 0 ? '+' : ''}${ratingDiff.toFixed(2)} (opponent ${ratingDiff > 0 ? 'stronger' : ratingDiff < 0 ? 'weaker' : 'equal'})`);
      console.log(`  Score Margin: ${analysis.scoreMargin} points`);
      console.log(``);
      console.log(`  Calculation:`);
      console.log(`    Base Points: ${basePoints > 0 ? '+' : ''}${basePoints.toFixed(2)} (${analysis.result})`);
      console.log(`    × Quality Multiplier: ${qualityMultiplier.toFixed(3)} (NEW ALGORITHM: ${isWin ? 'win bonus' : 'loss penalty'} for ${ratingDiff > 0 ? 'stronger' : 'weaker'} opponent)`);
      console.log(`    × Margin Factor: ${marginFactor.toFixed(3)} (${analysis.scoreMargin} point margin)`);
      console.log(`    = Game Score: ${gameScore > 0 ? '+' : ''}${gameScore.toFixed(3)}`);
      console.log('─'.repeat(70));
    });

    // Calculate final form score
    const avgQualityPerGame = totalQualityPoints / recentGames.length;
    const formScore = Math.max(0, Math.min(100, 50 + avgQualityPerGame * 25));
    const winRate = (wins / recentGames.length) * 100;

    let trend: 'up' | 'neutral' | 'down' = 'neutral';
    if (formScore >= 65) trend = 'up';
    else if (formScore <= 35) trend = 'down';

    console.log('');
    console.log('='.repeat(70));
    console.log('  FINAL FORM CALCULATION');
    console.log('='.repeat(70));
    console.log('');
    console.log(`Recent Record: ${wins}W - ${losses}L${draws > 0 ? ` - ${draws}D` : ''} (${recentGames.length} games)`);
    console.log(`Win Rate: ${winRate.toFixed(0)}%`);
    console.log('');
    console.log(`Total Quality Points: ${totalQualityPoints > 0 ? '+' : ''}${totalQualityPoints.toFixed(3)}`);
    console.log(`Average Per Game: ${avgQualityPerGame > 0 ? '+' : ''}${avgQualityPerGame.toFixed(3)}`);
    console.log('');
    console.log(`Form Score Calculation:`);
    console.log(`  Baseline: 50`);
    console.log(`  + (Avg Quality × 25): ${avgQualityPerGame > 0 ? '+' : ''}${(avgQualityPerGame * 25).toFixed(1)}`);
    console.log(`  = ${formScore.toFixed(0)}`);
    console.log('');

    const trendEmoji = trend === 'up' ? '↗️  GOOD FORM' : trend === 'down' ? '↘️  POOR FORM' : '→  NEUTRAL FORM';
    const color = formScore >= 65 ? '🟢' : formScore <= 35 ? '🔴' : '🟡';

    console.log(`${color} FINAL FORM SCORE: ${formScore.toFixed(0)}/100 ${trendEmoji}`);
    console.log('');
    console.log('Form Score Ranges:');
    console.log('  🟢 65-100: Good Form (winning against quality opponents)');
    console.log('  🟡 35-64:  Neutral Form (expected performance)');
    console.log('  🔴 0-34:   Poor Form (losing to weaker opponents)');
    console.log('');
    console.log('='.repeat(70));

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

const playerName = process.argv[2];
if (!playerName) {
  console.log('Usage: npx tsx scripts/analyze-player-form.ts "Player Name"');
  process.exit(1);
}

analyzePlayerForm(playerName);
