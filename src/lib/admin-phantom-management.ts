import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import { 
  createPhantomPlayer, 
  createPhantomPlayerBatch,
  getAllPhantomPlayersWithStatus,
  getPhantomPlayerStats,
  deletePhantomPlayer,
  updatePhantomPlayer,
  makePhantomPlayerClaimable
} from './phantom-players';
import { 
  getPlayerClaimLogs, 
  getClaimingStats, 
  unclaimPlayer 
} from './player-claiming';
import { 
  migrateExistingPlayersToPhantomSystem,
  validatePhantomPlayerMigration,
  rollbackPhantomPlayerMigration,
  getMigrationStatus
} from './database-migration';
import type { 
  Player, 
  PlayerWithClaimStatus, 
  PhantomPlayerCreationData,
  PlayerClaimLog 
} from './types';

/**
 * Admin Phantom Player Management System
 * 
 * This module provides comprehensive admin interfaces for managing phantom players,
 * including bulk operations, analytics, migration tools, and dispute resolution.
 */

export interface AdminPhantomDashboard {
  stats: {
    totalPhantom: number;
    claimable: number;
    anonymous: number;
    claimed: number;
    byCreator: Array<{ creatorId: string; count: number }>;
  };
  claimingStats: {
    totalClaimed: number;
    claimsToday: number;
    claimsThisWeek: number;
    topClaimers: Array<{ userId: string; claimCount: number }>;
    recentClaims: PlayerClaimLog[];
  };
  migrationStatus: {
    isMigrated: boolean;
    totalPlayers: number;
    phantomPlayers: number;
    claimedPlayers: number;
    regularPlayers: number;
  };
  recentActivity: PlayerClaimLog[];
}

/**
 * Get comprehensive admin dashboard data for phantom players
 */
export async function getAdminPhantomDashboard(): Promise<AdminPhantomDashboard> {
  try {
    logger.info('Fetching admin phantom player dashboard data');

    // Fetch all dashboard data in parallel
    const [stats, claimingStats, migrationStatus, recentActivity] = await Promise.all([
      getPhantomPlayerStats(),
      getClaimingStats(),
      getMigrationStatus(),
      getPlayerClaimLogs(20) // Get recent 20 activities
    ]);

    return {
      stats,
      claimingStats,
      migrationStatus,
      recentActivity
    };

  } catch (error) {
    logger.error('Error fetching admin phantom dashboard:', error);
    
    // Return safe defaults on error
    return {
      stats: {
        totalPhantom: 0,
        claimable: 0,
        anonymous: 0,
        claimed: 0,
        byCreator: []
      },
      claimingStats: {
        totalClaimed: 0,
        claimsToday: 0,
        claimsThisWeek: 0,
        topClaimers: [],
        recentClaims: []
      },
      migrationStatus: {
        isMigrated: false,
        totalPlayers: 0,
        phantomPlayers: 0,
        claimedPlayers: 0,
        regularPlayers: 0
      },
      recentActivity: []
    };
  }
}

/**
 * Admin function to get all phantom players with enhanced filtering
 */
