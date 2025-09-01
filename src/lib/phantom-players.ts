import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import { DEFAULT_RATING, DEFAULT_AVATAR_URL } from './constants';
import { 
  logPhantomPlayerCreated, 
  logBulkPhantomImport,
  logAuditEvent
} from './audit-trail';
import type { 
  Player, 
  PhantomPlayerCreationData,
  PlayerWithClaimStatus 
} from './types';

/**
 * Phantom Player Management Functions
 * 
 * This module handles the creation, management, and querying of phantom players.
 * Phantom players exist in the system before actual users claim them.
 */

/**
 * Creates a new phantom player with optional email for claiming
 */
export async function createPhantomPlayer(
  playerData: PhantomPlayerCreationData
): Promise<{ success: boolean; playerId?: string; error?: string }> {
  try {
    logger.info(`Creating phantom player: ${playerData.name}`, { 
      hasEmail: !!playerData.email,
      createdBy: playerData.createdBy 
    });

    // Validate email format if provided
    if (playerData.email && !isValidEmail(playerData.email)) {
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    // Check if email is already used by another phantom player
    if (playerData.email) {
      const existingPlayer = await getPhantomPlayerByEmail(playerData.email);
      if (existingPlayer) {
        return {
          success: false,
          error: 'A phantom player with this email already exists'
        };
      }
    }

    const newPhantomPlayer: Omit<Player, 'id'> = {
      name: playerData.name.trim(),
      avatar: playerData.avatar || DEFAULT_AVATAR_URL,
      rating: DEFAULT_RATING,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      // Phantom player specific fields
      isPhantom: true,
      createdBy: playerData.createdBy,
      createdAt: new Date().toISOString(),
      email: playerData.email?.toLowerCase().trim(),
      // claimedByUserId and claimedAt remain undefined until claimed
    };

    const docRef = await addDoc(collection(db, 'players'), newPhantomPlayer);
    
    logger.info(`Phantom player created successfully: ${docRef.id}`);
    
    // Log audit event
    await logPhantomPlayerCreated(
      docRef.id,
      playerData.name,
      playerData.createdBy || 'system',
      !!playerData.email,
      playerData.email
    );
    
    return {
      success: true,
      playerId: docRef.id
    };
  } catch (error) {
    logger.error('Error creating phantom player:', error);
    return {
      success: false,
      error: 'Failed to create phantom player. Please try again.'
    };
  }
}

/**
 * Creates multiple phantom players in batch
 */
export async function createPhantomPlayerBatch(
  playersData: PhantomPlayerCreationData[]
): Promise<{
  success: boolean;
  created: string[];
  failed: Array<{ name: string; error: string }>;
  duplicateEmails: string[];
}> {
  const result = {
    success: true,
    created: [] as string[],
    failed: [] as Array<{ name: string; error: string }>,
    duplicateEmails: [] as string[]
  };

  try {
    logger.info(`Starting batch creation of ${playersData.length} phantom players`);

    // Check for duplicate emails in the batch
    const emails = playersData
      .filter(p => p.email)
      .map(p => p.email!.toLowerCase().trim());
    
    const duplicatesInBatch = emails.filter((email, index) => 
      emails.indexOf(email) !== index
    );

    if (duplicatesInBatch.length > 0) {
      result.duplicateEmails = [...new Set(duplicatesInBatch)];
      logger.warn('Duplicate emails found in batch:', result.duplicateEmails);
    }

    // Check for existing phantom players with same emails
    const existingEmails = await Promise.all(
      emails.map(async (email) => {
        const existing = await getPhantomPlayerByEmail(email);
        return existing ? email : null;
      })
    );

    const existingEmailsFiltered = existingEmails.filter(Boolean) as string[];

    // Process each player
    for (const playerData of playersData) {
      try {
        // Skip if email is duplicate or already exists
        if (playerData.email) {
          const email = playerData.email.toLowerCase().trim();
          if (duplicatesInBatch.includes(email) || existingEmailsFiltered.includes(email)) {
            result.failed.push({
              name: playerData.name,
              error: 'Duplicate or existing email'
            });
            continue;
          }
        }

        const createResult = await createPhantomPlayer(playerData);
        
        if (createResult.success && createResult.playerId) {
          result.created.push(createResult.playerId);
        } else {
          result.failed.push({
            name: playerData.name,
            error: createResult.error || 'Unknown error'
          });
        }
      } catch (error) {
        result.failed.push({
          name: playerData.name,
          error: `Creation failed: ${error}`
        });
      }
    }

    if (result.failed.length > 0) {
      result.success = false;
    }

    logger.info(`Batch creation completed: ${result.created.length} created, ${result.failed.length} failed`);
    
    // Log bulk import audit event
    if (playersData.length > 0 && playersData[0].createdBy) {
      await logBulkPhantomImport(
        playersData[0].createdBy,
        result.created.length,
        result.failed.length,
        'manual'
      );
    }
    
    return result;
  } catch (error) {
    logger.error('Error in batch phantom player creation:', error);
    return {
      success: false,
      created: [],
      failed: playersData.map(p => ({ name: p.name, error: 'Batch operation failed' })),
      duplicateEmails: []
    };
  }
}

/**
 * Gets all phantom players created by a specific user
 */
export async function getPhantomPlayersByCreator(createdBy: string): Promise<Player[]> {
  try {
    const phantomQuery = query(
      collection(db, 'players'),
      where('isPhantom', '==', true),
      where('createdBy', '==', createdBy),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(phantomQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const { createdAt, nameLower, ...cleanData } = data;
      return { id: doc.id, ...cleanData } as Player;
    });
  } catch (error) {
    logger.error('Error fetching phantom players by creator:', error);
    return [];
  }
}

/**
 * Gets all phantom players with emails (claimable players)
 */
export async function getClaimablePhantomPlayers(): Promise<Player[]> {
  try {
    const claimableQuery = query(
      collection(db, 'players'),
      where('isPhantom', '==', true),
      where('email', '!=', null),
      orderBy('email'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(claimableQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const { createdAt, nameLower, ...cleanData } = data;
      return { id: doc.id, ...cleanData } as Player;
    });
  } catch (error) {
    logger.error('Error fetching claimable phantom players:', error);
    return [];
  }
}

/**
 * Gets phantom player by email
 */
export async function getPhantomPlayerByEmail(email: string): Promise<Player | null> {
  try {
    const emailQuery = query(
      collection(db, 'players'),
      where('isPhantom', '==', true),
      where('email', '==', email.toLowerCase().trim()),
      limit(1)
    );

    const snapshot = await getDocs(emailQuery);
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const { createdAt, nameLower, ...cleanData } = data;
    return { id: doc.id, ...cleanData } as Player;
  } catch (error) {
    logger.error('Error fetching phantom player by email:', error);
    return null;
  }
}

/**
 * Searches for phantom players that can be claimed by email
 */
export async function searchClaimablePlayersByEmail(email: string): Promise<Player[]> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    logger.info(`Searching for claimable players with email: ${normalizedEmail}`);

    const emailQuery = query(
      collection(db, 'players'),
      where('isPhantom', '==', true),
      where('email', '==', normalizedEmail)
    );

    const snapshot = await getDocs(emailQuery);
    
    const players = snapshot.docs.map(doc => {
      const data = doc.data();
      const { createdAt, nameLower, ...cleanData } = data;
      return { id: doc.id, ...cleanData } as Player;
    });

    logger.info(`Found ${players.length} claimable players for email: ${normalizedEmail}`);
    return players;
  } catch (error) {
    logger.error('Error searching claimable players by email:', error);
    return [];
  }
}

