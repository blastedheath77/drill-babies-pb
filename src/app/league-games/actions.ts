'use server';

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';
import type { LeagueGame, LeagueGameMatch, Player } from '@/lib/types';
import { validateData, createLeagueGameSchema } from '@/lib/validations';
import { getCurrentUser, requireAuthentication } from '@/lib/server-auth';
import { buildDuprPayload, submitLeagueFixtureToDupr } from '@/lib/dupr-api';

// ─────────────────────────────────────────────────────────────────────────────
// Match-pairing logic (PBS league rules)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate the 9 fixed PBS league matches from 3 male + 3 female club players
 * following the optimal 2-court schedule.
 *
 * Player slots are 1-indexed within each gender group:
 *   maleClub[0..2]    → M1, M2, M3  (indices 0,1,2)
 *   femaleClub[0..2]  → F1, F2, F3  (indices 0,1,2)
 *
 * The schedule (by round/court) is:
 *   R1 C1: Match 7  — Women's  F2+F3 vs F2+F3
 *   R1 C2: Match 8  — Men's    M2+M3 vs M2+M3
 *   R2 C1: Match 1  — Women's  F1+F3 vs F1+F3
 *   R2 C2: Match 2  — Men's    M1+M3 vs M1+M3
 *   R3 C1: Match 4  — Women's  F1+F2 vs F1+F2
 *   R3 C2: Match 5  — Men's    M1+M2 vs M1+M2
 *   R4 C1: Match 3  — Mixed    F2+M2 vs F2+M2
 *   R4 C2: Match 6  — Mixed    F3+M3 vs F3+M3
 *   R5 C1: Match 9  — Mixed    F1+M1 vs F1+M1
 *
 * Opponent slot keys: "male-1", "male-2", "male-3", "female-1", "female-2", "female-3"
 */
