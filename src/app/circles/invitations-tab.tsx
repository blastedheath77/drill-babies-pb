'use client';

import React, { useState } from 'react';
import { Check, X, Users, Clock, Eye, EyeOff } from 'lucide-react';
import { acceptCircleInvite, declineCircleInvite } from '@/lib/circle-invites';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import type { CircleInvite } from '@/lib/types';

interface InvitationsTabProps {
  invites: CircleInvite[];
  isLoading: boolean;
  onInviteAction: () => Promise<void>;
}

export function InvitationsTab({ invites, isLoading, onInviteAction }: InvitationsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [processingInvites, setProcessingInvites] = useState<Set<string>>(new Set());

  const handleAcceptInvite = async (inviteId: string) => {
    if (!user) return;

    try {
      setProcessingInvites(prev => new Set(prev).add(inviteId));
      logger.info(`Accepting invite ${inviteId}`);

      const result = await acceptCircleInvite(inviteId, user.id);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        await onInviteAction();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to accept invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingInvites(prev => {
        const next = new Set(prev);
        next.delete(inviteId);
        return next;
      });
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    if (!user) return;

    try {
      setProcessingInvites(prev => new Set(prev).add(inviteId));
      logger.info(`Declining invite ${inviteId}`);

      const result = await declineCircleInvite(inviteId, user.id);

      if (result.success) {
        toast({
          title: 'Invitation declined',
          description: result.message,
        });
        await onInviteAction();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to decline invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingInvites(prev => {
        const next = new Set(prev);
        next.delete(inviteId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pending Invitations</h3>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have any pending circle invitations at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          You have {invites.length} pending invitation{invites.length !== 1 ? 's' : ''}.
        </AlertDescription>
      </Alert>

      {invites.map((invite) => {
        const isProcessing = processingInvites.has(invite.id);
        const expiresAt = new Date(invite.expiresAt);
        const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours

        return (
          <Card key={invite.id} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {invite.circle?.isPrivate ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>
                    {invite.circle?.name || 'Unknown Circle'}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  {invite.circle?.isPrivate && (
                    <Badge variant="secondary" className="text-xs">
                      Private
                    </Badge>
                  )}
                  {isExpiringSoon && (
                    <Badge variant="destructive" className="text-xs">
                      Expires Soon
                    </Badge>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                <div className="space-y-1">
                  <div>
                    {invite.circle?.description || 'No description provided'}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {invite.circle?.memberCount || 0} members
                    </span>
                    <span>
                      Expires: {expiresAt.toLocaleDateString()}
                    </span>
                  </div>
                  {invite.message && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <strong>Message:</strong> {invite.message}
                    </div>
                  )}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleAcceptInvite(invite.id)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    'Processing...'
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Accept
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDeclineInvite(invite.id)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}