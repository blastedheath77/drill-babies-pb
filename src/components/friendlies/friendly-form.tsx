'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Minus, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { usePlayers } from '@/hooks/use-players';
import { useTodayRoster } from '@/hooks/use-today-roster';
import { useRefreshFriendlies } from '@/hooks/use-friendlies';
import { PlayerPickerSheet } from '@/components/player-picker/player-picker-sheet';
import { createFriendly, parseGuestList, planFriendly, playerGender, toFriendlyMatches, updateFriendly } from '@/lib/friendlies';
import { suggestRounds } from '@/lib/matchup/solver';
import { shortNames } from '@/lib/player-names';
import { CLUB_ID } from '@/config/club';
import { cn } from '@/lib/utils';
import type { Friendly, FriendlyGuest, FriendlyMatch } from '@/lib/types';

const MATCH_TYPES: { value: Friendly['matchTypes']; label: string; hint: string }[] = [
  { value: 'variety', label: "Men's, women's & mixed", hint: 'An even mix of all three' },
  { value: 'mixed', label: 'Mixed only', hint: 'Every pair is a man and a woman' },
  { value: 'open', label: 'Any pairs', hint: 'Ignore gender' },
];

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex rounded-lg border p-0.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-2.5 h-8 rounded-md text-sm font-medium',
            value === o.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-6 text-center font-semibold text-lg">{value}</span>
      <Button variant="outline" size="icon" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Builder form for a friendly. Without `initial` it creates a new friendly;
 * with `initial` it edits one that is still being planned (no scores yet)
 * and redraws the schedule, keeping locked matches whose players remain.
 */
