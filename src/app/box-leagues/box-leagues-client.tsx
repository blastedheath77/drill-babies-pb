'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Grid3x3, Users, Trophy, Calendar, Loader2 } from 'lucide-react';
import { useBoxLeagues } from '@/hooks/use-box-leagues';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import type { BoxLeague } from '@/lib/types';

export function BoxLeaguesClient() {
  const { data: boxLeagues = [], isLoading, error } = useBoxLeagues();

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
      {boxLeagues.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Box Leagues Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first box league to get started with competitive ladder play.
            </p>
            <Button asChild>
              <Link href="/box-leagues/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Box League
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {boxLeagues.map((league: BoxLeague) => (
            <Card key={league.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>{league.name}</CardTitle>
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