'use client';

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
import { Button } from '@/components/ui/button';

interface RecurringEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  action: 'edit' | 'delete';
  onThisOnly: () => void;
  onAllFuture: () => void;
  isLoading?: boolean;
}

export function RecurringEventDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
  onThisOnly,
  onAllFuture,
  isLoading = false,
}: RecurringEventDialogProps) {
  const actionText = action === 'edit' ? 'Edit' : 'Delete';
  const thisOnlyText = action === 'edit' ? 'Edit this event only' : 'Delete this event only';
  const allFutureText =
    action === 'edit' ? 'Edit this and all future events' : 'Delete this and all future events';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={onThisOnly}
            disabled={isLoading}
          >
            {thisOnlyText}
          </Button>
          <Button
            variant={action === 'delete' ? 'destructive' : 'default'}
            onClick={onAllFuture}
            disabled={isLoading}
          >
            {allFutureText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteEventDialog({
  open,
  onOpenChange,
  eventTitle,
  onConfirm,
  isLoading = false,
}: DeleteEventDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Event</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{eventTitle}&quot;? This action cannot be
            undone and will also remove all RSVPs for this event.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
