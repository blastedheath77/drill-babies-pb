'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Users, Plus, Trash2, Loader2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { DeleteTournamentDialog } from '@/components/delete-tournament-dialog';
import { subscribeTournamentsRealtime, getTournamentsByStatus } from '@/lib/data';
import { useAuth } from '@/contexts/auth-context';
import { useClub } from '@/contexts/club-context';
import Link from 'next/link';
import type { Tournament } from '@/lib/types';

export function TournamentsClient() {
  const { canCreateTournaments } = useAuth();
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const clubName = selectedClub ? selectedClub.name : 'All Clubs';
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [completedTournaments, setCompletedTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);

  // Fallback manual fetch function (used as backup)
  const fetchTournamentsFallback = useCallback(async () => {
    // Cooldown to prevent too many rapid refreshes (2 second minimum)
    const now = Date.now();
    if (now - lastRefresh < 2000) {
      return;
    }
    
    try {
      setIsRefreshing(true);
      setError(null);
      setLastRefresh(now);
      
      const [active, completed] = await Promise.all([
        getTournamentsByStatus('active', selectedClub?.id),
        getTournamentsByStatus('completed', selectedClub?.id),
      ]);
      setActiveTournaments(active);
      setCompletedTournaments(completed);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tournaments'));
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [lastRefresh]);

  // Real-time update handler
  const handleTournamentsUpdate = useCallback((tournaments: { active: Tournament[]; completed: Tournament[] }) => {
    setActiveTournaments(tournaments.active);
    setCompletedTournaments(tournaments.completed);
    setIsLoading(false);
    setError(null);
  }, []);

  // Error handler for real-time listener
  const handleRealtimeError = useCallback((err: Error) => {
    console.warn('Real-time listener error:', err);
    setError(err);
    // Fallback to manual fetch if real-time fails
    fetchTournamentsFallback();
  }, [fetchTournamentsFallback]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    fetchTournamentsFallback();
  }, [fetchTournamentsFallback]);

  useEffect(() => {
    // Set up real-time listener as primary method
    const unsubscribe = subscribeTournamentsRealtime(
      handleTournamentsUpdate,
      handleRealtimeError,
      selectedClub?.id
    );

    // Multiple refresh triggers for fool-proof updates
    
    // 1. Page visibility change (mobile-friendly)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible - refresh to get latest data
        fetchTournamentsFallback();
      }
    };

    // 2. Window focus (desktop-friendly)  
    const handleFocus = () => {
      fetchTournamentsFallback();
    };

    // 3. Page show event (handles back/forward navigation)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from cache - force refresh
        fetchTournamentsFallback();
      }
    };

    // 4. Online event (network reconnection)
    const handleOnline = () => {
      fetchTournamentsFallback();
    };

    // Add all event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);

    // Cleanup function
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
    };
  }, [handleTournamentsUpdate, handleRealtimeError, fetchTournamentsFallback]);

  const handleTournamentDeleted = useCallback(() => {
    // Real-time listener will handle the update automatically
    // But trigger manual refresh as backup
    setTimeout(() => {
      fetchTournamentsFallback();
    }, 1000);
  }, [fetchTournamentsFallback]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'secondary',
      completed: 'outline',
    } as const;

    const labels = {
      active: 'In Progress',
      completed: 'Completed',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const TournamentCard = ({ tournament }: { tournament: Tournament }) => (
    <Card
      key={tournament.id}
      className={`hover:shadow-md transition-shadow relative ${
        tournament.isQuickPlay
          ? 'border-l-4 border-l-green-500'
          : 'border-l-4 border-l-blue-500'
      }`}
    >
      <Link href={`/tournaments/${tournament.id}`} className="block">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight flex items-center gap-2 truncate">
                {tournament.isQuickPlay ? (
                  <Zap className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <Trophy className="h-4 w-4 text-blue-600 flex-shrink-0" />
                )}
                <span className="truncate">{tournament.name}</span>
              </CardTitle>
              {tournament.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1 truncate">
                  {tournament.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {getStatusBadge(tournament.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{formatDate(tournament.createdDate)}</span>
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{tournament.playerIds.length}</span>
            </span>
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 truncate">
              {tournament.format}
            </Badge>
          </div>
        </CardContent>
      </Link>
    </Card>
  );

  // Show message if user has no clubs
  if (!clubsLoading && !hasAnyClubs) {
    return (
      <>
        <PageHeader
          title="Tournaments"
          description="Organise recreational play and tournaments."
        />
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Users className="h-6 w-6" />
                No Club Access
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                You are not assigned to any clubs yet. Please contact an administrator to get access to a club.
              </p>
              <p className="text-sm text-muted-foreground">
                Once you have club access, you'll be able to view and create tournaments.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <>
        <PageHeader
          title={`${clubName} Tournaments`}
          description={`Organise recreational play and tournaments${selectedClub ? ` in ${clubName}` : ''}.`}
        />
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading tournaments...</span>
          </CardContent>
        </Card>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <PageHeader
          title={`${clubName} Tournaments`}
          description={`Organise recreational play and tournaments${selectedClub ? ` in ${clubName}` : ''}.`}
        />
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <AlertCircle className="h-8 w-8 text-destructive mr-2" />
            <div>
              <p className="font-medium">Failed to load tournaments</p>
              <p className="text-sm text-muted-foreground">
                {error.message || 'Unknown error occurred'}
              </p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${clubName} Tournaments`}
        description={`Organise recreational play and tournaments${selectedClub ? ` in ${clubName}` : ''}.`}
      />

      {canCreateTournaments() && (
        <div className="flex gap-2 justify-center mb-6">
          <Link href="/tournaments/quick-play">
            <Button className="bg-green-600 hover:bg-green-700 text-white border-0 w-32">
              <Zap className="h-4 w-4 mr-2" />
              Quick Play
            </Button>
          </Link>
          <Link href="/tournaments/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 w-32">
              <Trophy className="h-4 w-4 mr-2" />
              Tournament
            </Button>
          </Link>
        </div>
      )}

      <div className="mb-6">
        <Tabs defaultValue="active" className="w-full">
          <div className="flex justify-center sm:justify-start">
            <TabsList>
              <TabsTrigger value="active">
                Active ({activeTournaments.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedTournaments.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="mt-6">
            {activeTournaments.length > 0 ? (
              <div className="grid gap-4">
                {activeTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center text-center gap-4 py-16">
                  <Trophy className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">No Active Tournaments</p>
                    <p className="text-muted-foreground">
                      There are no tournaments currently in progress.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedTournaments.length > 0 ? (
              <div className="grid gap-4">
                {completedTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center text-center gap-4 py-16">
                  <Trophy className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">No Completed Tournaments</p>
                    <p className="text-muted-foreground">
                      Tournament history will appear here once tournaments are completed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}