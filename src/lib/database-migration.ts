import {
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
  query,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';

/**
 * Database Migration Functions for Phantom Player System
 * 
 * This module handles migrating existing players to support the phantom player system
 * by adding required fields while preserving existing data integrity.
 */

export interface MigrationResult {
  success: boolean;
  playersUpdated: number;
  errors: string[];
  skipped: number;
}

/**
 * Migrates existing players to support phantom player fields
 * Sets isPhantom: false for all existing players (they are "claimed" by default)
 * Adds missing timestamps and ensures data consistency
 */
export async function migrateExistingPlayersToPhantomSystem(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    playersUpdated: 0,
    errors: [],
    skipped: 0
  };

  try {
    logger.info('Starting migration of existing players to phantom system');
    
    // Get all existing players
    const playersCollection = collection(db, 'players');
    const snapshot = await getDocs(playersCollection);
    
    if (snapshot.empty) {
      logger.info('No existing players found to migrate');
      return result;
    }

    logger.info(`Found ${snapshot.docs.length} players to migrate`);

    // Process in batches to avoid hitting Firestore limits
    const BATCH_SIZE = 500; // Firestore batch write limit
    let currentBatch = writeBatch(db);
    let batchCount = 0;
    let totalBatches = 0;

    for (const playerDoc of snapshot.docs) {
      const playerData = playerDoc.data();
      
      // Skip if already migrated (has isPhantom field)
      if (playerData.hasOwnProperty('isPhantom')) {
        result.skipped++;
        logger.debug(`Skipping already migrated player: ${playerDoc.id}`);
        continue;
      }

      // Add phantom player fields to existing player
      const migrationUpdates = {
        isPhantom: false,                    // Existing players are considered "claimed"
        claimedByUserId: null,              // Will be linked to users in future enhancement
        createdAt: playerData.createdAt || serverTimestamp(), // Preserve or add timestamp
        // Note: email, createdBy, claimedAt remain undefined for existing players
      };

      currentBatch.update(doc(db, 'players', playerDoc.id), migrationUpdates);
      batchCount++;

      // Execute batch when limit reached
      if (batchCount >= BATCH_SIZE) {
        await currentBatch.commit();
        totalBatches++;
        result.playersUpdated += batchCount;
        logger.info(`Completed batch ${totalBatches}, updated ${result.playersUpdated} players`);
        
        // Start new batch
        currentBatch = writeBatch(db);
        batchCount = 0;
      }
    }

    // Execute final batch if it has items
    if (batchCount > 0) {
      await currentBatch.commit();
      totalBatches++;
      result.playersUpdated += batchCount;
      logger.info(`Completed final batch ${totalBatches}, updated ${result.playersUpdated} players`);
    }

    logger.info(`Migration completed successfully. Updated: ${result.playersUpdated}, Skipped: ${result.skipped}`);
    
  } catch (error) {
    result.success = false;
    const errorMessage = `Migration failed: ${error}`;
    result.errors.push(errorMessage);
    logger.error('Migration error:', error);
  }

  return result;
}

/**
 * Validates the migration by checking if all players have required phantom fields
 */
export async function validatePhantomPlayerMigration(): Promise<{
  isValid: boolean;
  missingFields: string[];
  totalPlayers: number;
  validPlayers: number;
}> {
  try {
    logger.info('Validating phantom player migration');
    
    const playersCollection = collection(db, 'players');
    const snapshot = await getDocs(playersCollection);
    
    const result = {
      isValid: true,
      missingFields: [] as string[],
      totalPlayers: snapshot.docs.length,
      validPlayers: 0
    };

    for (const playerDoc of snapshot.docs) {
      const playerData = playerDoc.data();
      let isPlayerValid = true;

      // Check for required phantom fields
      if (!playerData.hasOwnProperty('isPhantom')) {
        result.missingFields.push(`Player ${playerDoc.id} missing isPhantom field`);
        isPlayerValid = false;
      }

      if (!playerData.hasOwnProperty('createdAt')) {
        result.missingFields.push(`Player ${playerDoc.id} missing createdAt field`);
        isPlayerValid = false;
      }

      if (isPlayerValid) {
        result.validPlayers++;
      }
    }

    result.isValid = result.missingFields.length === 0;
    
    if (result.isValid) {
      logger.info(`Migration validation successful: ${result.validPlayers}/${result.totalPlayers} players valid`);
    } else {
      logger.warn(`Migration validation failed: ${result.missingFields.length} issues found`);
    }

    return result;
    
  } catch (error) {
    logger.error('Migration validation error:', error);
    return {
      isValid: false,
      missingFields: [`Validation error: ${error}`],
      totalPlayers: 0,
      validPlayers: 0
    };
  }
}

