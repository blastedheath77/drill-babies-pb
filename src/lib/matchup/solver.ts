/**
 * Matchup Builder solver (pure, no Firebase).
 *
 * Builds a schedule for a friendly between our squad ("home") and visitors
 * ("away"). Squads can be different sizes (e.g. 6 v 8). Every match is a
 * home side against an away side. Visitors are just names: they need no
 * account, and their optional level only helps balance matches.
 *
 * The solver builds the schedule round by round and keeps the best of many
 * randomised attempts, scored by:
 *  - an even share of games within each squad (most important)
 *  - no repeated partners, few repeated opponents
 *  - the requested match types (men's / women's / mixed)
 *  - close matches: similar strength on both sides of the net
 */

export type Gender = 'M' | 'F';
export type Category = 'mens' | 'womens' | 'mixed' | 'open';
export type MatchTypePlan = 'open' | 'mixed' | 'variety';

export interface MatchupPlayer {
  id: string;
  name: string;
  gender?: Gender;
  /** Strength on the club's rating scale (e.g. 3.4). Unknown = squad average. */
  level?: number;
}

export interface MatchupMatch {
  round: number;
  court: number;
  home: string[];
  away: string[];
  category: Category;
  locked?: boolean;
}

export interface MatchupInput {
  home: MatchupPlayer[];
  away: MatchupPlayer[];
  format: 'doubles' | 'singles';
  courts: number;
  rounds: number;
  /** Optional cap on the total number of matches (the last round may use fewer courts). */
  maxMatches?: number;
  matchTypes: MatchTypePlan;
  /** Matches the organiser has fixed; the solver plans around them. */
  locked?: MatchupMatch[];
  seed?: number;
  attempts?: number;
}

export interface SquadFairness {
  gamesPerPlayer: Record<string, number>;
  min: number;
  max: number;
}

export interface FairnessReport {
  home: SquadFairness;
  away: SquadFairness;
  repeatPartners: number;
  repeatOpponents: number;
  categoryCounts: Record<Category, number>;
  /** Average difference in strength between the two sides of a match. */
  averageLevelGap: number;
  /** Matches that couldn't be filled (e.g. not enough women for a mixed match). */
  unfilledSlots: number;
}

export interface MatchupResult {
  matches: MatchupMatch[];
  report: FairnessReport;
  warnings: string[];
}

export const MATCHUP_WEIGHTS = {
  gameSpread: 400, // per game above/below the squad's fair share, squared
  repeatPartner: 150,
  repeatOpponent: 20,
  levelGap: 30, // per rating point between the two sides
  categoryShortfall: 60, // per match away from an even mix in 'variety' mode
};

// ---------------------------------------------------------------------------

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

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

interface State {
  games: Map<string, number>;
  partners: Map<string, number>;
  opponents: Map<string, number>;
  categories: Record<Category, number>;
}

function newState(): State {
  return {
    games: new Map(),
    partners: new Map(),
    opponents: new Map(),
    categories: { mens: 0, womens: 0, mixed: 0, open: 0 },
  };
}

function bump(map: Map<string, number>, k: string, by = 1) {
  map.set(k, (map.get(k) ?? 0) + by);
}

function apply(state: State, m: MatchupMatch) {
  [...m.home, ...m.away].forEach((id) => bump(state.games, id));
  for (const side of [m.home, m.away]) if (side.length === 2) bump(state.partners, key(side[0], side[1]));
  for (const h of m.home) for (const a of m.away) bump(state.opponents, key(h, a));
  state.categories[m.category]++;
}

function categoryOf(side: MatchupPlayer[]): Category {
  if (side.length < 2) return side[0]?.gender === 'F' ? 'womens' : side[0]?.gender === 'M' ? 'mens' : 'open';
  const g = side.map((p) => p.gender);
  if (g.includes(undefined)) return 'open';
  if (g[0] === 'M' && g[1] === 'M') return 'mens';
  if (g[0] === 'F' && g[1] === 'F') return 'womens';
  return 'mixed';
}

