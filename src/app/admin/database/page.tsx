'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { AuthWrapper } from '@/components/auth-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useInvalidatePlayers } from '@/hooks/use-players';
import { useInvalidateGames } from '@/hooks/use-games';
import { useQueryClient } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  Database, 
  Trash2, 
  RefreshCw, 
  Users,
  Gamepad2,
  Trophy,
  AlertCircle
} from 'lucide-react';
import { 
  nukeDatabaseCompletely, 
  deduplicatePlayers, 
  initializeFreshDatabase, 
  getDatabaseStats,
  compressPlayerRatings,
  rollbackRatingCompression,
  getRatingBackups
} from '@/lib/database-admin';
import {
  analyzeDatabaseIntegrity,
  nuclearDatabaseReset,
  cleanupOrphanedReferences
} from '@/lib/database-forensics';
import { AdminCircleManagement } from '@/components/admin-circle-management';

interface DatabaseStats {
  players: number;
  games: number;
  tournaments: number;
  duplicateNames: string[];
}

interface ForensicsResult {
  collections: { [key: string]: { documentCount: number; sampleDocuments: any[] } };
  integrityIssues: string[];
  orphanedReferences: {
    gamesWithMissingPlayers: string[];
    tournamentsWithMissingPlayers: string[];
  };
}

