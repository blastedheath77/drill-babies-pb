'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  FormDescription,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCreateCircle, useUpdateCircle, useCircleNameAvailable } from '@/hooks/use-circles';
import { useAuth } from '@/contexts/auth-context';
import { useClub } from '@/contexts/club-context';
import { CirclePlayerSelector } from './circle-player-selector';
import { Loader2 } from 'lucide-react';
import type { Circle } from '@/lib/types';

const circleFormSchema = z.object({
  name: z.string()
    .min(1, 'Circle name is required')
    .max(50, 'Circle name must be 50 characters or less')
    .trim(),
  description: z.string()
    .max(200, 'Description must be 200 characters or less')
    .optional(),
  playerIds: z.array(z.string())
    .min(0, 'No minimum player requirement'),
});

type CircleFormData = z.infer<typeof circleFormSchema>;

interface CircleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circle?: Circle; // If provided, we're editing; otherwise creating
  children?: React.ReactNode;
}

export function CircleFormDialog({
  open,
  onOpenChange,
  circle,
  children,
}: CircleFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedClub } = useClub();

  const createCircleMutation = useCreateCircle();
  const updateCircleMutation = useUpdateCircle();

  const isEditing = !!circle;

  const form = useForm<CircleFormData>({
    resolver: zodResolver(circleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      playerIds: [],
    },
  });

  // No real-time name checking - validation happens only on submit

  // Reset form when dialog opens/closes or circle changes
  const resetFormData = useCallback(() => {
    if (isEditing && circle) {
      form.reset({
        name: circle.name,
        description: circle.description || '',
        playerIds: circle.playerIds,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        playerIds: [],
      });
    }
  }, [form, isEditing, circle]);

  useEffect(() => {
    if (open) {
      resetFormData();
    }
  }, [open, resetFormData]);

  const onSubmit = async (data: CircleFormData) => {
    if (isSubmitting) return;

    // Validation: Check authentication
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create or edit circles.',
      });
      return;
    }

    // Validation: Check club selection (only for creating new circles)
    if (!isEditing && !selectedClub?.id) {
      toast({
        variant: 'destructive',
        title: 'No Club Selected',
        description: 'Please select a club before creating a circle.',
      });
      return;
    }

    // Validation: Check for empty name after trimming
    if (!data.name || data.name.trim().length === 0) {
      form.setError('name', {
        type: 'manual',
        message: 'Circle name is required',
      });
      return;
    }

    // Validation: Check name length
    if (data.name.trim().length > 50) {
      form.setError('name', {
        type: 'manual',
        message: 'Circle name must be 50 characters or less',
      });
      return;
    }

    // Validation: Check description length if provided
    if (data.description && data.description.length > 200) {
      form.setError('description', {
        type: 'manual',
        message: 'Description must be 200 characters or less',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        // Update existing circle
        await updateCircleMutation.mutateAsync({
          id: circle.id,
          data: {
            name: data.name,
            description: data.description,
            playerIds: data.playerIds,
          },
        });

        toast({
          title: 'Circle Updated',
          description: `"${data.name}" has been updated successfully.`,
        });
      } else {
        // Create new circle
        await createCircleMutation.mutateAsync({
          name: data.name,
          description: data.description,
          playerIds: data.playerIds,
          createdBy: user.id,
          clubId: selectedClub!.id,
        });

        toast({
          title: 'Circle Created',
          description: `"${data.name}" has been created successfully for ${selectedClub!.name}.`,
        });
      }

      onOpenChange(false);
    } catch (error) {
      let errorMessage = 'An unexpected error occurred';
      let errorTitle = isEditing ? 'Failed to Update Circle' : 'Failed to Create Circle';

      if (error instanceof Error) {
        // Handle specific known errors
        if (error.message.includes('name already exists') || error.message.includes('duplicate')) {
          errorMessage = `A circle with the name "${data.name}" already exists. Please choose a different name.`;
          errorTitle = 'Duplicate Circle Name';
          form.setError('name', {
            type: 'manual',
            message: 'A circle with this name already exists',
          });
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = 'You do not have permission to perform this action.';
          errorTitle = 'Permission Denied';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.';
          errorTitle = 'Connection Error';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        variant: 'destructive',
        title: errorTitle,
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Circle' : 'Create New Circle'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the circle details and player membership.'
              : selectedClub
              ? `Create a new circle in ${selectedClub.name} to group players for filtering statistics.`
              : 'Create a new circle to group players for filtering statistics.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circle Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Advanced Players, Thursday Group"
                      maxLength={50}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between">
                    <FormMessage />
                    <span className="text-xs text-muted-foreground">
                      {field.value?.length || 0}/50
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this circle..."
                      className="min-h-[80px] resize-none"
                      maxLength={200}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between">
                    <FormMessage />
                    <FormDescription className="text-xs">
                      {field.value?.length || 0}/200 characters
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Player Selection */}
            <FormField
              control={form.control}
              name="playerIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Players</FormLabel>
                  <FormDescription>
                    Select players to include in this circle. You can add or remove players later.
                    {isSubmitting && (
                      <span className="block text-amber-600 text-xs mt-1">
                        Please wait while saving...
                      </span>
                    )}
                  </FormDescription>
                  <FormControl>
                    <div className={`mt-2 ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}>
                      <CirclePlayerSelector
                        selectedPlayerIds={field.value}
                        onSelectionChange={field.onChange}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !form.formState.isValid ||
                  !form.getValues('name')?.trim()
                }
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting
                  ? (isEditing ? 'Updating...' : 'Creating...')
                  : (isEditing ? 'Update Circle' : 'Create Circle')
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}