export interface Club {
  id: string;
  name: string;
  description?: string;
  createdDate: string;
  createdBy: string;
  isActive: boolean;
  settings?: {
    allowPublicJoin?: boolean;
    defaultPlayerRating?: number;
  };
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  clubId: string;
}

export interface Game {
  id: string;
  date: string;
  type: 'Singles' | 'Doubles';
  team1: {
    playerIds: string[];
    players: Player[];
    score: number;
  };
  team2: {
    playerIds: string[];
    players: Player[];
    score: number;
  };
  playerIds: string[]; // For easier querying
  tournamentId?: string;
  ratingChanges?: { [playerId: string]: { before: number; after: number } }; // Rating history
  clubId: string;
}

export interface Partnership {
  partner: Player;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

export interface HeadToHead {
  opponentId: string;
  opponent?: Player;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsDifference: number;
}

export interface RatingHistoryPoint {
  date: string;
  rating: number;
  gameId: string;
  opponent?: string;
}

export interface FormMetric {
  score: number;              // Overall form score (0-100)
  trend: 'up' | 'neutral' | 'down';
  recentWins: number;
  recentLosses: number;
  recentDraws: number;
  winRate: number;            // Recent win percentage
  qualityScore: number;       // Quality-adjusted performance
  gamesPlayed: number;        // Number of games in sample
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  format: 'singles' | 'doubles';
  type: 'round-robin' | 'single-elimination' | 'double-elimination';
  status: 'active' | 'completed';
  playerIds: string[];
  createdDate: string;
  createdBy: string;
  maxRounds?: number; // Limit rounds for time-constrained tournaments
  availableCourts?: number; // Number of courts available (default: 2)
  estimatedDuration?: number; // Estimated duration in minutes
  isQuickPlay?: boolean; // Quick Play mode allows adding rounds dynamically
  currentRound?: number; // Track current round for Quick Play
  clubId: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1Id?: string;
  player2Id?: string;
  team1PlayerIds?: string[];
  team2PlayerIds?: string[];
  gameId?: string; // Links to actual Game when played
  status: 'pending' | 'in-progress' | 'completed' | 'bye';
  scheduledTime?: string;
  court?: string;
}

export interface TournamentStanding {
  playerId: string;
  player: Player;
  scheduledGames: number; // Total matches scheduled for this player (including pending)
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  winPercentage: number;
}

export interface Circle {
  id: string;
  name: string;
  description?: string;
  playerIds: string[];
  createdDate: string;
  createdBy: string;
  clubId: string;
}

// Box League Interfaces
export interface BoxLeague {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'paused';
  createdDate: string;
  createdBy: string;
  // Configuration
  roundsPerCycle: number; // 1-5 rounds before promotion/relegation
  newPlayerEntryBox: number; // Which box new players enter (usually bottom box)
  totalBoxes: number;
  isTestMode?: boolean; // Mark league as test/debug mode (doesn't affect player stats)
  // Current state
  currentCycle: number;
  currentRound: number;
  circleId?: string; // Optional: restrict to specific circle
  // Pause management
  pauseReason?: string; // Reason for pausing the league
  pausedDate?: string; // When the league was paused
  completedDate?: string; // When the league was completed
  clubId: string;
}

export interface Box {
  id: string;
  boxLeagueId: string;
  boxNumber: number; // 1 = highest, 2 = next, etc.
  playerIds: string[]; // Exactly 4 players
  createdDate: string;
  // Current standings within this box
  standings?: BoxLeagueStanding[];
}

export interface BoxLeagueRound {
  id: string;
  boxLeagueId: string;
  roundNumber: number;
  cycleNumber: number;
  status: 'pending' | 'active' | 'completed';
  createdDate: string;
  completedDate?: string;
  // All matches for this round across all boxes
  matchIds: string[];
  // Scheduling
  startDate?: string; // When the round starts/started
  endDate?: string; // Deadline for completing the round
}

export interface BoxLeagueMatch {
  id: string;
  boxLeagueId: string;
  boxLeagueRoundId: string;
  boxId: string;
  roundNumber: number;
  cycleNumber: number;
  matchNumber: 1 | 2 | 3; // The 3 specific match formats
  // Match participants (exactly 4 players)
  playerIds: string[]; // All 4 players involved
  // Partnerships for this specific match
  team1PlayerIds: string[]; // 2 players partnered
  team2PlayerIds: string[]; // 2 players partnered
  // Game result
  team1Score: number;
  team2Score: number;
  winnerTeamPlayerIds: string[]; // IDs of winning team
  status: 'pending' | 'completed';
  date?: string;
  gameId?: string; // Link to actual Game record if needed
}

export interface BoxLeaguePlayerStats {
  id: string;
  playerId: string;
  boxLeagueId: string;
  boxId: string;
  currentPosition: 1 | 2 | 3 | 4; // Current ranking within box
  // Match statistics
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  // Game statistics
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  // Box league points (1 for win, 0 for loss)
  totalPoints: number;
  // Partner statistics
  partnerStats: { [partnerId: string]: { wins: number; losses: number } };
  // Opponent statistics
  opponentStats: { [opponentId: string]: { wins: number; losses: number } };
  // Historical data
  positionHistory: { cycle: number; round: number; position: number; boxNumber: number }[];
  lastUpdated: string;
}

export interface BoxLeagueStanding {
  playerId: string;
  player?: Player;
  position: 1 | 2 | 3 | 4;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  totalPoints: number; // Box league points
  // Head-to-head vs other players in same box
  headToHeadRecord: { [playerId: string]: { wins: number; losses: number } };
}

