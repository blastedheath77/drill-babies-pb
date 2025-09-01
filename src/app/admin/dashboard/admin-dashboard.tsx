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
import { Trash2, Plus, Users, GamepadIcon, Shield, Database, Settings, Ghost, FileText } from 'lucide-react';
import { 
  deletePlayer, 
  createPlayer, 
  deleteGame, 
  getPlayersWithGameCount, 
  getAllGamesWithPlayerNames 
} from '@/lib/admin-actions';
import { convertExistingRatings } from '@/lib/convert-ratings';
import { updateGameDatesForTesting } from '@/lib/update-game-dates';
import { backfillRatingHistory } from '@/lib/backfill-rating-history';
import { syncAllPlayerStats } from '@/lib/sync-all-player-stats';
import { useInvalidatePlayers } from '@/hooks/use-players';
import { AdminPhantomPlayerManagement } from '@/components/admin-phantom-player-management';
import { AdminAuditTrailViewer } from '@/components/admin-audit-trail-viewer';
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

  // Database management states
  const [isConverting, setIsConverting] = useState(false);
  const [isUpdatingDates, setIsUpdatingDates] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [managementMessage, setManagementMessage] = useState<string>('');

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

  // Database management functions
  const handleConvertRatings = async () => {
    setIsConverting(true);
    setManagementMessage('Converting ratings to DUPR scale...');

    try {
      await convertExistingRatings();
      setAlert({ type: 'success', message: 'Successfully converted all ratings to DUPR scale!' });
      setManagementMessage('');
      await loadPlayers();
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to convert ratings' });
      setManagementMessage('');
    } finally {
      setIsConverting(false);
    }
  };

  const handleUpdateDates = async () => {
    setIsUpdatingDates(true);
    setManagementMessage('Updating game dates...');

    try {
      await updateGameDatesForTesting();
      setAlert({ type: 'success', message: 'Successfully updated game dates for testing!' });
      setManagementMessage('');
      await loadGames();
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update game dates' });
      setManagementMessage('');
    } finally {
      setIsUpdatingDates(false);
    }
  };

  const handleBackfillRatings = async () => {
    setIsBackfilling(true);
    setManagementMessage('Backfilling rating history...');

    try {
      await backfillRatingHistory();
      setAlert({ type: 'success', message: 'Successfully backfilled rating history!' });
      setManagementMessage('');
      await loadPlayers();
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to backfill rating history' });
      setManagementMessage('');
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleSyncStats = async () => {
    setIsSyncing(true);
    setManagementMessage('Syncing all player stats...');

    try {
      await syncAllPlayerStats();
      setAlert({ type: 'success', message: 'Successfully synced all player stats!' });
      setManagementMessage('');
      await loadPlayers();
      await loadGames();
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to sync player stats' });
      setManagementMessage('');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateInput: any) => {
    try {
      // Handle Firestore Timestamp objects
      if (dateInput && typeof dateInput === 'object' && 'seconds' in dateInput) {
        const date = new Date(dateInput.seconds * 1000);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      // Handle regular date strings
      const date = new Date(dateInput);
      return isNaN(date.getTime()) ? String(dateInput) : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return String(dateInput);
    }
  };

  const formatTeamScore = (team1Names: string[], team1Score: number, team2Names: string[], team2Score: number) => {
    return `${team1Names.join(', ')} ${team1Score} - ${team2Score} ${team2Names.join(', ')}`;
  };

  return (
    <div className="container max-w-6xl mx-auto p-4 sm:p-6">
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="players" className="flex items-center gap-1 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Players</span>
            <span className="xs:hidden">P</span>
          </TabsTrigger>
          <TabsTrigger value="games" className="flex items-center gap-1 text-xs sm:text-sm">
            <GamepadIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Games</span>
            <span className="xs:hidden">G</span>
          </TabsTrigger>
          <TabsTrigger value="phantom" className="flex items-center gap-1 text-xs sm:text-sm">
            <Ghost className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Phantom</span>
            <span className="xs:hidden">Ph</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1 text-xs sm:text-sm">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Audit</span>
            <span className="xs:hidden">A</span>
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center gap-1 text-xs sm:text-sm">
            <Database className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Management</span>
            <span className="xs:hidden">M</span>
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
                <div className="grid grid-cols-1 gap-4">
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Name</TableHead>
                        <TableHead className="min-w-[80px]">Rating</TableHead>
                        <TableHead className="min-w-[80px]">Record</TableHead>
                        <TableHead className="min-w-[60px]">Games</TableHead>
                        <TableHead className="min-w-[80px]">Actions</TableHead>
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
                </div>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead className="min-w-[200px]">Match</TableHead>
                        <TableHead className="min-w-[80px]">Type</TableHead>
                        <TableHead className="min-w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {games
                      .sort((a, b) => {
                        // Sort by date, most recent first
                        let dateA, dateB;
                        
                        // Handle Firestore Timestamp objects
                        if (a.date && typeof a.date === 'object' && 'seconds' in a.date) {
                          dateA = new Date(a.date.seconds * 1000);
                        } else {
                          dateA = new Date(a.date);
                        }
                        
                        if (b.date && typeof b.date === 'object' && 'seconds' in b.date) {
                          dateB = new Date(b.date.seconds * 1000);
                        } else {
                          dateB = new Date(b.date);
                        }
                        
                        return dateB.getTime() - dateA.getTime();
                      })
                      .map((game) => (
                      <TableRow key={game.id}>
                        <TableCell>
                          {(() => {
                            try {
                              // Handle Firestore Timestamp objects
                              if (game.date && typeof game.date === 'object' && 'seconds' in game.date) {
                                const date = new Date(game.date.seconds * 1000);
                                return date.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                });
                              }
                              // Handle regular date strings
                              const date = new Date(game.date);
                              return isNaN(date.getTime()) ? String(game.date) : date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric', 
                                year: 'numeric',
                              });
                            } catch (error) {
                              return String(game.date);
                            }
                          })()}
                        </TableCell>
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phantom" className="space-y-6">
          <AdminPhantomPlayerManagement />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AdminAuditTrailViewer />
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Database Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Advanced tools for managing and maintaining the database
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {managementMessage && (
                <Alert>
                  <AlertDescription>{managementMessage}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid gap-6">
                {/* Convert Ratings */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-2">Convert Rating System</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Convert existing ELO ratings (1200-1700) to DUPR scale (2.0-8.0) for better pickleball rating representation.
                  </p>
                  <Button onClick={handleConvertRatings} disabled={isConverting}>
                    {isConverting ? 'Converting...' : 'Convert to DUPR Scale'}
                  </Button>
                </div>

                {/* Update Game Dates */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-2">Update Game Dates</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update existing games to have staggered dates (today, 2 days ago, 4 days ago, etc.) for testing rating history charts.
                  </p>
                  <Button onClick={handleUpdateDates} disabled={isUpdatingDates} variant="outline">
                    {isUpdatingDates ? 'Updating...' : 'Update Game Dates for Testing'}
                  </Button>
                </div>

                {/* Backfill Rating History */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-2">Backfill Rating History</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate historical rating changes for existing games to populate the rating history charts. This simulates what the ratings would have been after each game.
                  </p>
                  <Button onClick={handleBackfillRatings} disabled={isBackfilling} variant="secondary">
                    {isBackfilling ? 'Backfilling...' : 'Backfill Rating History'}
                  </Button>
                </div>

                {/* Sync All Player Stats */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-2">Sync All Player Stats</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Recalculate ALL player stats (rating, wins, losses, points for/against) from actual game history. Fixes discrepancies between stored stats and game results.
                  </p>
                  <Button onClick={handleSyncStats} disabled={isSyncing} variant="outline">
                    {isSyncing ? 'Syncing...' : 'Sync All Player Stats'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}