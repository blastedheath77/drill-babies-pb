import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import { searchClaimablePlayersByEmail } from './phantom-players';
import { logPhantomPlayerClaimed, logPhantomPlayerUnclaimed } from './audit-trail';
import type { 
  Player, 
  PlayerClaimRequest, 
  PlayerClaimLog,
  User
} from './types';

/**
 * Player Claiming System
 * 
 * This module handles the claiming of phantom players by users during registration
 * or after account creation. Includes validation, audit trails, and security checks.
 */

/**
 * Claims a phantom player for a user with full validation and atomic transaction
 */
export async function claimPlayer(
  claimRequest: PlayerClaimRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔍 CLAIM PLAYER START:', claimRequest);
    logger.info(`Attempting to claim player ${claimRequest.playerId} for user ${claimRequest.userId}`);

    // Validate claim request
    console.log('⚡ Starting validation...');
    const validation = await validatePlayerClaim(
      claimRequest.userId,
      claimRequest.playerId,
      claimRequest.email
    );
    console.log('🔒 Validation result:', validation);

    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.error);
      return { success: false, error: validation.error };
    }

    // Perform atomic claim transaction
    console.log('⚛️ Starting transaction...');
    const result = await runTransaction(db, async (transaction) => {
      // Re-fetch and verify player in transaction
      const playerRef = doc(db, 'players', claimRequest.playerId);
      const playerDoc = await transaction.get(playerRef);

      if (!playerDoc.exists()) {
        console.error('❌ Player not found in transaction:', claimRequest.playerId);
        throw new Error('Player not found');
      }

      const playerData = playerDoc.data() as Player;
      console.log('📄 Player data in transaction:', { 
        id: claimRequest.playerId, 
        name: playerData.name,
        email: playerData.email,
        isPhantom: playerData.isPhantom,
        claimedByUserId: playerData.claimedByUserId 
      });

      // Double-check claiming conditions in transaction
      if (!playerData.isPhantom) {
        console.error('❌ Player is not phantom:', { playerId: claimRequest.playerId, isPhantom: playerData.isPhantom });
        throw new Error('Player is not a phantom player');
      }

      if (playerData.claimedByUserId) {
        console.error('❌ Player already claimed:', { playerId: claimRequest.playerId, claimedBy: playerData.claimedByUserId });
        throw new Error('Player has already been claimed');
      }

      const requestEmail = claimRequest.email.toLowerCase().trim();
      if (!playerData.email || playerData.email !== requestEmail) {
        console.error('❌ Email mismatch:', { 
          playerId: claimRequest.playerId,
          playerEmail: playerData.email, 
          requestEmail: requestEmail 
        });
        throw new Error('Email does not match phantom player email');
      }

      // Get user information for audit log
      const userRef = doc(db, 'users', claimRequest.userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data() as any;

      // Update player with claim information and consolidate name
      const claimUpdate = {
        claimedByUserId: claimRequest.userId,
        claimedAt: new Date().toISOString(),
        isPhantom: false, // Player is no longer phantom once claimed
        name: userData.name || userData.email.split('@')[0], // Consolidate to user's name
      };

      console.log('💾 Updating player with claim data and name consolidation:', { 
        playerId: claimRequest.playerId, 
        claimUpdate,
        originalPhantomName: playerData.name,
        newConsolidatedName: userData.name,
        nameChanged: playerData.name !== userData.name
      });
      transaction.update(playerRef, claimUpdate);

      // Create audit log entry
      const auditLog: Omit<PlayerClaimLog, 'id'> = {
        playerId: claimRequest.playerId,
        playerName: userData.name || userData.email.split('@')[0], // Use consolidated name
        claimedByUserId: claimRequest.userId,
        claimedByUserName: userData.name || userData.email,
        claimedAt: new Date().toISOString(),
        originalEmail: playerData.email,
      };

      const auditRef = doc(collection(db, 'playerClaimLogs'));
      transaction.set(auditRef, auditLog);

      return { 
        success: true, 
        playerData: playerData, 
        userData: userData 
      };
    });

    console.log('🎉 CLAIM TRANSACTION COMPLETED:', { playerId: claimRequest.playerId, userId: claimRequest.userId, success: result.success });
    logger.info(`Player ${claimRequest.playerId} successfully claimed by user ${claimRequest.userId}`);
    
    // Log audit event after successful transaction
    if (result.success && result.playerData && result.userData) {
      try {
        await logPhantomPlayerClaimed(
          claimRequest.playerId,
          result.playerData.name,
          claimRequest.userId,
          result.playerData.email || claimRequest.email,
          result.playerData.wins + result.playerData.losses
        );
        console.log('✅ Audit event logged successfully');
      } catch (auditError) {
        console.warn('⚠️ Failed to log audit event (non-critical):', auditError);
        // Don't throw - audit logging failure shouldn't affect claiming
      }
    }
    
    return { success: result.success };

  } catch (error) {
    logger.error('Error claiming player:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to claim player'
    };
  }
}

