export interface Player {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  // Phantom player and claiming fields
  claimedByUserId?: string;  // Links to User.id when claimed by a user
  email?: string;            // Email for phantom players (enables claiming)
  isPhantom?: boolean;       // True for phantom players, false for claimed/direct players
  createdBy?: string;        // User ID who created this phantom player
  createdAt?: string;        // When phantom player was created
  claimedAt?: string;        // When player was claimed by user
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
  circleId?: string; // Circle association for social context - nullable for backward compatibility
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
  maxRounds?: number; // Limit rounds for time-constrained tournaments
  availableCourts?: number; // Number of courts available (default: 2)
  estimatedDuration?: number; // Estimated duration in minutes
  isQuickPlay?: boolean; // Quick Play mode allows adding rounds dynamically
  currentRound?: number; // Track current round for Quick Play
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

// Circles system types
export interface Circle {
  id: string;
  name: string;
  description: string;
  createdBy: string; // User ID of creator
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean; // If true, requires invitation to join
  memberCount: number;
  settings?: {
    allowMemberInvites: boolean; // If members can invite others
    autoAcceptInvites: boolean; // If invites are auto-accepted
  };
}

export interface CircleMembership {
  id: string;
  circleId: string;
  userId: string;
  role: 'admin' | 'member'; // admin can manage circle, member can just participate
  joinedAt: string;
  invitedBy?: string; // User ID who invited this member
}

export interface CircleInvite {
  id: string;
  circleId: string;
  circle?: Circle; // Populated for UI
  invitedUserId: string;
  invitedBy: string; // User ID who sent the invite
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
  message?: string; // Optional personal message
}

export interface CircleContext {
  selectedCircleId: string | 'all'; // 'all' means show all players/data
  availableCircles: Circle[];
}

// Extended types to support circle context
export interface TournamentWithCircle extends Tournament {
  circleId?: string; // Optional - tournaments can be circle-specific
}

// Phantom Player and Claiming Types
export interface PhantomPlayerCreationData {
  name: string;
  email?: string;          // Optional - makes player claimable if provided
  avatar?: string;
  createdBy: string;       // User ID who created this phantom player
}

export interface PlayerClaimRequest {
  userId: string;
  playerId: string;
  email: string;           // Must match phantom player's email
}

export interface PlayerClaimLog {
  id: string;
  playerId: string;
  playerName: string;
  claimedByUserId: string;
  claimedByUserName: string;
  claimedAt: string;
  originalEmail?: string;   // Email used for claiming
  previousOwner?: string;   // If player was re-claimed
}

// Extended types for phantom player support
export interface PlayerWithClaimStatus extends Player {
  isClaimable: boolean;     // Computed: isPhantom && email exists
  claimStatus: 'claimed' | 'claimable' | 'anonymous'; // Status for UI display
}

// Enhanced Circle Invitation Types
export interface EmailCircleInvite {
  id: string;
  circleId: string;
  circle?: Circle; // Populated for UI
  invitedEmail: string;     // Email address for invitation
  invitedBy: string;        // User ID who sent the invite
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'converted';
  createdAt: string;
  expiresAt: string;
  message?: string;         // Optional personal message
  convertedToUserId?: string; // Set when email invite becomes user invite
  convertedAt?: string;     // When conversion happened
}

export interface CircleInviteWithEmail extends CircleInvite {
  invitedUserEmail?: string; // Email of invited user for display
}

export interface CircleInvitationRequest {
  circleId: string;
  invitedBy: string;
  message?: string;
  // Either invite by userId OR by email
  invitedUserId?: string;   // For existing users
  invitedEmail?: string;    // For email-based invites
}

export interface CircleInvitationResponse {
  success: boolean;
  message: string;
  inviteId?: string;
  inviteType?: 'user' | 'email';
}
