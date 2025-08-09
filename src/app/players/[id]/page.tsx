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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Trophy, Swords, Percent, BarChart } from 'lucide-react';
import { HeadToHeadClient, PartnershipClient } from './client';
import { RatingChart } from '@/components/rating-chart';
import { PlayerProfileClient } from './player-profile-client';

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const player = await getPlayerById(params.id);
  if (!player) {
    notFound();
  }

  const allPlayers = (await getPlayers()).filter((p) => p.id !== player.id);
  const games = await getGamesForPlayer(player.id);
  const ratingHistory = await getPlayerRatingHistory(player.id, 30);

  const partnerships = getPartnershipStats(player.id, games);
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
              <TabsTrigger value="history">Match History</TabsTrigger>
              <TabsTrigger value="h2h">Head-to-Head</TabsTrigger>
              <TabsTrigger value="partners">Partners</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Matches</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Opponent(s)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {games.map((game) => {
                        const playerTeam = game.team1.players.some((p) => p.id === player.id)
                          ? game.team1
                          : game.team2;
                        const opponentTeam = game.team1.players.some((p) => p.id === player.id)
                          ? game.team2
                          : game.team1;
                        const win = playerTeam.score > opponentTeam.score;

                        // Calculate rating change
                        const gameData = game as any;
                        const ratingChange = gameData.ratingChanges?.[player.id];

                        const getRatingDisplay = () => {
                          if (!ratingChange) return 'N/A';

                          const change = ratingChange.after - ratingChange.before;
                          const changeText =
                            change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
                          const changeColor = change >= 0 ? 'text-green-600' : 'text-red-600';

                          return (
                            <span className={`font-mono font-medium ${changeColor}`}>
                              {changeText}
                            </span>
                          );
                        };

                        return (
                          <TableRow key={game.id}>
                            <TableCell>{new Date(game.date).toLocaleDateString()}</TableCell>
                            <TableCell>{game.type}</TableCell>
                            <TableCell>
                              <Badge variant={win ? 'default' : 'destructive'}>
                                {win ? 'Win' : 'Loss'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {playerTeam.score} - {opponentTeam.score}
                            </TableCell>
                            <TableCell>{getRatingDisplay()}</TableCell>
                            <TableCell>
                              {opponentTeam.players.map((p) => p.name).join(' & ')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
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
