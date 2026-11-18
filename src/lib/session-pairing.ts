/**
 * Round-by-round pairing for quick-play / training sessions (pure, no Firebase).
 *
 * Each call produces ONE round from the players present now and the matches
 * already generated, so people can arrive or leave between rounds.
 *
 * Priorities, in order:
 *  1. Fair sitting out: players with the fewest games play first; ties go to
 *     whoever sat out most recently / most often.
 *  2. No repeated partners while new partnerships are possible.
 *  3. Few repeated opponents.
 *  4. Balanced teams: small difference between the two teams' average rating.
 */

export interface SessionPlayer {
  id: string;
  rating: number;
}

export interface PastMatch {
  round: number;
  team1: string[];
  team2: string[];
}

export interface RoundInput {
  players: SessionPlayer[];
  format: 'singles' | 'doubles';
  courts: number;
  history: PastMatch[];
  /** Seed for repeatable results (tests). Defaults to a time-based seed. */
  seed?: number;
  /** Search effort; higher = better pairings, slower. */
  iterations?: number;
}

export interface RoundMatch {
  team1: string[];
  team2: string[];
}

export interface RoundResult {
  matches: RoundMatch[];
  sittingOut: string[];
}

export const PAIRING_WEIGHTS = {
  repeatPartner: 100,
  repeatOpponent: 12,
  /** per 1.0 rating point of difference between team averages */
  ratingGap: 40,
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export interface SessionCounts {
  games: Map<string, number>;
  sitOuts: Map<string, number>;
  lastSatOut: Map<string, number>;
  partners: Map<string, number>;
  opponents: Map<string, number>;
}

/** Tallies games, sit-outs, partnerships and opponents from earlier rounds. */
export function countHistory(history: PastMatch[], playerIds: string[]): SessionCounts {
  const games = new Map<string, number>();
  const sitOuts = new Map<string, number>();
  const lastSatOut = new Map<string, number>();
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  const rounds = new Map<number, Set<string>>();
  for (const m of history) {
    const all = [...m.team1, ...m.team2];
    all.forEach((id) => bump(games, id));
    const playing = rounds.get(m.round) ?? new Set<string>();
    all.forEach((id) => playing.add(id));
    rounds.set(m.round, playing);
    for (const team of [m.team1, m.team2]) {
      for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++) bump(partners, pairKey(team[i], team[j]));
    }
    for (const a of m.team1) for (const b of m.team2) bump(opponents, pairKey(a, b));
  }
  // A player present now who didn't play in a past round counts as sitting it out
  for (const [round, playing] of rounds) {
    for (const id of playerIds) {
      if (!playing.has(id)) {
        bump(sitOuts, id);
        lastSatOut.set(id, Math.max(lastSatOut.get(id) ?? 0, round));
      }
    }
  }
  return { games, sitOuts, lastSatOut, partners, opponents };
}

function avg(ids: string[], rating: Map<string, number>) {
  return ids.reduce((s, id) => s + (rating.get(id) ?? 3), 0) / ids.length;
}

export function matchCost(match: RoundMatch, counts: SessionCounts, rating: Map<string, number>): number {
  let cost = 0;
  for (const team of [match.team1, match.team2]) {
    if (team.length === 2) cost += PAIRING_WEIGHTS.repeatPartner * (counts.partners.get(pairKey(team[0], team[1])) ?? 0);
  }
  for (const a of match.team1) for (const b of match.team2) {
    cost += PAIRING_WEIGHTS.repeatOpponent * (counts.opponents.get(pairKey(a, b)) ?? 0);
  }
  cost += PAIRING_WEIGHTS.ratingGap * Math.abs(avg(match.team1, rating) - avg(match.team2, rating));
  return cost;
}

/** Best way to split four players into two pairs. */
function bestDoublesSplit(four: string[], counts: SessionCounts, rating: Map<string, number>) {
  const [a, b, c, d] = four;
  const options: RoundMatch[] = [
    { team1: [a, b], team2: [c, d] },
    { team1: [a, c], team2: [b, d] },
    { team1: [a, d], team2: [b, c] },
  ];
  let best = options[0];
  let bestCost = Infinity;
  for (const o of options) {
    const cost = matchCost(o, counts, rating);
    if (cost < bestCost) {
      best = o;
      bestCost = cost;
    }
  }
  return { match: best, cost: bestCost };
}

function buildMatches(order: string[], perMatch: number, counts: SessionCounts, rating: Map<string, number>) {
  const matches: RoundMatch[] = [];
  let total = 0;
  for (let i = 0; i + perMatch <= order.length; i += perMatch) {
    const group = order.slice(i, i + perMatch);
    if (perMatch === 4) {
      const { match, cost } = bestDoublesSplit(group, counts, rating);
      matches.push(match);
      total += cost;
    } else {
      const match = { team1: [group[0]], team2: [group[1]] };
      matches.push(match);
      total += matchCost(match, counts, rating);
    }
  }
  return { matches, total };
}

/** Chooses who plays this round: fewest games first, then who sat out most recently. */
export function choosePlaying(playerIds: string[], slots: number, counts: SessionCounts, rand: () => number): {
  playing: string[];
  sittingOut: string[];
} {
  const ranked = shuffle(playerIds, rand).sort((x, y) => {
    const g = (counts.games.get(x) ?? 0) - (counts.games.get(y) ?? 0);
    if (g !== 0) return g;
    const last = (counts.lastSatOut.get(y) ?? 0) - (counts.lastSatOut.get(x) ?? 0);
    if (last !== 0) return last;
    return (counts.sitOuts.get(y) ?? 0) - (counts.sitOuts.get(x) ?? 0);
  });
  return { playing: ranked.slice(0, slots), sittingOut: ranked.slice(slots) };
}

export function generateRound(input: RoundInput): RoundResult {
  const { players, format, courts, history } = input;
  const perMatch = format === 'doubles' ? 4 : 2;
  const ids = players.map((p) => p.id);
  const rating = new Map(players.map((p) => [p.id, p.rating]));
  const matchCount = Math.min(Math.max(1, courts), Math.floor(ids.length / perMatch));
  if (matchCount === 0) return { matches: [], sittingOut: ids };

  const rand = mulberry32(input.seed ?? Date.now());
  const counts = countHistory(history, ids);
  const { playing, sittingOut } = choosePlaying(ids, matchCount * perMatch, counts, rand);

  // Random restarts + pairwise swaps between groups, keeping the cheapest schedule
  const iterations = input.iterations ?? 300;
  let best = buildMatches(playing, perMatch, counts, rating);
  for (let it = 0; it < iterations; it++) {
    let order = shuffle(playing, rand);
    let current = buildMatches(order, perMatch, counts, rating);
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < order.length && !improved; i++) {
        for (let j = i + 1; j < order.length && !improved; j++) {
          if (Math.floor(i / perMatch) === Math.floor(j / perMatch)) continue;
          const next = [...order];
          [next[i], next[j]] = [next[j], next[i]];
          const candidate = buildMatches(next, perMatch, counts, rating);
          if (candidate.total < current.total - 1e-9) {
            order = next;
            current = candidate;
            improved = true;
          }
        }
      }
    }
    if (current.total < best.total) best = current;
    if (best.total < 1e-6) break;
  }

  return { matches: best.matches, sittingOut };
}