/**
 * Converts anonymous phantom player to claimable by adding email
 */
export async function makePhantomPlayerClaimable(
  playerId: string,
  email: string,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Making phantom player claimable: ${playerId} with email: ${email}`);

    // Validate email
    if (!isValidEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if player exists and is phantom
    const playerDoc = await getDoc(doc(db, 'players', playerId));
    if (!playerDoc.exists()) {
      return { success: false, error: 'Player not found' };
    }

    const playerData = playerDoc.data();
    if (!playerData.isPhantom) {
      return { success: false, error: 'Player is not a phantom player' };
    }

    if (playerData.email) {
      return { success: false, error: 'Player already has an email' };
    }

    // Check if email is already used by another phantom player
    const existingPlayer = await getPhantomPlayerByEmail(normalizedEmail);
    if (existingPlayer) {
      return { success: false, error: 'Email already used by another phantom player' };
    }

    // Update player with email
    await updateDoc(doc(db, 'players', playerId), {
      email: normalizedEmail,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy
    });

    logger.info(`Phantom player ${playerId} made claimable with email: ${normalizedEmail}`);
    
    // Log audit event
    await logAuditEvent({
      eventType: 'phantom_player_made_claimable',
      severity: 'info',
      userId: updatedBy,
      playerId: playerId,
      details: {
        playerName: playerData.name,
        email: normalizedEmail,
        previouslyAnonymous: true
      }
    });
    
    return { success: true };
  } catch (error) {
    logger.error('Error making phantom player claimable:', error);
    return { success: false, error: 'Failed to update phantom player' };
  }
}

/**
 * Gets all phantom players with enhanced status information
 */
export async function getAllPhantomPlayersWithStatus(): Promise<PlayerWithClaimStatus[]> {
  try {
    const phantomQuery = query(
      collection(db, 'players'),
      where('isPhantom', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(phantomQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const { createdAt, nameLower, ...cleanData } = data;
      const player = { id: doc.id, ...cleanData } as Player;
      
      // Compute claim status
      let claimStatus: 'claimed' | 'claimable' | 'anonymous';
      if (player.claimedByUserId) {
        claimStatus = 'claimed';
      } else if (player.email) {
        claimStatus = 'claimable';
      } else {
        claimStatus = 'anonymous';
      }

      return {
        ...player,
        isClaimable: !!(player.isPhantom && player.email && !player.claimedByUserId),
        claimStatus
      } as PlayerWithClaimStatus;
    });
  } catch (error) {
    logger.error('Error fetching phantom players with status:', error);
    return [];
  }
}

/**
 * Deletes a phantom player (admin function)
 */
export async function deletePhantomPlayer(
  playerId: string,
  deletedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Deleting phantom player: ${playerId} by user: ${deletedBy}`);

    // Verify player exists and is phantom
    const playerDoc = await getDoc(doc(db, 'players', playerId));
    if (!playerDoc.exists()) {
      return { success: false, error: 'Player not found' };
    }

    const playerData = playerDoc.data();
    if (!playerData.isPhantom) {
      return { success: false, error: 'Cannot delete non-phantom player' };
    }

    if (playerData.claimedByUserId) {
      return { success: false, error: 'Cannot delete claimed phantom player' };
    }

    // Check if phantom player is used in any games
    const gamesQuery = query(
      collection(db, 'games'),
      where('playerIds', 'array-contains', playerId),
      limit(1)
    );

    const gamesSnapshot = await getDocs(gamesQuery);
    if (!gamesSnapshot.empty) {
      return {
        success: false,
        error: 'Cannot delete phantom player: they have recorded games'
      };
    }

    // Delete the phantom player
    await deleteDoc(doc(db, 'players', playerId));
    
    logger.info(`Phantom player ${playerId} deleted successfully by ${deletedBy}`);
    
    // Log audit event
    await logAuditEvent({
      eventType: 'phantom_player_deleted',
      severity: 'warning',
      userId: deletedBy,
      playerId: playerId,
      details: {
        playerName: playerData.name,
        wasClaimable: !!playerData.email,
        email: playerData.email || null,
        deletionReason: 'Admin deletion'
      }
    });
    
    return { success: true };
  } catch (error) {
    logger.error('Error deleting phantom player:', error);
    return { success: false, error: 'Failed to delete phantom player' };
  }
}

