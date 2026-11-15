'use server';

import { z } from 'zod';
import { requireUser } from '@/lib/server/auth';
import { recordGame } from '@/lib/server/games';
import { adminDb, admin } from '@/lib/firebase-admin';
import { validateData, scoreSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';

const matchResultSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  team1Score: scoreSchema,
  team2Score: scoreSchema,
});

export type MatchResultData = z.infer<typeof matchResultSchema>;

/** Records a tournament / quick-play match result as a rated game. */
export async function recordTournamentMatchResult(idToken: string, data: MatchResultData) {
  const user = await requireUser(idToken, { permission: 'canRecordGameResults' });
  const { matchId, tournamentId, team1Score, team2Score } = validateData(matchResultSchema, data);

  const db = adminDb();
  const [tournamentSnap, matchSnap] = await Promise.all([
    db.collection('tournaments').doc(tournamentId).get(),
    db.collection('tournamentMatches').doc(matchId).get(),
  ]);
  if (!tournamentSnap.exists) throw new Error('Tournament not found');
  if (!matchSnap.exists) throw new Error('Tournament match not found');

  // Ties are allowed in quick play, not in bracket/round-robin tournaments
  if (!tournamentSnap.get('isQuickPlay') && team1Score === team2Score) {
    throw new Error('Match cannot end in a tie');
  }

  const match = matchSnap.data()!;
  let team1PlayerIds: string[];
  let team2PlayerIds: string[];
  if (match.player1Id && match.player2Id) {
    team1PlayerIds = [match.player1Id];
    team2PlayerIds = [match.player2Id];
  } else if (match.team1PlayerIds?.length && match.team2PlayerIds?.length) {
    team1PlayerIds = match.team1PlayerIds;
    team2PlayerIds = match.team2PlayerIds;
  } else {
    throw new Error('Invalid match configuration');
  }

  const { gameId } = await recordGame({
    team1PlayerIds,
    team2PlayerIds,
    team1Score,
    team2Score,
    tournamentId,
    tournamentMatchId: matchId,
    createdBy: user.id,
  });

  await markTournamentCompleteIfDone(tournamentId);
  return { success: true, gameId };
}

/**
 * Bracket/round-robin tournaments complete when no matches are pending.
 * Quick-play sessions are ended explicitly, so they are skipped here.
 */
async function markTournamentCompleteIfDone(tournamentId: string) {
  try {
    const db = adminDb();
    const ref = db.collection('tournaments').doc(tournamentId);
    const t = await ref.get();
    if (!t.exists || t.get('status') === 'completed' || t.get('isQuickPlay')) return;

    const matches = await db.collection('tournamentMatches').where('tournamentId', '==', tournamentId).get();
    if (matches.empty) return;
    const open = matches.docs.some((m) => ['pending', 'in-progress'].includes(m.get('status')));
    if (!open) {
      await ref.update({ status: 'completed', completedDate: admin.firestore.FieldValue.serverTimestamp() });
    }
  } catch (error) {
    logger.error('Error checking tournament completion', { tournamentId, error });
  }
}
