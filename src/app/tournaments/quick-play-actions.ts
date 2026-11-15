'use client';

// Runs in the browser as the signed-in member; Firestore rules enforce access.
import {
  collection,
  doc,
  addDoc,
  writeBatch,
  getDocs,
  query,
  where,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser, requireAuthentication } from '@/lib/client-user';
import { getPlayersByIds } from '@/lib/data';
import { generateRound, type PastMatch } from '@/lib/session-pairing';
import { CLUB_ID } from '@/config/club';
import { DEFAULT_RATING } from '@/lib/constants';
import type { Tournament, TournamentMatch } from '@/lib/types';

/** Quick-play sessions older than this with no new matches show as finished. */
export const STALE_SESSION_MS = 24 * 60 * 60 * 1000;

/** "Thu 20 Aug" */
export function defaultSessionName(date = new Date()): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export interface CreateQuickPlayData {
  name?: string;
  description?: string;
  format: 'singles' | 'doubles';
  playerIds: string[];
  availableCourts: number;
}

async function loadMatches(tournamentId: string): Promise<(TournamentMatch & { ref: ReturnType<typeof doc> })[]> {
  const snap = await getDocs(query(collection(db, 'tournamentMatches'), where('tournamentId', '==', tournamentId)));
  return snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...(d.data() as Omit<TournamentMatch, 'id'>) }));
}

function toPast(m: TournamentMatch): PastMatch | null {
  if (m.player1Id && m.player2Id) return { round: m.round, team1: [m.player1Id], team2: [m.player2Id] };
  if (m.team1PlayerIds?.length && m.team2PlayerIds?.length) {
    return { round: m.round, team1: m.team1PlayerIds, team2: m.team2PlayerIds };
  }
  return null;
}

/** Generates and saves the next round from the players in the session now. */
async function writeNextRound(tournamentId: string, tournament: Tournament, roundNumber: number) {
  const [players, existing] = await Promise.all([getPlayersByIds(tournament.playerIds), loadMatches(tournamentId)]);
  const history = existing.map(toPast).filter((m): m is PastMatch => m !== null);

  const { matches } = generateRound({
    players: players.map((p) => ({ id: p.id, rating: p.rating ?? DEFAULT_RATING })),
    format: tournament.format,
    courts: tournament.availableCourts || 2,
    history,
  });
  if (matches.length === 0) {
    throw new Error(
      tournament.format === 'doubles' ? 'Need at least 4 players for a doubles round' : 'Need at least 2 players for a singles round'
    );
  }

  const batch = writeBatch(db);
  matches.forEach((m, i) => {
    const ref = doc(collection(db, 'tournamentMatches'));
    const base = {
      tournamentId,
      round: roundNumber,
      matchNumber: i + 1,
      court: String(i + 1),
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
    batch.set(
      ref,
      tournament.format === 'singles'
        ? { ...base, player1Id: m.team1[0], player2Id: m.team2[0] }
        : { ...base, team1PlayerIds: m.team1, team2PlayerIds: m.team2 }
    );
  });
  batch.update(doc(db, 'tournaments', tournamentId), {
    currentRound: roundNumber,
    lastActivityAt: new Date().toISOString(),
  });
  await batch.commit();
}

/** Starts a session and generates its first round. More rounds are added one at a time. */
export async function createQuickPlayTournament(data: CreateQuickPlayData) {
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);

  const min = data.format === 'singles' ? 2 : 4;
  if (data.playerIds.length < min) {
    throw new Error(`${data.format === 'singles' ? 'Singles' : 'Doubles'} needs at least ${min} players`);
  }

  const now = new Date().toISOString();
  const tournament: Omit<Tournament, 'id'> & { lastActivityAt: string } = {
    name: data.name?.trim() || defaultSessionName(),
    description: data.description?.trim() ?? '',
    format: data.format,
    type: 'round-robin',
    status: 'active',
    playerIds: data.playerIds,
    clubId: CLUB_ID,
    createdDate: now,
    createdBy: currentUser.id,
    availableCourts: data.availableCourts,
    isQuickPlay: true,
    currentRound: 0,
    lastActivityAt: now,
  };

  const ref = await addDoc(collection(db, 'tournaments'), tournament);
  await writeNextRound(ref.id, { id: ref.id, ...tournament }, 1);
  return { success: true, tournamentId: ref.id };
}

