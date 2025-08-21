'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Circle, 
  UserPlus, 
  UserMinus, 
  RefreshCw,
  Settings,
  ChevronDown,
  CheckSquare,
  Square
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
  getAllCirclesWithStats,
  getPlayersWithCircleInfo,
  addPlayerToCircle,
  removePlayerFromCircle,
  bulkAssignPlayersToCircle,
  getCircleManagementStats
} from '@/lib/admin-circle-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import type { Player, Circle as CircleType } from '@/lib/types';

interface PlayerWithCircles extends Player {
  circleIds: string[];
  circleNames: string[];
}

interface CircleStats {
  totalCircles: number;
  totalMemberships: number;
  playersWithCircles: number;
  playersWithoutCircles: number;
  averageMembersPerCircle: number;
}

export function AdminCircleManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [circles, setCircles] = useState<CircleType[]>([]);
  const [players, setPlayers] = useState<PlayerWithCircles[]>([]);
  const [stats, setStats] = useState<CircleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // UI state
  const [selectedCircle, setSelectedCircle] = useState<string>('');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isCircleListOpen, setIsCircleListOpen] = useState(false);
  const [isPlayerListOpen, setIsPlayerListOpen] = useState(false);

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);
      const [circlesData, playersData, statsData] = await Promise.all([
        getAllCirclesWithStats(),
        getPlayersWithCircleInfo(),
        getCircleManagementStats()
      ]);
      
      setCircles(circlesData);
      setPlayers(playersData);
      setStats(statsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load circle management data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddPlayerToCircle = async (playerId: string, circleId: string) => {
    if (!user) return;

    try {
      setOperationLoading(true);
      const result = await addPlayerToCircle(playerId, circleId, user.id);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        await loadData(); // Refresh data
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add player to circle',
        variant: 'destructive',
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleRemovePlayerFromCircle = async (playerId: string, circleId: string) => {
    if (!user) return;

    try {
      setOperationLoading(true);
      const result = await removePlayerFromCircle(playerId, circleId, user.id);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        await loadData(); // Refresh data
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove player from circle',
        variant: 'destructive',
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleBulkAssign = async (replace: boolean = false) => {
    if (!user || !selectedCircle || selectedPlayers.size === 0) return;

    try {
      setOperationLoading(true);
      const result = await bulkAssignPlayersToCircle(
        Array.from(selectedPlayers),
        selectedCircle,
        user.id,
        replace
      );
      
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        setSelectedPlayers(new Set());
        await loadData(); // Refresh data
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to bulk assign players',
        variant: 'destructive',
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    const newSelection = new Set(selectedPlayers);
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else {
      newSelection.add(playerId);
    }
    setSelectedPlayers(newSelection);
  };

  const selectAllPlayers = () => {
    setSelectedPlayers(new Set(players.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedPlayers(new Set());
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Circle className="h-5 w-5 mr-2" />
            Circle Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedCircleData = circles.find(c => c.id === selectedCircle);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Circle className="h-5 w-5 mr-2" />
            Circle Management
          </div>
          <Button 
            onClick={loadData} 
            disabled={loading || operationLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Directly manage player memberships in circles. Bypass the invitation system for quick setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCircles}</div>
              <div className="text-xs text-muted-foreground">Circles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalMemberships}</div>
              <div className="text-xs text-muted-foreground">Memberships</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.playersWithCircles}</div>
              <div className="text-xs text-muted-foreground">Players in Circles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.playersWithoutCircles}</div>
              <div className="text-xs text-muted-foreground">Unassigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.averageMembersPerCircle}</div>
              <div className="text-xs text-muted-foreground">Avg per Circle</div>
            </div>
          </div>
        )}

        {/* Bulk Assignment */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Bulk Player Assignment</h3>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedCircle} onValueChange={setSelectedCircle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a circle..." />
                </SelectTrigger>
                <SelectContent>
                  {circles.map((circle) => (
                    <SelectItem key={circle.id} value={circle.id}>
                      <div className="flex items-center gap-2">
                        <span>{circle.name}</span>
                        <Badge variant="outline">{circle.memberCount} members</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => handleBulkAssign(false)}
                disabled={!selectedCircle || selectedPlayers.size === 0 || operationLoading}
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Selected ({selectedPlayers.size})
              </Button>
              
              <Button
                onClick={() => handleBulkAssign(true)}
                disabled={!selectedCircle || selectedPlayers.size === 0 || operationLoading}
                size="sm"
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Replace All
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={selectAllPlayers} variant="outline" size="sm">
              Select All Players
            </Button>
            <Button onClick={clearSelection} variant="outline" size="sm">
              Clear Selection
            </Button>
          </div>
        </div>

        {/* Current Circles List */}
        <Collapsible open={isCircleListOpen} onOpenChange={setIsCircleListOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center">
                <Circle className="h-4 w-4 mr-2" />
                View All Circles ({circles.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isCircleListOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-4">
            {circles.map((circle) => (
              <div key={circle.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <div className="font-medium">{circle.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {circle.description || 'No description'}
                  </div>
                </div>
                <Badge variant="outline">{circle.memberCount} members</Badge>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Players List */}
        <Collapsible open={isPlayerListOpen} onOpenChange={setIsPlayerListOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                View All Players ({players.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isPlayerListOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-4 max-h-96 overflow-y-auto">
            {players.map((player) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedPlayers.has(player.id)}
                    onCheckedChange={() => togglePlayerSelection(player.id)}
                  />
                  <div>
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {player.circleNames.length > 0 
                        ? `Circles: ${player.circleNames.join(', ')}`
                        : 'No circles'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={player.circleIds.length > 0 ? 'default' : 'secondary'}>
                    {player.circleIds.length} circles
                  </Badge>
                  
                  {selectedCircle && (
                    <div className="flex gap-1">
                      {player.circleIds.includes(selectedCircle) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemovePlayerFromCircle(player.id, selectedCircle)}
                          disabled={operationLoading}
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAddPlayerToCircle(player.id, selectedCircle)}
                          disabled={operationLoading}
                        >
                          <UserPlus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Instructions */}
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            <strong>Quick Setup:</strong> Select a circle above, then use checkboxes to select players and click "Add Selected" 
            to quickly assign multiple players. Use "Replace All" to completely replace a circle's membership.
          </AlertDescription>
        </Alert>

      </CardContent>
    </Card>
  );
}