/**
 * Validates whether a user can claim a specific phantom player
 */
export async function validatePlayerClaim(
  userId: string,
  playerId: string,
  email: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!userId || !playerId || !email) {
      return { isValid: false, error: 'Missing required claim information' };
    }

    // Check if user exists
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { isValid: false, error: 'User not found' };
    }

    // Check if player exists
    const playerDoc = await getDoc(doc(db, 'players', playerId));
    if (!playerDoc.exists()) {
      return { isValid: false, error: 'Player not found' };
    }

    const playerData = playerDoc.data() as Player;

    // Validate phantom player conditions
    if (!playerData.isPhantom) {
      return { isValid: false, error: 'Player is not a phantom player' };
    }

    if (playerData.claimedByUserId) {
      return { isValid: false, error: 'Player has already been claimed' };
    }

    if (!playerData.email) {
      return { isValid: false, error: 'Player does not have an email for claiming' };
    }

    // Validate email match
    const normalizedEmail = email.toLowerCase().trim();
    if (playerData.email !== normalizedEmail) {
      return { isValid: false, error: 'Email does not match player email' };
    }

    // Check if user has already claimed this player (shouldn't happen, but safety check)
    if (playerData.claimedByUserId === userId) {
      return { isValid: false, error: 'You have already claimed this player' };
    }

    // Check if user has reached claiming limits (optional business rule)
    const userClaimedCount = await getUserClaimedPlayersCount(userId);
    const MAX_CLAIMS_PER_USER = 10; // Configurable business rule

    if (userClaimedCount >= MAX_CLAIMS_PER_USER) {
      return { 
        isValid: false, 
        error: `You have reached the maximum limit of ${MAX_CLAIMS_PER_USER} claimed players` 
      };
    }

    return { isValid: true };

  } catch (error) {
    logger.error('Error validating player claim:', error);
    return { 
      isValid: false, 
      error: 'Validation failed due to system error' 
    };
  }
}

/**
 * Gets all players claimed by a specific user
 */
export async function getPlayersByClaimedUser(userId: string): Promise<Player[]> {
  try {
    const claimedQuery = query(
      collection(db, 'players'),
      where('claimedByUserId', '==', userId),
      orderBy('claimedAt', 'desc')
    );

    const snapshot = await getDocs(claimedQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const { nameLower, ...cleanData } = data;
      return { id: doc.id, ...cleanData } as Player;
    });
  } catch (error) {
    logger.error('Error fetching players by claimed user:', error);
    return [];
  }
}

/**
 * Gets count of players claimed by a user (for limits)
 */
export async function getUserClaimedPlayersCount(userId: string): Promise<number> {
  try {
    const claimedQuery = query(
      collection(db, 'players'),
      where('claimedByUserId', '==', userId)
    );

    const snapshot = await getDocs(claimedQuery);
    return snapshot.docs.length;
  } catch (error) {
    logger.error('Error getting user claimed players count:', error);
    return 0;
  }
}

/**
 * Searches for claimable players by email and returns detailed claim information
 */
