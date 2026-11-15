'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScoreSelector } from '@/components/ui/score-selector';
import { useToast } from '@/hooks/use-toast';
import { getIdToken } from '@/lib/id-token';
import { removeGame, updateGame } from '@/app/log-game/actions';
import type { Game } from '@/lib/types';

/** Admin-only: correct a game's score or delete it. Later ratings are replayed. */
export function AdminGameControls({ game }: { game: Game }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [score1, setScore1] = useState(game.team1.score);
  const [score2, setScore2] = useState(game.team2.score);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['games'] }),
      queryClient.invalidateQueries({ queryKey: ['players'] }),
    ]);

  const names = (ids: string[]) =>
    ids.map((id) => game.team1.players?.concat(game.team2.players ?? []).find((p) => p.id === id)?.name.split(' ')[0] ?? '?').join(' & ');

  const save = async () => {
    setBusy(true);
    try {
      await updateGame(await getIdToken(), game.id, {
        team1PlayerIds: game.team1.playerIds,
        team2PlayerIds: game.team2.playerIds,
        team1Score: score1,
        team2Score: score2,
      });
      await refresh();
      setEditOpen(false);
      toast({ title: 'Score corrected', description: 'Ratings for this and every later game were recalculated.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not update game', description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeGame(await getIdToken(), game.id);
      await refresh();
      toast({ title: 'Game deleted', description: 'Ratings for every later game were recalculated.' });
      router.push('/games');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not delete game', description: (error as Error).message });
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="h-4 w-4 mr-1" /> Edit score
      </Button>
      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteOpen(true)}>
        <Trash2 className="h-4 w-4 mr-1" /> Delete
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct the score</DialogTitle>
            <DialogDescription>Ratings for this game and every game after it will be recalculated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium truncate">{names(game.team1.playerIds)}</span>
              <ScoreSelector value={score1} onChange={setScore1} align="center" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium truncate">{names(game.team2.playerIds)}</span>
              <ScoreSelector value={score2} onChange={setScore2} align="center" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy || (score1 === game.team1.score && score2 === game.team2.score)}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this game?</AlertDialogTitle>
            <AlertDialogDescription>
              Its result is removed from everyone&apos;s record, and ratings for every later game are recalculated.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={busy} className="bg-destructive text-destructive-foreground">
              Delete game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
