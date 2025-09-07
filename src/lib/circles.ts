'use server';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import type { 
  Circle, 
  CircleMembership, 
  CircleInvite,
  User 
} from './types';

/**
 * Circle Management Functions
 */

// Create a new circle
export async function createCircle(
  name: string,
  description: string,
  createdBy: string,
  isPrivate: boolean = false,
  settings?: {
    allowMemberInvites: boolean;
    autoAcceptInvites: boolean;
  }
): Promise<{ success: boolean; circleId?: string; message: string }> {
  try {
    logger.info(`Creating circle: ${name} by user ${createdBy}`);
    
    // Check if circle name already exists
    const existingCircleQuery = query(
      collection(db, 'circles'),
      where('name', '==', name.trim()),
      limit(1)
    );
    const existingSnapshot = await getDocs(existingCircleQuery);
    
    if (!existingSnapshot.empty) {
      return {
        success: false,
        message: `Circle with name "${name}" already exists`
      };
    }
    
    const circleData = {
      name: name.trim(),
      description: description.trim(),
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isPrivate,
      memberCount: 1, // Creator is automatically a member
      settings: settings || {
        allowMemberInvites: true,
        autoAcceptInvites: false
      }
    };
    
    // Create the circle
    const circleRef = await addDoc(collection(db, 'circles'), circleData);
    
    // Add creator as admin member
    await addDoc(collection(db, 'circleMemberships'), {
      circleId: circleRef.id,
      userId: createdBy,
      role: 'admin',
      joinedAt: serverTimestamp()
    });
    
    logger.info(`Circle created successfully: ${circleRef.id}`);
    return {
      success: true,
      circleId: circleRef.id,
      message: `Circle "${name}" created successfully`
    };
  } catch (error) {
    logger.error('Failed to create circle:', error);
    return {
      success: false,
      message: `Failed to create circle: ${error}`
    };
  }
}

// Get all circles a user is a member of
export async function getUserCircles(userId: string): Promise<Circle[]> {
  try {
    logger.info(`[getUserCircles] Starting query for user ${userId}`);
    
    // Get user's memberships
    logger.info(`[getUserCircles] Querying circleMemberships collection for userId: ${userId}`);
    const membershipsQuery = query(
      collection(db, 'circleMemberships'),
      where('userId', '==', userId)
    );
    
    const membershipsSnapshot = await getDocs(membershipsQuery);
    logger.info(`[getUserCircles] Found ${membershipsSnapshot.size} memberships for user ${userId}`);
    
    if (membershipsSnapshot.empty) {
      logger.warn(`[getUserCircles] No memberships found for user ${userId}, returning empty array`);
      return [];
    }
    
    // Get circle IDs
    const circleIds = membershipsSnapshot.docs.map(doc => {
      const data = doc.data();
      logger.info(`[getUserCircles] Membership document: ${doc.id}, circleId: ${data.circleId}, joinedAt: ${data.joinedAt}`);
      return data.circleId;
    });
    logger.info(`[getUserCircles] Circle IDs to fetch:`, circleIds);
    
    // Get circles
    const circles: Circle[] = [];
    for (const circleId of circleIds) {
      logger.info(`[getUserCircles] Fetching circle details for circleId: ${circleId}`);
      try {
        const circleDoc = await getDoc(doc(db, 'circles', circleId));
        if (circleDoc.exists()) {
          const circleData = circleDoc.data();
          logger.info(`[getUserCircles] Circle found: ${circleData.name} (${circleId})`);
          circles.push({
            id: circleDoc.id,
            name: circleData.name,
            description: circleData.description,
            createdBy: circleData.createdBy,
            createdAt: circleData.createdAt?.toDate?.()?.toISOString() || circleData.createdAt,
            updatedAt: circleData.updatedAt?.toDate?.()?.toISOString() || circleData.updatedAt,
            isPrivate: circleData.isPrivate,
            memberCount: circleData.memberCount || 0,
            settings: circleData.settings
          });
        } else {
          logger.warn(`[getUserCircles] Circle document ${circleId} does not exist`);
        }
      } catch (circleError) {
        logger.error(`[getUserCircles] Error fetching circle ${circleId}:`, circleError);
      }
    }
    
    const sortedCircles = circles.sort((a, b) => a.name.localeCompare(b.name));
    logger.info(`[getUserCircles] Returning ${sortedCircles.length} circles for user ${userId}:`, sortedCircles.map(c => ({id: c.id, name: c.name})));
    
    return sortedCircles;
  } catch (error) {
    logger.error(`[getUserCircles] Failed to get user circles for ${userId}:`, error);
    return [];
  }
}