export async function findClaimablePlayersForUser(email: string): Promise<{
  players: Array<Player & { 
    canClaim: boolean; 
    claimError?: string;
    gamesPlayed: number;
    currentRating: number;
  }>;
  totalFound: number;
}> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    logger.info(`Finding claimable players for email: ${normalizedEmail}`);

    // Get phantom players with this email
    const phantomPlayers = await searchClaimablePlayersByEmail(normalizedEmail);
    
    // Enhance each player with claim status and game statistics
    const enhancedPlayers = await Promise.all(
      phantomPlayers.map(async (player) => {
        // Check if player can be claimed
        let canClaim = true;
        let claimError: string | undefined;

        if (player.claimedByUserId) {
          canClaim = false;
          claimError = 'Already claimed by another user';
        } else if (!player.isPhantom) {
          canClaim = false;
          claimError = 'Not a phantom player';
        }

        // Get game statistics for this player
        const gamesQuery = query(
          collection(db, 'games'),
          where('playerIds', 'array-contains', player.id)
        );

        const gamesSnapshot = await getDocs(gamesQuery);
        const gamesPlayed = gamesSnapshot.docs.length;

        return {
          ...player,
          canClaim,
          claimError,
          gamesPlayed,
          currentRating: player.rating || 3.5
        };
      })
    );

    logger.info(`Found ${enhancedPlayers.length} claimable players for email: ${normalizedEmail}`);

    return {
      players: enhancedPlayers,
      totalFound: enhancedPlayers.length
    };

  } catch (error) {
    logger.error('Error finding claimable players for user:', error);
    return {
      players: [],
      totalFound: 0
    };
  }
}

/**
 * Bulk claim multiple players for a user (during registration)
 */
export async function bulkClaimPlayers(
  userId: string,
  email: string,
  playerIds: string[]
): Promise<{
  success: boolean;
  claimedCount: number;
  failed: Array<{ playerId: string; error: string }>;
  errors: string[];
}> {
  const result = {
    success: true,
    claimedCount: 0,
    failed: [] as Array<{ playerId: string; error: string }>,
    errors: [] as string[]
  };

  try {
    console.log('🚀 BULK CLAIM START:', { userId, email, playerIds, playerCount: playerIds.length });
    logger.info(`Bulk claiming ${playerIds.length} players for user ${userId}`);

    // Validate user exists
    console.log('👤 Checking if user exists:', userId);
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.error('❌ User not found in Firestore:', userId);
      return {
        ...result,
        success: false,
        errors: ['User not found']
      };
    }
    console.log('✅ User found in Firestore:', { userId, userData: userDoc.data() });

    // Process each player claim
    for (const playerId of playerIds) {
      try {
        console.log('🎭 Processing claim for player:', playerId);
        const claimRequest: PlayerClaimRequest = {
          userId,
          playerId,
          email
        };

        console.log('📋 Claim request details:', claimRequest);
        const claimResult = await claimPlayer(claimRequest);
        console.log('🎯 Claim result:', claimResult);
        
        if (claimResult.success) {
          result.claimedCount++;
          console.log('✅ Player claimed successfully:', playerId);
        } else {
          result.failed.push({
            playerId,
            error: claimResult.error || 'Unknown error'
          });
          console.log('❌ Player claim failed:', { playerId, error: claimResult.error });
        }
      } catch (error) {
        console.error('💥 Exception during player claim:', { playerId, error });
        result.failed.push({
          playerId,
          error: error instanceof Error ? error.message : 'Claim failed'
        });
      }
    }

    if (result.failed.length > 0) {
      result.success = false;
    }

    console.log('📊 BULK CLAIM COMPLETED:', { 
      claimedCount: result.claimedCount, 
      failedCount: result.failed.length, 
      success: result.success,
      failed: result.failed 
    });
    logger.info(`Bulk claim completed: ${result.claimedCount} claimed, ${result.failed.length} failed`);
    
  } catch (error) {
    logger.error('Error in bulk claim players:', error);
    result.success = false;
    result.errors.push('Bulk claim operation failed');
  }

  return result;
}

/**
 * Gets claim audit logs for admin purposes
 */