function avgLevel(side: MatchupPlayer[], fallback: number) {
  return side.reduce((s, p) => s + (p.level ?? fallback), 0) / side.length;
}

// ---------------------------------------------------------------------------

export function buildMatchups(input: MatchupInput): MatchupResult {
  const perSide = input.format === 'doubles' ? 2 : 1;
  const rand = mulberry32(input.seed ?? Date.now());
  const attempts = input.attempts ?? 80;
  const homeById = new Map(input.home.map((p) => [p.id, p]));
  const awayById = new Map(input.away.map((p) => [p.id, p]));
  const homeAvg = average(input.home.map((p) => p.level).filter(isNum)) ?? 3;
  const awayAvg = average(input.away.map((p) => p.level).filter(isNum)) ?? homeAvg;
  const warnings: string[] = [];

  const plannedMatches = Math.min(
    input.maxMatches ?? Infinity,
    input.rounds * Math.min(input.courts, Math.floor(input.home.length / perSide), Math.floor(input.away.length / perSide))
  );

  if (input.matchTypes !== 'open' && input.format === 'doubles') {
    const missing = [...input.home, ...input.away].filter((p) => !p.gender).length;
    if (missing) warnings.push(`${missing} player(s) have no gender set, so they can only play open matches.`);
  }

  let best: { matches: MatchupMatch[]; cost: number; unfilled: number } | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const state = newState();
    const matches: MatchupMatch[] = [];
    let unfilled = 0;
    let remaining = plannedMatches;

    for (let round = 1; round <= input.rounds && remaining > 0; round++) {
      const lockedHere = (input.locked ?? []).filter((m) => m.round === round);
      const usedHome = new Set(lockedHere.flatMap((m) => m.home));
      const usedAway = new Set(lockedHere.flatMap((m) => m.away));
      for (const m of lockedHere) {
        const match = { ...m, locked: true, category: categoryOf([...m.home.map((id) => homeById.get(id)!)].filter(Boolean)) };
        matches.push(match);
        apply(state, match);
        remaining--;
      }

      const courtsFree = [...Array(input.courts).keys()]
        .map((c) => c + 1)
        .filter((c) => !lockedHere.some((m) => m.court === c));
      const slots = Math.min(courtsFree.length, remaining);

      for (let i = 0; i < slots; i++) {
        const court = courtsFree[i];
        const wanted = chooseCategory(input, state, input.home, input.away, usedHome, usedAway, perSide);
        const match = pickMatch({
          wanted,
          perSide,
          state,
          home: input.home.filter((p) => !usedHome.has(p.id)),
          away: input.away.filter((p) => !usedAway.has(p.id)),
          homeAvg,
          awayAvg,
          rand,
        });
        if (!match) {
          unfilled++;
          continue;
        }
        const full: MatchupMatch = { round, court, ...match };
        match.home.forEach((id) => usedHome.add(id));
        match.away.forEach((id) => usedAway.add(id));
        matches.push(full);
        apply(state, full);
        remaining--;
      }
    }

    const improved = improveSchedule(input, matches, homeById, awayById, homeAvg, awayAvg);
    const cost = improved.cost + unfilled * 1000;
    if (!best || cost < best.cost) best = { matches: improved.matches, cost, unfilled };
  }

  const matches = best!.matches.sort((a, b) => a.round - b.round || a.court - b.court);
  const report = buildReport(input, matches, homeById, awayById, homeAvg, awayAvg, best!.unfilled);
  if (report.unfilledSlots) warnings.push(`${report.unfilledSlots} match(es) couldn't be filled with these players and match types.`);
  return { matches, report, warnings };
}

function isNum(x: unknown): x is number {
  return typeof x === 'number' && !Number.isNaN(x);
}

function average(xs: number[]): number | undefined {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}

