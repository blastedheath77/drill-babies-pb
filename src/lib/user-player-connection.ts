/**
 * User-Player Connection Management
 * 
 * Handles creating and managing the connection between User and Player records
 * for the user-centric transformation.
 */

import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { createPlayer } from './admin-actions';
import { DEFAULT_AVATAR_URL } from './constants';
import { logger } from './logger';
import type { User } from './auth-types';

/**
 * Creates a connected Player record for a newly registered User
 * This ensures every user has a corresponding player record for game statistics
 */
export async function createConnectedPlayerForUser(
  user: User
): Promise<{ success: boolean; playerId?: string; error?: string }> {
  try {
    logger.info('Creating connected player for user', { userId: user.id, email: user.email });
    
    // Create a player record that is NOT phantom (since it's connected to a user)
    const playerResult = await createPlayer({
      name: user.name,
      email: user.email,
      avatar: user.avatar || DEFAULT_AVATAR_URL,
      createdBy: user.id, // Track that this was created for the user
      isPhantom: false,   // NOT a phantom - it's connected to a real user
    });
    
    if (!playerResult.success) {
      logger.error('Failed to create player for user', { 
        userId: user.id, 
        error: playerResult.error 
      });
      return { 
        success: false, 
        error: `Failed to create player record: ${playerResult.error}` 
      };
    }
    
    const playerId = playerResult.playerId!;
    logger.info('Player created for user', { userId: user.id, playerId });
    
    // Update the user document to link to the player
    try {
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        connectedPlayerId: playerId,
        updatedAt: new Date(),
      });
      
      logger.info('User document updated with player connection', { 
        userId: user.id, 
        playerId 
      });
      
      return { 
        success: true, 
        playerId 
      };
      
    } catch (linkError) {
      logger.error('Failed to link player to user document', { 
        userId: user.id, 
        playerId, 
        error: linkError 
      });
      
      // Player was created but linking failed
      // In a production system, you might want to clean up the player or retry
      return { 
        success: false, 
        error: 'Player created but failed to link to user profile' 
      };
    }
    
  } catch (error) {
    logger.error('Error in createConnectedPlayerForUser', { 
      userId: user.id, 
      error 
    });
    
    return { 
      success: false, 
      error: 'Failed to create connected player record' 
    };
  }
}

/**
 * Updates the connected player's information when user profile changes
 */
export async function syncUserToPlayer(
  userId: string, 
  playerId: string, 
  updates: { name?: string; avatar?: string; email?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Syncing user changes to player', { userId, playerId, updates });
    
    // Get the player document and update it
    const playerDocRef = doc(db, 'players', playerId);
    
    const playerUpdates: any = {
      updatedAt: new Date(),
    };
    
    if (updates.name) playerUpdates.name = updates.name;
    if (updates.avatar) playerUpdates.avatar = updates.avatar;
    if (updates.email) playerUpdates.email = updates.email;
    
    await updateDoc(playerDocRef, playerUpdates);
    
    logger.info('Player synced with user changes', { userId, playerId });
    
    return { success: true };
    
  } catch (error) {
    logger.error('Failed to sync user changes to player', { 
      userId, 
      playerId, 
      error 
    });
    
    return { 
      success: false, 
      error: 'Failed to sync user changes to player record' 
    };
  }
}

/**
 * Checks if a user has a connected player record and creates one if missing
 * Useful for existing users who registered before the user-centric transformation
 */
export async function ensureUserHasConnectedPlayer(
  user: User
): Promise<{ success: boolean; playerId?: string; error?: string; wasCreated?: boolean }> {
  try {
    // If user already has a connected player, return it
    if (user.connectedPlayerId) {
      logger.info('User already has connected player', { 
        userId: user.id, 
        playerId: user.connectedPlayerId 
      });
      
      return { 
        success: true, 
        playerId: user.connectedPlayerId, 
        wasCreated: false 
      };
    }
    
    // Create a new connected player
    const result = await createConnectedPlayerForUser(user);
    
    if (result.success) {
      return {
        ...result,
        wasCreated: true
      };
    }
    
    return result;
    
  } catch (error) {
    logger.error('Error in ensureUserHasConnectedPlayer', { 
      userId: user.id, 
      error 
    });
    
    return { 
      success: false, 
      error: 'Failed to ensure user has connected player' 
    };
  }
}