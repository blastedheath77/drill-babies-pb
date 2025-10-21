// Analysis script to compare Stuart vs Mhari as Andreas's ally
// Run with: node analyze-andreas-ally.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBHca7wjkKS-O8YD4ovKJxz2DQNio2yfwo",
  authDomain: "pbstats-5e7fe.firebaseapp.com",
  projectId: "pbstats-5e7fe",
  storageBucket: "pbstats-5e7fe.firebasestorage.app",
  messagingSenderId: "868442856125",
  appId: "1:868442856125:web:a8cd6da8ca1e823f5ba8b0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ELO expected win rate calculation
function calculateExpectedWinRate(playerRating, opponentRating) {
  const ratingDiff = opponentRating - playerRating;
  return 1 / (1 + Math.pow(10, ratingDiff / 400));
}

async function analyzeAndreasAlly() {
  console.log('\n=== ANDREAS JONSSON ALLY ANALYSIS ===\n');

  // Get all players
  const playersSnap = await getDocs(collection(db, 'players'));
  const players = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const andreas = players.find(p => p.name === 'Andreas Jonsson');
  const stuart = players.find(p => p.name === 'Stuart Drummond');
  const mhari = players.find(p => p.name === 'Mhari McNaught');

  console.log('Player Ratings:');
  console.log(`  Andreas Jonsson: ${andreas.rating.toFixed(2)}`);
  console.log(`  Stuart Drummond: ${stuart.rating.toFixed(2)}`);
  console.log(`  Mhari McNaught: ${mhari.rating.toFixed(2)}`);
  console.log();

  // Get all games
  const gamesSnap = await getDocs(collection(db, 'games'));
  const games = gamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Analyze partnership with Stuart
  console.log('--- PARTNERSHIP WITH STUART ---');
  const stuartGames = games.filter(game =>
    game.type === 'Doubles' &&
    game.playerIds.includes(andreas.id) &&
    game.playerIds.includes(stuart.id)
  );

  console.log(`Games played together: ${stuartGames.length}`);

  if (stuartGames.length > 0) {
    let wins = 0;
    let totalPlayerTeamRating = 0;
    let totalOpponentRating = 0;

    stuartGames.forEach(game => {
      const isTeam1 = game.team1.playerIds.includes(andreas.id);
      const playerTeam = isTeam1 ? game.team1 : game.team2;
      const opponentTeam = isTeam1 ? game.team2 : game.team1;

      const won = playerTeam.score > opponentTeam.score;
      if (won) wins++;

      // Calculate team ratings
      const playerTeamRating = playerTeam.players.reduce((sum, p) => sum + p.rating, 0) / playerTeam.players.length;
      const opponentTeamRating = opponentTeam.players.reduce((sum, p) => sum + p.rating, 0) / opponentTeam.players.length;

      totalPlayerTeamRating += playerTeamRating;
      totalOpponentRating += opponentTeamRating;
    });

    const actualWinRate = wins / stuartGames.length;
    const avgPlayerTeamRating = totalPlayerTeamRating / stuartGames.length;
    const avgOpponentRating = totalOpponentRating / stuartGames.length;
    const expectedWinRate = calculateExpectedWinRate(avgPlayerTeamRating, avgOpponentRating);
    const performanceBonus = actualWinRate - expectedWinRate;

    console.log(`Record: ${wins}W-${stuartGames.length - wins}L`);
    console.log(`Actual Win Rate: ${(actualWinRate * 100).toFixed(1)}%`);
    console.log(`Average Team Rating: ${avgPlayerTeamRating.toFixed(2)}`);
    console.log(`Average Opponent Rating: ${avgOpponentRating.toFixed(2)}`);
    console.log(`Expected Win Rate: ${(expectedWinRate * 100).toFixed(1)}%`);
    console.log(`Performance Bonus: ${(performanceBonus * 100).toFixed(1)}% ${performanceBonus > 0 ? '✓ ABOVE EXPECTED' : '✗ BELOW EXPECTED'}`);
  }

  console.log();

  // Analyze partnership with Mhari
  console.log('--- PARTNERSHIP WITH MHARI ---');
  const mhariGames = games.filter(game =>
    game.type === 'Doubles' &&
    game.playerIds.includes(andreas.id) &&
    game.playerIds.includes(mhari.id)
  );

  console.log(`Games played together: ${mhariGames.length}`);

  if (mhariGames.length > 0) {
    let wins = 0;
    let totalPlayerTeamRating = 0;
    let totalOpponentRating = 0;

    mhariGames.forEach(game => {
      const isTeam1 = game.team1.playerIds.includes(andreas.id);
      const playerTeam = isTeam1 ? game.team1 : game.team2;
      const opponentTeam = isTeam1 ? game.team2 : game.team1;

      const won = playerTeam.score > opponentTeam.score;
      if (won) wins++;

      // Calculate team ratings
      const playerTeamRating = playerTeam.players.reduce((sum, p) => sum + p.rating, 0) / playerTeam.players.length;
      const opponentTeamRating = opponentTeam.players.reduce((sum, p) => sum + p.rating, 0) / opponentTeam.players.length;

      totalPlayerTeamRating += playerTeamRating;
      totalOpponentRating += opponentTeamRating;
    });

    const actualWinRate = wins / mhariGames.length;
    const avgPlayerTeamRating = totalPlayerTeamRating / mhariGames.length;
    const avgOpponentRating = totalOpponentRating / mhariGames.length;
    const expectedWinRate = calculateExpectedWinRate(avgPlayerTeamRating, avgOpponentRating);
    const performanceBonus = actualWinRate - expectedWinRate;

    console.log(`Record: ${wins}W-${mhariGames.length - wins}L`);
    console.log(`Actual Win Rate: ${(actualWinRate * 100).toFixed(1)}%`);
    console.log(`Average Team Rating: ${avgPlayerTeamRating.toFixed(2)}`);
    console.log(`Average Opponent Rating: ${avgOpponentRating.toFixed(2)}`);
    console.log(`Expected Win Rate: ${(expectedWinRate * 100).toFixed(1)}%`);
    console.log(`Performance Bonus: ${(performanceBonus * 100).toFixed(1)}% ${performanceBonus > 0 ? '✓ ABOVE EXPECTED' : '✗ BELOW EXPECTED'}`);
  }

  console.log('\n=== CONCLUSION ===');
  console.log('The partner with the HIGHEST performance bonus is the Ally.');
  console.log('This represents who Andreas performs BETTER with than ratings predict.\n');

  process.exit(0);
}

analyzeAndreasAlly().catch(console.error);
