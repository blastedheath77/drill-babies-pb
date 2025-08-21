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
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import { isCircleMember, isCircleAdmin, updateCircleMemberCount } from './circles';
import type { CircleInvite, Circle } from './types';

/**
 * Circle Invitation Functions
 */

// Send an invitation to join a circle
export async function sendCircleInvite(
  circleId: string,
  invitedUserId: string,
  invitedBy: string,
  message?: string
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(`Sending circle invite: ${invitedBy} -> ${invitedUserId} for circle ${circleId}`);
    
    // Check if inviter has permission
    const canInvite = await canUserInviteToCircle(circleId, invitedBy);
    if (!canInvite) {
      return {
        success: false,
        message: 'You do not have permission to invite users to this circle'
      };
    }
    
    // Check if user is already a member
    const isAlreadyMember = await isCircleMember(circleId, invitedUserId);
    if (isAlreadyMember) {
      return {
        success: false,
        message: 'User is already a member of this circle'
      };
    }
    
    // Check if there's already a pending invite
    const existingInviteQuery = query(
      collection(db, 'circleInvites'),
      where('circleId', '==', circleId),
      where('invitedUserId', '==', invitedUserId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const existingInviteSnapshot = await getDocs(existingInviteQuery);
    
    if (!existingInviteSnapshot.empty) {
      return {
        success: false,
        message: 'User already has a pending invitation to this circle'
      };
    }
    
    // Create expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Create the invite
    const inviteData = {
      circleId,
      invitedUserId,
      invitedBy,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
      message: message || ''
    };
    
    await addDoc(collection(db, 'circleInvites'), inviteData);
    
    logger.info(`Circle invite sent successfully`);
    return {
      success: true,
      message: 'Invitation sent successfully'
    };
  } catch (error) {
    logger.error('Failed to send circle invite:', error);
    return {
      success: false,
      message: `Failed to send invitation: ${error}`
    };
  }
}

// Get all pending invites for a user
export async function getUserInvites(userId: string): Promise<CircleInvite[]> {
  try {
    const invitesQuery = query(
      collection(db, 'circleInvites'),
      where('invitedUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const invitesSnapshot = await getDocs(invitesQuery);
    
    const invites: CircleInvite[] = [];
    
    for (const inviteDoc of invitesSnapshot.docs) {
      const inviteData = inviteDoc.data();
      
      // Check if invite has expired
      const expiresAt = new Date(inviteData.expiresAt);
      if (expiresAt < new Date()) {
        // Mark as expired
        await updateDoc(inviteDoc.ref, { status: 'expired' });
        continue;
      }
      
      // Get circle details
      const circleDoc = await getDoc(doc(db, 'circles', inviteData.circleId));
      let circle: Circle | undefined;
      
      if (circleDoc.exists()) {
        const circleData = circleDoc.data();
        circle = {
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
      }
      
      invites.push({
        id: inviteDoc.id,
        circleId: inviteData.circleId,
        circle,
        invitedUserId: inviteData.invitedUserId,
        invitedBy: inviteData.invitedBy,
        status: inviteData.status,
        createdAt: inviteData.createdAt?.toDate?.()?.toISOString() || inviteData.createdAt,
        expiresAt: inviteData.expiresAt,
        message: inviteData.message
      });
    }
    
    return invites;
  } catch (error) {
    logger.error('Failed to get user invites:', error);
    return [];
  }
}

// Accept a circle invitation
export async function acceptCircleInvite(
  inviteId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(`User ${userId} accepting invite ${inviteId}`);
    
    // Get the invite
    const inviteDoc = await getDoc(doc(db, 'circleInvites', inviteId));
    if (!inviteDoc.exists()) {
      return {
        success: false,
        message: 'Invitation not found'
      };
    }
    
    const inviteData = inviteDoc.data();
    
    // Verify the invite belongs to this user
    if (inviteData.invitedUserId !== userId) {
      return {
        success: false,
        message: 'This invitation is not for you'
      };
    }
    
    // Check if invite is still pending
    if (inviteData.status !== 'pending') {
      return {
        success: false,
        message: 'This invitation is no longer valid'
      };
    }
    
    // Check if invite has expired
    const expiresAt = new Date(inviteData.expiresAt);
    if (expiresAt < new Date()) {
      await updateDoc(inviteDoc.ref, { status: 'expired' });
      return {
        success: false,
        message: 'This invitation has expired'
      };
    }
    
    // Check if user is already a member
    const isAlreadyMember = await isCircleMember(inviteData.circleId, userId);
    if (isAlreadyMember) {
      await updateDoc(inviteDoc.ref, { status: 'accepted' });
      return {
        success: false,
        message: 'You are already a member of this circle'
      };
    }
    
    const batch = writeBatch(db);
    
    // Add membership
    const membershipRef = doc(collection(db, 'circleMemberships'));
    batch.set(membershipRef, {
      circleId: inviteData.circleId,
      userId: userId,
      role: 'member',
      joinedAt: serverTimestamp(),
      invitedBy: inviteData.invitedBy
    });
    
    // Update invite status
    batch.update(inviteDoc.ref, { status: 'accepted' });
    
    // Update circle member count
    const circleRef = doc(db, 'circles', inviteData.circleId);
    const circleDoc = await getDoc(circleRef);
    if (circleDoc.exists()) {
      const currentCount = circleDoc.data().memberCount || 0;
      batch.update(circleRef, {
        memberCount: currentCount + 1,
        updatedAt: serverTimestamp()
      });
    }
    
    await batch.commit();
    
    logger.info(`User ${userId} accepted invite to circle ${inviteData.circleId}`);
    return {
      success: true,
      message: 'Successfully joined the circle'
    };
  } catch (error) {
    logger.error('Failed to accept circle invite:', error);
    return {
      success: false,
      message: `Failed to accept invitation: ${error}`
    };
  }
}

// Decline a circle invitation
export async function declineCircleInvite(
  inviteId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(`User ${userId} declining invite ${inviteId}`);
    
    // Get the invite
    const inviteDoc = await getDoc(doc(db, 'circleInvites', inviteId));
    if (!inviteDoc.exists()) {
      return {
        success: false,
        message: 'Invitation not found'
      };
    }
    
    const inviteData = inviteDoc.data();
    
    // Verify the invite belongs to this user
    if (inviteData.invitedUserId !== userId) {
      return {
        success: false,
        message: 'This invitation is not for you'
      };
    }
    
    // Check if invite is still pending
    if (inviteData.status !== 'pending') {
      return {
        success: false,
        message: 'This invitation is no longer valid'
      };
    }
    
    // Update invite status
    await updateDoc(inviteDoc.ref, { status: 'declined' });
    
    logger.info(`User ${userId} declined invite to circle ${inviteData.circleId}`);
    return {
      success: true,
      message: 'Invitation declined'
    };
  } catch (error) {
    logger.error('Failed to decline circle invite:', error);
    return {
      success: false,
      message: `Failed to decline invitation: ${error}`
    };
  }
}

// Get all invites for a circle (for admins)
export async function getCircleInvites(
  circleId: string,
  requestingUserId: string
): Promise<CircleInvite[]> {
  try {
    // Check if user is admin of this circle
    const isAdmin = await isCircleAdmin(circleId, requestingUserId);
    if (!isAdmin) {
      logger.warn(`Non-admin user ${requestingUserId} tried to view invites for circle ${circleId}`);
      return [];
    }
    
    const invitesQuery = query(
      collection(db, 'circleInvites'),
      where('circleId', '==', circleId),
      orderBy('createdAt', 'desc')
    );
    const invitesSnapshot = await getDocs(invitesQuery);
    
    const invites: CircleInvite[] = [];
    
    invitesSnapshot.docs.forEach(inviteDoc => {
      const inviteData = inviteDoc.data();
      invites.push({
        id: inviteDoc.id,
        circleId: inviteData.circleId,
        invitedUserId: inviteData.invitedUserId,
        invitedBy: inviteData.invitedBy,
        status: inviteData.status,
        createdAt: inviteData.createdAt?.toDate?.()?.toISOString() || inviteData.createdAt,
        expiresAt: inviteData.expiresAt,
        message: inviteData.message
      });
    });
    
    return invites;
  } catch (error) {
    logger.error('Failed to get circle invites:', error);
    return [];
  }
}

// Cancel an invitation (by inviter or circle admin)
export async function cancelCircleInvite(
  inviteId: string,
  requestingUserId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get the invite
    const inviteDoc = await getDoc(doc(db, 'circleInvites', inviteId));
    if (!inviteDoc.exists()) {
      return {
        success: false,
        message: 'Invitation not found'
      };
    }
    
    const inviteData = inviteDoc.data();
    
    // Check permissions - either the inviter or a circle admin can cancel
    const isInviter = inviteData.invitedBy === requestingUserId;
    const isAdmin = await isCircleAdmin(inviteData.circleId, requestingUserId);
    
    if (!isInviter && !isAdmin) {
      return {
        success: false,
        message: 'You do not have permission to cancel this invitation'
      };
    }
    
    // Check if invite is still pending
    if (inviteData.status !== 'pending') {
      return {
        success: false,
        message: 'This invitation is no longer pending'
      };
    }
    
    // Delete the invite
    await deleteDoc(inviteDoc.ref);
    
    logger.info(`Invite ${inviteId} cancelled by user ${requestingUserId}`);
    return {
      success: true,
      message: 'Invitation cancelled successfully'
    };
  } catch (error) {
    logger.error('Failed to cancel circle invite:', error);
    return {
      success: false,
      message: `Failed to cancel invitation: ${error}`
    };
  }
}

/**
 * Helper Functions
 */

// Check if a user can invite others to a circle
export async function canUserInviteToCircle(circleId: string, userId: string): Promise<boolean> {
  try {
    // Get circle settings
    const circleDoc = await getDoc(doc(db, 'circles', circleId));
    if (!circleDoc.exists()) {
      return false;
    }
    
    const circleData = circleDoc.data();
    const settings = circleData.settings || {};
    
    // Check if user is admin (admins can always invite)
    const isAdmin = await isCircleAdmin(circleId, userId);
    if (isAdmin) {
      return true;
    }
    
    // Check if members can invite and user is a member
    if (settings.allowMemberInvites) {
      return await isCircleMember(circleId, userId);
    }
    
    return false;
  } catch (error) {
    logger.error('Failed to check invite permissions:', error);
    return false;
  }
}

// Clean up expired invites (can be run periodically)
export async function cleanupExpiredInvites(): Promise<{ deletedCount: number }> {
  try {
    logger.info('Starting cleanup of expired invites');
    
    const expiredInvitesQuery = query(
      collection(db, 'circleInvites'),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(expiredInvitesQuery);
    
    const now = new Date();
    const expiredInvites = snapshot.docs.filter(doc => {
      const expiresAt = new Date(doc.data().expiresAt);
      return expiresAt < now;
    });
    
    const batch = writeBatch(db);
    expiredInvites.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
    });
    
    if (expiredInvites.length > 0) {
      await batch.commit();
    }
    
    logger.info(`Marked ${expiredInvites.length} invites as expired`);
    return { deletedCount: expiredInvites.length };
  } catch (error) {
    logger.error('Failed to cleanup expired invites:', error);
    return { deletedCount: 0 };
  }
}