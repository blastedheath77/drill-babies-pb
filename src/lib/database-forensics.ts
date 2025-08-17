'use server';

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';

/**
 * FORENSIC ANALYSIS: Deep dive into database state
 * This helps identify integrity issues and orphaned references
 */

interface DatabaseForensics {
  collections: {
    [collectionName: string]: {
      documentCount: number;
      sampleDocuments: any[];
    };
  };
  integrityIssues: string[];
  orphanedReferences: {
    gamesWithMissingPlayers: string[];
    tournamentsWithMissingPlayers: string[];
  };
}

/**
 * Comprehensive database analysis
 */
export async function analyzeDatabaseIntegrity(): Promise<DatabaseForensics> {
  try {
    logger.info('Starting comprehensive database forensics...');
    
    const result: DatabaseForensics = {
      collections: {},
      integrityIssues: [],
      orphanedReferences: {
        gamesWithMissingPlayers: [],
        tournamentsWithMissingPlayers: [],
      },
    };

    // Analyze all known collections
    const collectionsToAnalyze = [
      'players',
      'games', 
      'tournaments',
      'tournamentMatches',
      // Add any other collections that might exist
      'userProfiles',
      'ratings',
      'statistics',
      'partnerships',
      'headToHead'
    ];

    for (const collectionName of collectionsToAnalyze) {
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        if (!snapshot.empty) {
          const sampleDocs = snapshot.docs.slice(0, 3).map(doc => ({
            id: doc.id,
            data: doc.data()
          }));
          
          result.collections[collectionName] = {
            documentCount: snapshot.size,
            sampleDocuments: sampleDocs
          };
          
          logger.info(`Found collection '${collectionName}': ${snapshot.size} documents`);
        }
      } catch (error) {
        // Collection might not exist, that's okay
      }
    }

    // Check for players
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const playerIds = new Set(playersSnapshot.docs.map(doc => doc.id));
    
    // Check games for orphaned player references
    const gamesSnapshot = await getDocs(collection(db, 'games'));
    gamesSnapshot.docs.forEach(gameDoc => {
      const game = gameDoc.data();
      const referencedPlayerIds = game.playerIds || [];
      
      const missingPlayers = referencedPlayerIds.filter((id: string) => !playerIds.has(id));
      if (missingPlayers.length > 0) {
        result.orphanedReferences.gamesWithMissingPlayers.push(
          `Game ${gameDoc.id} references missing players: ${missingPlayers.join(', ')}`
        );
      }
    });

    // Check tournaments for orphaned player references
    const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
    tournamentsSnapshot.docs.forEach(tournamentDoc => {
      const tournament = tournamentDoc.data();
      const referencedPlayerIds = tournament.playerIds || [];
      
      const missingPlayers = referencedPlayerIds.filter((id: string) => !playerIds.has(id));
      if (missingPlayers.length > 0) {
        result.orphanedReferences.tournamentsWithMissingPlayers.push(
          `Tournament ${tournamentDoc.id} references missing players: ${missingPlayers.join(', ')}`
        );
      }
    });

    // Identify integrity issues
    const totalOrphanedRefs = 
      result.orphanedReferences.gamesWithMissingPlayers.length +
      result.orphanedReferences.tournamentsWithMissingPlayers.length;
    
    if (totalOrphanedRefs > 0) {
      result.integrityIssues.push(`Found ${totalOrphanedRefs} orphaned player references`);
    }

    if (result.collections.players && result.collections.games) {
      const playerCount = result.collections.players.documentCount;
      const gameCount = result.collections.games.documentCount;
      
      if (gameCount > 0 && playerCount === 0) {
        result.integrityIssues.push('Games exist but no players found - severe integrity issue');
      }
    }

    logger.info(`Database forensics complete. Found ${Object.keys(result.collections).length} collections`);
    return result;
    
  } catch (error) {
    logger.error('Database forensics failed:', error);
    throw error;
  }
}

/**
 * NUCLEAR OPTION: Complete Firebase project reset
 * This is the most thorough way to ensure clean state
 */
export async function nuclearDatabaseReset(): Promise<{ success: boolean; message: string }> {
  try {
    logger.warn('Starting NUCLEAR database reset - deleting EVERYTHING...');
    
    // Get ALL collections (including hidden ones)
    // Note: In Firebase, we can't easily list all collections, so we'll target known ones
    // plus any we discover through forensics
    
    const forensics = await analyzeDatabaseIntegrity();
    const collectionsToDelete = Object.keys(forensics.collections);
    
    logger.info(`Found collections to delete: ${collectionsToDelete.join(', ')}`);
    
    let totalDeleted = 0;
    
    for (const collectionName of collectionsToDelete) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      if (!snapshot.empty) {
        const deletePromises = snapshot.docs.map(docSnapshot => 
          deleteDoc(doc(db, collectionName, docSnapshot.id))
        );
        await Promise.all(deletePromises);
        totalDeleted += snapshot.size;
        logger.info(`Deleted ${snapshot.size} documents from ${collectionName}`);
      }
    }

    // Also try to delete some common subcollections that might exist
    const potentialSubcollections = [
      'users/{userId}/favorites',
      'players/{playerId}/ratings',
      'players/{playerId}/history',
      'tournaments/{tournamentId}/rounds',
      'games/{gameId}/ratings'
    ];

    logger.info(`NUCLEAR RESET COMPLETE: Deleted ${totalDeleted} total documents from ${collectionsToDelete.length} collections`);
    
    return {
      success: true,
      message: `Nuclear reset complete! Deleted ${totalDeleted} documents from ${collectionsToDelete.length} collections: ${collectionsToDelete.join(', ')}`
    };
    
  } catch (error) {
    logger.error('Nuclear database reset failed:', error);
    return { success: false, message: `Nuclear reset failed: ${error}` };
  }
}

/**
 * Clean up orphaned references without deleting valid data
 */
export async function cleanupOrphanedReferences(): Promise<{ success: boolean; message: string }> {
  try {
    logger.info('Starting orphaned reference cleanup...');
    
    const forensics = await analyzeDatabaseIntegrity();
    let cleanedCount = 0;
    
    // Get current player IDs
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const validPlayerIds = new Set(playersSnapshot.docs.map(doc => doc.id));
    
    // Clean games with invalid player references
    const gamesSnapshot = await getDocs(collection(db, 'games'));
    for (const gameDoc of gamesSnapshot.docs) {
      const game = gameDoc.data();
      const currentPlayerIds = game.playerIds || [];
      const validPlayerIds_filtered = currentPlayerIds.filter((id: string) => validPlayerIds.has(id));
      
      if (validPlayerIds_filtered.length !== currentPlayerIds.length) {
        if (validPlayerIds_filtered.length === 0) {
          // Delete games with no valid players
          await deleteDoc(doc(db, 'games', gameDoc.id));
          cleanedCount++;
        } else {
          // Update game with only valid player IDs
          await updateDoc(doc(db, 'games', gameDoc.id), {
            playerIds: validPlayerIds_filtered,
            // Also update team player IDs
            'team1.playerIds': game.team1?.playerIds?.filter((id: string) => validPlayerIds.has(id)) || [],
            'team2.playerIds': game.team2?.playerIds?.filter((id: string) => validPlayerIds.has(id)) || []
          });
          cleanedCount++;
        }
      }
    }
    
    return {
      success: true,
      message: `Cleaned up ${cleanedCount} orphaned references`
    };
    
  } catch (error) {
    logger.error('Orphaned reference cleanup failed:', error);
    return { success: false, message: `Cleanup failed: ${error}` };
  }
}