/** Which match type to schedule next on a free court. */
function chooseCategory(
  input: MatchupInput,
  state: State,
  home: MatchupPlayer[],
  away: MatchupPlayer[],
  usedHome: Set<string>,
  usedAway: Set<string>,
  perSide: number
): Category {
  if (input.matchTypes === 'open' || perSide === 1) return 'open';
  const free = (squad: MatchupPlayer[], used: Set<string>, g: Gender) => squad.filter((p) => !used.has(p.id) && p.gender === g).length;
  const hm = free(home, usedHome, 'M');
  const hf = free(home, usedHome, 'F');
  const am = free(away, usedAway, 'M');
  const af = free(away, usedAway, 'F');
  const feasible: Category[] = [];
  if (hm >= 1 && hf >= 1 && am >= 1 && af >= 1) feasible.push('mixed');
  if (input.matchTypes === 'variety') {
    if (hm >= 2 && am >= 2) feasible.push('mens');
    if (hf >= 2 && af >= 2) feasible.push('womens');
  }
  if (feasible.length === 0) return 'open';
  if (input.matchTypes === 'mixed') return 'mixed';
  // Even mix: the type played least so far
  return feasible.sort((a, b) => state.categories[a] - state.categories[b])[0];
}

interface PickArgs {
  wanted: Category;
  perSide: number;
  state: State;
  home: MatchupPlayer[];
  away: MatchupPlayer[];
  homeAvg: number;
  awayAvg: number;
  rand: () => number;
}

function needs(category: Category, perSide: number): (Gender | null)[] {
  if (perSide === 1 || category === 'open') return Array(perSide).fill(null);
  if (category === 'mens') return ['M', 'M'];
  if (category === 'womens') return ['F', 'F'];
  return ['M', 'F'];
}

/** Candidates for one side, fewest games first (ties shuffled). */
function candidates(squad: MatchupPlayer[], state: State, rand: () => number, gender: Gender | null) {
  return shuffle(squad, rand)
    .filter((p) => gender === null || p.gender === gender)
    .sort((a, b) => (state.games.get(a.id) ?? 0) - (state.games.get(b.id) ?? 0));
}

function pickSide(squad: MatchupPlayer[], state: State, rand: () => number, need: (Gender | null)[]): MatchupPlayer[][] {
  // A handful of plausible sides drawn from the least-played players
  const pools = need.map((g) => candidates(squad, state, rand, g).slice(0, 4));
  if (pools.some((p) => p.length === 0)) return [];
  const sides: MatchupPlayer[][] = [];
  if (need.length === 1) return pools[0].map((p) => [p]);
  for (const a of pools[0]) for (const b of pools[1]) if (a.id !== b.id) sides.push([a, b]);
  return sides;
}

function pickMatch(args: PickArgs): Omit<MatchupMatch, 'round' | 'court'> | null {
  const { wanted, perSide, state, home, away, homeAvg, awayAvg, rand } = args;
  const need = needs(wanted, perSide);
  const homeSides = pickSide(home, state, rand, need);
  const awaySides = pickSide(away, state, rand, need);
  if (!homeSides.length || !awaySides.length) {
    if (wanted !== 'open') return pickMatch({ ...args, wanted: 'open' });
    return null;
  }

  const minGames = (squad: MatchupPlayer[]) => Math.min(...squad.map((p) => state.games.get(p.id) ?? 0));
  const homeMin = minGames(home);
  const awayMin = minGames(away);

  let best: { cost: number; h: MatchupPlayer[]; a: MatchupPlayer[] } | null = null;
  for (const h of homeSides) {
    for (const a of awaySides) {
      let cost = 0;
      // Fair share: prefer the least-played players
      for (const p of h) cost += MATCHUP_WEIGHTS.gameSpread * ((state.games.get(p.id) ?? 0) - homeMin);
      for (const p of a) cost += MATCHUP_WEIGHTS.gameSpread * ((state.games.get(p.id) ?? 0) - awayMin);
      if (h.length === 2) cost += MATCHUP_WEIGHTS.repeatPartner * (state.partners.get(key(h[0].id, h[1].id)) ?? 0);
      if (a.length === 2) cost += MATCHUP_WEIGHTS.repeatPartner * (state.partners.get(key(a[0].id, a[1].id)) ?? 0);
      for (const x of h) for (const y of a) cost += MATCHUP_WEIGHTS.repeatOpponent * (state.opponents.get(key(x.id, y.id)) ?? 0);
      cost += MATCHUP_WEIGHTS.levelGap * Math.abs(avgLevel(h, homeAvg) - avgLevel(a, awayAvg));
      cost += rand() * 0.5; // break ties differently per attempt
      if (!best || cost < best.cost) best = { cost, h, a };
    }
  }
  if (!best) return null;
  return {
    home: best.h.map((p) => p.id),
    away: best.a.map((p) => p.id),
    category: perSide === 1 ? 'open' : categoryOf(best.h),
  };
}

