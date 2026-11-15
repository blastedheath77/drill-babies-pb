'use client';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CLUB_ID } from '@/config/club';
import { DEFAULT_RATING } from '@/lib/constants';
import { getCurrentUser, requireAuthentication } from '@/lib/client-user';
import { buildMatchups, type MatchupPlayer, type MatchupResult } from '@/lib/matchup/solver';
import type { Friendly, FriendlyGuest, FriendlyMatch, Player } from '@/lib/types';

const friendliesCollection = () => collection(db, 'friendlies');

export const GUEST_LEVEL_OFFSET: Record<NonNullable<FriendlyGuest['level']>, number> = {
  weaker: -0.4,
  similar: 0,
  stronger: 0.4,
};

export function playerGender(p: Pick<Player, 'gender'>): 'M' | 'F' | undefined {
  return p.gender === 'he' ? 'M' : p.gender === 'she' ? 'F' : undefined;
}

/** Turns a pasted list into guests. Accepts "Name", "Name, M", "Name (F)", "Name - f". */
export function parseGuestList(text: string): FriendlyGuest[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^(.*?)[\s,;:(\-]+([MFmf])\)?$/);
      const name = (m ? m[1] : line).trim().replace(/[,;:(\-]+$/, '').trim();
      const gender = m ? (m[2].toUpperCase() as 'M' | 'F') : undefined;
      return { id: `g${Date.now().toString(36)}${i}`, name: name || line, ...(gender ? { gender } : {}) };
    });
}

export interface PlanInput {
  homePlayers: Player[];
  guests: FriendlyGuest[];
  format: Friendly['format'];
  courts: number;
  rounds: number;
  matchTypes: Friendly['matchTypes'];
  locked?: FriendlyMatch[];
  /** Existing matches, when adding more rounds to a friendly that's under way. */
  history?: FriendlyMatch[];
  maxMatches?: number;
}

/** Runs the solver for a friendly. Visitors' strength is relative to our squad's average rating. */
export function planFriendly(input: PlanInput): MatchupResult {
  const homeAvg =
    input.homePlayers.reduce((s, p) => s + (p.rating ?? DEFAULT_RATING), 0) / Math.max(1, input.homePlayers.length);
  const home: MatchupPlayer[] = input.homePlayers.map((p) => ({
    id: p.id,
    name: p.name,
    gender: playerGender(p),
    level: p.rating ?? DEFAULT_RATING,
  }));
  const away: MatchupPlayer[] = input.guests.map((g) => ({
    id: g.id,
    name: g.name,
    gender: g.gender,
    level: homeAvg + GUEST_LEVEL_OFFSET[g.level ?? 'similar'],
  }));
  return buildMatchups({
    home,
    away,
    format: input.format,
    courts: input.courts,
    rounds: input.rounds,
    maxMatches: input.maxMatches,
    matchTypes: input.matchTypes,
    locked: input.locked?.filter((m) => m.locked).map((m) => ({ ...m, locked: true })),
    history: input.history,
    attempts: 120,
    timeBudgetMs: 1200,
  });
}

export function toFriendlyMatches(result: MatchupResult, previous: FriendlyMatch[] = []): FriendlyMatch[] {
  return result.matches.map((m) => {
    const kept = m.locked ? previous.find((p) => p.round === m.round && p.court === m.court) : undefined;
    return {
      id: kept?.id ?? `m${m.round}-${m.court}-${Math.random().toString(36).slice(2, 7)}`,
      round: m.round,
      court: m.court,
      home: m.home,
      away: m.away,
      category: m.category,
      locked: !!m.locked,
      status: kept?.status ?? 'pending',
      ...(kept?.homeScore !== undefined ? { homeScore: kept.homeScore, awayScore: kept.awayScore } : {}),
    };
  });
}

export async function createFriendly(data: Omit<Friendly, 'id' | 'clubId' | 'createdBy' | 'createdDate' | 'status'>) {
  const user = await getCurrentUser();
  requireAuthentication(user);
  const ref = await addDoc(friendliesCollection(), {
    ...stripUndefined(data),
    clubId: CLUB_ID,
    status: 'draft',
    createdBy: user.id,
    createdDate: new Date().toISOString(),
  });
  return ref.id;
}

export async function getFriendlies(): Promise<Friendly[]> {
  const snap = await getDocs(query(friendliesCollection(), where('clubId', '==', CLUB_ID)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Friendly, 'id'>) }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdDate.localeCompare(a.createdDate));
}

export async function getFriendly(id: string): Promise<Friendly | null> {
  const snap = await getDoc(doc(db, 'friendlies', id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Friendly, 'id'>) } as Friendly) : null;
}

export async function updateFriendly(id: string, updates: Partial<Omit<Friendly, 'id' | 'clubId' | 'createdBy'>>) {
  await updateDoc(doc(db, 'friendlies', id), stripUndefined(updates));
}

export async function deleteFriendly(id: string) {
  await deleteDoc(doc(db, 'friendlies', id));
}

/** Firestore rejects undefined values; drop them (deeply, for match arrays). */
function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export interface FriendlyTally {
  homeMatches: number;
  awayMatches: number;
  homePoints: number;
  awayPoints: number;
  played: number;
}

export function tallyFriendly(f: Pick<Friendly, 'matches'>): FriendlyTally {
  const t: FriendlyTally = { homeMatches: 0, awayMatches: 0, homePoints: 0, awayPoints: 0, played: 0 };
  for (const m of f.matches) {
    if (m.status !== 'completed' || m.homeScore === undefined || m.awayScore === undefined) continue;
    t.played++;
    t.homePoints += m.homeScore;
    t.awayPoints += m.awayScore;
    if (m.homeScore > m.awayScore) t.homeMatches++;
    else if (m.awayScore > m.homeScore) t.awayMatches++;
  }
  return t;
}

/** A member's record across all friendlies. */
export function memberFriendlyRecord(friendlies: Friendly[], playerId: string) {
  let wins = 0;
  let losses = 0;
  for (const f of friendlies) {
    for (const m of f.matches) {
      if (m.status !== 'completed' || !m.home.includes(playerId)) continue;
      if ((m.homeScore ?? 0) > (m.awayScore ?? 0)) wins++;
      else if ((m.homeScore ?? 0) < (m.awayScore ?? 0)) losses++;
    }
  }
  return { wins, losses };
}
