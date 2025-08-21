'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, UserPlus, Search } from 'lucide-react';
import { sendCircleInvite } from '@/lib/circle-invites';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

const inviteSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  message: z.string()
    .max(200, 'Message must be less than 200 characters')
    .optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

interface InviteMemberDialogProps {
  circleId: string;
  circleName: string;
  onInviteSent?: () => void;
  children?: React.ReactNode;
}

export function InviteMemberDialog({ 
  circleId, 
  circleName, 
  onInviteSent, 
  children 
}: InviteMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      message: '',
    },
  });

  const onSubmit = async (data: InviteForm) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send invitations',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      logger.info(`Sending invite to ${data.email} for circle ${circleId}`);

      // For now, we'll simulate finding the user by email
      // In a real implementation, you'd have a user lookup function
      // TODO: Implement user lookup by email
      const simulatedUserId = `user_${data.email.replace('@', '_').replace('.', '_')}`;

      const result = await sendCircleInvite(
        circleId,
        simulatedUserId, // This should be the actual user ID from lookup
        user.id,
        data.message
      );

      if (result.success) {
        toast({
          title: 'Invitation sent!',
          description: `Invitation sent to ${data.email}`,
        });

        form.reset();
        setOpen(false);
        
        if (onInviteSent) {
          onInviteSent();
        }
      } else {
        toast({
          title: 'Failed to send invitation',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to send invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerButton = children || (
    <Button size="sm">
      <UserPlus className="h-4 w-4 mr-2" />
      Invite Member
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join "{circleName}". They'll receive an invitation that they can accept or decline.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="member@example.com"
                        className="pl-10"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Enter the email address of the person you want to invite
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Hey! I'd like to invite you to join our pickleball circle..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add a personal message to your invitation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Temporary notification for development
export function InviteMemberDialogTemp({ 
  circleId, 
  circleName, 
  onInviteSent, 
  children 
}: InviteMemberDialogProps) {
  const { toast } = useToast();

  const handleClick = () => {
    toast({
      title: 'Feature in Development',
      description: `User lookup by email is not yet implemented. This will allow you to invite users to "${circleName}" by their email address.`,
    });
  };

  const triggerButton = children || (
    <Button size="sm" onClick={handleClick}>
      <UserPlus className="h-4 w-4 mr-2" />
      Invite Member
    </Button>
  );

  return triggerButton;
}