import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Users, Plus, Trash2 } from 'lucide-react';
import { getTournamentsByStatus } from '@/lib/data';
import { DeleteTournamentDialog } from '@/components/delete-tournament-dialog';
import Link from 'next/link';

export default async function TournamentsPage() {
  const [activeTournaments, completedTournaments] = await Promise.all([
    getTournamentsByStatus('active'),
    getTournamentsByStatus('completed'),
  ]);

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

  const TournamentCard = ({ tournament }: { tournament: any }) => (
    <Card key={tournament.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{tournament.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{tournament.description}</p>
          </div>
          {getStatusBadge(tournament.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(tournament.createdDate)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {tournament.playerIds.length} players
            </span>
            <Badge variant="outline" className="text-xs">
              {tournament.format} • {tournament.type}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/tournaments/${tournament.id}`}>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </Link>
          <DeleteTournamentDialog tournament={tournament}>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </DeleteTournamentDialog>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Tournaments & Leagues"
        description="Organize and participate in club events."
      />

      <div className="flex justify-between items-center mb-6">
        <Tabs defaultValue="active" className="w-full">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="active">Active ({activeTournaments.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedTournaments.length})</TabsTrigger>
            </TabsList>
            <Link href="/tournaments/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Tournament
              </Button>
            </Link>
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