export async function getAdminPhantomPlayers(filters?: {
  status?: 'all' | 'claimable' | 'anonymous' | 'claimed';
  createdBy?: string;
  orderBy?: 'name' | 'createdAt' | 'rating' | 'gamesPlayed';
  limit?: number;
}): Promise<{
  players: PlayerWithClaimStatus[];
  totalCount: number;
  filteredCount: number;
}> {
  try {
    const { 
      status = 'all', 
      createdBy, 
      orderBy: orderByField = 'createdAt', 
      limit: limitCount = 100 
    } = filters || {};

    logger.info('Fetching admin phantom players with filters', filters);

    // Get all phantom players with status
    const allPhantomPlayers = await getAllPhantomPlayersWithStatus();

    // Apply filters
    let filteredPlayers = allPhantomPlayers;

    if (status !== 'all') {
      filteredPlayers = filteredPlayers.filter(player => player.claimStatus === status);
    }

    if (createdBy) {
      filteredPlayers = filteredPlayers.filter(player => player.createdBy === createdBy);
    }

    // Sort players
    filteredPlayers.sort((a, b) => {
      switch (orderByField) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'createdAt':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'rating':
          return b.rating - a.rating;
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    // Apply limit
    const limitedPlayers = filteredPlayers.slice(0, limitCount);

    // Get game counts for each player (this would be expensive for large datasets)
    // For now, we'll add this as a separate operation when needed
    const enhancedPlayers = await Promise.all(
      limitedPlayers.map(async (player) => {
        // Could add game count here if needed
        return player;
      })
    );

    return {
      players: enhancedPlayers,
      totalCount: allPhantomPlayers.length,
      filteredCount: filteredPlayers.length
    };

  } catch (error) {
    logger.error('Error fetching admin phantom players:', error);
    return {
      players: [],
      totalCount: 0,
      filteredCount: 0
    };
  }
}

/**
 * Admin bulk creation of phantom players
 */
export async function adminBulkCreatePhantomPlayers(
  playersData: Array<{
    name: string;
    email?: string;
    avatar?: string;
  }>,
  createdBy: string
): Promise<{
  success: boolean;
  created: number;
  failed: number;
  errors: string[];
  details: {
    created: string[];
    failed: Array<{ name: string; error: string }>;
    duplicateEmails: string[];
  };
}> {
  try {
    logger.info(`Admin bulk creating ${playersData.length} phantom players`, { createdBy });

    // Convert to phantom player creation data
    const phantomPlayersData: PhantomPlayerCreationData[] = playersData.map(player => ({
      name: player.name,
      email: player.email,
      avatar: player.avatar,
      createdBy
    }));

    const result = await createPhantomPlayerBatch(phantomPlayersData);

    logger.info('Admin bulk creation completed', {
      created: result.created.length,
      failed: result.failed.length,
      createdBy
    });

    return {
      success: result.success,
      created: result.created.length,
      failed: result.failed.length,
      errors: result.failed.map(f => `${f.name}: ${f.error}`),
      details: {
        created: result.created,
        failed: result.failed,
        duplicateEmails: result.duplicateEmails
      }
    };

  } catch (error) {
    logger.error('Error in admin bulk phantom player creation:', error);
    return {
      success: false,
      created: 0,
      failed: playersData.length,
      errors: ['Bulk creation failed due to system error'],
      details: {
        created: [],
        failed: playersData.map(p => ({ name: p.name, error: 'System error' })),
        duplicateEmails: []
      }
    };
  }
}

/**
 * Admin function to migrate existing players to phantom system
 */
export async function adminMigrateToPhantomSystem(
  performMigration: boolean = false
): Promise<{
  success: boolean;
  migrationResult?: any;
  validationResult?: any;
  error?: string;
}> {
  try {
    logger.info('Admin phantom system migration requested', { performMigration });

    if (performMigration) {
      // Perform the actual migration
      const migrationResult = await migrateExistingPlayersToPhantomSystem();
      
      if (!migrationResult.success) {
        return {
          success: false,
          migrationResult,
          error: 'Migration failed: ' + migrationResult.errors.join(', ')
        };
      }

      // Validate the migration
      const validationResult = await validatePhantomPlayerMigration();
      
      return {
        success: validationResult.isValid,
        migrationResult,
        validationResult,
        error: validationResult.isValid ? undefined : 'Migration validation failed'
      };

    } else {
      // Just return validation of current state
      const validationResult = await validatePhantomPlayerMigration();
      const migrationStatus = await getMigrationStatus();
      
      return {
        success: true,
        validationResult,
        migrationResult: migrationStatus
      };
    }

  } catch (error) {
    logger.error('Error in admin phantom system migration:', error);
    return {
      success: false,
      error: 'Migration failed due to system error'
    };
  }
}

/**
 * Admin dispute resolution - unclaim a player
 */
export async function adminUnclaimPlayer(
  playerId: string,
  adminUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.warn('Admin unclaiming player', { playerId, adminUserId, reason });

    const result = await unclaimPlayer(playerId, adminUserId, reason);
    
    if (result.success) {
      logger.info('Player successfully unclaimed by admin', { playerId, adminUserId });
    }

    return result;

  } catch (error) {
    logger.error('Error in admin unclaim player:', error);
    return {
      success: false,
      error: 'Failed to unclaim player'
    };
  }
}

/**
 * Admin function to delete phantom player
 */
export async function adminDeletePhantomPlayer(
  playerId: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.warn('Admin deleting phantom player', { playerId, adminUserId });

    const result = await deletePhantomPlayer(playerId, adminUserId);
    
    if (result.success) {
      logger.info('Phantom player successfully deleted by admin', { playerId, adminUserId });
    }

    return result;

  } catch (error) {
    logger.error('Error in admin delete phantom player:', error);
    return {
      success: false,
      error: 'Failed to delete phantom player'
    };
  }
}

/**
 * Admin function to update phantom player
 */
export async function adminUpdatePhantomPlayer(
  playerId: string,
  updates: { name?: string; avatar?: string },
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Admin updating phantom player', { playerId, updates, adminUserId });

    const result = await updatePhantomPlayer(playerId, updates, adminUserId);
    
    if (result.success) {
      logger.info('Phantom player successfully updated by admin', { playerId, adminUserId });
    }

    return result;

  } catch (error) {
    logger.error('Error in admin update phantom player:', error);
    return {
      success: false,
      error: 'Failed to update phantom player'
    };
  }
}

