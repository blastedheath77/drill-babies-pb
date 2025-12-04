'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { recordTournamentMatchResult } from '@/app/tournaments/match-actions';
import { Trophy, Users } from 'lucide-react';
import type { TournamentMatch, Player } from '@/lib/types';
import { ScoreSelector } from '@/components/ui/score-selector';
import { ScoreConfirmationDialog } from '@/components/score-confirmation-dialog';

const matchResultFormSchema = z.object({
  team1Score: z.coerce
    .number()
    .int('Score must be a whole number')
    .min(0, 'Score cannot be negative')
    .max(50, 'Score cannot exceed 50'),
  team2Score: z.coerce
    .number()
    .int('Score must be a whole number')
    .min(0, 'Score cannot be negative')
    .max(50, 'Score cannot exceed 50'),
}).refine(
  (data) => data.team1Score !== data.team2Score,
  {
    message: 'Match cannot end in a tie',
    path: ['team2Score'],
  }
);

type MatchResultForm = z.infer<typeof matchResultFormSchema>;

interface MatchResultDialogProps {
  match: TournamentMatch;
  players: Map<string, Player>;
  tournamentId: string;
  children: React.ReactNode;
}

export function MatchResultDialog({
  match,
  players,
  tournamentId,
  children
}: MatchResultDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingScores, setPendingScores] = useState<{ team1Score: number; team2Score: number } | null>(null);
  const { toast } = useToast();

  const form = useForm<MatchResultForm>({
    resolver: zodResolver(matchResultFormSchema),
    defaultValues: {
      team1Score: 0,
      team2Score: 0,
    },
  });

  const getMatchPlayers = () => {
    if (match.player1Id && match.player2Id) {
      // Singles match
      return {
        team1: [players.get(match.player1Id)].filter(Boolean) as Player[],
        team2: [players.get(match.player2Id)].filter(Boolean) as Player[],
      };
    } else if (match.team1PlayerIds && match.team2PlayerIds) {
      // Doubles match
      return {
        team1: match.team1PlayerIds.map((id) => players.get(id)).filter(Boolean) as Player[],
        team2: match.team2PlayerIds.map((id) => players.get(id)).filter(Boolean) as Player[],
      };
    }
    return { team1: [], team2: [] };
  };

  const { team1, team2 } = getMatchPlayers();

  const onSubmit = (data: MatchResultForm) => {
    // Show confirmation dialog
    setPendingScores({ team1Score: data.team1Score, team2Score: data.team2Score });
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingScores || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await recordTournamentMatchResult({
        matchId: match.id,
        team1Score: pendingScores.team1Score,
        team2Score: pendingScores.team2Score,
        tournamentId,
      });

      toast({
        title: 'Match Result Recorded!',
        description: 'The match result has been saved and player ratings updated.',
      });

      setShowConfirmDialog(false);
      setOpen(false);
      form.reset();
      setPendingScores(null);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record match result.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const TeamDisplay = ({ team, label }: { team: Player[]; label: string }) => (
    <div className="text-center">
      <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="flex -space-x-2">
          {team.map((player) => (
            <Avatar key={player.id} className="h-10 w-10 border-2 border-background">
              <AvatarImage src={player.avatar} alt={player.name} />
              <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
      <p className="font-medium">{team.map((p) => p.name).join(' & ')}</p>
      <p className="text-sm text-muted-foreground">
        Avg. Rating: {(team.reduce((sum, p) => sum + p.rating, 0) / team.length).toFixed(1)}
      </p>
    </div>
  );

  if (team1.length === 0 || team2.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Record Match Result
          </DialogTitle>
          <DialogDescription>
            Round {match.round} • Match {match.matchNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-6 border-y">
          <TeamDisplay team={team1} label="Team 1" />
          
          <div className="mx-6 text-2xl font-bold text-muted-foreground">VS</div>
          
          <TeamDisplay team={team2} label="Team 2" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="team1Score"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex flex-col items-center">
                        <FormLabel className="mb-2">
                          Score
                        </FormLabel>
                        <ScoreSelector 
                          value={field.value} 
                          onChange={field.onChange} 
                          maxScore={15}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="team2Score"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex flex-col items-center">
                        <FormLabel className="mb-2">
                          Score
                        </FormLabel>
                        <ScoreSelector 
                          value={field.value} 
                          onChange={field.onChange} 
                          maxScore={15}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Recording...' : 'Record Result'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Score Confirmation Dialog */}
      {pendingScores && (
        <ScoreConfirmationDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={handleConfirmSubmit}
          gameType={match.player1Id && match.player2Id ? 'singles' : 'doubles'}
          team1Players={team1}
          team2Players={team2}
          team1Score={pendingScores.team1Score}
          team2Score={pendingScores.team2Score}
        />
      )}
    </Dialog>
  );
}