/**
 * Detailed statistics for one friendly (pure; no Firebase).
 */
import type { Friendly, FriendlyMatch } from '@/lib/types';

export type FriendlySide = 'home' | 'away';
type Category = FriendlyMatch['category'];

export interface RecordLine {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface PlayerLine extends RecordLine {
  id: string;
  side: FriendlySide;
  diff: number;
  winPct: number;
  /** Average points margin per match (positive = winning by). */
  avgMargin: number;
  bestPartner?: { id: string; wins: number; played: number };
  categories: Partial<Record<Category, number>>;
}

export interface PartnershipLine extends RecordLine {
  side: FriendlySide;
  ids: [string, string];
  diff: number;
}

export interface MatchHighlight {
  match: FriendlyMatch;
  margin: number;
}

export interface FriendlyStats {
  team: RecordLine & { diff: number; winPct: number; closeMatches: number };
  byCategory: { category: Category; home: RecordLine }[];
  byRound: { round: number; homeWins: number; awayWins: number; draws: number; homePoints: number; awayPoints: number }[];
  players: PlayerLine[];
  partnerships: PartnershipLine[];
  closest?: MatchHighlight;
  biggestHomeWin?: MatchHighlight;
  biggestAwayWin?: MatchHighlight;
  completed: FriendlyMatch[];
}

const empty = (): RecordLine => ({ played: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0 });

function add(line: RecordLine, own: number, other: number) {
  line.played++;
  line.pointsFor += own;
  line.pointsAgainst += other;
  if (own > other) line.wins++;
  else if (own < other) line.losses++;
  else line.draws++;
}

const pct = (wins: number, played: number) => (played ? Math.round((wins / played) * 100) : 0);

export function computeFriendlyStats(f: Pick<Friendly, 'matches' | 'homePlayerIds' | 'guests'>): FriendlyStats {
  const completed = f.matches
    .filter((m) => m.status === 'completed' && m.homeScore !== undefined && m.awayScore !== undefined)
    .sort((a, b) => a.round - b.round || a.court - b.court);

  const team = empty();
  const categories = new Map<Category, RecordLine>();
  const rounds = new Map<number, FriendlyStats['byRound'][number]>();
  const players = new Map<string, PlayerLine>();
  const partnerRecords = new Map<string, Map<string, { wins: number; played: number; diff: number }>>();
  const partnerships = new Map<string, PartnershipLine>();

  const player = (id: string, side: FriendlySide) => {
    let p = players.get(id);
    if (!p) {
      p = { id, side, ...empty(), diff: 0, winPct: 0, avgMargin: 0, categories: {} };
      players.set(id, p);
    }
    return p;
  };
  // Everyone in the squads appears, even with no games
  f.homePlayerIds.forEach((id) => player(id, 'home'));
  f.guests.forEach((g) => player(g.id, 'away'));

  let closeMatches = 0;
  let closest: MatchHighlight | undefined;
  let biggestHomeWin: MatchHighlight | undefined;
  let biggestAwayWin: MatchHighlight | undefined;

  for (const m of completed) {
    const h = m.homeScore!;
    const a = m.awayScore!;
    add(team, h, a);
    if (Math.abs(h - a) <= 2) closeMatches++;

    const cat = categories.get(m.category) ?? empty();
    add(cat, h, a);
    categories.set(m.category, cat);

    const r = rounds.get(m.round) ?? { round: m.round, homeWins: 0, awayWins: 0, draws: 0, homePoints: 0, awayPoints: 0 };
    r.homePoints += h;
    r.awayPoints += a;
    if (h > a) r.homeWins++;
    else if (a > h) r.awayWins++;
    else r.draws++;
    rounds.set(m.round, r);

    const margin = Math.abs(h - a);
    if (!closest || margin < closest.margin) closest = { match: m, margin };
    if (h > a && (!biggestHomeWin || margin > biggestHomeWin.margin)) biggestHomeWin = { match: m, margin };
    if (a > h && (!biggestAwayWin || margin > biggestAwayWin.margin)) biggestAwayWin = { match: m, margin };

    for (const side of ['home', 'away'] as const) {
      const own = side === 'home' ? h : a;
      const other = side === 'home' ? a : h;
      const ids = m[side];
      for (const id of ids) {
        const p = player(id, side);
        add(p, own, other);
        p.categories[m.category] = (p.categories[m.category] ?? 0) + 1;
        for (const partner of ids) {
          if (partner === id) continue;
          const recs = partnerRecords.get(id) ?? new Map();
          const rec = recs.get(partner) ?? { wins: 0, played: 0, diff: 0 };
          rec.played++;
          rec.diff += own - other;
          if (own > other) rec.wins++;
          recs.set(partner, rec);
          partnerRecords.set(id, recs);
        }
      }
      if (ids.length === 2) {
        const sorted = [...ids].sort() as [string, string];
        const key = `${side}:${sorted.join('|')}`;
        const line = partnerships.get(key) ?? { side, ids: sorted, ...empty(), diff: 0 };
        add(line, own, other);
        line.diff = line.pointsFor - line.pointsAgainst;
        partnerships.set(key, line);
      }
    }
  }

  for (const p of players.values()) {
    p.diff = p.pointsFor - p.pointsAgainst;
    p.winPct = pct(p.wins, p.played);
    p.avgMargin = p.played ? Math.round((p.diff / p.played) * 10) / 10 : 0;
    const recs = partnerRecords.get(p.id);
    if (recs) {
      const [id, rec] = [...recs.entries()].sort(
        (x, y) => y[1].wins - x[1].wins || y[1].diff - x[1].diff || y[1].played - x[1].played
      )[0];
      if (rec.wins > 0) p.bestPartner = { id, wins: rec.wins, played: rec.played };
    }
  }

  const byPerformance = (a: PlayerLine, b: PlayerLine) =>
    b.winPct - a.winPct || b.diff - a.diff || b.played - a.played || a.id.localeCompare(b.id);

  return {
    team: {
      ...team,
      diff: team.pointsFor - team.pointsAgainst,
      winPct: pct(team.wins, team.played),
      closeMatches,
    },
    byCategory: (['mens', 'womens', 'mixed', 'open'] as Category[])
      .filter((c) => categories.has(c))
      .map((c) => ({ category: c, home: categories.get(c)! })),
    byRound: [...rounds.values()].sort((a, b) => a.round - b.round),
    players: [...players.values()].sort(byPerformance),
    partnerships: [...partnerships.values()].sort(
      (a, b) => b.wins - a.wins || b.diff - a.diff || b.played - a.played
    ),
    closest,
    biggestHomeWin,
    biggestAwayWin,
    completed,
  };
}
