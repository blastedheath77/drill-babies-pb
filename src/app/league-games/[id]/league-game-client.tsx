'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Loader2,
  Send,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { LeagueGameMatchCard } from '@/components/league-game-match-card';
import { LeagueGameReviewDialog } from '@/components/league-game-review-dialog';
import { deleteLeagueGame } from '../actions';
import type { LeagueGame, LeagueGameMatch, Player } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

interface Props {
  game: LeagueGame;
  clubPlayers: Record<string, Player>;
}

export function LeagueGameClient({ game: initialGame, clubPlayers }: Props) {
  const { canCreateTournaments } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [game, setGame] = useState<LeagueGame>(() => ({
    ...initialGame,
    matches: Array.isArray(initialGame.matches) ? initialGame.matches : [],
  }));
  const [reviewOpen, setReviewOpen] = useState(false);

  const matches = game.matches;
  const completedCount = matches.filter((m) => m.status === 'completed').length;
  const totalCount = matches.length;
  const allComplete = completedCount === totalCount;

  const handleMatchScored = (matchIndex: number, updated: LeagueGameMatch) => {
    setGame((prev) => ({
      ...prev,
      matches: prev.matches.map((m, i) => (i === matchIndex ? updated : m)),
    }));
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteLeagueGame(game.id);
      if (result.success) {
        toast({ title: 'Fixture deleted' });
        router.push('/league-games');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  const handleSubmitted = (submissionId: string) => {
    setGame((prev) => ({
      ...prev,
      status: 'submitted',
      duprSubmissionId: submissionId,
      submittedAt: new Date().toISOString(),
    }));
  };

  const getMatchIndex = (match: LeagueGameMatch) =>
    matches.findIndex((m) => m.matchNumber === match.matchNumber);

  const isSubmitted = game.status === 'submitted';
  const canEdit = canCreateTournaments();

  // Group matches by round, sorted by round then court
  const rounds = [1, 2, 3, 4, 5] as const;
  const matchesByRound = rounds.map((round) =>
    [...matches]
      .filter((m) => m.round === round)
      .sort((a, b) => a.court - b.court)
  );

  const categoryLabel: Record<string, string> = {
    mens_doubles: "Men's",
    womens_doubles: "Women's",
    mixed_doubles: 'Mixed',
  };

  return (
    <>
      <PageHeader
        title={game.name}
        description={game.venue ? `${game.date} · ${game.venue}` : game.date}
      />

      {/* Status + progress */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {isSubmitted ? (
              <Badge className="bg-green-600 text-white">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Submitted to DUPR
              </Badge>
            ) : (
              <Badge variant="secondary">Active</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} matches scored
            </span>
          </div>

          {canEdit && !isSubmitted && (
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={!allComplete}
                onClick={() => setReviewOpen(true)}
              >
                <Send className="h-4 w-4 mr-1" />
                Send to DUPR
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Fixture</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{game.name}"? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Fixture'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {isSubmitted && game.duprSubmissionId && (
            <span className="text-xs text-muted-foreground">ID: {game.duprSubmissionId}</span>
          )}
        </div>

        <Progress value={(completedCount / totalCount) * 100} className="h-2" />

        {!allComplete && canEdit && !isSubmitted && (
          <p className="text-sm text-muted-foreground">
            Score all {totalCount} matches to enable DUPR submission.
          </p>
        )}
      </div>

      {/* Matches grouped by round */}
      <div className="space-y-6">
        {matchesByRound.map((roundMatches, idx) => {
          if (roundMatches.length === 0) return null;
          const roundNum = idx + 1;
          return (
            <section key={roundNum}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Round {roundNum}
              </h2>
              <div className="grid gap-2">
                {roundMatches.map((match) => (
                  <div key={match.matchNumber} className="space-y-0.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-xs text-muted-foreground">Court {match.court}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{categoryLabel[match.category]} Doubles</span>
                    </div>
                    <LeagueGameMatchCard
                      match={match}
                      matchIndex={getMatchIndex(match)}
                      leagueGameId={game.id}
                      opponentPlayers={game.opponentPlayers}
                      clubPlayers={clubPlayers}
                      canEdit={canEdit && !isSubmitted}
                      onScored={handleMatchScored}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6">
        <Link href="/league-games">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Fixtures
          </Button>
        </Link>
      </div>

      <LeagueGameReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        game={game}
        clubPlayers={clubPlayers}
        onSubmitted={handleSubmitted}
      />
    </>
  );
}
