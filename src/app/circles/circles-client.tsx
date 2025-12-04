'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCirclesWithPlayerCount } from '@/hooks/use-circles';
import { useClub } from '@/contexts/club-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CircleFormDialog } from '@/components/circle-form-dialog';
import {
  Plus,
  Users2,
  AlertTriangle,
  Circle as CircleIcon,
  ChevronRight,
} from 'lucide-react';
import type { Circle } from '@/lib/types';

interface CirclesClientProps {
  initialCircles: Circle[];
}

export function CirclesClient({ initialCircles }: CirclesClientProps) {
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { data: circles, isLoading, error, isError } = useCirclesWithPlayerCount(selectedClub?.id);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const clubName = selectedClub ? selectedClub.name : 'All Clubs';

  // Use React Query data if available, otherwise fall back to initial data
  const allCircles = circles || initialCircles;

  // Show message if user has no clubs
  if (!clubsLoading && !hasAnyClubs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Users2 className="h-6 w-6" />
              No Club Access
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You are not assigned to any clubs yet. Please contact an administrator to get access to a club.
            </p>
            <p className="text-sm text-muted-foreground">
              Once you have club access, you'll be able to view and manage circles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load circles. {error?.message || 'Please try refreshing the page.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading && !allCircles.length) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (allCircles.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{clubName} Circles</h1>
            <p className="text-muted-foreground">
              No circles created yet{selectedClub ? ` in ${clubName}` : ''}. Create your first circle to start organizing players.
            </p>
          </div>
          <CircleFormDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Circle
            </Button>
          </CircleFormDialog>
        </div>

        {/* Empty state */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CircleIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Circles Found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create circles to group players for easier filtering of statistics and leaderboards.
              Each circle can contain any number of players.
            </p>
            <CircleFormDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Circle
              </Button>
            </CircleFormDialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{clubName} Circles</h1>
        </div>
        <CircleFormDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Circle
          </Button>
        </CircleFormDialog>
      </div>

      {/* Circles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {allCircles.map((circle) => (
          <CircleCard
            key={circle.id}
            circle={circle}
            playerCount={'playerCount' in circle ? circle.playerCount : circle.playerIds.length}
          />
        ))}
      </div>

    </div>
  );
}

interface CircleCardProps {
  circle: Circle;
  playerCount: number;
}

function CircleCard({ circle, playerCount }: CircleCardProps) {
  const router = useRouter();

  return (
    <Card
      className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
      onClick={() => router.push(`/circles/${circle.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight truncate group-hover:text-primary transition-colors">
              {circle.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1 transition-colors">
                <Users2 className="h-3 w-3" />
                {playerCount} player{playerCount !== 1 ? 's' : ''}
              </Badge>
              {playerCount === 0 && (
                <Badge variant="outline" className="text-xs">
                  Empty
                </Badge>
              )}
            </div>
          </div>
          <div className="opacity-60 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {circle.description ? (
            <CardDescription className="text-sm leading-relaxed line-clamp-3">
              {circle.description}
            </CardDescription>
          ) : (
            <CardDescription className="text-sm italic text-muted-foreground/60">
              No description provided
            </CardDescription>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
            <span>Created {new Date(circle.createdDate).toLocaleDateString()}</span>
            {playerCount > 0 && (
              <span className="text-primary font-medium">
                Active
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}