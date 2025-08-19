import { notFound } from 'next/navigation';
import {
  getPlayerById,
  getGamesForPlayer,
  getHeadToHeadStats,
  getPartnershipStats,
  getPlayers,
  getPlayerRatingHistory,
} from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Trophy, Swords, Percent, BarChart } from 'lucide-react';
import { HeadToHeadClient, PartnershipClient } from './client';
import { RatingChart } from '@/components/rating-chart';
import { PlayerProfileClient } from './player-profile-client';
import { GamesHistoryClient } from './games-history-client';

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const player = await getPlayerById(params.id);
  if (!player) {
    notFound();
  }

  const allPlayers = (await getPlayers()).filter((p) => p.id !== player.id);
  const games = await getGamesForPlayer(player.id);
  const ratingHistory = await getPlayerRatingHistory(player.id, 30);

  const partnerships = getPartnershipStats(player.id, games, allPlayers.concat(player));
  const firstOpponent = allPlayers[0];
  const headToHead = firstOpponent ? getHeadToHeadStats(player.id, firstOpponent.id, games) : null;

  const winPercentage =
    player.wins + player.losses > 0
      ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(0)
      : '0';
  const pointsDiff = player.pointsFor - player.pointsAgainst;

  return (
    <>
      <PageHeader
        title={player.name}
        description={`Detailed statistics and match history for ${player.name}.`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <PlayerProfileClient player={player} />
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Wins"
              value={String(player.wins)}
              icon={<Trophy className="h-4 w-4" />}
            />
            <StatCard
              title="Losses"
              value={String(player.losses)}
              icon={<Swords className="h-4 w-4" />}
            />
            <StatCard
              title="Win %"
              value={`${winPercentage}%`}
              icon={<Percent className="h-4 w-4" />}
            />
            <StatCard
              title="Points Diff"
              value={String(pointsDiff > 0 ? `+${pointsDiff}` : pointsDiff)}
              icon={<BarChart className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Rating Chart */}
          <RatingChart ratingHistory={ratingHistory} playerName={player.name} />

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