/**
 * Rollback migration by removing phantom player fields from all players
 * USE WITH CAUTION: This will remove phantom player capabilities
 */
export async function rollbackPhantomPlayerMigration(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    playersUpdated: 0,
    errors: [],
    skipped: 0
  };

  try {
    logger.warn('Starting rollback of phantom player migration - THIS WILL REMOVE PHANTOM PLAYER FIELDS');
    
    const playersCollection = collection(db, 'players');
    const snapshot = await getDocs(playersCollection);
    
    if (snapshot.empty) {
      logger.info('No players found to rollback');
      return result;
    }

    const BATCH_SIZE = 500;
    let currentBatch = writeBatch(db);
    let batchCount = 0;

    for (const playerDoc of snapshot.docs) {
      const playerData = playerDoc.data();
      
      // Skip if already rolled back (no phantom fields)
      if (!playerData.hasOwnProperty('isPhantom')) {
        result.skipped++;
        continue;
      }

      // Remove phantom player fields
      const rollbackUpdates = {
        isPhantom: null,
        claimedByUserId: null,
        email: null,
        createdBy: null,
        claimedAt: null,
        // Keep createdAt as it's useful for existing players
      };

      // Use delete field syntax to remove fields entirely
      Object.keys(rollbackUpdates).forEach(key => {
        if (key !== 'createdAt') {
          (rollbackUpdates as any)[key] = null; // Will delete the field
        }
      });

      currentBatch.update(doc(db, 'players', playerDoc.id), rollbackUpdates);
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await currentBatch.commit();
        result.playersUpdated += batchCount;
        currentBatch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await currentBatch.commit();
      result.playersUpdated += batchCount;
    }

    logger.warn(`Rollback completed. Processed: ${result.playersUpdated}, Skipped: ${result.skipped}`);
    
  } catch (error) {
    result.success = false;
    result.errors.push(`Rollback failed: ${error}`);
    logger.error('Rollback error:', error);
  }

  return result;
}

/**
 * Admin function to get migration status
 */
export async function getMigrationStatus(): Promise<{
  isMigrated: boolean;
  totalPlayers: number;
  phantomPlayers: number;
  claimedPlayers: number;
  regularPlayers: number;
}> {
  try {
    const playersCollection = collection(db, 'players');
    const snapshot = await getDocs(playersCollection);
    
    let phantomPlayers = 0;
    let claimedPlayers = 0;
    let regularPlayers = 0;
    let isMigrated = true;

    for (const playerDoc of snapshot.docs) {
      const playerData = playerDoc.data();
      
      if (!playerData.hasOwnProperty('isPhantom')) {
        isMigrated = false;
        regularPlayers++;
      } else {
        if (playerData.isPhantom === true) {
          phantomPlayers++;
        } else {
          claimedPlayers++;
        }
      }
    }

    return {
      isMigrated,
      totalPlayers: snapshot.docs.length,
      phantomPlayers,
      claimedPlayers,
      regularPlayers
    };
    
  } catch (error) {
    logger.error('Error getting migration status:', error);
    return {
      isMigrated: false,
      totalPlayers: 0,
      phantomPlayers: 0,
      claimedPlayers: 0,
      regularPlayers: 0
    };
  }
}