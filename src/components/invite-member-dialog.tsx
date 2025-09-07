'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, UserPlus, User2, AtSign, Users } from 'lucide-react';
import { sendCircleInvitation } from '@/lib/enhanced-circle-invites';
import { getUserByEmail, searchUsersNotInCircle, searchUsersAndPhantomPlayersNotInCircle } from '@/lib/user-search';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { UserPicker } from '@/components/user-picker';
import type { User } from '@/lib/types';
import { getSuggestedUsers } from '@/lib/user-search';

const userInviteSchema = z.object({
  selectedUserId: z.string().min(1, 'Please select a user to invite'),
  message: z.string()
    .max(200, 'Message must be less than 200 characters')
    .optional(),
});

const emailInviteSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  message: z.string()
    .max(200, 'Message must be less than 200 characters')
    .optional(),
});

type UserInviteForm = z.infer<typeof userInviteSchema>;
type EmailInviteForm = z.infer<typeof emailInviteSchema>;

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
  const [selectedTab, setSelectedTab] = useState('user');
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const userForm = useForm<UserInviteForm>({
    resolver: zodResolver(userInviteSchema),
    defaultValues: {
      selectedUserId: '',
      message: '',
    },
  });

  const emailForm = useForm<EmailInviteForm>({
    resolver: zodResolver(emailInviteSchema),
    defaultValues: {
      email: '',
      message: '',
    },
  });

  const resetForms = () => {
    userForm.reset();
    emailForm.reset();
  };

  // Load location-based suggested users when dialog opens
  useEffect(() => {
    if (open && user?.location) {
      const loadSuggestions = async () => {
        setIsLoadingSuggestions(true);
        try {
          const suggestions = await getSuggestedUsers(
            user.id,
            [user.id], // Exclude current user
            5, // Limit to 5 suggestions
            user.location
          );
          setSuggestedUsers(suggestions);
        } catch (error) {
          console.error('Failed to load user suggestions:', error);
        } finally {
          setIsLoadingSuggestions(false);
        }
      };
      
      loadSuggestions();
    }
  }, [open, user]);

  const onUserInviteSubmit = async (data: UserInviteForm) => {
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
      logger.info(`Sending user invite for circle ${circleId}`);

      const result = await sendCircleInvitation({
        circleId,
        invitedUserId: data.selectedUserId,
        invitedBy: user.id,
        message: data.message,
      });

      if (result.success) {
        // Handle different invitation types with appropriate messaging
        if (result.inviteType === 'phantom_instant') {
          toast({
            title: 'Phantom Player Added!',
            description: 'The phantom player was instantly added to the circle (no invitation needed)',
          });
        } else {
          toast({
            title: 'Invitation sent!',
            description: 'The user has been invited to join the circle',
          });
        }

        resetForms();
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
      logger.error('Failed to send user invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEmailInviteSubmit = async (data: EmailInviteForm) => {
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
      logger.info(`Sending email invite to ${data.email} for circle ${circleId}`);

      // Check if user already exists with this email
      const existingUser = await getUserByEmail(data.email);
      let result;
      
      if (existingUser) {
        // User exists, send user invite instead
        result = await sendCircleInvitation({
          circleId,
          invitedUserId: existingUser.id,
          invitedBy: user.id,
          message: data.message,
        });

        if (result.success) {
          toast({
            title: 'Invitation sent!',
            description: `Invitation sent to ${existingUser.name} (${data.email})`,
          });
        } else {
          toast({
            title: 'Failed to send invitation',
            description: result.message,
            variant: 'destructive',
          });
        }
      } else {
        // User doesn't exist, send email invite
        result = await sendCircleInvitation({
          circleId,
          invitedEmail: data.email,
          invitedBy: user.id,
          message: data.message,
        });

        if (result.success) {
          toast({
            title: 'Email invitation sent!',
            description: `Invitation sent to ${data.email}. They'll receive an email with instructions to join.`,
          });
        } else {
          toast({
            title: 'Failed to send email invitation',
            description: result.message,
            variant: 'destructive',
          });
        }
      }

      if (result.success) {
        resetForms();
        setOpen(false);
        
        if (onInviteSent) {
          onInviteSent();
        }
      }
    } catch (error) {
      logger.error('Failed to send email invite:', error);
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
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetForms();
      }
    }}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Member to {circleName}
          </DialogTitle>
          <DialogDescription>
            Invite existing users or send email invitations to new members.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Existing User
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Email Invite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="space-y-4">
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(onUserInviteSubmit)} className="space-y-4">
                <FormField
                  control={userForm.control}
                  name="selectedUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select User</FormLabel>
                      <FormControl>
                        <UserPicker
                          selectedUserId={field.value}
                          onUserSelect={(user: User) => field.onChange(user.id)}
                          circleId={circleId}
                          customSearchFunction={searchUsersAndPhantomPlayersNotInCircle.bind(null, circleId)}
                          searchOptions={{ 
                            excludeUserIds: [user?.id || ''],
                            limit: 50,
                            // Prioritize users from same location if current user has location
                            ...(user?.location && {
                              nearLocation: {
                                city: user.location.city,
                                country: user.location.country,
                              }
                            })
                          }}
                          placeholder={
                            user?.location 
                              ? `Search users and phantom players (prioritizing ${user.location.city}, ${user.location.country})...`
                              : "Search for users and phantom players to invite..."
                          }
                          disabled={isSubmitting}
                          showLocation={true}
                          showGender={true}
                        />
                      </FormControl>
                      <FormDescription>
                        Search and select an existing user or phantom player to invite
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Hey! I'd like to invite you to join our pickleball circle..."
                          className="resize-none"
                          rows={3}
                          disabled={isSubmitting}
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
                    disabled={isSubmitting || !userForm.watch('selectedUserId')}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailInviteSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="member@example.com"
                            className="pl-10"
                            disabled={isSubmitting}
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        If this email belongs to an existing user, they'll get an in-app invitation. 
                        Otherwise, they'll receive an email with signup instructions.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={emailForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Hey! I'd like to invite you to join our pickleball circle..."
                          className="resize-none"
                          rows={3}
                          disabled={isSubmitting}
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
          </TabsContent>
        </Tabs>
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