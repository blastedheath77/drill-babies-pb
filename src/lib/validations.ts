import { z } from 'zod';
import { MIN_RATING, MAX_RATING } from './constants';

// Base validation patterns
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name cannot exceed 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

export const emailSchema = z.string().email('Invalid email address').optional();

export const ratingSchema = z
  .number()
  .min(MIN_RATING, `Rating must be at least ${MIN_RATING}`)
  .max(MAX_RATING, `Rating cannot exceed ${MAX_RATING}`)
  .refine((val) => Number.isFinite(val), 'Rating must be a valid number');

export const scoreSchema = z
  .number()
  .int('Score must be a whole number')
  .min(0, 'Score cannot be negative')
  .max(50, 'Score cannot exceed 50 points');

export const gameTypeSchema = z.enum(['Singles', 'Doubles'], {
  errorMap: () => ({ message: 'Game type must be either Singles or Doubles' }),
});

// Player validation schemas
export const createPlayerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  avatar: z.string().url('Avatar must be a valid URL').optional(),
});

export const updatePlayerSchema = createPlayerSchema.partial();

export const playerSchema = z.object({
  id: z.string().min(1, 'Player ID is required'),
  name: nameSchema,
  avatar: z.string().url(),
  rating: ratingSchema,
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  pointsFor: z.number().int().min(0),
  pointsAgainst: z.number().int().min(0),
});

// Game validation schemas
export const gameTeamSchema = z.object({
  playerIds: z
    .array(z.string().min(1, 'Player ID cannot be empty'))
    .min(1, 'Team must have at least 1 player')
    .max(2, 'Team cannot have more than 2 players'),
  score: scoreSchema,
});

export const createGameSchema = z
  .object({
    type: gameTypeSchema,
    team1: gameTeamSchema,
    team2: gameTeamSchema,
    date: z.string().datetime('Invalid date format').optional(),
    tournamentId: z.string().optional(),
  })
  .refine(
    (data) => {
      // For singles, each team must have exactly 1 player
      if (data.type === 'Singles') {
        return data.team1.playerIds.length === 1 && data.team2.playerIds.length === 1;
      }
      // For doubles, each team must have exactly 2 players
      if (data.type === 'Doubles') {
        return data.team1.playerIds.length === 2 && data.team2.playerIds.length === 2;
      }
      return true;
    },
    {
      message: 'Player count must match game type (Singles: 1 per team, Doubles: 2 per team)',
    }
  )
  .refine(
    (data) => {
      // Ensure no player is on both teams
      const team1Players = new Set(data.team1.playerIds);
      const team2Players = new Set(data.team2.playerIds);
      return !data.team1.playerIds.some((id) => team2Players.has(id));
    },
    {
      message: 'A player cannot be on both teams',
    }
  )
  .refine(
    (data) => {
      // Ensure no duplicate players within teams
      const team1Unique = new Set(data.team1.playerIds);
      const team2Unique = new Set(data.team2.playerIds);
      return (
        team1Unique.size === data.team1.playerIds.length &&
        team2Unique.size === data.team2.playerIds.length
      );
    },
    {
      message: 'Each player can only appear once per team',
    }
  )
  .refine(
    (data) => {
      // Game must have a winner (no ties)
      return data.team1.score !== data.team2.score;
    },
    {
      message: 'Games cannot end in a tie',
    }
  );

export const gameSchema = z.object({
  id: z.string().min(1),
  type: gameTypeSchema,
  team1: gameTeamSchema,
  team2: gameTeamSchema,
  date: z.string().datetime('Invalid date format').optional(),
  tournamentId: z.string().optional(),
  playerIds: z.array(z.string()),
  ratingChanges: z.record(
    z.object({
      before: ratingSchema,
      after: ratingSchema,
    })
  ).optional(),
});

// Tournament validation schemas
export const tournamentFormatSchema = z.enum(['singles', 'doubles'], {
  errorMap: () => ({ message: 'Tournament format must be either singles or doubles' }),
});

export const tournamentTypeSchema = z.enum(['round-robin', 'single-elimination', 'double-elimination'], {
  errorMap: () => ({ message: 'Invalid tournament type' }),
});

export const tournamentStatusSchema = z.enum(['active', 'completed'], {
  errorMap: () => ({ message: 'Tournament status must be either active or completed' }),
});