// Get circle details
export async function getCircle(circleId: string): Promise<Circle | null> {
  try {
    const circleDoc = await getDoc(doc(db, 'circles', circleId));
    
    if (!circleDoc.exists()) {
      return null;
    }
    
    const circleData = circleDoc.data();
    return {
      id: circleDoc.id,
      name: circleData.name,
      description: circleData.description,
      createdBy: circleData.createdBy,
      createdAt: circleData.createdAt?.toDate?.()?.toISOString() || circleData.createdAt,
      updatedAt: circleData.updatedAt?.toDate?.()?.toISOString() || circleData.updatedAt,
      isPrivate: circleData.isPrivate,
      memberCount: circleData.memberCount || 0,
      settings: circleData.settings
    };
  } catch (error) {
    logger.error('Failed to get circle:', error);
    return null;
  }
}

// Update circle
export async function updateCircle(
  circleId: string,
  updates: {
    name?: string;
    description?: string;
    isPrivate?: boolean;
    settings?: {
      allowMemberInvites: boolean;
      autoAcceptInvites: boolean;
    };
  },
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user is admin of this circle
    const isAdmin = await isCircleAdmin(circleId, userId);
    if (!isAdmin) {
      return {
        success: false,
        message: 'Only circle admins can update circle settings'
      };
    }
    
    const updateData: any = {
      updatedAt: serverTimestamp()
    };
    
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description.trim();
    }
    if (updates.isPrivate !== undefined) {
      updateData.isPrivate = updates.isPrivate;
    }
    if (updates.settings !== undefined) {
      updateData.settings = updates.settings;
    }
    
    await updateDoc(doc(db, 'circles', circleId), updateData);
    
    logger.info(`Circle ${circleId} updated by user ${userId}`);
    return {
      success: true,
      message: 'Circle updated successfully'
    };
  } catch (error) {
    logger.error('Failed to update circle:', error);
    return {
      success: false,
      message: `Failed to update circle: ${error}`
    };
  }
}

// Delete circle (only by admin)
export async function deleteCircle(
  circleId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user is admin of this circle
    const isAdmin = await isCircleAdmin(circleId, userId);
    if (!isAdmin) {
      return {
        success: false,
        message: 'Only circle admins can delete circles'
      };
    }
    
    const batch = writeBatch(db);
    
    // Delete all memberships
    const membershipsQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId)
    );
    const membershipsSnapshot = await getDocs(membershipsQuery);
    membershipsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete all invites
    const invitesQuery = query(
      collection(db, 'circleInvites'),
      where('circleId', '==', circleId)
    );
    const invitesSnapshot = await getDocs(invitesQuery);
    invitesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the circle
    batch.delete(doc(db, 'circles', circleId));
    
    await batch.commit();
    
    logger.info(`Circle ${circleId} deleted by user ${userId}`);
    return {
      success: true,
      message: 'Circle deleted successfully'
    };
  } catch (error) {
    logger.error('Failed to delete circle:', error);
    return {
      success: false,
      message: `Failed to delete circle: ${error}`
    };
  }
}

/**
 * Circle Membership Functions
 */

// Check if user is a member of a circle
export async function isCircleMember(circleId: string, userId: string): Promise<boolean> {
  try {
    const membershipQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId),
      where('userId', '==', userId),
      limit(1)
    );
    const snapshot = await getDocs(membershipQuery);
    return !snapshot.empty;
  } catch (error) {
    logger.error('Failed to check circle membership:', error);
    return false;
  }
}