async function loadSession(tournamentId: string): Promise<Tournament> {
  const snap = await getDoc(doc(db, 'tournaments', tournamentId));
  if (!snap.exists()) throw new Error('Session not found');
  const t = { id: tournamentId, ...snap.data() } as Tournament;
  if (!t.isQuickPlay) throw new Error('This only works for quick-play sessions');
  return t;
}

/** Adds the next round, using whoever is in the session now. */
export async function addQuickPlayRound(tournamentId: string) {
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);
  const tournament = await loadSession(tournamentId);
  const existing = await loadMatches(tournamentId);
  const nextRound = Math.max(tournament.currentRound ?? 0, ...existing.map((m) => m.round), 0) + 1;
  await writeNextRound(tournamentId, tournament, nextRound);
  return { success: true, roundNumber: nextRound };
}

/** Removes a round that has no results yet. */
export async function deleteQuickPlayRound(tournamentId: string, roundNumber: number) {
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);
  const existing = await loadMatches(tournamentId);
  const round = existing.filter((m) => m.round === roundNumber);
  if (round.length === 0) throw new Error('Round not found');
  if (round.some((m) => m.status === 'completed')) {
    throw new Error('This round has results. Delete those games first.');
  }
  const batch = writeBatch(db);
  round.forEach((m) => batch.delete(m.ref));
  const remaining = existing.filter((m) => m.round !== roundNumber).map((m) => m.round);
  batch.update(doc(db, 'tournaments', tournamentId), { currentRound: Math.max(0, ...remaining) });
  await batch.commit();
  return { success: true, deletedRound: roundNumber };
}

/** Changes who is in the session (late arrivals, people leaving). Affects future rounds only. */
export async function setSessionPlayers(tournamentId: string, playerIds: string[]) {
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);
  await updateDoc(doc(db, 'tournaments', tournamentId), {
    playerIds,
    lastActivityAt: new Date().toISOString(),
  });
}

export async function setSessionCourts(tournamentId: string, courts: number) {
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);
  await updateDoc(doc(db, 'tournaments', tournamentId), { availableCourts: Math.max(1, Math.min(8, courts)) });
}

/** Ends a session. Unplayed matches are removed so they don't clutter history. */
export async function endSession(tournamentId: string) {
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);
  const existing = await loadMatches(tournamentId);
  const batch = writeBatch(db);
  existing.filter((m) => m.status !== 'completed').forEach((m) => batch.delete(m.ref));
  batch.update(doc(db, 'tournaments', tournamentId), {
    status: 'completed',
    completedDate: new Date().toISOString(),
  });
  await batch.commit();
}

/** Admin tidy-up: ends every quick-play session with no activity for a day. */
export async function closeStaleSessions(): Promise<number> {
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);
  const snap = await getDocs(
    query(collection(db, 'tournaments'), where('clubId', '==', CLUB_ID), where('status', '==', 'active'))
  );
  let closed = 0;
  for (const d of snap.docs) {
    const t = { id: d.id, ...d.data() } as Tournament & { lastActivityAt?: string };
    if (!t.isQuickPlay) continue;
    const last = Date.parse(t.lastActivityAt ?? t.createdDate);
    if (Date.now() - last > STALE_SESSION_MS) {
      await endSession(t.id);
      closed++;
    }
  }
  return closed;
}

export function isSessionStale(t: Tournament & { lastActivityAt?: string }): boolean {
  if (!t.isQuickPlay || t.status !== 'active') return false;
  return Date.now() - Date.parse(t.lastActivityAt ?? t.createdDate) > STALE_SESSION_MS;
}