function stateOf(matches: MatchupMatch[]): State {
  const state = newState();
  matches.forEach((m) => apply(state, m));
  return state;
}

/**
 * Local search: swap a player with a squad-mate in another match of the same
 * round, or with a squad-mate sitting that round out. Swaps keep each match's
 * type (same gender unless the match is open). Locked matches never change.
 */
function improveSchedule(
  input: MatchupInput,
  start: MatchupMatch[],
  homeById: Map<string, MatchupPlayer>,
  awayById: Map<string, MatchupPlayer>,
  homeAvg: number,
  awayAvg: number
): { matches: MatchupMatch[]; cost: number } {
  let matches = start.map((m) => ({ ...m, home: [...m.home], away: [...m.away] }));
  const costOf = (ms: MatchupMatch[]) => scheduleCost(input, ms, stateOf(ms), homeById, awayById, homeAvg, awayAvg);
  let cost = costOf(matches);
  const rounds = [...new Set(matches.map((m) => m.round))];
  const genderOf = (id: string) => (homeById.get(id) ?? awayById.get(id))?.gender;
  const compatible = (a: string, b: string, m1: MatchupMatch, m2?: MatchupMatch) =>
    (m1.category === 'open' && (!m2 || m2.category === 'open')) || genderOf(a) === genderOf(b);

  for (let pass = 0; pass < 6; pass++) {
    let improvedAny = false;
    for (const round of rounds) {
      const inRound = matches.map((m, i) => ({ m, i })).filter(({ m }) => m.round === round && !m.locked);
      for (const side of ['home', 'away'] as const) {
        const squad = side === 'home' ? input.home : input.away;
        const playing = new Set(matches.filter((m) => m.round === round).flatMap((m) => m[side]));
        const idle = squad.map((p) => p.id).filter((id) => !playing.has(id));

        for (const { m: m1, i: i1 } of inRound) {
          for (let s1 = 0; s1 < m1[side].length; s1++) {
            // Swap with a player in another match this round
            for (const { m: m2, i: i2 } of inRound) {
              if (i2 <= i1) continue;
              for (let s2 = 0; s2 < m2[side].length; s2++) {
                // Re-read: an accepted swap changes who is where
                const a = matches[i1][side][s1];
                const b = matches[i2][side][s2];
                if (!compatible(a, b, m1, m2)) continue;
                const next = matches.map((m) => ({ ...m, home: [...m.home], away: [...m.away] }));
                next[i1][side][s1] = b;
                next[i2][side][s2] = a;
                const c = costOf(next);
                if (c < cost - 1e-9) {
                  matches = next;
                  cost = c;
                  improvedAny = true;
                }
              }
            }
            // Swap with someone sitting out this round
            for (const b of idle) {
              const current = matches[i1][side][s1];
              if (!compatible(current, b, m1)) continue;
              const next = matches.map((m) => ({ ...m, home: [...m.home], away: [...m.away] }));
              next[i1][side][s1] = b;
              const c = costOf(next);
              if (c < cost - 1e-9) {
                idle.splice(idle.indexOf(b), 1, current);
                matches = next;
                cost = c;
                improvedAny = true;
              }
            }
          }
        }
      }
    }
    if (!improvedAny) break;
  }
  return { matches, cost };
}

