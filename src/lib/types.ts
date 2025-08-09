export interface Player {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
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
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  winPercentage: number;
}