/**
 * Updates phantom player information (name, avatar)
 */
export async function updatePhantomPlayer(
  playerId: string,
  updates: { name?: string; avatar?: string },
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Updating phantom player: ${playerId}`, updates);

    // Verify player exists and is phantom
    const playerDoc = await getDoc(doc(db, 'players', playerId));
    if (!playerDoc.exists()) {
      return { success: false, error: 'Player not found' };
    }

    const playerData = playerDoc.data();
    if (!playerData.isPhantom) {
      return { success: false, error: 'Cannot update non-phantom player' };
    }

    if (playerData.claimedByUserId) {
      return { success: false, error: 'Cannot update claimed phantom player' };
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy
    };

    if (updates.name) {
      updateData.name = updates.name.trim();
    }

    if (updates.avatar) {
      updateData.avatar = updates.avatar;
    }

    // Update the phantom player
    await updateDoc(doc(db, 'players', playerId), updateData);
    
    logger.info(`Phantom player ${playerId} updated successfully`);
    
    // Log audit event
    await logAuditEvent({
      eventType: 'phantom_player_updated',
      severity: 'info',
      userId: updatedBy,
      playerId: playerId,
      details: {
        playerName: playerData.name,
        updatedFields: updates,
        isClaimable: !!playerData.email
      }
    });
    
    return { success: true };
  } catch (error) {
    logger.error('Error updating phantom player:', error);
    return { success: false, error: 'Failed to update phantom player' };
  }
}

/**
 * Helper function to validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get phantom player statistics for admin dashboard
 */
export async function getPhantomPlayerStats(): Promise<{
  totalPhantom: number;
  claimable: number;
  anonymous: number;
  claimed: number;
  byCreator: Array<{ creatorId: string; count: number }>;
}> {
  try {
    const phantomQuery = query(
      collection(db, 'players'),
      where('isPhantom', '==', true)
    );

    const snapshot = await getDocs(phantomQuery);
    
    let claimable = 0;
    let anonymous = 0;
    let claimed = 0;
    const creatorCounts = new Map<string, number>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      if (data.claimedByUserId) {
        claimed++;
      } else if (data.email) {
        claimable++;
      } else {
        anonymous++;
      }

      if (data.createdBy) {
        creatorCounts.set(data.createdBy, (creatorCounts.get(data.createdBy) || 0) + 1);
      }
    });

    return {
      totalPhantom: snapshot.docs.length,
      claimable,
      anonymous,
      claimed,
      byCreator: Array.from(creatorCounts.entries()).map(([creatorId, count]) => ({
        creatorId,
        count
      }))
    };
  } catch (error) {
    logger.error('Error getting phantom player stats:', error);
    return {
      totalPhantom: 0,
      claimable: 0,
      anonymous: 0,
      claimed: 0,
      byCreator: []
    };
  }
}