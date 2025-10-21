'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Grid3x3, Users, Trophy, Calendar, Loader2, Trash2 } from 'lucide-react';
import { useBoxLeagues, useDeleteBoxLeague } from '@/hooks/use-box-leagues';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import type { BoxLeague } from '@/lib/types';

export function BoxLeaguesClient() {
  const { data: boxLeagues = [], isLoading, error } = useBoxLeagues();
  const deleteBoxLeague = useDeleteBoxLeague();
  const { isAdmin } = useAuth();
  const [showTestLeagues, setShowTestLeagues] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredLeagues = useMemo(() => {
    if (showTestLeagues) {
      return boxLeagues;
    }
    return boxLeagues.filter(league => !league.isTestMode);
  }, [boxLeagues, showTestLeagues]);

  const handleDeleteAllTestLeagues = async () => {
    const testLeagues = boxLeagues.filter(league => league.isTestMode);
    if (testLeagues.length === 0) return;

    setIsDeleting(true);
    try {
      // Delete all test leagues sequentially
      for (const league of testLeagues) {
        await deleteBoxLeague.mutateAsync(league.id);
      }
    } catch (error) {
      console.error('Error deleting test leagues:', error);
      alert('Failed to delete some test leagues. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading box leagues...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading box leagues. Please try again.</p>
      </div>
    );
  }

  const testLeagueCount = boxLeagues.filter(league => league.isTestMode).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Box Leagues</h1>
          <p className="text-muted-foreground mt-2">
            Competitive ladder system with promotion and relegation
          </p>
        </div>
        <Button asChild>
          <Link href="/box-leagues/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Box League
          </Link>
        </Button>
      </div>

      {/* Test Leagues Filter */}
      {testLeagueCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showTestLeagues"
              checked={showTestLeagues}
              onCheckedChange={(checked) => setShowTestLeagues(checked === true)}
            />
            <label
              htmlFor="showTestLeagues"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show Test Leagues ({testLeagueCount})
            </label>
          </div>
          {isAdmin() && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete All Test Leagues'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Test Leagues?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {testLeagueCount} test league{testLeagueCount !== 1 ? 's' : ''} and their associated data (boxes, rounds, matches, and stats). This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllTestLeagues} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      {/* Box League Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            How Box Leagues Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">4 Players per Box</h3>
              <p className="text-sm text-muted-foreground">
                Each box contains exactly 4 players ranked 1-4
              </p>
            </div>
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">3 Matches per Round</h3>
              <p className="text-sm text-muted-foreground">
                Every player partners with each other player exactly once
              </p>
            </div>
            <div className="text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Promotion & Relegation</h3>
              <p className="text-sm text-muted-foreground">
                Top player promotes up, bottom player relegates down
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Box Leagues List */}
      {filteredLeagues.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {boxLeagues.length === 0 ? 'No Box Leagues Yet' : 'No Non-Test Leagues'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {boxLeagues.length === 0
                ? 'Create your first box league to get started with competitive ladder play.'
                : 'All current leagues are in test mode. Enable "Show Test Leagues" to see them.'}
            </p>
            {boxLeagues.length === 0 && (
              <Button asChild>
                <Link href="/box-leagues/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Box League
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLeagues.map((league: BoxLeague) => (
            <Card key={league.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>{league.name}</CardTitle>
                    {league.isTestMode && (
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700">
                        TEST
                      </Badge>
                    )}
                  </div>
                  <Badge variant={league.status === 'active' ? 'default' : 'secondary'}>
                    {league.status}
                  </Badge>
                </div>
                {league.description && (
                  <p className="text-sm text-muted-foreground">{league.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Boxes:</span>
                    <div className="font-semibold">{league.totalBoxes}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Cycle:</span>
                    <div className="font-semibold">{league.currentCycle}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Round:</span>
                    <div className="font-semibold">
                      {league.currentRound} of {league.roundsPerCycle}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/box-leagues/${league.id}`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}