'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Settings, Mail, Crown, Shield, Eye, EyeOff, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useCircles } from '@/contexts/circle-context';
import { getUserInvites } from '@/lib/circle-invites';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InvitationsTab } from './invitations-tab';
import type { CircleInvite } from '@/lib/types';

export function CirclesListClient() {
  const { user } = useAuth();
  const { availableCircles, isLoadingCircles, refreshCircles } = useCircles();
  const [invites, setInvites] = useState<CircleInvite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);

  // Load user invites
  const loadInvites = async () => {
    if (!user) return;
    
    try {
      setIsLoadingInvites(true);
      const userInvites = await getUserInvites(user.id);
      setInvites(userInvites);
    } catch (error) {
      logger.error('Failed to load invites:', error);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadInvites();
    }
  }, [user]);

  const handleInviteAction = async () => {
    // Refresh both invites and circles when an invite is acted upon
    await Promise.all([
      loadInvites(),
      refreshCircles()
    ]);
  };

  if (isLoadingCircles) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="circles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="circles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            My Circles ({availableCircles.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invitations
            {invites.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {invites.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="circles" className="space-y-6">
          {availableCircles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Circles Yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  You haven't joined any circles yet. Create your first circle or wait for an invitation to get started.
                </p>
                <Link href="/circles/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Circle
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableCircles.map((circle) => (
                <Card key={circle.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {circle.isPrivate ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="truncate">{circle.name}</span>
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {circle.memberCount} members
                      </Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {circle.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {circle.memberCount}
                        </span>
                        {circle.isPrivate && (
                          <Badge variant="secondary" className="text-xs">
                            Private
                          </Badge>
                        )}
                      </div>
                      <Link href={`/circles/${circle.id}`}>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationsTab
            invites={invites}
            isLoading={isLoadingInvites}
            onInviteAction={handleInviteAction}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}