export const createTournamentSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Tournament name must be at least 3 characters')
      .max(100, 'Tournament name cannot exceed 100 characters'),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .default(''),
    format: tournamentFormatSchema,
    type: tournamentTypeSchema,
    playerIds: z
      .array(z.string().min(1, 'Player ID cannot be empty'))
      .min(2, 'Tournament must have at least 2 players'),
    clubId: z.string().min(1, 'Club ID is required'),
    maxRounds: z
      .number()
      .int('Maximum rounds must be a whole number')
      .min(1, 'Must have at least 1 round')
      .max(50, 'Cannot exceed 50 rounds')
      .optional(),
    availableCourts: z
      .number()
      .int('Number of courts must be a whole number')
      .min(1, 'Must have at least 1 court')
      .max(4, 'Cannot exceed 4 courts')
      .default(2),
  })
  .refine(
    (data) => {
      // For doubles tournaments, must have at least 4 players
      if (data.format === 'doubles') {
        return data.playerIds.length >= 4;
      }
      return true;
    },
    {
      message: 'Doubles tournaments require at least 4 players',
    }
  )
  .refine(
    (data) => {
      // For doubles tournaments, must have even number of players
      if (data.format === 'doubles') {
        return data.playerIds.length % 2 === 0;
      }
      return true;
    },
    {
      message: 'Doubles tournaments require an even number of players',
    }
  )
  .refine(
    (data) => {
      // Ensure no duplicate players
      const uniquePlayerIds = new Set(data.playerIds);
      return uniquePlayerIds.size === data.playerIds.length;
    },
    {
      message: 'Each player can only be registered once per tournament',
    }
  );

export const tournamentSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(3, 'Tournament name must be at least 3 characters')
    .max(100, 'Tournament name cannot exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .default(''),
  format: tournamentFormatSchema,
  type: tournamentTypeSchema,
  playerIds: z
    .array(z.string().min(1, 'Player ID cannot be empty'))
    .min(2, 'Tournament must have at least 2 players'),
  status: tournamentStatusSchema,
  createdDate: z.string().datetime(),
  createdBy: z.string().min(1),
  maxRounds: z
    .number()
    .int('Maximum rounds must be a whole number')
    .min(1, 'Must have at least 1 round')
    .max(50, 'Cannot exceed 50 rounds')
    .optional(),
  availableCourts: z
    .number()
    .int('Number of courts must be a whole number')
    .min(1, 'Must have at least 1 court')
    .max(4, 'Cannot exceed 4 courts')
    .optional(),
  estimatedDuration: z
    .number()
    .int('Estimated duration must be in minutes')
    .min(1, 'Duration must be at least 1 minute')
    .optional(),
});

// Tournament match validation schemas
export const tournamentMatchStatusSchema = z.enum(['pending', 'in-progress', 'completed', 'bye'], {
  errorMap: () => ({ message: 'Invalid match status' }),
});

export const createTournamentMatchSchema = z.object({
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  round: z.number().int().min(1, 'Round must be at least 1'),
  matchNumber: z.number().int().min(1, 'Match number must be at least 1'),
  player1Id: z.string().min(1).optional(),
  player2Id: z.string().min(1).optional(),
  team1PlayerIds: z.array(z.string().min(1)).optional(),
  team2PlayerIds: z.array(z.string().min(1)).optional(),
  gameId: z.string().optional(),
  status: tournamentMatchStatusSchema.default('pending'),
  scheduledTime: z.string().datetime().optional(),
  court: z.string().optional(),
});

export const tournamentMatchSchema = z.object({
  id: z.string().min(1),
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  round: z.number().int().min(1, 'Round must be at least 1'),
  matchNumber: z.number().int().min(1, 'Match number must be at least 1'),
  player1Id: z.string().min(1).optional(),
  player2Id: z.string().min(1).optional(),
  team1PlayerIds: z.array(z.string().min(1)).optional(),
  team2PlayerIds: z.array(z.string().min(1)).optional(),
  gameId: z.string().optional(),
  status: tournamentMatchStatusSchema.default('pending'),
  scheduledTime: z.string().datetime().optional(),
  court: z.string().optional(),
});

// Quick Play match result schema (allows draws)
export const quickPlayMatchResultSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  team1Score: scoreSchema,
  team2Score: scoreSchema,
  tournamentId: z.string().min(1, 'Tournament ID is required'),
});

// API response validation schemas
export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  total: z.number().int().min(0).optional(),
  totalPages: z.number().int().min(0).optional(),
});

// Helper functions for validation
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }
    throw error;
  }
}

export function validateDataSafe<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return { success: false, error: `Validation failed: ${errorMessage}` };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}