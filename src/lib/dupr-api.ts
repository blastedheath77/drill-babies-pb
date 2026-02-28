// DUPR API client — server-side only, never import from client components
// Environment variables:
//   DUPR_API_KEY=...
//   DUPR_API_ENDPOINT=https://backend.mydupr.com  (configurable)

import type { LeagueGame, LeagueGameMatch, DuprOpponentPlayer, Player } from './types';

const DUPR_ENDPOINT = process.env.DUPR_API_ENDPOINT ?? 'https://backend.mydupr.com';
const DUPR_API_KEY = process.env.DUPR_API_KEY ?? '';

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${DUPR_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export interface DuprPlayerInfo {
  valid: boolean;
  name?: string;
  rating?: number;
  error?: string;
}

export async function verifyDuprPlayerId(duprId: string): Promise<DuprPlayerInfo> {
  if (!DUPR_API_KEY) {
    // No API key configured — return a permissive mock for development
    return { valid: true, name: `Player ${duprId}`, rating: 3.5 };
  }

  try {
    const res = await fetch(`${DUPR_ENDPOINT}/player/${encodeURIComponent(duprId)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { valid: false, error: 'Player not found in DUPR' };
      }
      return { valid: false, error: `DUPR API error: ${res.status}` };
    }

    const data = await res.json();
    return {
      valid: true,
      name: data.displayName ?? data.name,
      rating: data.rating,
    };
  } catch (err) {
    return { valid: false, error: 'Failed to reach DUPR API' };
  }
}

// Shape of a single doubles match for DUPR submission
interface DuprMatchPayload {
  team1: string[];   // DUPR IDs
  team2: string[];   // DUPR IDs
  team1Score: number;
  team2Score: number;
  matchDate: string; // ISO date
  category: string;
}

export interface DuprFixturePayload {
  fixtureDate: string;
  venue?: string;
  matches: DuprMatchPayload[];
}

export interface DuprSubmissionResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

export async function submitLeagueFixtureToDupr(
  payload: DuprFixturePayload
): Promise<DuprSubmissionResult> {
  if (!DUPR_API_KEY) {
    // Dev mode: simulate a successful submission
    return { success: true, submissionId: `mock-${Date.now()}` };
  }

  try {
    const res = await fetch(`${DUPR_ENDPOINT}/match/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `DUPR submission failed (${res.status}): ${text}` };
    }

    const data = await res.json();
    return { success: true, submissionId: data.submissionId ?? data.id };
  } catch (err) {
    return { success: false, error: 'Failed to reach DUPR API for submission' };
  }
}

/**
 * Build the DUPR payload from a LeagueGame document.
 * Requires that all club players have duprId set.
 */
export function buildDuprPayload(
  game: LeagueGame,
  clubPlayersMap: Map<string, Player>
): DuprFixturePayload {
  const opponentMap = new Map<string, DuprOpponentPlayer>(
    game.opponentPlayers
      .filter((p): p is DuprOpponentPlayer & { duprId: string } => !!p.duprId)
      .map((p) => [p.duprId, p])
  );

  const matches: DuprMatchPayload[] = game.matches.map((m) => {
    const clubDuprIds = m.clubTeamPlayerIds.map((id) => {
      const player = clubPlayersMap.get(id);
      if (!player?.duprId) throw new Error(`Club player ${id} has no DUPR ID`);
      return player.duprId;
    });

    // Resolve opponent DUPR IDs from slot keys (e.g. "male-1", "female-2")
    const slotOpponentMap = new Map(
      game.opponentPlayers
        .filter((p) => !!p.duprId)
        .map((p) => [`${p.gender}-${p.slot}`, p.duprId as string])
    );
    const team2DuprIds = m.opponentTeamSlots.map((slot) => {
      const duprId = slotOpponentMap.get(slot);
      if (!duprId) throw new Error(`Opponent player for slot ${slot} has no DUPR ID`);
      return duprId;
    });

    return {
      team1: clubDuprIds,
      team2: team2DuprIds,
      team1Score: m.clubTeamScore ?? 0,
      team2Score: m.opponentTeamScore ?? 0,
      matchDate: game.date,
      category: m.category,
    };
  });

  return {
    fixtureDate: game.date,
    venue: game.venue,
    matches,
  };
}
