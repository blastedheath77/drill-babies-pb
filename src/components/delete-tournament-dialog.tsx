'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteTournament } from '@/app/tournaments/actions';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { Tournament } from '@/lib/types';

interface DeleteTournamentDialogProps {
  tournament: Tournament;
  children: React.ReactNode;
  onDelete?: () => void;
}

export function DeleteTournamentDialog({ tournament, children, onDelete }: DeleteTournamentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);

    try {
      await deleteTournament(tournament.id);

      toast({
        title: 'Tournament Deleted',
        description: 'The tournament and all associated matches have been permanently deleted.',
      });

      // Call the onDelete callback to update the parent component
      onDelete?.();

      setOpen(false);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete tournament.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Tournament
          </DialogTitle>
          <DialogDescription className="text-left">
            Are you sure you want to delete "{tournament.name}"?
            <br />
            <br />
            <strong>This action cannot be undone.</strong> This will permanently:
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              <li>Delete the tournament</li>
              <li>Delete all tournament matches</li>
              <li>Delete all completed games and results</li>
              <li>Remove associated statistics</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              'Deleting...'
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Tournament
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}