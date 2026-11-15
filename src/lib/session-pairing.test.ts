import { describe, expect, it } from 'vitest';
import { generateRound, countHistory, type PastMatch, type SessionPlayer } from './session-pairing';

const ratings = [4.5, 4.2, 4.0, 3.8, 3.6, 3.4, 3.2, 3.0, 2.9, 2.7];
const makePlayers = (n: number): SessionPlayer[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, rating: ratings[i % ratings.length] }));

/** Runs a whole session round by round, as the app does. */
function runSession(players: SessionPlayer[], rounds: number, courts = 2, format: 'doubles' | 'singles' = 'doubles') {
  const history: PastMatch[] = [];
  const sitOuts: string[][] = [];
  for (let r = 1; r <= rounds; r++) {
    const { matches, sittingOut } = generateRound({ players, format, courts, history, seed: r * 7919 });
    matches.forEach((m) => history.push({ round: r, ...m }));
    sitOuts.push(sittingOut);
  }
  return { history, sitOuts };
}

describe('generateRound', () => {
  it('uses every court when there are enough players', () => {
    const { matches, sittingOut } = generateRound({ players: makePlayers(9), format: 'doubles', courts: 2, history: [], seed: 1 });
    expect(matches).toHaveLength(2);
    expect(sittingOut).toHaveLength(1);
    const ids = matches.flatMap((m) => [...m.team1, ...m.team2]);
    expect(new Set(ids).size).toBe(8);
  });

  it('shares sitting out fairly: game counts never differ by more than 1', () => {
    const players = makePlayers(10);
    const { history } = runSession(players, 10);
    const counts = countHistory(history, players.map((p) => p.id));
    const games = players.map((p) => counts.games.get(p.id) ?? 0);
    expect(Math.max(...games) - Math.min(...games)).toBeLessThanOrEqual(1);
  });

  it('never repeats a partnership while new ones are available (8 players, 7 rounds)', () => {
    const players = makePlayers(8);
    const { history } = runSession(players, 7);
    const counts = countHistory(history, players.map((p) => p.id));
    expect(Math.max(...counts.partners.values())).toBe(1);
  });

  it('balances teams by rating better than chance', () => {
    const players = makePlayers(8);
    const { matches } = generateRound({ players, format: 'doubles', courts: 2, history: [], seed: 3 });
    const rating = new Map(players.map((p) => [p.id, p.rating]));
    const avg = (ids: string[]) => ids.reduce((s, id) => s + rating.get(id)!, 0) / ids.length;
    for (const m of matches) expect(Math.abs(avg(m.team1) - avg(m.team2))).toBeLessThan(0.15);
  });

  it('gives a late arrival the next game', () => {
    const early = makePlayers(8);
    const { history } = runSession(early, 2);
    const late = { id: 'late', rating: 3.5 };
    const { matches } = generateRound({ players: [...early, late], format: 'doubles', courts: 2, history, seed: 99 });
    expect(matches.flatMap((m) => [...m.team1, ...m.team2])).toContain('late');
  });

  it('handles singles', () => {
    const { matches, sittingOut } = generateRound({ players: makePlayers(5), format: 'singles', courts: 2, history: [], seed: 5 });
    expect(matches).toHaveLength(2);
    expect(matches.every((m) => m.team1.length === 1 && m.team2.length === 1)).toBe(true);
    expect(sittingOut).toHaveLength(1);
  });

  it('returns no matches when there are too few players', () => {
    expect(generateRound({ players: makePlayers(3), format: 'doubles', courts: 2, history: [], seed: 1 }).matches).toHaveLength(0);
  });
});
