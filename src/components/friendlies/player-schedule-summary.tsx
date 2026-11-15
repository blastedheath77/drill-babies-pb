'use client';

import { cn } from '@/lib/utils';
import type { Friendly, FriendlyMatch } from '@/lib/types';

type Side = 'home' | 'away';

/**
 * Per-player view of the schedule: games, match types, courts and rests.
 * Lets the organiser check the draw is fair before play starts.
 */
export function PlayerScheduleSummary({
  friendly,
  matches,
  nameOf,
  homeLabel,
}: {
  friendly: Pick<Friendly, 'homePlayerIds' | 'guests' | 'courts' | 'format' | 'matchTypes' | 'opponentName'>;
  matches: FriendlyMatch[];
  nameOf: (side: Side, id: string) => string;
  homeLabel: string;
}) {
  const rounds = new Set(matches.map((m) => m.round)).size;
  const courts = Math.max(friendly.courts, ...matches.map((m) => m.court), 1);
  const showTypes = friendly.format === 'doubles' && friendly.matchTypes !== 'open';

  const rows = (side: Side, ids: string[]) =>
    ids.map((id) => {
      const mine = matches.filter((m) => m[side].includes(id));
      const byCourt = Array.from({ length: courts }, (_, c) => mine.filter((m) => m.court === c + 1).length);
      const types = { mens: 0, womens: 0, mixed: 0, open: 0 } as Record<FriendlyMatch['category'], number>;
      mine.forEach((m) => types[m.category]++);
      return { id, games: mine.length, byCourt, types, rests: rounds - mine.length };
    });

  const table = (side: Side, ids: string[], title: string) => {
    const data = rows(side, ids);
    const games = data.map((r) => r.games);
    const min = Math.min(...games);
    const max = Math.max(...games);
    return (
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className={cn('text-xs', max - min > 1 ? 'text-amber-600' : 'text-muted-foreground')}>
            {min === max ? `${min} games each` : `${min}–${max} games each`}
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground bg-muted/40 text-xs">
              <tr>
                <th className="text-left font-normal px-3 py-1">Player</th>
                <th className="font-normal px-1.5">Games</th>
                {showTypes && (
                  <>
                    <th className="font-normal px-1.5" title="Men's doubles">MD</th>
                    <th className="font-normal px-1.5" title="Women's doubles">WD</th>
                    <th className="font-normal px-1.5" title="Mixed doubles">XD</th>
                  </>
                )}
                {courts > 1 &&
                  Array.from({ length: courts }, (_, c) => (
                    <th key={c} className="font-normal px-1.5" title={`Court ${c + 1}`}>
                      C{c + 1}
                    </th>
                  ))}
                <th className="font-normal px-1.5 pr-3">Rests</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const courtGap = Math.max(...r.byCourt) - Math.min(...r.byCourt);
                return (
                  <tr key={r.id} className="border-t text-center">
                    <td className="text-left px-3 py-1.5 whitespace-nowrap">{nameOf(side, r.id)}</td>
                    <td className={cn('px-1.5 font-semibold', r.games !== min && r.games !== max ? '' : max - min > 1 && 'text-amber-600')}>
                      {r.games}
                    </td>
                    {showTypes && (
                      <>
                        <td className="px-1.5">{r.types.mens || '–'}</td>
                        <td className="px-1.5">{r.types.womens || '–'}</td>
                        <td className="px-1.5">{r.types.mixed || '–'}</td>
                      </>
                    )}
                    {courts > 1 &&
                      r.byCourt.map((n, c) => (
                        <td key={c} className={cn('px-1.5', courtGap > 1 && 'text-amber-600')}>
                          {n}
                        </td>
                      ))}
                    <td className="px-1.5 pr-3 text-muted-foreground">{r.rests}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {table('home', friendly.homePlayerIds, homeLabel)}
      {table(
        'away',
        friendly.guests.map((g) => g.id),
        friendly.opponentName
      )}
      <p className="text-xs text-muted-foreground">
        {showTypes ? 'MD/WD/XD = men’s, women’s and mixed doubles. ' : ''}
        {courts > 1 ? 'C1, C2… = games on each court. ' : ''}Amber marks anything more than one apart.
      </p>
    </div>
  );
}
