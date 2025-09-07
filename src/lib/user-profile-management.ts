/**
 * User Profile Management
 * 
 * Functions for updating and managing user profile information
 * including syncing changes to connected player records.
 */

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { syncUserToPlayer } from './user-player-connection';
import { logger } from './logger';
import type { User } from './auth-types';

interface ProfileUpdateData {
  name?: string;
  location?: {
    city: string;
    country: string;
  };
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  duprId?: string;
  avatar?: string;
}

/**
 * Updates a user's profile information and syncs changes to connected player
 */
export async function updateUserProfile(
  userId: string,
  updates: ProfileUpdateData
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Updating user profile', { userId, updates });
    
    // Prepare the update data for Firestore
    const userUpdates: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    // Update the user document
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, userUpdates);
    
    logger.info('User profile updated successfully', { userId });
    
    // If the user has a connected player, sync the changes
    // Note: We would need to fetch the user's connectedPlayerId first
    // For now, we'll handle this in a separate function or as part of a larger refactor
    
    return { success: true };
    
  } catch (error) {
    logger.error('Failed to update user profile', { userId, error });
    
    return { 
      success: false, 
      error: 'Failed to update profile. Please try again.' 
    };
  }
}

/**
 * Updates user profile and syncs to connected player
 */
export async function updateUserProfileWithPlayerSync(
  user: User,
  updates: ProfileUpdateData
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Updating user profile with player sync', { userId: user.id, updates });
    
    // First update the user profile
    const profileResult = await updateUserProfile(user.id, updates);
    
    if (!profileResult.success) {
      return profileResult;
    }
    
    // If user has a connected player, sync the relevant changes
    if (user.connectedPlayerId) {
      const playerSyncData: any = {};
      
      if (updates.name) playerSyncData.name = updates.name;
      if (updates.avatar) playerSyncData.avatar = updates.avatar;
      
      if (Object.keys(playerSyncData).length > 0) {
        const syncResult = await syncUserToPlayer(
          user.id, 
          user.connectedPlayerId, 
          playerSyncData
        );
        
        if (!syncResult.success) {
          logger.warn('User profile updated but player sync failed', { 
            userId: user.id, 
            playerId: user.connectedPlayerId, 
            error: syncResult.error 
          });
          
          // Don't fail the entire operation if player sync fails
          // The user profile was successfully updated
        }
      }
    }
    
    return { success: true };
    
  } catch (error) {
    logger.error('Failed to update user profile with player sync', { 
      userId: user.id, 
      error 
    });
    
    return { 
      success: false, 
      error: 'Failed to update profile. Please try again.' 
    };
  }
}

/**
 * Gets user profile statistics and information
 */
export async function getUserProfileStats(userId: string): Promise<{
  success: boolean;
  stats?: {
    totalCircles: number;
    totalGames: number;
    connectedPlayerStats?: {
      rating: number;
      wins: number;
      losses: number;
      gamesPlayed: number;
    };
  };
  error?: string;
}> {
  try {
    // This would fetch user statistics from various collections
    // For now, return a placeholder
    return {
      success: true,
      stats: {
        totalCircles: 0,
        totalGames: 0,
      }
    };
  } catch (error) {
    logger.error('Failed to get user profile stats', { userId, error });
    
    return {
      success: false,
      error: 'Failed to load profile statistics'
    };
  }
}

/**
 * Validates profile update data
 */
export function validateProfileUpdateData(updates: ProfileUpdateData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate name
  if (updates.name !== undefined) {
    if (!updates.name || updates.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    if (updates.name.trim().length > 100) {
      errors.push('Name must be less than 100 characters');
    }
  }
  
  // Validate location
  if (updates.location) {
    if (updates.location.city && updates.location.city.length > 100) {
      errors.push('City name must be less than 100 characters');
    }
    if (updates.location.country && updates.location.country.length > 100) {
      errors.push('Country name must be less than 100 characters');
    }
  }
  
  // Validate DUPR ID
  if (updates.duprId !== undefined) {
    if (updates.duprId && !/^\d+$/.test(updates.duprId)) {
      errors.push('DUPR ID must contain only numbers');
    }
    if (updates.duprId && updates.duprId.length > 20) {
      errors.push('DUPR ID must be less than 20 characters');
    }
  }
  
  // Validate date of birth
  if (updates.dateOfBirth !== undefined) {
    if (updates.dateOfBirth) {
      const date = new Date(updates.dateOfBirth);
      if (isNaN(date.getTime())) {
        errors.push('Invalid date of birth');
      }
      
      // Check if date is in the future
      if (date > new Date()) {
        errors.push('Date of birth cannot be in the future');
      }
      
      // Check if date is too far in the past (assuming max age of 120 years)
      const maxAge = new Date();
      maxAge.setFullYear(maxAge.getFullYear() - 120);
      if (date < maxAge) {
        errors.push('Date of birth cannot be more than 120 years ago');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}