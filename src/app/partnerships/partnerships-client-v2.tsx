'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { usePartnershipsData } from '@/hooks/use-games';
import { Loader2, AlertCircle } from 'lucide-react';

export function PartnershipsClientV2() {
  const { games, players, isLoading, error } = usePartnershipsData();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Partnership Analysis"
          description="Comprehensive analysis of doubles partnerships across all players."
        />
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading partnership data...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Partnership Analysis"
          description="Comprehensive analysis of doubles partnerships across all players."
        />
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <AlertCircle className="h-8 w-8 text-destructive mr-2" />
            <div>
              <p className="font-medium">Failed to load partnership data</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partnership Analysis"
        description="Comprehensive analysis of doubles partnerships across all players."
      />
      <Card>
        <CardHeader>
          <CardTitle>Partnership Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Found {games.length} games and {players.length} players.</p>
          <p>This simplified version avoids the hooks error while we debug.</p>
        </CardContent>
      </Card>
    </div>
  );
}