'use server';

import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import type { Player } from './types';

/**
 * Convert a regular player to a phantom player that can be claimed by a user
 */
export async function makePlayerClaimable(
  playerId: string,
  email: string,
  adminUserId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Converting player ${playerId} to claimable phantom with email ${email}`);

    // Get the player document
    const playerRef = doc(db, 'players', playerId);
    const playerDoc = await getDoc(playerRef);

    if (!playerDoc.exists()) {
      return {
        success: false,
        error: 'Player not found'
      };
    }

    const playerData = playerDoc.data() as Player;

    // Validate that player can be converted
    if (playerData.isPhantom) {
      return {
        success: false,
        error: 'Player is already a phantom player'
      };
    }

    if (playerData.claimedByUserId) {
      return {
        success: false,
        error: 'Player is already claimed by a user'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!emailRegex.test(normalizedEmail)) {
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    // Update player to be phantom and claimable
    const updateData = {
      isPhantom: true,
      email: normalizedEmail,
      // Keep all existing stats and data
      updatedAt: serverTimestamp(),
      // Track who made this change
      ...(adminUserId && { convertedToPhantomBy: adminUserId }),
      convertedToPhantomAt: new Date().toISOString(),
    };

    await updateDoc(playerRef, updateData);

    // Create audit log entry
    const auditLog = {
      playerId: playerId,
      playerName: playerData.name,
      action: 'CONVERTED_TO_PHANTOM',
      email: normalizedEmail,
      performedBy: adminUserId || 'system',
      performedAt: new Date().toISOString(),
      originalData: {
        isPhantom: playerData.isPhantom || false,
        email: playerData.email || null,
      }
    };

    await addDoc(collection(db, 'playerConversionLogs'), auditLog);

    logger.info(`Successfully converted player ${playerId} (${playerData.name}) to phantom with email ${normalizedEmail}`);

    return {
      success: true
    };

  } catch (error) {
    logger.error('Failed to make player claimable:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert player'
    };
  }
}

/**
 * Revert a phantom player back to regular player (admin function)
 */
export async function revertPhantomPlayer(
  playerId: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Reverting phantom player ${playerId} to regular player`);

    const playerRef = doc(db, 'players', playerId);
    const playerDoc = await getDoc(playerRef);

    if (!playerDoc.exists()) {
      return {
        success: false,
        error: 'Player not found'
      };
    }

    const playerData = playerDoc.data() as Player;

    if (!playerData.isPhantom) {
      return {
        success: false,
        error: 'Player is not a phantom player'
      };
    }

    if (playerData.claimedByUserId) {
      return {
        success: false,
        error: 'Cannot revert claimed player. Must unclaim first.'
      };
    }

    // Revert to regular player
    const updateData = {
      isPhantom: false,
      email: null, // Remove email
      updatedAt: serverTimestamp(),
      revertedFromPhantomBy: adminUserId,
      revertedFromPhantomAt: new Date().toISOString(),
    };

    await updateDoc(playerRef, updateData);

    // Create audit log
    const auditLog = {
      playerId: playerId,
      playerName: playerData.name,
      action: 'REVERTED_FROM_PHANTOM',
      performedBy: adminUserId,
      performedAt: new Date().toISOString(),
      originalData: {
        isPhantom: playerData.isPhantom,
        email: playerData.email,
      }
    };

    await addDoc(collection(db, 'playerConversionLogs'), auditLog);

    logger.info(`Successfully reverted phantom player ${playerId} (${playerData.name}) to regular player`);

    return {
      success: true
    };

  } catch (error) {
    logger.error('Failed to revert phantom player:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revert player'
    };
  }
}

/**
 * Get conversion logs for audit purposes
 */
export async function getPlayerConversionLogs(): Promise<Array<{
  id: string;
  playerId: string;
  playerName: string;
  action: string;
  email?: string;
  performedBy: string;
  performedAt: string;
  originalData: any;
}>> {
  try {
    // This would need to be implemented with proper querying
    // For now, return empty array
    return [];
  } catch (error) {
    logger.error('Failed to get conversion logs:', error);
    return [];
  }
}