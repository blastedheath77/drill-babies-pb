'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Minus, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePlayers } from '@/hooks/use-players';
import { useTodayRoster } from '@/hooks/use-today-roster';
import { PlayerPickerSheet } from '@/components/player-picker/player-picker-sheet';
import { createQuickPlayTournament, defaultSessionName } from '../quick-play-actions';
import { shortNames } from '@/lib/player-names';
import { CLUB_ID } from '@/config/club';
import { cn } from '@/lib/utils';

export function QuickPlayForm() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: players = [], isLoading } = usePlayers(CLUB_ID);
  const { roster, setRoster } = useTodayRoster();

  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<'doubles' | 'singles'>('doubles');
  const [courts, setCourts] = useState(2);
  const [name, setName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [initialised, setInitialised] = useState(false);

  // Start from today's roster if there is one
  useEffect(() => {
    if (!initialised && roster.length > 0) {
      setSelected(roster);
      setInitialised(true);
    }
  }, [roster, initialised]);

  const names = useMemo(() => shortNames(players), [players]);
  const perMatch = format === 'doubles' ? 4 : 2;
  const matchesPerRound = Math.min(courts, Math.floor(selected.length / perMatch));
  const sitting = selected.length - matchesPerRound * perMatch;
  const enough = selected.length >= perMatch;

  const start = async () => {
    if (!enough) return;
    setStarting(true);
    try {
      const { tournamentId } = await createQuickPlayTournament({
        name,
        format,
        playerIds: selected,
        availableCourts: courts,
      });
      setRoster([...new Set([...roster, ...selected])]);
      await queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      router.push(`/tournaments/${tournamentId}`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not start the session', description: (error as Error).message });
      setStarting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-28">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/tournaments" aria-label="Back to sessions" className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Start a session</h1>
      </div>

      <section className="rounded-xl border p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Players ({selected.length})</h2>
          <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} disabled={isLoading}>
            <Users className="h-4 w-4 mr-1" /> {selected.length ? 'Change' : 'Choose players'}
          </Button>
        </div>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pick who&apos;s playing. Group filters make this quick. You can add or remove people between rounds.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((id) => (
              <span key={id} className="rounded-full bg-muted px-3 py-1 text-sm">
                {names.get(id) ?? '…'}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border p-3 mb-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Format</span>
          <div className="flex rounded-lg border p-0.5" role="radiogroup" aria-label="Format">
            {(['doubles', 'singles'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={format === f}
                onClick={() => setFormat(f)}
                className={cn(
                  'px-3 h-8 rounded-md text-sm font-medium capitalize',
                  format === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">Courts</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Fewer courts" onClick={() => setCourts((c) => Math.max(1, c - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center font-semibold text-lg">{courts}</span>
            <Button variant="outline" size="icon" aria-label="More courts" onClick={() => setCourts((c) => Math.min(8, c + 1))}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <label htmlFor="session-name" className="font-medium text-sm">
            Name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            id="session-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={defaultSessionName()}
            className="mt-1"
          />
        </div>
      </section>

      {enough && (
        <p className="text-sm text-muted-foreground px-1">
          {matchesPerRound} {matchesPerRound === 1 ? 'match' : 'matches'} per round
          {sitting > 0 ? `, ${sitting} sitting out (rotating fairly)` : ', everyone plays'}. Teams are balanced by
          rating and partners rotate.
        </p>
      )}

      <div className="fixed inset-x-0 bottom-20 md:bottom-0 px-3 py-2 z-30 bg-background/95 backdrop-blur border-t md:border-0 md:bg-transparent">
        <div className="max-w-xl mx-auto">
          <Button className="w-full h-12 text-base shadow-lg" disabled={!enough || starting} onClick={start}>
            {starting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : enough ? (
              'Start session'
            ) : (
              `Pick at least ${perMatch} players`
            )}
          </Button>
        </div>
      </div>

      <PlayerPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="multiple"
        players={players}
        selectedIds={selected}
        onChange={setSelected}
        title="Who's playing?"
      />
    </div>
  );
}
