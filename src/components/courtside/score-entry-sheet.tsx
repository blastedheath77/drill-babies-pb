'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SCORES = Array.from({ length: 22 }, (_, i) => i);

/**
 * Bottom sheet for entering a match score: tap Team 1's score, it moves to
 * Team 2, then Save. Used by quick-play sessions and friendlies.
 */
export function ScoreEntrySheet({
  open,
  onOpenChange,
  team1Label,
  team2Label,
  title = 'Enter score',
  description,
  allowTie = true,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team1Label: string;
  team2Label: string;
  title?: string;
  description?: string;
  allowTie?: boolean;
  initial?: [number, number];
  onSave: (team1Score: number, team2Score: number) => Promise<void>;
}) {
  const [scores, setScores] = useState<[number | null, number | null]>([null, null]);
  const [active, setActive] = useState<0 | 1>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setScores(initial ? [initial[0], initial[1]] : [null, null]);
      setActive(0);
      setSaving(false);
    }
  }, [open, initial]);

  const pick = (n: number) => {
    setScores((prev) => (active === 0 ? [n, prev[1]] : [prev[0], n]));
    if (active === 0) setActive(1);
  };

  const isTie = scores[0] !== null && scores[0] === scores[1];
  const ready = scores[0] !== null && scores[1] !== null && (allowTie || !isTie);

  const save = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      await onSave(scores[0]!, scores[1]!);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const row = (team: 0 | 1, label: string) => (
    <button
      type="button"
      onClick={() => setActive(team)}
      className={cn(
        'w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left',
        active === team ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      )}
    >
      <span className="font-medium truncate">{label}</span>
      <span className={cn('text-2xl font-mono font-semibold w-12 text-right', scores[team] === null && 'text-muted-foreground')}>
        {scores[team] ?? '–'}
      </span>
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl p-4 space-y-3" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        {row(0, team1Label)}
        {row(1, team2Label)}
        <div className="grid grid-cols-8 gap-1.5">
          {SCORES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => pick(n)}
              className={cn(
                'h-11 rounded-lg border font-mono',
                scores[active] === n ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
              )}
            >
              {n}
            </button>
          ))}
        </div>
        {!allowTie && isTie && <p className="text-sm text-destructive">This match can&apos;t end in a tie.</p>}
        <Button className="w-full h-12 text-base" disabled={!ready || saving} onClick={save}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save score'}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
