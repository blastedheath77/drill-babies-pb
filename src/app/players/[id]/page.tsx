import { notFound } from 'next/navigation';
import {
  getPlayerById,
  getGamesForPlayer,
  getHeadToHeadStats,
  getPartnershipStats,
  getPlayers,
  calculatePlayerForm,
} from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Trophy, Swords, Percent, BarChart } from 'lucide-react';
import { HeadToHeadClient, PartnershipClient } from './client';
import { RatingChartWithTimeRange } from '@/components/rating-chart-with-time-range';
import { PlayerProfileClient } from './player-profile-client';
import { GamesHistoryClient } from './games-history-client';

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const player = await getPlayerById(params.id);
  if (!player) {
    notFound();
  }

  const allPlayers = (await getPlayers()).filter((p) => p.id !== player.id);
  const games = await getGamesForPlayer(player.id);

  const partnerships = getPartnershipStats(player.id, games, allPlayers.concat(player));
  const firstOpponent = allPlayers[0];
  const headToHead = firstOpponent ? getHeadToHeadStats(player.id, firstOpponent.id, games) : null;

  const winPercentage =
    player.wins + player.losses > 0
      ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(0)
      : '0';
  const pointsDiff = player.pointsFor - player.pointsAgainst;

  // Calculate player form
  const form = calculatePlayerForm(player.id, games, player.rating);

  return (
    <>
      <PageHeader
        title="Player Statistics"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <PlayerProfileClient player={player} form={form} />
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
