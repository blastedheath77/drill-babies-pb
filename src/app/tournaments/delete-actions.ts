'use server';

import { requireUser } from '@/lib/server/auth';
import { deleteGames } from '@/lib/server/games';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Deletes a tournament or quick-play session, its matches and its games.
 * Ratings and stat totals from those games are reversed by replaying history.
 */
export async function deleteTournament(idToken: string, tournamentId: string) {
  await requireUser(idToken, { permission: 'canDeleteTournaments' });
  const db = adminDb();

  const tournamentRef = db.collection('tournaments').doc(tournamentId);
  if (!(await tournamentRef.get()).exists) throw new Error('Tournament not found');

  const games = await db.collection('games').where('tournamentId', '==', tournamentId).get();
  await deleteGames(games.docs.map((d) => d.id));

  const matches = await db.collection('tournamentMatches').where('tournamentId', '==', tournamentId).get();
  const refs = [...matches.docs.map((d) => d.ref), tournamentRef];
  for (let i = 0; i < refs.length; i += 450) {
    const batch = db.batch();
    refs.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }

  return { success: true, gamesDeleted: games.size };
}
