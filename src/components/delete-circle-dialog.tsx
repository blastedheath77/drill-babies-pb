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
import { useDeleteCircle } from '@/hooks/use-circles';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { Circle } from '@/lib/types';

interface DeleteCircleDialogProps {
  circle: Circle;
  children: React.ReactNode;
  onDelete?: () => void;
}

export function DeleteCircleDialog({ circle, children, onDelete }: DeleteCircleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const deleteCircleMutation = useDeleteCircle();

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      await deleteCircleMutation.mutateAsync(circle.id);

      toast({
        title: 'Circle Deleted',
        description: `"${circle.name}" has been permanently deleted.`,
      });

      // Call the onDelete callback to update the parent component
      onDelete?.();

      setOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete circle.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const playerCount = circle.playerIds.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Circle
          </DialogTitle>
          <DialogDescription className="text-left">
            Are you sure you want to delete "{circle.name}"?
            <br />
            <br />
            <strong>This action cannot be undone.</strong> This will permanently:
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              <li>Delete the circle and its configuration</li>
              <li>Remove the circle from any filtering options</li>
              {playerCount > 0 && (
                <li>Remove {playerCount} player{playerCount !== 1 ? 's' : ''} from this grouping</li>
              )}
              <li>Clear any saved circle preferences</li>
            </ul>
            {playerCount > 0 && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Players in this circle:</p>
                <p className="text-sm text-muted-foreground">
                  {playerCount} player{playerCount !== 1 ? 's' : ''} will no longer be grouped in "{circle.name}"
                </p>
              </div>
            )}
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
                Delete Circle
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}