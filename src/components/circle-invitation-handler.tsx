'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Mail, 
  Calendar, 
  Check, 
  X, 
  Clock, 
  UserPlus,
  Shield
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { EmailCircleInvite } from '@/lib/types';

interface CircleInvitationHandlerProps {
  pendingInvitations: EmailCircleInvite[];
  onInvitationsHandled: (acceptedIds: string[], declinedIds: string[]) => void;
  onSkip: () => void;
  isLoading?: boolean;
  className?: string;
}

interface InvitationDecision {
  [inviteId: string]: 'accept' | 'decline' | 'pending';
}

export function CircleInvitationHandler({
  pendingInvitations,
  onInvitationsHandled,
  onSkip,
  isLoading = false,
  className
}: CircleInvitationHandlerProps) {
  const [decisions, setDecisions] = useState<InvitationDecision>({});

  const handleDecision = (inviteId: string, decision: 'accept' | 'decline') => {
    setDecisions(prev => ({
      ...prev,
      [inviteId]: decision
    }));
  };

  const handleConfirmDecisions = () => {
    const acceptedIds = Object.entries(decisions)
      .filter(([_, decision]) => decision === 'accept')
      .map(([inviteId]) => inviteId);
    
    const declinedIds = Object.entries(decisions)
      .filter(([_, decision]) => decision === 'decline')
      .map(([inviteId]) => inviteId);

    onInvitationsHandled(acceptedIds, declinedIds);
  };

  const handleAcceptAll = () => {
    const allAccept: InvitationDecision = {};
    pendingInvitations.forEach(invite => {
      allAccept[invite.id] = 'accept';
    });
    setDecisions(allAccept);
  };

  const handleDeclineAll = () => {
    const allDecline: InvitationDecision = {};
    pendingInvitations.forEach(invite => {
      allDecline[invite.id] = 'decline';
    });
    setDecisions(allDecline);
  };

  const acceptedCount = Object.values(decisions).filter(d => d === 'accept').length;
  const declinedCount = Object.values(decisions).filter(d => d === 'decline').length;
  const decidedCount = acceptedCount + declinedCount;

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
              <UserPlus className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-green-900 dark:text-green-100">
                You've been invited to join circles!
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                {pendingInvitations.length} circle invitation{pendingInvitations.length > 1 ? 's' : ''} 
                {' '}waiting for your response
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcceptAll}
                disabled={isLoading}
              >
                Accept All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeclineAll}
                disabled={isLoading}
              >
                Decline All
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {decidedCount} of {pendingInvitations.length} decided
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invitation Cards */}
      <div className="space-y-4">
        {pendingInvitations.map((invitation) => (
          <CircleInvitationCard
            key={invitation.id}
            invitation={invitation}
            decision={decisions[invitation.id] || 'pending'}
            onDecision={(decision) => handleDecision(invitation.id, decision)}
            disabled={isLoading}
          />
        ))}
      </div>

      {/* Summary and Actions */}
      {decidedCount > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  Your Decisions Summary
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {acceptedCount > 0 && (
                    <span>Joining {acceptedCount} circle{acceptedCount > 1 ? 's' : ''}</span>
                  )}
                  {acceptedCount > 0 && declinedCount > 0 && <span>, </span>}
                  {declinedCount > 0 && (
                    <span>declining {declinedCount} invitation{declinedCount > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={onSkip}
          disabled={isLoading}
        >
          Skip for now
        </Button>
        
        <div className="space-x-3">
          <Button
            onClick={handleConfirmDecisions}
            disabled={decidedCount === 0 || isLoading}
          >
            {isLoading ? 'Processing...' : 'Confirm Decisions'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CircleInvitationCardProps {
  invitation: EmailCircleInvite;
  decision: 'accept' | 'decline' | 'pending';
  onDecision: (decision: 'accept' | 'decline') => void;
  disabled?: boolean;
}

function CircleInvitationCard({
  invitation,
  decision,
  onDecision,
  disabled = false
}: CircleInvitationCardProps) {
  const circle = invitation.circle;
  const isExpiringSoon = invitation.expiresAt && 
    new Date(invitation.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <Card className={cn(
      'relative transition-all duration-200',
      decision === 'accept' && 'ring-2 ring-green-500 border-green-300 bg-green-50 dark:bg-green-950',
      decision === 'decline' && 'ring-2 ring-red-500 border-red-300 bg-red-50 dark:bg-red-950',
      disabled && 'opacity-60 cursor-not-allowed'
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={circle?.avatar} alt={circle?.name} />
              <AvatarFallback>
                <Users className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            
            <div>
              <CardTitle className="text-lg">
                {circle?.name || 'Circle'}
              </CardTitle>
              <CardDescription>
                {circle?.description || 'Join this pickleball community'}
              </CardDescription>
              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3" />
                  <span>{circle?.memberCount || 0} members</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Invited {formatDistanceToNow(parseISO(invitation.createdAt))} ago
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Decision Badge */}
          {decision !== 'pending' && (
            <Badge 
              variant={decision === 'accept' ? 'default' : 'destructive'}
              className="ml-2"
            >
              {decision === 'accept' ? (
                <><Check className="h-3 w-3 mr-1" />Joining</>
              ) : (
                <><X className="h-3 w-3 mr-1" />Declining</>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invitation Message */}
        {invitation.message && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-start space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">Personal message:</div>
                <div className="text-sm text-muted-foreground mt-1">
                  "{invitation.message}"
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Circle Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium">Privacy</div>
            <div className="text-muted-foreground">
              {circle?.isPrivate ? (
                <div className="flex items-center space-x-1">
                  <Shield className="h-3 w-3" />
                  <span>Private</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3" />
                  <span>Public</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="font-medium">Expires</div>
            <div className={cn(
              "text-muted-foreground",
              isExpiringSoon && "text-orange-600 font-medium"
            )}>
              {invitation.expiresAt ? (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(parseISO(invitation.expiresAt))}
                  </span>
                </div>
              ) : (
                'No expiration'
              )}
            </div>
          </div>
        </div>

        {/* Expiration Warning */}
        {isExpiringSoon && (
          <Alert className="border-orange-200 bg-orange-50">
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This invitation expires soon! Make sure to respond before it expires.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDecision('decline')}
            disabled={disabled}
            className={cn(
              decision === 'decline' && 'bg-red-100 border-red-300 text-red-700'
            )}
          >
            <X className="h-4 w-4 mr-1" />
            Decline
          </Button>
          
          <Button
            size="sm"
            onClick={() => onDecision('accept')}
            disabled={disabled}
            className={cn(
              decision === 'accept' && 'bg-green-600 hover:bg-green-700'
            )}
          >
            <Check className="h-4 w-4 mr-1" />
            Join Circle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CircleInvitationHandler;