// Check if user is an admin of a circle
export async function isCircleAdmin(circleId: string, userId: string): Promise<boolean> {
  try {
    const membershipQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId),
      where('userId', '==', userId),
      where('role', '==', 'admin'),
      limit(1)
    );
    const snapshot = await getDocs(membershipQuery);
    return !snapshot.empty;
  } catch (error) {
    logger.error('Failed to check circle admin status:', error);
    return false;
  }
}

// Get circle members
export async function getCircleMembers(circleId: string): Promise<{
  memberships: CircleMembership[];
  users: User[];
}> {
  try {
    const membershipsQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId)
    );
    const membershipsSnapshot = await getDocs(membershipsQuery);
    
    const memberships: CircleMembership[] = [];
    const userIds: string[] = [];
    
    membershipsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      memberships.push({
        id: doc.id,
        circleId: data.circleId,
        userId: data.userId,
        role: data.role,
        joinedAt: data.joinedAt?.toDate?.()?.toISOString() || data.joinedAt,
        invitedBy: data.invitedBy
      });
      userIds.push(data.userId);
    });
    
    // Get user details (check both users and players collections)
    const users: User[] = [];
    for (const userId of userIds) {
      try {
        // First try to get from users collection
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          users.push({
            id: userDoc.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            avatar: userData.avatar,
            createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt,
            updatedAt: userData.updatedAt?.toDate?.()?.toISOString() || userData.updatedAt
          });
        } else {
          // If not found in users, try players collection (for phantom players)
          const playerDoc = await getDoc(doc(db, 'players', userId));
          if (playerDoc.exists()) {
            const playerData = playerDoc.data();
            users.push({
              id: playerDoc.id,
              name: playerData.name,
              email: playerData.email || '',
              role: 'phantom' as any, // Mark as phantom
              avatar: playerData.avatar || '',
              createdAt: playerData.createdAt?.toDate?.()?.toISOString() || playerData.createdAt,
              updatedAt: new Date().toISOString(), // Use current time as updatedAt
              location: playerData.location,
              gender: playerData.gender
            });
          }
        }
      } catch (error) {
        logger.warn(`Failed to get user/player details for ${userId}:`, error);
      }
    }
    
    return { memberships, users };
  } catch (error) {
    logger.error('Failed to get circle members:', error);
    return { memberships: [], users: [] };
  }
}

// Leave circle
export async function leaveCircle(
  circleId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Find the membership
    const membershipQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId),
      where('userId', '==', userId),
      limit(1)
    );
    const membershipSnapshot = await getDocs(membershipQuery);
    
    if (membershipSnapshot.empty) {
      return {
        success: false,
        message: 'You are not a member of this circle'
      };
    }
    
    const membershipDoc = membershipSnapshot.docs[0];
    const membershipData = membershipDoc.data();
    
    // Check if this is the last admin
    if (membershipData.role === 'admin') {
      const adminQuery = query(
        collection(db, 'circleMemberships'),
        where('circleId', '==', circleId),
        where('role', '==', 'admin')
      );
      const adminSnapshot = await getDocs(adminQuery);
      
      if (adminSnapshot.size === 1) {
        return {
          success: false,
          message: 'Cannot leave circle as the only admin. Transfer admin role first or delete the circle.'
        };
      }
    }
    
    // Delete membership
    await deleteDoc(membershipDoc.ref);
    
    // Update member count
    const circleRef = doc(db, 'circles', circleId);
    const circleDoc = await getDoc(circleRef);
    if (circleDoc.exists()) {
      const currentCount = circleDoc.data().memberCount || 0;
      await updateDoc(circleRef, {
        memberCount: Math.max(0, currentCount - 1),
        updatedAt: serverTimestamp()
      });
    }
    
    logger.info(`User ${userId} left circle ${circleId}`);
    return {
      success: true,
      message: 'Successfully left the circle'
    };
  } catch (error) {
    logger.error('Failed to leave circle:', error);
    return {
      success: false,
      message: `Failed to leave circle: ${error}`
    };
  }
}

/**
 * Helper Functions
 */

