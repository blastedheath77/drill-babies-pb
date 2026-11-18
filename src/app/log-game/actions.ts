'use server';

import { z } from 'zod';
import { requireUser } from '@/lib/server/auth';
import { recordGame, deleteGame, editGame } from '@/lib/server/games';
import { validateData } from '@/lib/validations';
import { adminDb } from '@/lib/firebase-admin';
import { isAdminUser } from '@/lib/permissions';

const gameSchema = z
  .object({
    team1PlayerIds: z.array(z.string().min(1)).min(1).max(2),
    team2PlayerIds: z.array(z.string().min(1)).min(1).max(2),
    team1Score: z.coerce.number().int().min(0).max(50, 'Score cannot exceed 50'),
    team2Score: z.coerce.number().int().min(0).max(50, 'Score cannot exceed 50'),
  })
  .refine((d) => d.team1PlayerIds.length === d.team2PlayerIds.length, {
    message: 'Both teams need the same number of players',
  });

export type LogGameInput = z.infer<typeof gameSchema>;

/** Logs a game and updates ratings. Any signed-in member may log games. */
export async function logGame(idToken: string, values: LogGameInput) {
  const user = await requireUser(idToken, { permission: 'canRecordGameResults' });
  const game = validateData(gameSchema, values);
  const { gameId } = await recordGame({ ...game, createdBy: user.id });
  return { gameId };
}

/**
 * Removes a game and replays ratings for every later game.
 * Admins can delete any game; the member who logged a game can undo it
 * within 10 minutes (for the Undo button after saving).
 */
export async function removeGame(idToken: string, gameId: string) {
  const user = await requireUser(idToken);
  const snap = await adminDb().collection('games').doc(gameId).get();
  if (!snap.exists) throw new Error('Game not found');

  if (!isAdminUser(user)) {
    const createdBy = snap.get('createdBy');
    const date = snap.get('date') as FirebaseFirestore.Timestamp | undefined;
    const recent = date ? Date.now() - date.toMillis() < 10 * 60 * 1000 : false;
    if (createdBy !== user.id || !recent) {
      throw new Error('Only an admin can delete this game');
    }
  }

  await deleteGame(gameId);
  return { success: true };
}

/** Admin-only: change a game's players or scores and replay later ratings. */
export async function updateGame(idToken: string, gameId: string, values: LogGameInput) {
  await requireUser(idToken, { admin: true });
  const game = validateData(gameSchema, values);
  await editGame(gameId, game);
  return { success: true };
}
