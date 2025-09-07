'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, UserPlus, Users, Search, CheckSquare, Square } from 'lucide-react';
import { sendCircleInvitation } from '@/lib/enhanced-circle-invites';
import { searchUsersAndPhantomPlayersNotInCircle } from '@/lib/user-search';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import type { User } from '@/lib/types';

const bulkInviteSchema = z.object({
  selectedUserIds: z.array(z.string()).min(1, 'Please select at least one user to invite'),
  message: z.string()
    .max(200, 'Message must be less than 200 characters')
    .optional(),
});

type BulkInviteForm = z.infer<typeof bulkInviteSchema>;

interface BulkInviteMemberDialogProps {
  circleId: string;
  circleName: string;
  onInvitesSent?: () => void;
  children?: React.ReactNode;
}

export function BulkInviteMemberDialog({ 
  circleId, 
  circleName, 
  onInvitesSent, 
  children 
}: BulkInviteMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const form = useForm<BulkInviteForm>({
    resolver: zodResolver(bulkInviteSchema),
    defaultValues: {
      selectedUserIds: [],
      message: '',
    },
  });

  // Search for users when query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchUsersAndPhantomPlayersNotInCircle(
          circleId,
          searchQuery,
          {
            excludeUserIds: [user?.id || ''],
            limit: 50,
            ...(user?.location && {
              nearLocation: {
                city: user.location.city,
                country: user.location.country,
              }
            })
          }
        );
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, circleId, user]);

  // Update form when selected users change
  useEffect(() => {
    form.setValue('selectedUserIds', Array.from(selectedUsers));
  }, [selectedUsers, form]);

  const resetState = () => {
    form.reset();
    setSelectedUsers(new Set());
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAll = () => {
    const allUserIds = searchResults.map(u => u.id);
    setSelectedUsers(new Set(allUserIds));
  };

  const deselectAll = () => {
    setSelectedUsers(new Set());
  };

  const onSubmit = async (data: BulkInviteForm) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send invitations',
        variant: 'destructive',
      });
      return;
    }

    if (data.selectedUserIds.length === 0) {
      toast({
        title: 'No users selected',
        description: 'Please select at least one user to invite',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      logger.info(`Sending bulk invites for circle ${circleId} to ${data.selectedUserIds.length} users`);

      const results = [];
      const selectedUsersList = searchResults.filter(u => data.selectedUserIds.includes(u.id));

      // Send invitations sequentially to avoid overwhelming the server
      for (const selectedUser of selectedUsersList) {
        try {
          const result = await sendCircleInvitation({
            circleId,
            invitedUserId: selectedUser.id,
            invitedBy: user.id,
            message: data.message,
          });
          
          results.push({
            user: selectedUser,
            success: result.success,
            message: result.message,
            inviteType: result.inviteType
          });
        } catch (error) {
          results.push({
            user: selectedUser,
            success: false,
            message: 'Failed to send invitation'
          });
        }
      }

      // Summarize results
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const phantomInstant = results.filter(r => r.inviteType === 'phantom_instant').length;

      if (successful === data.selectedUserIds.length) {
        // All succeeded
        if (phantomInstant > 0) {
          toast({
            title: 'Invitations completed!',
            description: `${phantomInstant} phantom players were instantly added to the circle, ${successful - phantomInstant} invitations sent successfully.`,
          });
        } else {
          toast({
            title: 'All invitations sent!',
            description: `Successfully sent ${successful} invitations.`,
          });
        }
      } else if (successful > 0) {
        // Partial success
        toast({
          title: 'Invitations partially completed',
          description: `${successful} invitations sent successfully, ${failed} failed.`,
          variant: 'destructive',
        });
      } else {
        // All failed
        toast({
          title: 'Failed to send invitations',
          description: 'All invitations failed to send. Please try again.',
          variant: 'destructive',
        });
      }

      if (successful > 0) {
        resetState();
        setOpen(false);
        
        if (onInvitesSent) {
          onInvitesSent();
        }
      }
    } catch (error) {
      logger.error('Failed to send bulk invites:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerButton = children || (
    <Button size="sm" variant="outline">
      <Users className="h-4 w-4 mr-2" />
      Bulk Invite
    </Button>
  );

  const getSelectedUserNames = () => {
    return searchResults
      .filter(u => selectedUsers.has(u.id))
      .map(u => u.name)
      .slice(0, 3)
      .join(', ') + (selectedUsers.size > 3 ? `... (+${selectedUsers.size - 3} more)` : '');
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetState();
      }
    }}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Invite Members to {circleName}
          </DialogTitle>
          <DialogDescription>
            Search and select multiple users or phantom players to invite at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Search Section */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  user?.location 
                    ? `Search users and phantom players (prioritizing ${user.location.city}, ${user.location.country})...`
                    : "Search for users and phantom players to invite..."
                }
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Selection Summary */}
            {selectedUsers.size > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">
                        {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                      </div>
                      <div className="text-sm text-blue-700">
                        {getSelectedUserNames()}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={deselectAll}
                      className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                    >
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Search Results */}
          <div className="space-y-2">
            {isSearching && (
              <div className="text-center py-4 text-muted-foreground">
                Searching users...
              </div>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No users found matching "{searchQuery}"
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <>
                {/* Bulk Actions */}
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    {searchResults.length} user{searchResults.length !== 1 ? 's' : ''} found
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={selectAll}
                      disabled={isSubmitting}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={deselectAll}
                      disabled={isSubmitting}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                {/* User List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((resultUser) => (
                    <Card 
                      key={resultUser.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedUsers.has(resultUser.id) ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => toggleUserSelection(resultUser.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedUsers.has(resultUser.id)}
                            onChange={() => {}} // Controlled by parent click
                            className="pointer-events-none"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {resultUser.name}
                              </span>
                              {resultUser.isPhantom && (
                                <Badge variant="secondary" className="text-xs">
                                  Phantom
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {resultUser.email && (
                                <span className="truncate">{resultUser.email}</span>
                              )}
                              {resultUser.location && (
                                <span className="truncate">
                                  {resultUser.location.city}, {resultUser.location.country}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {searchQuery.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Start typing to search for users and phantom players to invite</p>
              </div>
            )}
          </div>

          {/* Message Section */}
          <Form {...form}>
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
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting || selectedUsers.size === 0}
          >
            {isSubmitting 
              ? `Sending ${selectedUsers.size} invitation${selectedUsers.size !== 1 ? 's' : ''}...`
              : `Send ${selectedUsers.size} invitation${selectedUsers.size !== 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}