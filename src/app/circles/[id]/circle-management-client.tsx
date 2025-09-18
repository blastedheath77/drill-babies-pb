'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Settings, 
  Mail, 
  Crown, 
  Eye, 
  EyeOff, 
  UserPlus, 
  ArrowLeft,
  Trash2,
  Edit,
  Ghost
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useCircles } from '@/contexts/circle-context';
import { 
  getCircle, 
  getCircleMembers, 
  isCircleAdmin, 
  leaveCircle, 
  deleteCircle 
} from '@/lib/circles';
import { getCircleInvites } from '@/lib/circle-invites';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { InviteMemberDialog } from '@/components/invite-member-dialog';
import type { Circle, CircleMembership, CircleInvite, User } from '@/lib/types';

interface CircleManagementClientProps {
  circleId: string;
}

export function CircleManagementClient({ circleId }: CircleManagementClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshCircles } = useCircles();
  const { toast } = useToast();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [memberships, setMemberships] = useState<CircleMembership[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [invites, setInvites] = useState<CircleInvite[]>([]);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // Load circle data - memoized to prevent infinite loops
  const loadCircleData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      logger.info(`Loading circle data for ${circleId}`);

      const [circleData, membersData, isAdmin, invitesData] = await Promise.all([
        getCircle(circleId),
        getCircleMembers(circleId),
        isCircleAdmin(circleId, user.id),
        isCircleAdmin(circleId, user.id).then(isAdmin => 
          isAdmin ? getCircleInvites(circleId, user.id) : []
        )
      ]);

      if (!circleData) {
        toast({
          title: 'Circle not found',
          description: 'The circle you are looking for does not exist or you do not have access to it.',
          variant: 'destructive',
        });
        router.push('/circles');
        return;
      }

      setCircle(circleData);
      setMemberships(membersData.memberships);
      setMembers(membersData.users);
      setInvites(invitesData);
      setUserIsAdmin(isAdmin);

      logger.info(`Loaded circle: ${circleData.name} with ${membersData.memberships.length} members`);
    } catch (error) {
      logger.error('Failed to load circle data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load circle data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [circleId, user?.id, router, toast]);

  useEffect(() => {
    if (user) {
      loadCircleData();
    }
  }, [circleId, user, loadCircleData]);

  const handleLeaveCircle = async () => {
    if (!user || !circle) return;

    try {
      setIsLoadingAction(true);
      const result = await leaveCircle(circle.id, user.id);

      if (result.success) {
        toast({
          title: 'Left circle',
          description: result.message,
        });
        await refreshCircles();
        router.push('/circles');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to leave circle:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave circle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleDeleteCircle = async () => {
    if (!user || !circle) return;

    try {
      setIsLoadingAction(true);
      const result = await deleteCircle(circle.id, user.id);

      if (result.success) {
        toast({
          title: 'Circle deleted',
          description: result.message,
        });
        await refreshCircles();
        router.push('/circles');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to delete circle:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete circle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Circle not found</h2>
          <p className="text-muted-foreground mb-4">
            The circle you are looking for does not exist or you do not have access to it.
          </p>
          <Button onClick={() => router.push('/circles')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Circles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/circles')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              {circle.isPrivate ? (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Eye className="h-5 w-5 text-muted-foreground" />
              )}
              <span>{circle.name}</span>
            </div>
          </div>
        }
        description={circle.description || 'No description provided'}
        action={
          <div className="flex items-center gap-2">
            {userIsAdmin && (
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant={userIsAdmin ? "destructive" : "outline"} 
                  size="sm"
                  disabled={isLoadingAction}
                >
                  {userIsAdmin ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Circle
                    </>
                  ) : (
                    'Leave Circle'
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {userIsAdmin ? 'Delete Circle' : 'Leave Circle'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {userIsAdmin 
                      ? `Are you sure you want to delete "${circle.name}"? This action cannot be undone and will remove all members and data.`
                      : `Are you sure you want to leave "${circle.name}"? You will need to be re-invited to join again.`
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={userIsAdmin ? handleDeleteCircle : handleLeaveCircle}
                    className={userIsAdmin ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                  >
                    {userIsAdmin ? 'Delete' : 'Leave'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      {/* Circle Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{circle.memberCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Privacy</CardTitle>
            {circle.isPrivate ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {circle.isPrivate ? 'Private' : 'Public'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invites.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for management */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="members">
            Members ({memberships.length})
          </TabsTrigger>
          {userIsAdmin && (
            <TabsTrigger value="invitations">
              Invitations ({invites.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Circle Members</h3>
            {userIsAdmin && (
              <InviteMemberDialog
                circleId={circle.id}
                circleName={circle.name}
                onInviteSent={loadCircleData}
              />
            )}
          </div>

          <div className="grid gap-4">
            {memberships.map((membership) => {
              const member = members.find(m => m.id === membership.userId);
              if (!member) return null;

              return (
                <Card key={membership.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'phantom' && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Ghost className="h-3 w-3" />
                          Phantom
                        </Badge>
                      )}
                      <Badge variant={membership.role === 'admin' ? 'default' : 'secondary'}>
                        {membership.role === 'admin' ? (
                          <>
                            <Crown className="h-3 w-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          member.role === 'phantom' ? 'Player' : 'Member'
                        )}
                      </Badge>
                      {userIsAdmin && membership.userId !== user?.id && (
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {userIsAdmin && (
          <TabsContent value="invitations" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Pending Invitations</h3>
              <InviteMemberDialog
                circleId={circle.id}
                circleName={circle.name}
                onInviteSent={loadCircleData}
              >
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitations
                </Button>
              </InviteMemberDialog>
            </div>

            {invites.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Invitations</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    There are no pending invitations for this circle.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {invites.map((invite) => (
                  <Card key={invite.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-medium">Invitation sent</div>
                        <div className="text-sm text-muted-foreground">
                          Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {invite.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}