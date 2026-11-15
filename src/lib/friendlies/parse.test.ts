import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('@/lib/client-user', () => ({ getCurrentUser: vi.fn(), requireAuthentication: vi.fn() }));

import { parseGuestList, tallyFriendly } from './index';

describe('parseGuestList', () => {
  it('reads names with optional gender markers', () => {
    const guests = parseGuestList('Anna Smith, F\nBob Jones (M)\n  \nCarl - m\nDee');
    expect(guests.map((g) => [g.name, g.gender])).toEqual([
      ['Anna Smith', 'F'],
      ['Bob Jones', 'M'],
      ['Carl', 'M'],
      ['Dee', undefined],
    ]);
    expect(new Set(guests.map((g) => g.id)).size).toBe(4);
  });

  it("doesn't treat a name ending in m/f as a gender unless separated", () => {
    expect(parseGuestList('Tom')[0]).toMatchObject({ name: 'Tom' });
    expect(parseGuestList('Tom')[0].gender).toBeUndefined();
  });
});

describe('tallyFriendly', () => {
  it('counts matches and points for completed matches only', () => {
    const t = tallyFriendly({
      matches: [
        { id: '1', round: 1, court: 1, home: [], away: [], category: 'open', status: 'completed', homeScore: 11, awayScore: 7 },
        { id: '2', round: 1, court: 2, home: [], away: [], category: 'open', status: 'completed', homeScore: 9, awayScore: 11 },
        { id: '3', round: 2, court: 1, home: [], away: [], category: 'open', status: 'pending' },
      ],
    });
    expect(t).toEqual({ homeMatches: 1, awayMatches: 1, homePoints: 20, awayPoints: 18, played: 2 });
  });
});