function scheduleCost(
  input: MatchupInput,
  matches: MatchupMatch[],
  state: State,
  homeById: Map<string, MatchupPlayer>,
  awayById: Map<string, MatchupPlayer>,
  homeAvg: number,
  awayAvg: number
): number {
  let cost = 0;
  for (const squad of [input.home, input.away]) {
    const counts = squad.map((p) => state.games.get(p.id) ?? 0);
    const mean = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
    cost += MATCHUP_WEIGHTS.gameSpread * counts.reduce((s, c) => s + (c - mean) ** 2, 0);
  }
  for (const v of state.partners.values()) cost += MATCHUP_WEIGHTS.repeatPartner * Math.max(0, v - 1);
  for (const v of state.opponents.values()) cost += MATCHUP_WEIGHTS.repeatOpponent * Math.max(0, v - 1);
  for (const m of matches) {
    const h = m.home.map((id) => homeById.get(id)!).filter(Boolean);
    const a = m.away.map((id) => awayById.get(id)!).filter(Boolean);
    if (h.length && a.length) cost += MATCHUP_WEIGHTS.levelGap * Math.abs(avgLevel(h, homeAvg) - avgLevel(a, awayAvg));
  }
  if (input.matchTypes === 'variety') {
    const c = state.categories;
    const typed = [c.mens, c.womens, c.mixed];
    const mean = typed.reduce((x, y) => x + y, 0) / 3;
    cost += MATCHUP_WEIGHTS.categoryShortfall * typed.reduce((s, x) => s + Math.abs(x - mean), 0);
  }
  return cost;
}

function buildReport(
  input: MatchupInput,
  matches: MatchupMatch[],
  homeById: Map<string, MatchupPlayer>,
  awayById: Map<string, MatchupPlayer>,
  homeAvg: number,
  awayAvg: number,
  unfilledSlots: number
): FairnessReport {
  const state = newState();
  matches.forEach((m) => apply(state, m));
  const squad = (players: MatchupPlayer[]): SquadFairness => {
    const gamesPerPlayer = Object.fromEntries(players.map((p) => [p.id, state.games.get(p.id) ?? 0]));
    const values = Object.values(gamesPerPlayer);
    return { gamesPerPlayer, min: values.length ? Math.min(...values) : 0, max: values.length ? Math.max(...values) : 0 };
  };
  let gapTotal = 0;
  for (const m of matches) {
    const h = m.home.map((id) => homeById.get(id)!).filter(Boolean);
    const a = m.away.map((id) => awayById.get(id)!).filter(Boolean);
    if (h.length && a.length) gapTotal += Math.abs(avgLevel(h, homeAvg) - avgLevel(a, awayAvg));
  }
  return {
    home: squad(input.home),
    away: squad(input.away),
    repeatPartners: [...state.partners.values()].reduce((s, v) => s + Math.max(0, v - 1), 0),
    repeatOpponents: [...state.opponents.values()].reduce((s, v) => s + Math.max(0, v - 1), 0),
    categoryCounts: state.categories,
    averageLevelGap: matches.length ? gapTotal / matches.length : 0,
    unfilledSlots,
  };
}

/**
 * Suggested number of rounds: about `targetGames` each on average across both
 * squads (the smaller squad plays a bit more), capped at a realistic evening.
 */
export function suggestRounds(
  homeCount: number,
  awayCount: number,
  courts: number,
  format: 'doubles' | 'singles',
  targetGames = 4,
  maxRounds = 10
) {
  const perSide = format === 'doubles' ? 2 : 1;
  const perRound = Math.min(courts, Math.floor(homeCount / perSide), Math.floor(awayCount / perSide));
  if (perRound === 0) return 0;
  const averageSquad = (homeCount + awayCount) / 2;
  return Math.min(maxRounds, Math.max(1, Math.ceil((targetGames * averageSquad) / (perRound * perSide))));
}