function DatabaseAdminContent() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [forensics, setForensics] = useState<ForensicsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmNuke, setConfirmNuke] = useState(false);
  const [confirmNuclear, setConfirmNuclear] = useState(false);
  const [confirmCompress, setConfirmCompress] = useState(false);
  const [compressionFactor, setCompressionFactor] = useState(0.6);
  const [compressionPreview, setCompressionPreview] = useState<any>(null);
  const [ratingBackups, setRatingBackups] = useState<any[]>([]);
  const { toast } = useToast();
  const { refetchAll: refetchPlayers } = useInvalidatePlayers();
  const { invalidateAll: invalidateGames } = useInvalidateGames();
  const queryClient = useQueryClient();

  // Clear all React Query caches
  const clearAllCaches = () => {
    queryClient.clear(); // Nuclear option - clears everything
    queryClient.resetQueries(); // Reset all queries to initial state
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const newStats = await getDatabaseStats();
      setStats(newStats);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load database stats'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeduplication = async () => {
    setLoading(true);
    try {
      const result = await deduplicatePlayers();
      if (result.success) {
        // Clear all caches after deduplication
        clearAllCaches();
        
        toast({
          title: 'Success',
          description: result.message + ' Please refresh other pages to see changes.'
        });
        await loadStats(); // Refresh stats
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Deduplication failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNuke = async () => {
    if (!confirmNuke) {
      setConfirmNuke(true);
      setTimeout(() => setConfirmNuke(false), 5000); // Reset after 5 seconds
      return;
    }

    setLoading(true);
    try {
      const result = await nukeDatabaseCompletely();
      if (result.success) {
        // CRITICAL: Clear all caches after database wipe
        clearAllCaches();
        
        toast({
          title: 'Database Wiped',
          description: result.message + ' All caches cleared. Please refresh other pages.'
        });
        setConfirmNuke(false);
        await loadStats(); // Refresh stats
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Database wipe failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setLoading(true);
    try {
      const result = await initializeFreshDatabase();
      if (result.success) {
        // Clear caches and refetch fresh data
        clearAllCaches();
        
        toast({
          title: 'Database Initialized',
          description: result.message + ' Caches cleared. Please refresh other pages.'
        });
        await loadStats(); // Refresh stats
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Database initialization failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForensics = async () => {
    setLoading(true);
    try {
      const result = await analyzeDatabaseIntegrity();
      setForensics(result);
      toast({
        title: 'Forensics Complete',
        description: `Found ${Object.keys(result.collections).length} collections and ${result.integrityIssues.length} issues`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Forensics Failed',
        description: error instanceof Error ? error.message : 'Database analysis failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNuclear = async () => {
    if (!confirmNuclear) {
      setConfirmNuclear(true);
      setTimeout(() => setConfirmNuclear(false), 5000);
      return;
    }

    setLoading(true);
    try {
      const result = await nuclearDatabaseReset();
      if (result.success) {
        clearAllCaches();
        toast({
          title: 'NUCLEAR RESET COMPLETE',
          description: result.message + ' All caches cleared.'
        });
        setConfirmNuclear(false);
        setForensics(null);
        await loadStats();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Nuclear Reset Failed',
        description: error instanceof Error ? error.message : 'Nuclear reset failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOrphans = async () => {
    setLoading(true);
    try {
      const result = await cleanupOrphanedReferences();
      if (result.success) {
        clearAllCaches();
        toast({
          title: 'Cleanup Complete',
          description: result.message + ' Caches cleared.'
        });
        await loadStats();
        if (forensics) {
          await handleForensics(); // Refresh forensics
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Cleanup Failed',
        description: error instanceof Error ? error.message : 'Orphan cleanup failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompressionPreview = async () => {
    setLoading(true);
    try {
      const result = await compressPlayerRatings(compressionFactor, true); // dry run
      if (result.success) {
        setCompressionPreview(result);
        toast({
          title: 'Preview Generated',
          description: `Would affect ${result.stats.playersAffected} players`
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Preview Failed',
        description: error instanceof Error ? error.message : 'Failed to generate preview'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRatingCompression = async () => {
    if (!confirmCompress) {
      setConfirmCompress(true);
      setTimeout(() => setConfirmCompress(false), 5000);
      return;
    }

    setLoading(true);
    try {
      const result = await compressPlayerRatings(compressionFactor, false); // actual run
      if (result.success) {
        clearAllCaches();
        toast({
          title: 'Ratings Compressed!',
          description: result.message + ' Caches cleared.'
        });
        setConfirmCompress(false);
        setCompressionPreview(null);
        await loadStats();
        await loadBackups();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Compression Failed',
        description: error instanceof Error ? error.message : 'Rating compression failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRatingRollback = async (backupId: string) => {
    setLoading(true);
    try {
      const result = await rollbackRatingCompression(backupId);
      if (result.success) {
        clearAllCaches();
        toast({
          title: 'Ratings Restored!',
          description: result.message + ' Caches cleared.'
        });
        await loadStats();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Rollback Failed',
        description: error instanceof Error ? error.message : 'Rating rollback failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      const backups = await getRatingBackups();
      setRatingBackups(backups);
    } catch (error) {
      console.error('Failed to load rating backups:', error);
    }
  };

  // Load stats and backups on component mount
  React.useEffect(() => {
    loadStats();
    loadBackups();
  }, []);

  return (
    <>
      <PageHeader 
        title="Database Administration" 
        description="Manage database integrity and fix data inconsistencies"
      >
        <Button onClick={loadStats} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </PageHeader>

      <div className="space-y-8">
        {/* Circle Management */}
        <AdminCircleManagement />

        {/* Database Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Database Statistics
            </CardTitle>
            <CardDescription>
              Current database state and integrity information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Players:</span>
                  <Badge variant="outline">{stats.players}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Gamepad2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Games:</span>
                  <Badge variant="outline">{stats.games}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">Tournaments:</span>
                  <Badge variant="outline">{stats.tournaments}</Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">Loading stats...</div>
            )}

            {stats && stats.duplicateNames.length > 0 && (
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Duplicate Players Found:</strong> {stats.duplicateNames.join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Manual Cache Clear */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              Cache Management
            </CardTitle>
            <CardDescription>
              Clear React Query cache if old data persists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                clearAllCaches();
                toast({
                  title: 'Cache Cleared',
                  description: 'All cached data has been cleared. Please refresh pages to see changes.'
                });
              }}
              variant="outline"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Caches
            </Button>
          </CardContent>
        </Card>

        {/* Rating Compression Section */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <Users className="h-5 w-5 mr-2" />
              Rating Compression
            </CardTitle>
            <CardDescription>
              Shrink the rating gap between players while maintaining relative skill differences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Compression Factor Input */}
            <div className="flex items-center space-x-4">
              <label htmlFor="compressionFactor" className="text-sm font-medium">
                Compression Factor:
              </label>
              <input
                id="compressionFactor"
                type="number"
                min="0.1"
                max="1.0"
                step="0.1"
                value={compressionFactor}
                onChange={(e) => setCompressionFactor(parseFloat(e.target.value))}
                className="w-20 px-2 py-1 border rounded text-center"
              />
              <span className="text-xs text-muted-foreground">
                (0.6 = 40% compression, 1.0 = no change)
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handleCompressionPreview}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Preview Changes
              </Button>
              
              <Button 
                onClick={handleRatingCompression}
                disabled={loading || !compressionPreview}
                variant={confirmCompress ? "destructive" : "default"}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                {confirmCompress ? 'CONFIRM COMPRESS' : 'Compress Ratings'}
              </Button>
            </div>

            {confirmCompress && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>RATING COMPRESSION:</strong> This will permanently modify all player ratings. 
                  A backup will be created automatically. Click again to confirm.
                </AlertDescription>
              </Alert>
            )}

            {/* Compression Preview */}
            {compressionPreview && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Preview Results:</span>
                  <Badge variant="outline">
                    {compressionPreview.stats.playersAffected} players affected
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Average Rating:</span>
                    <div>{compressionPreview.stats.avgOldRating} → {compressionPreview.stats.avgNewRating}</div>
                  </div>
                  <div>
                    <span className="font-medium">Compression Factor:</span>
                    <div>{compressionFactor} (toward 3.5)</div>
                  </div>
                </div>

                {/* Show extreme cases */}
                <div className="space-y-2">
                  <span className="font-medium text-sm">Biggest Changes:</span>
                  <div className="max-h-32 overflow-y-auto text-xs">
                    {compressionPreview.changes
                      .sort((a: any, b: any) => Math.abs(b.change) - Math.abs(a.change))
                      .slice(0, 5)
                      .map((change: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>{change.name}</span>
                          <span className={change.change > 0 ? 'text-green-600' : 'text-red-600'}>
                            {change.oldRating} → {change.newRating} ({change.change >= 0 ? '+' : ''}{change.change})
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rating Backups */}
            {ratingBackups.length > 0 && (
              <div className="mt-6 space-y-4">
                <span className="font-medium">Available Backups:</span>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {ratingBackups.slice(0, 3).map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between text-sm border rounded p-2">
                      <div>
                        <div className="font-medium">
                          {new Date(backup.timestamp).toLocaleDateString()} {new Date(backup.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {backup.playerCount} players • Factor: {backup.compressionFactor || 'N/A'}
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleRatingRollback(backup.id)}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Forensics Section */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Database Forensics Analysis
            </CardTitle>
            <CardDescription>
              Deep analysis of database integrity and orphaned references
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={handleForensics}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Analyze Database
              </Button>
              
              <Button 
                onClick={handleCleanupOrphans}
                disabled={loading || !forensics}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Cleanup Orphans
              </Button>
              
              <Button 
                onClick={handleNuclear}
                disabled={loading}
                variant={confirmNuclear ? "destructive" : "outline"}
                className="w-full border-red-300"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {confirmNuclear ? 'CONFIRM NUCLEAR' : 'Nuclear Reset'}
              </Button>
            </div>
            
            {confirmNuclear && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>NUCLEAR RESET:</strong> This will delete ALL collections found in the database, 
                  including any hidden ones. This is more thorough than the regular wipe. Click again to confirm.
                </AlertDescription>
              </Alert>
            )}

            {/* Forensics Results */}
            {forensics && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center">
                  <Database className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="font-medium">Collections Found:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {Object.entries(forensics.collections).map(([name, info]) => (
                    <div key={name} className="flex items-center space-x-2 text-sm">
                      <Badge variant="outline">{name}</Badge>
                      <span className="text-muted-foreground">{info.documentCount} docs</span>
                    </div>
                  ))}
                </div>
                
                {forensics.integrityIssues.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Integrity Issues Found:</strong>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        {forensics.integrityIssues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                {(forensics.orphanedReferences.gamesWithMissingPlayers.length > 0 || 
                  forensics.orphanedReferences.tournamentsWithMissingPlayers.length > 0) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Orphaned References Found:</strong>
                      {forensics.orphanedReferences.gamesWithMissingPlayers.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium">Games with missing players:</div>
                          <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                            {forensics.orphanedReferences.gamesWithMissingPlayers.slice(0, 3).map((ref, index) => (
                              <li key={index}>{ref}</li>
                            ))}
                            {forensics.orphanedReferences.gamesWithMissingPlayers.length > 3 && (
                              <li>... and {forensics.orphanedReferences.gamesWithMissingPlayers.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {forensics.orphanedReferences.tournamentsWithMissingPlayers.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium">Tournaments with missing players:</div>
                          <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                            {forensics.orphanedReferences.tournamentsWithMissingPlayers.slice(0, 3).map((ref, index) => (
                              <li key={index}>{ref}</li>
                            ))}
                            {forensics.orphanedReferences.tournamentsWithMissingPlayers.length > 3 && (
                              <li>... and {forensics.orphanedReferences.tournamentsWithMissingPlayers.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                {forensics.integrityIssues.length === 0 && 
                 forensics.orphanedReferences.gamesWithMissingPlayers.length === 0 &&
                 forensics.orphanedReferences.tournamentsWithMissingPlayers.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Database Integrity Check Passed:</strong> No orphaned references or integrity issues found.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Deduplication */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Remove Duplicates</CardTitle>
              <CardDescription>
                Remove duplicate players with the same name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleDeduplication} 
                disabled={loading}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Deduplicate Players
              </Button>
            </CardContent>
          </Card>

          {/* Initialize Database */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Initialize Fresh Data</CardTitle>
              <CardDescription>
                Add seed players and games (only if empty)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleInitialize} 
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Initialize Database
              </Button>
            </CardContent>
          </Card>

          {/* Nuclear Option */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Reset Everything</CardTitle>
              <CardDescription>
                ⚠️ DANGER: Completely wipe all data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleNuke} 
                disabled={loading}
                variant={confirmNuke ? "destructive" : "outline"}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {confirmNuke ? 'CONFIRM WIPE' : 'Wipe Database'}
              </Button>
              {confirmNuke && (
                <Alert className="mt-2" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Click again to permanently delete ALL data
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Recovery Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>To fix database consistency issues (old players resurrecting):</strong>
            </p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li><strong>First:</strong> Use "Analyze Database" to identify orphaned references and integrity issues</li>
              <li>If orphaned references found, use "Cleanup Orphans" to fix them</li>
              <li>If problems persist, try "Remove Duplicates" to clean existing data</li>
              <li><strong>Nuclear Option:</strong> Use "Nuclear Reset" for complete database reconstruction (⚠️ destroys ALL data including hidden collections)</li>
              <li>After nuclear reset, use "Initialize Database" to add fresh seed players</li>
              <li><strong>IMPORTANT:</strong> Always use "Clear All Caches" after any database operation</li>
              <li>Refresh all browser tabs/pages to see changes</li>
            </ol>
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Root Cause:</strong> Old players "resurrect" due to orphaned references in games/tournaments. 
                The forensic analysis will identify these and the cleanup tools will fix them. 
                If issues persist, Nuclear Reset is more thorough than regular Wipe.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function DatabaseAdminPage() {
  return (
    <AuthWrapper adminOnly={true}>
      <DatabaseAdminContent />
    </AuthWrapper>
  );
}