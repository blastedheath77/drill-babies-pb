'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitLeagueGameToDupr } from '@/app/league-games/actions';
import type { LeagueGame, LeagueGameMatch, Player } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: LeagueGame;
  clubPlayers: Record<string, Player>;
  onSubmitted: (submissionId: string) => void;
}

export function LeagueGameReviewDialog({
  open,
  onOpenChange,
  game,
  clubPlayers,
  onSubmitted,
}: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitLeagueGameToDupr(game.id);
      if (result.success) {
        onSubmitted(result.submissionId ?? '');
        onOpenChange(false);
        toast({
          title: 'Submitted to DUPR!',
          description: `Submission ID: ${result.submissionId}`,
        });
      } else {
        toast({ variant: 'destructive', title: 'Submission failed', description: result.error });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't compute anything when the dialog is closed — Radix mounts children
  // regardless of `open`, which causes crashes when match data isn't fully loaded.
  if (!open) {
    return <AlertDialog open={false} onOpenChange={onOpenChange} />;
  }

  const matches = Array.isArray(game.matches) ? game.matches : [];

  const categoryLabel: Record<string, string> = {
    mens_doubles: "Men's",
    womens_doubles: "Women's",
    mixed_doubles: 'Mixed',
  };

  const getClubTeamNames = (match: LeagueGameMatch) =>
    (match.clubTeamPlayerIds ?? []).map((id) => clubPlayers[id]?.name ?? id).join(' & ');

  const getOpponentNames = (match: LeagueGameMatch) => {
    const opponentMap = new Map(
      (game.opponentPlayers ?? []).map((p) => [`${p.gender}-${p.slot}`, p.name])
    );
    return (match.opponentTeamSlots ?? []).map((slot) => opponentMap.get(slot) ?? slot).join(' & ');
  };

  const clubScore = matches.reduce(
    (sum, m) => sum + ((m.clubTeamScore ?? 0) > (m.opponentTeamScore ?? 0) ? 1 : 0),
    0
  );
  const oppScore = matches.length - clubScore;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Review & Send to DUPR</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Fixture header */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <p className="font-semibold">{game.name}</p>
            <p className="text-sm text-muted-foreground">{game.date}{game.venue ? ` · ${game.venue}` : ''}</p>
            <div className="mt-2 flex gap-3">
              <Badge variant="default" className="bg-green-700">Club {clubScore}</Badge>
              <Badge variant="outline">Opponents {oppScore}</Badge>
            </div>
          </div>

          {/* Match list */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">All {matches.length} Match Results</p>
            {[...matches].sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || (a.court ?? 0) - (b.court ?? 0)).map((match) => {
              const won = (match.clubTeamScore ?? 0) > (match.opponentTeamScore ?? 0);
              return (
                <div
                  key={match.matchNumber}
                  className="flex items-center gap-2 text-sm border rounded-md p-2"
                >
                  <span className="text-xs text-muted-foreground w-5 font-mono">{match.matchNumber}</span>
                  <Badge variant="outline" className="text-xs px-1.5">
                    {categoryLabel[match.category] ?? match.category}
                  </Badge>
                  <span className="flex-1 truncate">{getClubTeamNames(match)}</span>
                  <span className={`font-mono font-semibold text-xs ${won ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {match.clubTeamScore ?? '–'}–{match.opponentTeamScore ?? '–'}
                  </span>
                  <span className="flex-1 text-right truncate text-muted-foreground">
                    {getOpponentNames(match)}
                  </span>
                  {won ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <div className="h-4 w-4 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Confirm & Send to DUPR
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
