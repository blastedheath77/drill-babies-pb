import { describe, expect, it } from 'vitest';
import { computeGameRatings, gameStatDelta, replayFrom, type ReplayGame } from './rating-engine';

// Outputs captured from the pre-refactor logGame maths (src/app/log-game/actions.ts at ab0e59f).
const GOLDEN: { p: Record<string, number>; t1: string[]; t2: string[]; s: [number, number]; out: Record<string, number> }[] = [{"p":{"a":3,"b":3,"c":3,"d":3},"t1":["a","b"],"t2":["c","d"],"s":[11,9],"out":{"a":3.062,"b":3.062,"c":2.938,"d":2.938}},{"p":{"a":4.56,"b":2.7,"c":3.93,"d":3.1},"t1":["a","b"],"t2":["c","d"],"s":[11,3],"out":{"a":4.615548226729246,"b":2.8165212263334953,"c":3.7883547924665537,"d":3.0152680331834527}},{"p":{"a":2.4,"b":2.9,"c":4.2,"d":4},"t1":["a","b"],"t2":["c","d"],"s":[15,13],"out":{"a":2.538367084269954,"b":3.0136880117652485,"c":4.02887411226249,"d":3.837221716542368}},{"p":{"a":3.5,"b":3.2},"t1":["a"],"t2":["b"],"s":[7,11],"out":{"a":3.390664562243505,"b":3.286575816019429}},{"p":{"a":3.3,"b":3.6,"c":3.4,"d":3.5},"t1":["a","b"],"t2":["c","d"],"s":[10,10],"out":{"a":3.3,"b":3.6,"c":3.4,"d":3.5}},{"p":{"a":7.9,"b":7.8,"c":2.1,"d":2},"t1":["a","b"],"t2":["c","d"],"s":[0,11],"out":{"a":7.524632559609468,"b":7.433900891470962,"c":2.443217914245973,"d":2.351906975366124}}];

describe('computeGameRatings', () => {
  it.each(GOLDEN.map((g, i) => [i, g] as const))('matches the old maths exactly (case %i)', (_i, g) => {
    const rc = computeGameRatings(
      { team1PlayerIds: g.t1, team2PlayerIds: g.t2, team1Score: g.s[0], team2Score: g.s[1] },
      g.p
    );
    for (const [id, after] of Object.entries(g.out)) {
      expect(rc[id].before).toBe(g.p[id]);
      expect(rc[id].after).toBe(after);
    }
  });
});

describe('gameStatDelta', () => {
  it('counts wins, losses, draws and points', () => {
    const game = { team1PlayerIds: ['a', 'b'], team2PlayerIds: ['c', 'd'], team1Score: 11, team2Score: 7 };
    expect(gameStatDelta(game, 'a')).toEqual({ wins: 1, losses: 0, draws: 0, pointsFor: 11, pointsAgainst: 7 });
    expect(gameStatDelta(game, 'd')).toEqual({ wins: 0, losses: 1, draws: 0, pointsFor: 7, pointsAgainst: 11 });
    expect(gameStatDelta({ ...game, team2Score: 11 }, 'c').draws).toBe(1);
  });
});

/** Builds a history the way recordGame does: each game stores its ratingChanges. */
function buildHistory(start: Record<string, number>, games: Omit<ReplayGame, 'ratingChanges'>[]): ReplayGame[] {
  const ratings = { ...start };
  return games.map((g) => {
    const rc = computeGameRatings(g, ratings);
    for (const [id, { after }] of Object.entries(rc)) ratings[id] = after;
    return { ...g, ratingChanges: rc };
  });
}

const START = { a: 3.0, b: 3.4, c: 2.8, d: 3.9, e: 3.1 };
const RAW = [
  { id: 'g1', team1PlayerIds: ['a', 'b'], team2PlayerIds: ['c', 'd'], team1Score: 11, team2Score: 8 },
  { id: 'g2', team1PlayerIds: ['a', 'c'], team2PlayerIds: ['b', 'e'], team1Score: 6, team2Score: 11 },
  { id: 'g3', team1PlayerIds: ['d'], team2PlayerIds: ['e'], team1Score: 11, team2Score: 9 },
  { id: 'g4', team1PlayerIds: ['a', 'd'], team2PlayerIds: ['b', 'c'], team1Score: 11, team2Score: 13 },
];

describe('replayFrom', () => {
  it('reproduces stored history when nothing changed', () => {
    const history = buildHistory(START, RAW);
    const { changes } = replayFrom(history, 1);
    for (const g of history.slice(1)) expect(changes[g.id]).toEqual(g.ratingChanges);
  });

  it('deleting a game gives the same ratings as if it was never played', () => {
    const history = buildHistory(START, RAW);
    const without = history.filter((g) => g.id !== 'g2');
    const { finalRatings } = replayFrom(without, 1, {}, history);
    const expected = buildHistory(START, RAW.filter((g) => g.id !== 'g2'));
    const last = expected[expected.length - 1].ratingChanges!;
    expect(finalRatings.a).toBeCloseTo(last.a.after, 12);
    expect(finalRatings.d).toBeCloseTo(last.d.after, 12);
  });

  it('editing a score replays later games and leaves earlier ones alone', () => {
    const history = buildHistory(START, RAW);
    const edited = history.map((g) => (g.id === 'g2' ? { ...g, team1Score: 11, team2Score: 6 } : g));
    const { changes } = replayFrom(edited, 1, {}, history);
    expect(changes.g1).toBeUndefined();
    const fresh = buildHistory(START, RAW.map((g) => (g.id === 'g2' ? { ...g, team1Score: 11, team2Score: 6 } : g)));
    expect(changes.g4).toEqual(fresh[3].ratingChanges);
  });
});
