'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { RatingChartWithTimeRange } from '@/components/rating-chart-with-time-range';
import { PlayerProfileClient } from './player-profile-client';
import { GamesHistoryClient } from './games-history-client';
import { HeadToHeadClient, PartnershipClient } from './client';
import { RestrictedPlayerProfile } from '@/components/restricted-player-profile';
import { useAuth } from '@/contexts/auth-context';
import type { Player, Game, Partnership, HeadToHeadData, FormMetric } from '@/lib/types';

interface PlayerPageWrapperProps {
  player: Player;
  games: Game[];
  partnerships: Partnership[];
  headToHead: HeadToHeadData | null;
  allPlayers: Player[];
  winPercentage: string;
  pointsDiff: number;
  form: FormMetric;
}

export function PlayerPageWrapper({
  player,
  games,
  partnerships,
  headToHead,
  allPlayers,
  winPercentage,
  pointsDiff,
  form,
}: PlayerPageWrapperProps) {
  const { isAdmin } = useAuth();

  // Check if player is excluded and user is not admin
  if (player.excludeFromRankings && !isAdmin()) {
    return <RestrictedPlayerProfile playerName={player.name} />;
  }

  return (
    <>
      <PageHeader
        title="Player Statistics"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <PlayerProfileClient player={player} form={form} isAdmin={isAdmin()} />
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-xl font-bold">{player.wins}</div>
                  <div className="text-xs text-muted-foreground">Wins</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-bold">{player.losses}</div>
                  <div className="text-xs text-muted-foreground">Losses</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-bold">{winPercentage}%</div>
                  <div className="text-xs text-muted-foreground">Win %</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-bold">{pointsDiff > 0 ? `+${pointsDiff}` : pointsDiff}</div>
                  <div className="text-xs text-muted-foreground">Points Diff</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Rating Chart */}
          <RatingChartWithTimeRange playerId={player.id} playerName={player.name} />

          <Tabs defaultValue="history">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history">Games History</TabsTrigger>
              <TabsTrigger value="h2h">Head-to-Head</TabsTrigger>
              <TabsTrigger value="partners">Partners</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-4">
              <GamesHistoryClient games={games} player={player} />
            </TabsContent>

            <HeadToHeadClient
              playerId={player.id}
              initialData={headToHead}
              allPlayers={allPlayers}
              games={games}
            />

            <PartnershipClient partnerships={partnerships} />
          </Tabs>
        </div>
      </div>
    </>
  );
}
