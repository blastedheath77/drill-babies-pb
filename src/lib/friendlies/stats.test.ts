import { describe, expect, it } from 'vitest';
import { computeFriendlyStats } from './stats';
import type { FriendlyMatch } from '@/lib/types';

const m = (round: number, court: number, home: string[], away: string[], h?: number, a?: number, category: FriendlyMatch['category'] = 'open'): FriendlyMatch => ({
  id: `${round}-${court}`,
  round,
  court,
  home,
  away,
  category,
  status: h === undefined ? 'pending' : 'completed',
  ...(h === undefined ? {} : { homeScore: h, awayScore: a }),
});

const friendly = {
  homePlayerIds: ['h1', 'h2', 'h3'],
  guests: [{ id: 'a1', name: 'A1' }, { id: 'a2', name: 'A2' }, { id: 'a3', name: 'A3' }],
  matches: [
    m(1, 1, ['h1', 'h2'], ['a1', 'a2'], 11, 9, 'mixed'),
    m(1, 2, ['h3', 'h1'], ['a3', 'a1'], 4, 11, 'mens'),
    m(2, 1, ['h1', 'h2'], ['a2', 'a3'], 11, 2, 'mixed'),
    m(2, 2, ['h2', 'h3'], ['a1', 'a3']), // not played
  ],
};

describe('computeFriendlyStats', () => {
  const s = computeFriendlyStats(friendly);

  it('team totals use completed matches only', () => {
    expect(s.team).toMatchObject({ played: 3, wins: 2, losses: 1, pointsFor: 26, pointsAgainst: 22, diff: 4, winPct: 67, closeMatches: 1 });
  });

  it('splits by match type and round', () => {
    expect(s.byCategory.map((c) => [c.category, c.home.wins, c.home.losses])).toEqual([
      ['mens', 0, 1],
      ['mixed', 2, 0],
    ]);
    expect(s.byRound).toEqual([
      { round: 1, homeWins: 1, awayWins: 1, draws: 0, homePoints: 15, awayPoints: 20 },
      { round: 2, homeWins: 1, awayWins: 0, draws: 0, homePoints: 11, awayPoints: 2 },
    ]);
  });

  it('gives every player a line, including the ones who did not play', () => {
    const h1 = s.players.find((p) => p.id === 'h1')!;
    expect(h1).toMatchObject({ played: 3, wins: 2, losses: 1, pointsFor: 26, pointsAgainst: 22, diff: 4, winPct: 67 });
    expect(h1.bestPartner).toEqual({ id: 'h2', wins: 2, played: 2 });
    expect(h1.categories).toEqual({ mixed: 2, mens: 1 });
    const a1 = s.players.find((p) => p.id === 'a1')!;
    expect(a1).toMatchObject({ side: 'away', played: 2, wins: 1, losses: 1 });
    expect(s.players).toHaveLength(6);
  });

  it('records partnerships and highlights', () => {
    const pair = s.partnerships.find((p) => p.side === 'home' && p.ids.join() === 'h1,h2')!;
    expect(pair).toMatchObject({ played: 2, wins: 2, diff: 11 });
    expect(s.closest?.margin).toBe(2);
    expect(s.biggestHomeWin?.margin).toBe(9);
    expect(s.biggestAwayWin?.margin).toBe(7);
  });
});