/**
 * Admin function to make phantom player claimable
 */
export async function adminMakePhantomPlayerClaimable(
  playerId: string,
  email: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Admin making phantom player claimable', { playerId, email, adminUserId });

    const result = await makePhantomPlayerClaimable(playerId, email, adminUserId);
    
    if (result.success) {
      logger.info('Phantom player successfully made claimable by admin', { playerId, email, adminUserId });
    }

    return result;

  } catch (error) {
    logger.error('Error in admin make phantom player claimable:', error);
    return {
      success: false,
      error: 'Failed to make phantom player claimable'
    };
  }
}

/**
 * Admin function to search phantom players by various criteria
 */
export async function adminSearchPhantomPlayers(searchCriteria: {
  name?: string;
  email?: string;
  createdBy?: string;
  status?: 'claimable' | 'anonymous' | 'claimed';
}): Promise<{
  success: boolean;
  players: PlayerWithClaimStatus[];
  totalFound: number;
  error?: string;
}> {
  try {
    logger.info('Admin searching phantom players', searchCriteria);

    const { name, email, createdBy, status } = searchCriteria;

    // Get all phantom players first (in a real implementation, this would be optimized with database queries)
    const allPhantomPlayers = await getAllPhantomPlayersWithStatus();

    // Filter based on search criteria
    let filteredPlayers = allPhantomPlayers;

    if (name) {
      const nameSearch = name.toLowerCase();
      filteredPlayers = filteredPlayers.filter(player => 
        player.name.toLowerCase().includes(nameSearch)
      );
    }

    if (email) {
      const emailSearch = email.toLowerCase();
      filteredPlayers = filteredPlayers.filter(player => 
        player.email?.toLowerCase().includes(emailSearch)
      );
    }

    if (createdBy) {
      filteredPlayers = filteredPlayers.filter(player => 
        player.createdBy === createdBy
      );
    }

    if (status) {
      filteredPlayers = filteredPlayers.filter(player => 
        player.claimStatus === status
      );
    }

    logger.info(`Admin search found ${filteredPlayers.length} phantom players`);

    return {
      success: true,
      players: filteredPlayers,
      totalFound: filteredPlayers.length
    };

  } catch (error) {
    logger.error('Error in admin search phantom players:', error);
    return {
      success: false,
      players: [],
      totalFound: 0,
      error: 'Search failed due to system error'
    };
  }
}

/**
 * Admin function to export phantom players data
 */
export async function adminExportPhantomPlayersData(format: 'json' | 'csv' = 'json'): Promise<{
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}> {
  try {
    logger.info('Admin exporting phantom players data', { format });

    const phantomPlayers = await getAllPhantomPlayersWithStatus();
    
    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(phantomPlayers, null, 2),
        filename: `phantom-players-${new Date().toISOString().split('T')[0]}.json`
      };
    } else {
      // CSV format
      const headers = [
        'ID', 'Name', 'Email', 'Rating', 'Wins', 'Losses', 'Points For', 'Points Against',
        'Is Phantom', 'Claim Status', 'Created By', 'Created At', 'Claimed By', 'Claimed At'
      ];

      const csvRows = phantomPlayers.map(player => [
        player.id,
        `"${player.name}"`,
        player.email || '',
        player.rating,
        player.wins,
        player.losses,
        player.pointsFor,
        player.pointsAgainst,
        player.isPhantom,
        player.claimStatus,
        player.createdBy || '',
        player.createdAt || '',
        player.claimedByUserId || '',
        player.claimedAt || ''
      ]);

      const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

      return {
        success: true,
        data: csvContent,
        filename: `phantom-players-${new Date().toISOString().split('T')[0]}.csv`
      };
    }

  } catch (error) {
    logger.error('Error in admin export phantom players data:', error);
    return {
      success: false,
      error: 'Export failed due to system error'
    };
  }
}

/**
 * Admin function to get phantom player analytics
 */
export async function getAdminPhantomAnalytics(days: number = 30): Promise<{
  creationTrends: Array<{ date: string; created: number; claimed: number }>;
  topCreators: Array<{ userId: string; userName?: string; count: number }>;
  claimingTrends: Array<{ date: string; claims: number }>;
  emailDomains: Array<{ domain: string; count: number }>;
}> {
  try {
    logger.info(`Getting admin phantom analytics for ${days} days`);

    // This is a placeholder implementation
    // In a real system, this would query the database for time-based analytics
    
    return {
      creationTrends: [],
      topCreators: [],
      claimingTrends: [],
      emailDomains: []
    };

  } catch (error) {
    logger.error('Error getting admin phantom analytics:', error);
    return {
      creationTrends: [],
      topCreators: [],
      claimingTrends: [],
      emailDomains: []
    };
  }
}