export function FriendlyForm({ initial }: { initial?: Friendly }) {
  const editing = !!initial;
  const router = useRouter();
  const { toast } = useToast();
  const refreshFriendlies = useRefreshFriendlies();
  const { data: players = [] } = usePlayers(CLUB_ID);
  const { roster } = useTodayRoster();
  const names = useMemo(() => shortNames(players), [players]);

  const [opponentName, setOpponentName] = useState(initial?.opponentName ?? '');
  const [date, setDate] = useState(() => initial?.date ?? new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [homeIds, setHomeIds] = useState<string[]>(initial?.homePlayerIds ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [guestText, setGuestText] = useState('');
  const [guests, setGuests] = useState<FriendlyGuest[]>(initial?.guests ?? []);
  const [format, setFormat] = useState<Friendly['format']>(initial?.format ?? 'doubles');
  const [matchTypes, setMatchTypes] = useState<Friendly['matchTypes']>(initial?.matchTypes ?? 'variety');
  const [courts, setCourts] = useState(initial?.courts ?? 2);
  const [rounds, setRounds] = useState<number | null>(initial?.rounds ?? null);
  const [saving, setSaving] = useState(false);

  const homePlayers = useMemo(() => players.filter((p) => homeIds.includes(p.id)), [players, homeIds]);
  const perSide = format === 'doubles' ? 2 : 1;
  const suggested = suggestRounds(homeIds.length, guests.length, courts, format);
  const effectiveRounds = rounds ?? suggested;
  const ready = opponentName.trim().length > 0 && homeIds.length >= perSide && guests.length >= perSide && effectiveRounds > 0;

  const preview = useMemo(() => {
    if (!ready) return null;
    const perRound = Math.min(courts, Math.floor(homeIds.length / perSide), Math.floor(guests.length / perSide));
    const total = perRound * effectiveRounds;
    return {
      total,
      homeEach: (total * perSide) / homeIds.length,
      awayEach: (total * perSide) / guests.length,
    };
  }, [ready, courts, homeIds.length, guests.length, perSide, effectiveRounds]);

  const addGuests = () => {
    const parsed = parseGuestList(guestText);
    if (parsed.length === 0) return;
    setGuests((prev) => [...prev, ...parsed]);
    setGuestText('');
  };

  const updateGuest = (id: string, patch: Partial<FriendlyGuest>) =>
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const missingHomeGender = homePlayers.filter((p) => !playerGender(p)).length;
  const missingGuestGender = guests.filter((g) => !g.gender).length;

  const build = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      // Keep locked matches only if all their players are still in the squads and the slot still exists
      const guestIds = new Set(guests.map((g) => g.id));
      const keptLocks: FriendlyMatch[] = (initial?.matches ?? []).filter(
        (m) =>
          m.locked &&
          m.round <= effectiveRounds &&
          m.court <= courts &&
          m.home.every((id) => homeIds.includes(id)) &&
          m.away.every((id) => guestIds.has(id))
      );
      const result = planFriendly({
        homePlayers,
        guests,
        format,
        courts,
        rounds: effectiveRounds,
        matchTypes,
        locked: format === initial?.format ? keptLocks : [],
      });
      const fields = {
        opponentName: opponentName.trim(),
        date,
        venue: venue.trim() || undefined,
        format,
        courts,
        rounds: effectiveRounds,
        matchTypes,
        homePlayerIds: homeIds,
        guests,
        matches: toFriendlyMatches(result, keptLocks),
      };
      if (initial) {
        await updateFriendly(initial.id, fields);
        await refreshFriendlies();
        toast({ title: 'Friendly updated', description: 'The schedule was redrawn.' });
        router.push(`/friendlies/${initial.id}`);
      } else {
        const id = await createFriendly(fields);
        await refreshFriendlies();
        router.push(`/friendlies/${id}`);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save the friendly', description: (error as Error).message });
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-28 space-y-3">
      <div className="flex items-center gap-2">
        <Link
          href={initial ? `/friendlies/${initial.id}` : '/friendlies'}
          aria-label="Back"
          className="p-2 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">{editing ? 'Edit friendly' : 'New friendly'}</h1>
      </div>

      {/* 1. Fixture */}
      <section className="rounded-xl border p-3 space-y-2">
        <h2 className="font-semibold">Against</h2>
        <Input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} placeholder="Opponent team, e.g. BAM Leith" aria-label="Opponent team" />
        <div className="flex gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className="w-40" />
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue (optional)" aria-label="Venue" />
        </div>
      </section>

      {/* 2. Our squad */}
      <section className="rounded-xl border p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Our squad ({homeIds.length})</h2>
          <div className="flex gap-2">
            {roster.length > 0 && homeIds.length === 0 && (
              <Button variant="ghost" size="sm" onClick={() => setHomeIds(roster)}>
                Use today&apos;s {roster.length}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <Users className="h-4 w-4 mr-1" /> {homeIds.length ? 'Change' : 'Choose'}
            </Button>
          </div>
        </div>
        {homeIds.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {homePlayers.map((p) => (
              <span key={p.id} className="rounded-full bg-muted px-3 py-1 text-sm">
                {names.get(p.id)}
                {playerGender(p) && <span className="text-muted-foreground ml-1 text-xs">{playerGender(p)}</span>}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Pick who&apos;s playing for us. Group filters help.</p>
        )}
        {matchTypes !== 'open' && missingHomeGender > 0 && (
          <p className="text-xs text-amber-600 mt-2">
            {missingHomeGender} of our players have no gender on their profile, so they&apos;ll only play open matches.
          </p>
        )}
      </section>

      {/* 3. Visitors */}
      <section className="rounded-xl border p-3 space-y-2">
        <h2 className="font-semibold">Their players ({guests.length})</h2>
        <Textarea
          value={guestText}
          onChange={(e) => setGuestText(e.target.value)}
          placeholder={'Paste or type names, one per line.\nAdd M or F to set gender, e.g.\nAnna Smith, F\nBob Jones, M'}
          rows={4}
          aria-label="Visitor names"
        />
        <Button variant="outline" size="sm" onClick={addGuests} disabled={!guestText.trim()}>
          Add names
        </Button>
        {guests.length > 0 && (
          <ul className="divide-y">
            {guests.map((g) => (
              <li key={g.id} className="flex items-center gap-2 py-2">
                <Input
                  value={g.name}
                  onChange={(e) => updateGuest(g.id, { name: e.target.value })}
                  className="h-9 flex-1 min-w-0"
                  aria-label="Visitor name"
                />
                <Segmented
                  label={`${g.name} gender`}
                  value={(g.gender ?? '') as 'M' | 'F' | ''}
                  options={[
                    { value: 'M', label: 'M' },
                    { value: 'F', label: 'F' },
                  ]}
                  onChange={(v) => updateGuest(g.id, { gender: g.gender === v ? undefined : (v as 'M' | 'F') })}
                />
                <select
                  value={g.level ?? 'similar'}
                  onChange={(e) => updateGuest(g.id, { level: e.target.value as FriendlyGuest['level'] })}
                  className="h-9 rounded-md border bg-background px-1 text-sm"
                  aria-label={`${g.name} level`}
                >
                  <option value="weaker">Weaker</option>
                  <option value="similar">Similar</option>
                  <option value="stronger">Stronger</option>
                </select>
                <button
                  type="button"
                  onClick={() => setGuests((prev) => prev.filter((x) => x.id !== g.id))}
                  className="text-muted-foreground p-1"
                  aria-label={`Remove ${g.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {matchTypes !== 'open' && missingGuestGender > 0 && (
          <p className="text-xs text-amber-600">Set M or F for {missingGuestGender} visitor(s) to include them in gendered matches.</p>
        )}
        <p className="text-xs text-muted-foreground">Level is compared with our squad and only used to make matches close.</p>
      </section>

      {/* 4. Settings */}
      <section className="rounded-xl border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Format</span>
          <Segmented
            label="Format"
            value={format}
            options={[
              { value: 'doubles', label: 'Doubles' },
              { value: 'singles', label: 'Singles' },
            ]}
            onChange={setFormat}
          />
        </div>
        {format === 'doubles' && (
          <div>
            <span className="font-medium">Match types</span>
            <div className="grid gap-1.5 mt-1.5">
              {MATCH_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setMatchTypes(t.value)}
                  className={cn(
                    'text-left rounded-lg border px-3 py-2',
                    matchTypes === t.value ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                  )}
                >
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.hint}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-medium">Courts</span>
          <Stepper value={courts} onChange={setCourts} min={1} max={8} label="courts" />
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">
            Rounds
            {rounds === null && suggested > 0 && <span className="text-xs text-muted-foreground font-normal ml-1">(suggested)</span>}
          </span>
          <Stepper value={effectiveRounds} onChange={setRounds} min={1} max={20} label="rounds" />
        </div>
        {preview && (
          <p className="text-sm text-muted-foreground">
            {preview.total} matches. Each of our players gets about {preview.homeEach.toFixed(1)} games, each visitor about{' '}
            {preview.awayEach.toFixed(1)}.
          </p>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-20 md:bottom-0 px-3 py-2 z-30 bg-background/95 backdrop-blur border-t md:border-0 md:bg-transparent">
        <div className="max-w-xl mx-auto">
          <Button className="w-full h-12 text-base shadow-lg" disabled={!ready || saving} onClick={build}>
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : !opponentName.trim() ? (
              'Name the opponent'
            ) : homeIds.length < perSide ? (
              'Choose our squad'
            ) : guests.length < perSide ? (
              'Add their players'
            ) : editing ? (
              'Save and redraw schedule'
            ) : (
              'Build matchups'
            )}
          </Button>
        </div>
      </div>

      <PlayerPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="multiple"
        players={players}
        selectedIds={homeIds}
        onChange={setHomeIds}
        title="Our squad"
      />
    </div>
  );
}
