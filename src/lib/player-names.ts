import type { Player } from './types';

/** First names, with a last-name initial where two players share one. */
type Named = Pick<Player, 'id' | 'name'>;

export function shortNames(players: Named[]): Map<string, string> {
  const first = (p: Named) => p.name.trim().split(/\s+/)[0] ?? p.name;
  const counts = new Map<string, number>();
  players.forEach((p) => counts.set(first(p), (counts.get(first(p)) ?? 0) + 1));
  const map = new Map<string, string>();
  players.forEach((p) => {
    const parts = p.name.trim().split(/\s+/);
    map.set(p.id, (counts.get(first(p)) ?? 0) > 1 && parts[1] ? `${parts[0]} ${parts[1][0]}.` : first(p));
  });
  // Still ambiguous (e.g. two "Simon T."): use full names for those
  const labelCounts = new Map<string, number>();
  map.forEach((label) => labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1));
  players.forEach((p) => {
    if ((labelCounts.get(map.get(p.id)!) ?? 0) > 1) map.set(p.id, p.name.trim());
  });
  return map;
}
