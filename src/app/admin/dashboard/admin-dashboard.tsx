'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Plus, Users, GamepadIcon, Shield } from 'lucide-react';
import { 
  deletePlayer, 
  createPlayer, 
  deleteGame, 
  getPlayersWithGameCount, 
  getAllGamesWithPlayerNames 
} from '@/lib/admin-actions';
import { useInvalidatePlayers } from '@/hooks/use-players';
import type { Player, Game } from '@/lib/types';

type PlayerWithGameCount = Player & { gameCount: number };
type GameWithPlayerNames = Game & { 
  team1Names: string[];
  team2Names: string[]; 
  canDelete: boolean;
};

export function AdminDashboard() {
  const [players, setPlayers] = useState<PlayerWithGameCount[]>([]);
  const [games, setGames] = useState<GameWithPlayerNames[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { invalidateAll } = useInvalidatePlayers();
  
  // New player form
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadPlayers();
    loadGames();
  }, []);

  const loadPlayers = async () => {
    setIsLoadingPlayers(true);
    try {
      const playersData = await getPlayersWithGameCount();
      setPlayers(playersData);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to load players' });
    }
    setIsLoadingPlayers(false);
  };

  const loadGames = async () => {
    setIsLoadingGames(true);
    try {
      const gamesData = await getAllGamesWithPlayerNames();
      setGames(gamesData);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to load games' });
    }
    setIsLoadingGames(false);
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setIsCreatingPlayer(true);
    const result = await createPlayer({
      name: newPlayerName,
      email: newPlayerEmail || undefined,
    });

    if (result.success) {
      setAlert({ type: 'success', message: `Player "${newPlayerName}" created successfully!` });
      setNewPlayerName('');
      setNewPlayerEmail('');
      
      // Invalidate React Query cache to refresh player lists immediately
      invalidateAll();
      
      loadPlayers(); // Refresh the list
    } else {
      setAlert({ type: 'error', message: result.error || 'Failed to create player' });
    }
    setIsCreatingPlayer(false);
  };

  const handleDeletePlayer = async (playerId: string, playerName: string, forceDelete: boolean = false) => {
    try {
      const result = await deletePlayer(playerId, forceDelete);
      
      if (result.success) {
        const message = forceDelete 
          ? `Player "${playerName}" and all their games deleted successfully!`
          : `Player "${playerName}" deleted successfully!`;
        setAlert({ type: 'success', message });
        
        // Invalidate React Query cache to refresh player lists immediately
        invalidateAll();
        
        await loadPlayers(); // Refresh the list
        await loadGames(); // Also refresh games if we deleted games
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to delete player' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'An error occurred while deleting the player' });
      console.error('Delete player error:', error);
    }
  };

  const handleDeleteGame = async (gameId: string, gameDescription: string) => {
    const result = await deleteGame(gameId);
    
    if (result.success) {
      setAlert({ type: 'success', message: `Game "${gameDescription}" deleted successfully!` });
      loadGames(); // Refresh the list
      loadPlayers(); // Also refresh players to update game counts
    } else {
      setAlert({ type: 'error', message: result.error || 'Failed to delete game' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTeamScore = (team1Names: string[], team1Score: number, team2Names: string[], team2Score: number) => {
    return `${team1Names.join(', ')} ${team1Score} - ${team2Score} ${team2Names.join(', ')}`;
  };

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage players, games, and system data</p>
        </div>
      </div>

      {alert && (
        <Alert variant={alert.type === 'error' ? 'destructive' : 'default'} className="mb-6">
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="players" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="players" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Players
          </TabsTrigger>
          <TabsTrigger value="games" className="flex items-center gap-2">
            <GamepadIcon className="h-4 w-4" />
            Games
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-6">
          {/* Create Player Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Player
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePlayer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="playerName">Name *</Label>
                    <Input
                      id="playerName"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Enter player name"
                      required
                      disabled={isCreatingPlayer}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="playerEmail">Email (optional)</Label>
                    <Input
                      id="playerEmail"
                      type="email"
                      value={newPlayerEmail}
                      onChange={(e) => setNewPlayerEmail(e.target.value)}
                      placeholder="Enter player email"
                      disabled={isCreatingPlayer}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isCreatingPlayer || !newPlayerName.trim()}>
                  {isCreatingPlayer ? 'Creating...' : 'Create Player'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Players List */}
          <Card>
            <CardHeader>
              <CardTitle>Player Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total Players: {players.length}
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingPlayers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead>Games</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{player.rating.toFixed(1)}</Badge>
                        </TableCell>
                        <TableCell>{player.wins}W - {player.losses}L</TableCell>
                        <TableCell>
                          <Badge variant={player.gameCount === 0 ? 'secondary' : 'default'}>
                            {player.gameCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Player</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{player.name}"?
                                  {player.gameCount > 0 && (
                                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                      <strong>Warning:</strong> This player has {player.gameCount} recorded game(s). 
                                      Deleting the player will also delete all their games and match history.
                                    </div>
                                  )}
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePlayer(player.id, player.name, true)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {player.gameCount > 0 ? 'Force Delete Player & Games' : 'Delete Player'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Game Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total Games: {games.length}
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingGames ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games.map((game) => (
                      <TableRow key={game.id}>
                        <TableCell>{formatDate(game.date)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatTeamScore(
                            game.team1Names,
                            game.team1.score,
                            game.team2Names,
                            game.team2.score
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={game.tournamentId ? 'default' : 'secondary'}>
                            {game.tournamentId ? 'Tournament' : 'Casual'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {game.canDelete ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Game</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this game?
                                    <div className="mt-2 p-2 bg-gray-50 border rounded font-mono text-sm">
                                      {formatTeamScore(
                                        game.team1Names,
                                        game.team1.score,
                                        game.team2Names,
                                        game.team2.score
                                      )}
                                      <br />
                                      <span className="text-muted-foreground">{formatDate(game.date)}</span>
                                    </div>
                                    This will also update player statistics. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteGame(
                                      game.id, 
                                      formatTeamScore(
                                        game.team1Names,
                                        game.team1.score,
                                        game.team2Names,
                                        game.team2.score
                                      )
                                    )}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Game
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Protected
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}