// Get circles that include specific players (for filtering)
export async function getCirclesWithPlayers(playerIds: string[]): Promise<string[]> {
  try {
    // This would need to be implemented based on how we track 
    // which players are associated with which circles
    // For now, return empty array
    return [];
  } catch (error) {
    logger.error('Failed to get circles with players:', error);
    return [];
  }
}

// Update member count for a circle
export async function updateCircleMemberCount(circleId: string): Promise<void> {
  try {
    const membershipsQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId)
    );
    const membershipsSnapshot = await getDocs(membershipsQuery);
    
    await updateDoc(doc(db, 'circles', circleId), {
      memberCount: membershipsSnapshot.size,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    logger.error('Failed to update circle member count:', error);
  }
}

// Bulk delete all circles created by user (for testing/cleanup)
export async function deleteAllUserCircles(
  userId: string
): Promise<{ success: boolean; deletedCount: number; message: string }> {
  try {
    // Get all circles where user is admin
    const userCircles = await getUserCircles(userId);
    const adminCircles = [];
    
    // Check which circles the user is admin of
    for (const circle of userCircles) {
      const isAdmin = await isCircleAdmin(circle.id, userId);
      if (isAdmin) {
        adminCircles.push(circle);
      }
    }
    
    if (adminCircles.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: 'No circles found where you are admin'
      };
    }
    
    // Delete each circle
    let deletedCount = 0;
    const errors = [];
    
    for (const circle of adminCircles) {
      try {
        const result = await deleteCircle(circle.id, userId);
        if (result.success) {
          deletedCount++;
          logger.info(`Deleted circle: ${circle.name}`);
        } else {
          errors.push(`Failed to delete ${circle.name}: ${result.message}`);
        }
      } catch (error) {
        errors.push(`Error deleting ${circle.name}: ${error}`);
      }
    }
    
    return {
      success: true,
      deletedCount,
      message: errors.length > 0 
        ? `Deleted ${deletedCount} circles. Errors: ${errors.join(', ')}`
        : `Successfully deleted ${deletedCount} circles`
    };
  } catch (error) {
    logger.error('Failed to delete all user circles:', error);
    return {
      success: false,
      deletedCount: 0,
      message: `Failed to delete circles: ${error}`
    };
  }
}

// Check if user can invite others to circle
export async function canUserInviteToCircle(circleId: string, userId: string): Promise<boolean> {
  try {
    logger.info(`Checking if user ${userId} can invite to circle ${circleId}`);
    
    // Get the circle to check its settings
    const circle = await getCircle(circleId);
    if (!circle) {
      return false;
    }
    
    // Check if user is a member of the circle
    const isMember = await isCircleMember(circleId, userId);
    if (!isMember) {
      return false;
    }
    
    // Check if user is admin (admins can always invite)
    const isAdmin = await isCircleAdmin(circleId, userId);
    if (isAdmin) {
      return true;
    }
    
    // Check circle settings - if allowMemberInvites is true, any member can invite
    // Default to true if not specified for backwards compatibility
    const allowMemberInvites = circle.settings?.allowMemberInvites ?? true;
    
    return allowMemberInvites;
  } catch (error) {
    logger.error('Error checking user invite permission:', error);
    return false;
  }
}

// Add user to circle
export async function addUserToCircle(
  circleId: string, 
  userId: string, 
  role: 'admin' | 'member' = 'member',
  addedBy?: string
): Promise<boolean> {
  try {
    logger.info(`Adding user ${userId} to circle ${circleId} as ${role}`);
    
    // Check if user is already a member
    const isAlreadyMember = await isCircleMember(circleId, userId);
    if (isAlreadyMember) {
      logger.info(`User ${userId} is already a member of circle ${circleId}`);
      return true; // Not an error, just already exists
    }
    
    // Create membership document
    const membershipData = {
      circleId,
      userId,
      role,
      joinedAt: serverTimestamp(),
      addedBy: addedBy || null
    };
    
    await addDoc(collection(db, 'circleMemberships'), membershipData);
    
    // Update circle member count
    await updateCircleMemberCount(circleId);
    
    logger.info(`Successfully added user ${userId} to circle ${circleId}`);
    return true;
  } catch (error) {
    logger.error('Error adding user to circle:', error);
    return false;
  }
}