function generatePbsMatches(
  maleClubIds: string[],
  femaleClubIds: string[]
): LeagueGameMatch[] {
  // [matchNumber, round, court, category, clubA, clubB, oppSlotA, oppSlotB]
  type MatchDef = {
    matchNumber: LeagueGameMatch['matchNumber'];
    round: LeagueGameMatch['round'];
    court: LeagueGameMatch['court'];
    category: LeagueGameMatch['category'];
    clubA: string;
    clubB: string;
    oppA: string;
    oppB: string;
  };

  const defs: MatchDef[] = [
    // Round 1
    { matchNumber: 7, round: 1, court: 1, category: 'womens_doubles', clubA: femaleClubIds[1], clubB: femaleClubIds[2], oppA: 'female-2', oppB: 'female-3' },
    { matchNumber: 8, round: 1, court: 2, category: 'mens_doubles',   clubA: maleClubIds[1],   clubB: maleClubIds[2],   oppA: 'male-2',   oppB: 'male-3'   },
    // Round 2
    { matchNumber: 1, round: 2, court: 1, category: 'womens_doubles', clubA: femaleClubIds[0], clubB: femaleClubIds[2], oppA: 'female-1', oppB: 'female-3' },
    { matchNumber: 2, round: 2, court: 2, category: 'mens_doubles',   clubA: maleClubIds[0],   clubB: maleClubIds[2],   oppA: 'male-1',   oppB: 'male-3'   },
    // Round 3
    { matchNumber: 4, round: 3, court: 1, category: 'womens_doubles', clubA: femaleClubIds[0], clubB: femaleClubIds[1], oppA: 'female-1', oppB: 'female-2' },
    { matchNumber: 5, round: 3, court: 2, category: 'mens_doubles',   clubA: maleClubIds[0],   clubB: maleClubIds[1],   oppA: 'male-1',   oppB: 'male-2'   },
    // Round 4
    { matchNumber: 3, round: 4, court: 1, category: 'mixed_doubles',  clubA: femaleClubIds[1], clubB: maleClubIds[1],   oppA: 'female-2', oppB: 'male-2'   },
    { matchNumber: 6, round: 4, court: 2, category: 'mixed_doubles',  clubA: femaleClubIds[2], clubB: maleClubIds[2],   oppA: 'female-3', oppB: 'male-3'   },
    // Round 5
    { matchNumber: 9, round: 5, court: 1, category: 'mixed_doubles',  clubA: femaleClubIds[0], clubB: maleClubIds[0],   oppA: 'female-1', oppB: 'male-1'   },
  ];

  return defs.map(({ matchNumber, round, court, category, clubA, clubB, oppA, oppB }) => ({
    matchNumber,
    round,
    court,
    category,
    clubTeamPlayerIds: [clubA, clubB] as [string, string],
    opponentTeamSlots: [oppA, oppB] as [string, string],
    status: 'pending' as const,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Firestore converts arrays to maps when updated via dot-notation
 * (e.g. `matches.0.score`). This normalises the stored value back
 * to an array regardless of which shape it is in.
 */
function normalizeMatches(raw: unknown): LeagueGameMatch[] {
  if (Array.isArray(raw)) return raw as LeagueGameMatch[];
  if (raw && typeof raw === 'object') {
    return Object.values(raw as Record<string, LeagueGameMatch>).sort(
      (a, b) => a.matchNumber - b.matchNumber
    );
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions
// ─────────────────────────────────────────────────────────────────────────────

interface CreateLeagueGameData {
  name: string;
  date: string;
  venue?: string;
  clubId: string;
  /** 6 club player IDs: first 3 are men (slots M1-M3), next 3 are women (slots F1-F3) */
  clubPlayerIds: string[];
  opponentPlayers: {
    duprId?: string;
    name: string;
    gender: 'male' | 'female';
    slot: 1 | 2 | 3;
  }[];
}

export async function createLeagueGame(
  data: CreateLeagueGameData
): Promise<{ success: boolean; leagueGameId?: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    requireAuthentication(currentUser);

    const validated = validateData(createLeagueGameSchema, data);

    // Sort opponent players by gender + slot to get deterministic ordering
    const maleOpponents = validated.opponentPlayers
      .filter((p) => p.gender === 'male')
      .sort((a, b) => a.slot - b.slot);
    const femaleOpponents = validated.opponentPlayers
      .filter((p) => p.gender === 'female')
      .sort((a, b) => a.slot - b.slot);

    if (maleOpponents.length !== 3 || femaleOpponents.length !== 3) {
      return { success: false, error: 'Exactly 3 male and 3 female opponent players are required' };
    }

    // clubPlayerIds: first 3 = men (M1,M2,M3), last 3 = women (F1,F2,F3)
    const maleClubIds = validated.clubPlayerIds.slice(0, 3);
    const femaleClubIds = validated.clubPlayerIds.slice(3, 6);

    const matches = generatePbsMatches(maleClubIds, femaleClubIds);

    const leagueGame: Omit<LeagueGame, 'id'> = {
      clubId: validated.clubId,
      name: validated.name.trim(),
      date: validated.date,
      venue: validated.venue?.trim(),
      status: 'active',
      createdDate: new Date().toISOString(),
      createdBy: currentUser?.id ?? 'unknown',
      clubPlayerIds: validated.clubPlayerIds,
      opponentPlayers: validated.opponentPlayers as LeagueGame['opponentPlayers'],
      matches,
    };

    const docRef = await addDoc(collection(db, 'leagueGames'), leagueGame);

    revalidatePath('/league-games');

    return { success: true, leagueGameId: docRef.id };
  } catch (error) {
    console.error('createLeagueGame error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create league game',
    };
  }
}

interface UpdateMatchScoreData {
  leagueGameId: string;
  matchIndex: number; // 0-based index into the matches array
  clubTeamScore: number;
  opponentTeamScore: number;
}

export async function updateLeagueGameMatchScore(
  data: UpdateMatchScoreData
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    requireAuthentication(currentUser);

    const { leagueGameId, matchIndex, clubTeamScore, opponentTeamScore } = data;

    if (clubTeamScore < 0 || clubTeamScore > 21 || opponentTeamScore < 0 || opponentTeamScore > 21) {
      return { success: false, error: 'Scores must be between 0 and 21' };
    }

    const gameRef = doc(db, 'leagueGames', leagueGameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      return { success: false, error: 'League game not found' };
    }

    const gameData = gameDoc.data() as Omit<LeagueGame, 'id'>;
    if (gameData.status === 'submitted') {
      return { success: false, error: 'Cannot edit scores for a submitted fixture' };
    }

    // Normalise matches first — dot-notation updates previously converted the
    // Firestore array to a map, so we must handle both shapes.
    const matches = normalizeMatches(gameData.matches);
    if (matchIndex < 0 || matchIndex >= matches.length) {
      return { success: false, error: 'Invalid match index' };
    }

    matches[matchIndex] = {
      ...matches[matchIndex],
      clubTeamScore,
      opponentTeamScore,
      status: 'completed' as const,
    };

    // Write the whole array back — avoids the map-conversion bug
    await updateDoc(gameRef, { matches });

    revalidatePath(`/league-games/${leagueGameId}`);

    return { success: true };
  } catch (error) {
    console.error('updateLeagueGameMatchScore error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update match score',
    };
  }
}

export async function submitLeagueGameToDupr(
  leagueGameId: string
): Promise<{ success: boolean; submissionId?: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    requireAuthentication(currentUser);

    const gameRef = doc(db, 'leagueGames', leagueGameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      return { success: false, error: 'League game not found' };
    }

    const rawData = gameDoc.data()!;
    const gameData: LeagueGame = {
      id: gameDoc.id,
      ...rawData,
      matches: normalizeMatches(rawData.matches),
    } as LeagueGame;

    if (gameData.status === 'submitted') {
      return { success: false, error: 'This fixture has already been submitted to DUPR' };
    }

    // Verify all 9 matches are completed
    const incomplete = gameData.matches.filter((m) => m.status !== 'completed');
    if (incomplete.length > 0) {
      return {
        success: false,
        error: `${incomplete.length} match(es) have not been scored yet`,
      };
    }

    // Fetch club players to get their DUPR IDs
    const playerDocs = await Promise.all(
      gameData.clubPlayerIds.map((id) => getDoc(doc(db, 'players', id)))
    );

    const clubPlayersMap = new Map<string, Player>();
    for (const playerDoc of playerDocs) {
      if (playerDoc.exists()) {
        clubPlayersMap.set(playerDoc.id, { id: playerDoc.id, ...playerDoc.data() } as Player);
      }
    }

    // Check that all club players have DUPR IDs
    const missingDupr = gameData.clubPlayerIds.filter((id) => {
      const p = clubPlayersMap.get(id);
      return !p?.duprId;
    });

    if (missingDupr.length > 0) {
      return {
        success: false,
        error: `${missingDupr.length} club player(s) are missing DUPR IDs. Please add them in Admin → Players.`,
      };
    }

    // Build and submit payload
    const payload = buildDuprPayload(gameData, clubPlayersMap);
    const result = await submitLeagueFixtureToDupr(payload);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Mark as submitted
    await updateDoc(gameRef, {
      status: 'submitted',
      duprSubmissionId: result.submissionId,
      submittedAt: new Date().toISOString(),
    });

    revalidatePath(`/league-games/${leagueGameId}`);
    revalidatePath('/league-games');

    return { success: true, submissionId: result.submissionId };
  } catch (error) {
    console.error('submitLeagueGameToDupr error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit to DUPR',
    };
  }
}

export async function deleteLeagueGame(
  leagueGameId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    requireAuthentication(currentUser);

    const gameRef = doc(db, 'leagueGames', leagueGameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      return { success: false, error: 'League game not found' };
    }

    const gameData = gameDoc.data() as Omit<LeagueGame, 'id'>;
    if (gameData.status === 'submitted') {
      return { success: false, error: 'Cannot delete a fixture that has been submitted to DUPR' };
    }

    await deleteDoc(gameRef);

    revalidatePath('/league-games');

    return { success: true };
  } catch (error) {
    console.error('deleteLeagueGame error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete league game',
    };
  }
}

export async function getLeagueGamesByClub(clubId: string): Promise<LeagueGame[]> {
  try {
    const q = query(
      collection(db, 'leagueGames'),
      where('clubId', '==', clubId),
      orderBy('createdDate', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, matches: normalizeMatches(data.matches) } as LeagueGame;
    });
  } catch (error) {
    console.error('getLeagueGamesByClub error:', error);
    return [];
  }
}

export async function getLeagueGame(id: string): Promise<LeagueGame | null> {
  try {
    const snap = await getDoc(doc(db, 'leagueGames', id));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { id: snap.id, ...data, matches: normalizeMatches(data.matches) } as LeagueGame;
  } catch (error) {
    console.error('getLeagueGame error:', error);
    return null;
  }
}
