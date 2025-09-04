'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getPlayers } from '@/lib/data';
import { findClaimablePlayersForUser, claimPlayer } from '@/lib/player-claiming';
import { makePlayerClaimable, revertPhantomPlayer } from '@/lib/make-player-claimable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { Player } from '@/lib/types';

interface ClaimablePlayer extends Player {
  canClaim: boolean;
  claimError?: string;
  gamesPlayed: number;
  currentRating: number;
}

export function PlayerClaimingClient() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchName, setSearchName] = useState('Andreas Jonsson');
  const [searchEmail, setSearchEmail] = useState('dreas.jonsson@gmail.com');
  const [targetUserId, setTargetUserId] = useState('');
  const [claimableResults, setClaimableResults] = useState<ClaimablePlayer[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const { toast } = useToast();

  // Load all players
  const loadPlayers = async () => {
    setIsLoading(true);
    try {
      console.log('Loading all players...');
      const allPlayers = await getPlayers();
      console.log('Loaded players:', allPlayers.length);
      setPlayers(allPlayers);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: 'Error',
        description: 'Failed to load players',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Search for claimable players by email
  const searchClaimableByEmail = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Searching for claimable players by email:', searchEmail);
      const results = await findClaimablePlayersForUser(searchEmail);
      console.log('Claimable search results:', results);
      setClaimableResults(results.players);
      
      if (results.players.length === 0) {
        toast({
          title: 'No matches',
          description: `No claimable players found for ${searchEmail}`,
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error searching claimable players:', error);
      toast({
        title: 'Error',
        description: 'Failed to search claimable players',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manual claim function
  const handleManualClaim = async (playerId: string, playerName: string) => {
    if (!searchEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a user email first',
        variant: 'destructive'
      });
      return;
    }

    // Use the target user ID if provided, otherwise use current user
    const userId = targetUserId.trim() || user?.id;
    
    if (!userId) {
      toast({
        title: 'Error',
        description: 'No user ID available. Please enter a target user ID or log in.',
        variant: 'destructive'
      });
      return;
    }

    setIsClaiming(true);
    try {
      console.log('Attempting to claim player:', { playerId, playerName, userId, email: searchEmail });
      
      const result = await claimPlayer({
        userId,
        playerId,
        email: searchEmail
      });

      if (result.success) {
        toast({
          title: 'Success!',
          description: `Successfully claimed ${playerName}`,
          variant: 'default'
        });
        
        // Refresh data
        await loadPlayers();
        await searchClaimableByEmail();
      } else {
        toast({
          title: 'Claim Failed',
          description: result.error || 'Failed to claim player',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error claiming player:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim player due to system error',
        variant: 'destructive'
      });
    } finally {
      setIsClaiming(false);
    }
  };

  // Convert player to phantom and make claimable
  const handleMakePlayerClaimable = async (playerId: string, playerName: string) => {
    if (!searchEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email first',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Converting player to phantom:', { playerId, playerName, email: searchEmail });
      
      const result = await makePlayerClaimable(playerId, searchEmail, user?.id);

      if (result.success) {
        toast({
          title: 'Success!',
          description: `Successfully converted ${playerName} to claimable phantom player`,
          variant: 'default'
        });
        
        // Refresh data
        await loadPlayers();
      } else {
        toast({
          title: 'Conversion Failed',
          description: result.error || 'Failed to convert player',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error converting player:', error);
      toast({
        title: 'Error',
        description: 'Failed to convert player due to system error',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Revert phantom player back to regular
  const handleRevertPhantomPlayer = async (playerId: string, playerName: string) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to revert players',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Reverting phantom player:', { playerId, playerName });
      
      const result = await revertPhantomPlayer(playerId, user.id);

      if (result.success) {
        toast({
          title: 'Success!',
          description: `Successfully reverted ${playerName} to regular player`,
          variant: 'default'
        });
        
        // Refresh data
        await loadPlayers();
      } else {
        toast({
          title: 'Revert Failed',
          description: result.error || 'Failed to revert player',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error reverting player:', error);
      toast({
        title: 'Error',
        description: 'Failed to revert player due to system error',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  // Filter players by name search
  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(searchName.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Player Claiming Admin</h1>
        <Button onClick={loadPlayers} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Search Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Player Search</CardTitle>
            <CardDescription>Search for players by name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Player Name</label>
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g., Andreas Jonsson"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Email</label>
              <Input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="e.g., dreas.jonsson@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target User ID (optional)</label>
              <Input
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Leave empty to use current user"
              />
              <p className="text-xs text-muted-foreground">
                {user ? `Current user: ${user.id} (${user.email})` : 'Not logged in'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Claimable Player Search</CardTitle>
            <CardDescription>Find phantom players by email</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={searchClaimableByEmail} 
              disabled={isLoading}
              className="w-full"
            >
              Search Claimable Players
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{players.length}</div>
            <p className="text-sm text-muted-foreground">Total Players</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {players.filter(p => p.isPhantom).length}
            </div>
            <p className="text-sm text-muted-foreground">Phantom Players</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {players.filter(p => p.claimedByUserId).length}
            </div>
            <p className="text-sm text-muted-foreground">Claimed Players</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filteredPlayers.length}</div>
            <p className="text-sm text-muted-foreground">Search Matches</p>
          </CardContent>
        </Card>
      </div>

      {/* Claimable Results */}
      {claimableResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Claimable Players for {searchEmail}</CardTitle>
            <CardDescription>
              Players that can be claimed by this email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {claimableResults.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Rating: {player.currentRating} • Games: {player.gamesPlayed}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={player.isPhantom ? "secondary" : "default"}>
                        {player.isPhantom ? "Phantom" : "Regular"}
                      </Badge>
                      {player.claimedByUserId && (
                        <Badge variant="destructive">Claimed</Badge>
                      )}
                      {player.email && (
                        <Badge variant="outline">Has Email</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      onClick={() => handleManualClaim(player.id, player.name)}
                      disabled={!player.canClaim || isClaiming}
                      variant={player.canClaim ? "default" : "secondary"}
                    >
                      {isClaiming ? 'Claiming...' : 'Claim'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Player List */}
      <Card>
        <CardHeader>
          <CardTitle>All Players ({filteredPlayers.length})</CardTitle>
          <CardDescription>
            {searchName && `Filtered by: "${searchName}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading players...</div>
          ) : filteredPlayers.length === 0 ? (
            <Alert>
              <AlertDescription>
                No players found. The database might be empty or the search term doesn't match any players.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {filteredPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {player.id} • Rating: {player.rating} • W/L: {player.wins}/{player.losses}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={player.isPhantom ? "secondary" : "default"}>
                        {player.isPhantom ? "Phantom" : "Regular"}
                      </Badge>
                      {player.claimedByUserId && (
                        <Badge variant="destructive">
                          Claimed by {player.claimedByUserId}
                        </Badge>
                      )}
                      {player.email && (
                        <Badge variant="outline">{player.email}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-x-2">
                    {!player.isPhantom && !player.claimedByUserId && (
                      <Button
                        onClick={() => handleMakePlayerClaimable(player.id, player.name)}
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Converting...' : 'Make Claimable'}
                      </Button>
                    )}
                    {player.isPhantom && !player.claimedByUserId && (
                      <>
                        <Button
                          onClick={() => handleManualClaim(player.id, player.name)}
                          disabled={isClaiming}
                          size="sm"
                        >
                          {isClaiming ? 'Claiming...' : 'Claim'}
                        </Button>
                        <Button
                          onClick={() => handleRevertPhantomPlayer(player.id, player.name)}
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Reverting...' : 'Revert to Regular'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}