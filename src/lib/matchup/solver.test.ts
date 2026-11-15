import { describe, expect, it } from 'vitest';
import { buildMatchups, suggestRounds, type MatchupPlayer } from './solver';

const squad = (prefix: string, n: number, genders?: ('M' | 'F')[], levels?: number[]): MatchupPlayer[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    name: `${prefix}${i}`,
    gender: genders?.[i],
    level: levels?.[i],
  }));

function validate(matches: ReturnType<typeof buildMatchups>['matches'], perSide = 2) {
  const byRound = new Map<number, string[]>();
  for (const m of matches) {
    expect(m.home).toHaveLength(perSide);
    expect(m.away).toHaveLength(perSide);
    expect(m.home.every((id) => id.startsWith('h'))).toBe(true);
    expect(m.away.every((id) => id.startsWith('a'))).toBe(true);
    byRound.set(m.round, [...(byRound.get(m.round) ?? []), ...m.home, ...m.away]);
  }
  // Nobody plays twice in the same round
  for (const ids of byRound.values()) expect(new Set(ids).size).toBe(ids.length);
}

describe('buildMatchups', () => {
  it.each([
    [6, 7],
    [6, 8],
    [7, 9],
  ])('%i v %i: valid schedule with an even share of games in each squad', (h, a) => {
    const result = buildMatchups({
      home: squad('h', h),
      away: squad('a', a),
      format: 'doubles',
      courts: 2,
      rounds: 6,
      matchTypes: 'open',
      seed: 42,
    });
    expect(result.matches).toHaveLength(12);
    validate(result.matches);
    expect(result.report.home.max - result.report.home.min).toBeLessThanOrEqual(1);
    expect(result.report.away.max - result.report.away.min).toBeLessThanOrEqual(1);
  });

  it('6 v 8 over 6 rounds has no repeated partnerships', () => {
    const { report } = buildMatchups({
      home: squad('h', 6),
      away: squad('a', 8),
      format: 'doubles',
      courts: 2,
      rounds: 6,
      matchTypes: 'open',
      seed: 7,
    });
    expect(report.repeatPartners).toBe(0);
  });

  it('mixed mode makes every match mixed when genders allow', () => {
    const g: ('M' | 'F')[] = ['M', 'M', 'M', 'F', 'F', 'F'];
    const { matches } = buildMatchups({
      home: squad('h', 6, g),
      away: squad('a', 6, g),
      format: 'doubles',
      courts: 2,
      rounds: 4,
      matchTypes: 'mixed',
      seed: 3,
    });
    expect(matches.length).toBe(8);
    expect(matches.every((m) => m.category === 'mixed')).toBe(true);
  });

  it('league preset (3M+3F a side, 9 matches): everyone plays 3, 3 of each match type, no repeat partners', () => {
    const g: ('M' | 'F')[] = ['M', 'M', 'M', 'F', 'F', 'F'];
    const { matches, report } = buildMatchups({
      home: squad('h', 6, g),
      away: squad('a', 6, g),
      format: 'doubles',
      courts: 2,
      rounds: 5,
      maxMatches: 9,
      matchTypes: 'variety',
      seed: 11,
      attempts: 300,
    });
    validate(matches);
    expect(matches).toHaveLength(9);
    expect(report.categoryCounts).toMatchObject({ mens: 3, womens: 3, mixed: 3 });
    expect(Object.values(report.home.gamesPerPlayer).every((n) => n === 3)).toBe(true);
    expect(Object.values(report.away.gamesPerPlayer).every((n) => n === 3)).toBe(true);
    expect(report.repeatPartners).toBe(0);
  });

  it('pairs strong against strong when levels are known', () => {
    const { report } = buildMatchups({
      home: squad('h', 4, undefined, [4.5, 4.4, 3.0, 2.9]),
      away: squad('a', 4, undefined, [4.6, 4.3, 3.1, 2.8]),
      format: 'doubles',
      courts: 1,
      rounds: 1,
      matchTypes: 'open',
      seed: 5,
    });
    expect(report.averageLevelGap).toBeLessThan(0.3);
  });

  it('keeps locked matches and plans around them', () => {
    const locked = [{ round: 1, court: 1, home: ['h0', 'h1'], away: ['a0', 'a1'], category: 'open' as const }];
    const { matches } = buildMatchups({
      home: squad('h', 6),
      away: squad('a', 6),
      format: 'doubles',
      courts: 2,
      rounds: 3,
      matchTypes: 'open',
      locked,
      seed: 9,
    });
    const r1c1 = matches.find((m) => m.round === 1 && m.court === 1)!;
    expect(r1c1.home).toEqual(['h0', 'h1']);
    expect(r1c1.locked).toBe(true);
    validate(matches);
  });

  it('works for singles', () => {
    const { matches, report } = buildMatchups({
      home: squad('h', 3),
      away: squad('a', 5),
      format: 'singles',
      courts: 2,
      rounds: 5,
      matchTypes: 'open',
      seed: 1,
    });
    validate(matches, 1);
    expect(report.away.max - report.away.min).toBeLessThanOrEqual(1);
  });

  it('suggests about 4 games each on average, capped at 10 rounds', () => {
    expect(suggestRounds(6, 8, 2, 'doubles')).toBe(7);
    expect(suggestRounds(6, 6, 2, 'doubles')).toBe(6);
    expect(suggestRounds(11, 7, 2, 'doubles')).toBe(9);
    expect(suggestRounds(20, 20, 2, 'doubles')).toBe(10);
  });
});

describe('buildMatchups robustness', () => {
  it('never puts a player in two matches in the same round across many seeds', () => {
    const g: ('M' | 'F')[] = ['M', 'F', 'M', 'F', 'M', 'F', 'M', 'F'];
    for (let seed = 1; seed <= 25; seed++) {
      const { matches } = buildMatchups({
        home: squad('h', 7, g),
        away: squad('a', 8, g),
        format: 'doubles',
        courts: 3,
        rounds: 5,
        matchTypes: seed % 2 ? 'variety' : 'mixed',
        seed,
        attempts: 10,
      });
      validate(matches);
    }
  });
});
