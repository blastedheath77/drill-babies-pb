import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPlayers, getRecentGames, getTotalGamesCount } from '@/lib/data';
import { BarChart, Trophy, Users, Swords } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/stat-card';

export default async function Home() {
  const players = await getPlayers();
  const recentGames = await getRecentGames(5);
  const totalGames = await getTotalGamesCount();

  const totalPlayers = players.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Top Ranked Player"
          value={players.length > 0 ? players[0].name : 'N/A'}
          icon={<Trophy className="h-4 w-4 text-muted-foreground" />}
          description={
            players.length > 0 ? `Rating: ${players[0].rating.toFixed(2)}` : 'No players yet'
          }
        />
        <StatCard
          title="Total Players"
          value={totalPlayers.toString()}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Active club members"
        />
        <StatCard
          title="Games Logged"
          value={totalGames.toString()}
          icon={<Swords className="h-4 w-4 text-muted-foreground" />}
          description="Recent matches played"
        />
        <Link href="/statistics">
          <StatCard
            title="View All Stats"
            value="Dashboard"
            icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
            description="Go to statistics page"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Player Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="hidden sm:table-cell">W/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, index) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={player.avatar}
                            alt={player.name}
                            data-ai-hint="player avatar"
                          />
                          <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Link
                          href={`/players/${player.id}`}
                          className="font-medium hover:underline"
                        >
                          {player.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {player.rating.toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {player.wins} / {player.losses}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {recentGames.map((game) => (
              <div key={game.id} className="text-sm p-3 bg-secondary/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{game.type}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(game.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="space-y-1">
                  <div
                    className={`flex justify-between ${game.team1.score > game.team2.score ? 'font-bold' : ''}`}
                  >
                    <span>{game.team1.players.map((p) => p.name).join(' & ')}</span>
                    <span>{game.team1.score}</span>
                  </div>
                  <div
                    className={`flex justify-between ${game.team2.score > game.team1.score ? 'font-bold' : ''}`}
                  >
                    <span>{game.team2.players.map((p) => p.name).join(' & ')}</span>
                    <span>{game.team2.score}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