export async function getPlayerClaimLogs(limit: number = 50): Promise<PlayerClaimLog[]> {
  try {
    const logsQuery = query(
      collection(db, 'playerClaimLogs'),
      orderBy('claimedAt', 'desc')
    );

    const snapshot = await getDocs(logsQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PlayerClaimLog[];
  } catch (error) {
    logger.error('Error fetching claim logs:', error);
    return [];
  }
}

/**
 * Gets claim logs for a specific player
 */
export async function getPlayerClaimHistory(playerId: string): Promise<PlayerClaimLog[]> {
  try {
    const logsQuery = query(
      collection(db, 'playerClaimLogs'),
      where('playerId', '==', playerId),
      orderBy('claimedAt', 'desc')
    );

    const snapshot = await getDocs(logsQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PlayerClaimLog[];
  } catch (error) {
    logger.error('Error fetching player claim history:', error);
    return [];
  }
}

/**
 * Unclaims a player (admin function for dispute resolution)
 */
export async function unclaimPlayer(
  playerId: string,
  adminUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.warn(`Admin unclaiming player ${playerId} by user ${adminUserId}, reason: ${reason}`);

    // Verify admin permissions would be checked by calling function
    
    const result = await runTransaction(db, async (transaction) => {
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await transaction.get(playerRef);

      if (!playerDoc.exists()) {
        throw new Error('Player not found');
      }

      const playerData = playerDoc.data() as Player;

      if (!playerData.claimedByUserId) {
        throw new Error('Player is not claimed');
      }

      // Revert player to phantom state
      const unclaimUpdate = {
        claimedByUserId: null,
        claimedAt: null,
        isPhantom: true, // Return to phantom state
        unclaimedAt: new Date().toISOString(),
        unclaimedBy: adminUserId,
        unclaimReason: reason
      };

      transaction.update(playerRef, unclaimUpdate);

      // Create audit log for unclaim
      const unclaimLog: Omit<PlayerClaimLog, 'id'> = {
        playerId: playerId,
        playerName: playerData.name,
        claimedByUserId: adminUserId,
        claimedByUserName: 'ADMIN_UNCLAIM',
        claimedAt: new Date().toISOString(),
        originalEmail: playerData.email,
        previousOwner: playerData.claimedByUserId
      };

      const auditRef = doc(collection(db, 'playerClaimLogs'));
      transaction.set(auditRef, unclaimLog);

      return { 
        success: true, 
        playerData: playerData,
        previousOwner: playerData.claimedByUserId 
      };
    });

    logger.warn(`Player ${playerId} successfully unclaimed by admin ${adminUserId}`);
    
    // Log audit event after successful transaction
    if (result.success && result.playerData) {
      await logPhantomPlayerUnclaimed(
        playerId,
        result.playerData.name,
        adminUserId,
        reason,
        result.previousOwner
      );
    }
    
    return { success: result.success };

  } catch (error) {
    logger.error('Error unclaiming player:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to unclaim player'
    };
  }
}

/**
 * Gets claiming statistics for admin dashboard
 */
export async function getClaimingStats(): Promise<{
  totalClaimed: number;
  claimsToday: number;
  claimsThisWeek: number;
  topClaimers: Array<{ userId: string; claimCount: number }>;
  recentClaims: PlayerClaimLog[];
}> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all claim logs
    const allLogsQuery = query(
      collection(db, 'playerClaimLogs'),
      orderBy('claimedAt', 'desc')
    );

    const allLogsSnapshot = await getDocs(allLogsQuery);
    const allLogs = allLogsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PlayerClaimLog[];

    // Calculate statistics
    const totalClaimed = allLogs.length;
    const claimsToday = allLogs.filter(log => log.claimedAt >= today).length;
    const claimsThisWeek = allLogs.filter(log => log.claimedAt >= weekAgo).length;

    // Calculate top claimers
    const claimerCounts = new Map<string, number>();
    allLogs.forEach(log => {
      if (log.claimedByUserName !== 'ADMIN_UNCLAIM') {
        claimerCounts.set(log.claimedByUserId, (claimerCounts.get(log.claimedByUserId) || 0) + 1);
      }
    });

    const topClaimers = Array.from(claimerCounts.entries())
      .map(([userId, claimCount]) => ({ userId, claimCount }))
      .sort((a, b) => b.claimCount - a.claimCount)
      .slice(0, 10);

    return {
      totalClaimed,
      claimsToday,
      claimsThisWeek,
      topClaimers,
      recentClaims: allLogs.slice(0, 10)
    };

  } catch (error) {
    logger.error('Error getting claiming stats:', error);
    return {
      totalClaimed: 0,
      claimsToday: 0,
      claimsThisWeek: 0,
      topClaimers: [],
      recentClaims: []
    };
  }
}