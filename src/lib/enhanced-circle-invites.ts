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
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import { getUserDocument } from './user-management';
import { isCircleMember, isCircleAdmin, canUserInviteToCircle, addUserToCircle, getCircle } from './circles';
import { logCircleInviteSent } from './audit-trail';
import { createNotification } from './notifications';
import type { 
  CircleInvitationRequest, 
  CircleInvitationResponse,
  EmailCircleInvite,
  CircleInvite,
  CircleInviteWithEmail,
  Circle 
} from './types';

/**
 * Enhanced Circle Invitation System
 * 
 * This module extends the circle invitation system to support email-based invites
 * for users who haven't signed up yet, with automatic conversion when they register.
 * Also supports instant addition of phantom players to circles.
 */

/**
 * Check if a player ID represents a phantom player (no claimed user)
 */
async function isPhantomPlayer(playerId: string): Promise<boolean> {
  try {
    const playerDoc = await getDoc(doc(db, 'players', playerId));
    if (!playerDoc.exists()) {
      return false;
    }
    
    const playerData = playerDoc.data();
    return playerData.isPhantom === true && !playerData.claimedByUserId;
  } catch (error) {
    logger.error('Error checking if player is phantom:', error);
    return false;
  }
}

/**
 * Add a phantom player directly to a circle (no invitation needed)
 */
async function addPhantomPlayerToCircle(
  circleId: string, 
  playerId: string, 
  addedBy: string
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(`Adding phantom player ${playerId} to circle ${circleId} by ${addedBy}`);
    
    // Check if player is already a member by checking for existing circleMemberships
    const membershipQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId),
      where('userId', '==', playerId), // For phantom players, userId is the playerId
      limit(1)
    );
    
    const membershipSnapshot = await getDocs(membershipQuery);
    if (!membershipSnapshot.empty) {
      return {
        success: false,
        message: 'Phantom player is already a member of this circle'
      };
    }
    
    // Add phantom player to circle membership
    const membershipData = {
      circleId,
      userId: playerId, // For phantom players, we use playerId as userId
      role: 'member' as const,
      joinedAt: serverTimestamp(),
      addedBy,
      isPhantomPlayer: true // Flag to identify this as a phantom player membership
    };
    
    const membershipRef = doc(collection(db, 'circleMemberships'));
    const circleRef = doc(db, 'circles', circleId);
    
    await runTransaction(db, async (transaction) => {
      // All reads must happen first
      const circleDoc = await transaction.get(circleRef);
      
      // Then all writes
      transaction.set(membershipRef, membershipData);
      
      // Update circle member count
      if (circleDoc.exists()) {
        const currentCount = circleDoc.data().memberCount || 0;
        transaction.update(circleRef, { 
          memberCount: currentCount + 1 
        });
      }
    });
    
    logger.info(`Phantom player ${playerId} successfully added to circle ${circleId}`);
    
    return {
      success: true,
      message: 'Phantom player added to circle successfully'
    };
    
  } catch (error) {
    logger.error('Error adding phantom player to circle:', error);
    return {
      success: false,
      message: 'Failed to add phantom player to circle'
    };
  }
}

/**
 * Universal circle invitation function - handles both user and email invites
 */
export async function sendCircleInvitation(
  invitationRequest: CircleInvitationRequest
): Promise<CircleInvitationResponse> {
  try {
    const { circleId, invitedBy, message, invitedUserId, invitedEmail } = invitationRequest;

    logger.info('Sending circle invitation', { 
      circleId, 
      invitedBy, 
      hasUserId: !!invitedUserId,
      hasEmail: !!invitedEmail
    });

    // Validate invitation request
    if (!invitedUserId && !invitedEmail) {
      return {
        success: false,
        message: 'Must provide either user ID or email address'
      };
    }

    if (invitedUserId && invitedEmail) {
      return {
        success: false,
        message: 'Cannot invite by both user ID and email simultaneously'
      };
    }

    // Check if inviter has permission
    const canInvite = await canUserInviteToCircle(circleId, invitedBy);
    if (!canInvite) {
      return {
        success: false,
        message: 'You do not have permission to invite users to this circle'
      };
    }

    // Route to appropriate invitation method
    if (invitedUserId) {
      return await sendUserCircleInvite(circleId, invitedUserId, invitedBy, message);
    } else {
      return await sendEmailCircleInvite(circleId, invitedEmail!, invitedBy, message);
    }

  } catch (error) {
    logger.error('Error sending circle invitation:', error);
    return {
      success: false,
      message: 'Failed to send invitation due to system error'
    };
  }
}

/**
 * Send invitation to existing user by user ID (existing functionality)
 * Now also handles phantom players by instantly adding them to the circle
 */
export async function sendUserCircleInvite(
  circleId: string,
  invitedUserId: string,
  invitedBy: string,
  message?: string
): Promise<CircleInvitationResponse> {
  try {
    logger.info(`Sending user circle invite: ${invitedBy} -> ${invitedUserId} for circle ${circleId}`);
    
    // First check if this is a phantom player
    const isPhantom = await isPhantomPlayer(invitedUserId);
    if (isPhantom) {
      logger.info(`${invitedUserId} is a phantom player - adding directly to circle`);
      
      const result = await addPhantomPlayerToCircle(circleId, invitedUserId, invitedBy);
      
      if (result.success) {
        return {
          success: true,
          message: 'Phantom player added to circle instantly',
          inviteType: 'phantom_instant'
        };
      } else {
        return {
          success: false,
          message: result.message
        };
      }
    }
    
    // Check if user exists (for regular users)
    const invitedUser = await getUserDocument(invitedUserId);
    if (!invitedUser) {
      return {
        success: false,
        message: 'Invited user not found'
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
    
    // Check if there's already a pending user invite
    const existingUserInviteQuery = query(
      collection(db, 'circleInvites'),
      where('circleId', '==', circleId),
      where('invitedUserId', '==', invitedUserId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const existingUserInviteSnapshot = await getDocs(existingUserInviteQuery);
    
    if (!existingUserInviteSnapshot.empty) {
      return {
        success: false,
        message: 'User already has a pending invitation to this circle'
      };
    }
    
    // Check for pending email invite for this user's email
    if (invitedUser.email) {
      const existingEmailInviteQuery = query(
        collection(db, 'emailCircleInvites'),
        where('circleId', '==', circleId),
        where('invitedEmail', '==', invitedUser.email),
        where('status', '==', 'pending'),
        limit(1)
      );
      const existingEmailInviteSnapshot = await getDocs(existingEmailInviteQuery);
      
      if (!existingEmailInviteSnapshot.empty) {
        return {
          success: false,
          message: 'User already has a pending email invitation to this circle'
        };
      }
    }
    
    // Create expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Create the user invite
    const inviteData = {
      circleId,
      invitedUserId,
      invitedBy,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
      message: message || ''
    };
    
    const inviteRef = await addDoc(collection(db, 'circleInvites'), inviteData);
    
    logger.info(`User circle invite sent successfully: ${inviteRef.id}`);
    
    // Create notification for the invited user
    try {
      const circle = await getCircle(circleId);
      const inviterUser = await getUserDocument(invitedBy);
      
      if (circle && inviterUser) {
        await createNotification({
          userId: invitedUserId,
          type: 'circle_invite',
          title: `Circle Invitation`,
          message: `${inviterUser.name} invited you to join "${circle.name}"`,
          data: {
            circleId: circleId,
            circleName: circle.name,
            inviterId: invitedBy,
            inviterName: inviterUser.name,
            inviteId: inviteRef.id,
            message: message
          },
          expiresAt: expiresAt.toISOString(),
          actionUrl: `/circles/${circleId}`,
          actions: [
            {
              id: 'accept',
              label: 'Accept',
              type: 'primary',
              action: 'accept_circle_invite',
              data: { inviteId: inviteRef.id }
            },
            {
              id: 'decline',
              label: 'Decline',
              type: 'secondary',
              action: 'decline_circle_invite',
              data: { inviteId: inviteRef.id }
            }
          ]
        });
      }
    } catch (notificationError) {
      logger.warn('Failed to create notification for circle invite:', notificationError);
      // Don't fail the entire invitation if notification creation fails
    }
    
    // Log audit event
    await logCircleInviteSent(
      circleId,
      invitedBy,
      invitedUserId
    );
    
    return {
      success: true,
      message: 'Invitation sent successfully',
      inviteId: inviteRef.id,
      inviteType: 'user'
    };

  } catch (error) {
    logger.error('Error sending user circle invite:', error);
    return {
      success: false,
      message: 'Failed to send invitation'
    };
  }
}

/**
 * Send invitation by email address (new functionality)
 */
export async function sendEmailCircleInvite(
  circleId: string,
  invitedEmail: string,
  invitedBy: string,
  message?: string
): Promise<CircleInvitationResponse> {
  try {
    const normalizedEmail = invitedEmail.toLowerCase().trim();
    
    logger.info(`Sending email circle invite: ${invitedBy} -> ${normalizedEmail} for circle ${circleId}`);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return {
        success: false,
        message: 'Invalid email address format'
      };
    }

    // Check if user with this email is already a member
    const existingUserQuery = query(
      collection(db, 'users'),
      where('email', '==', normalizedEmail),
      limit(1)
    );
    const existingUserSnapshot = await getDocs(existingUserQuery);
    
    if (!existingUserSnapshot.empty) {
      const existingUser = existingUserSnapshot.docs[0];
      const isAlreadyMember = await isCircleMember(circleId, existingUser.id);
      
      if (isAlreadyMember) {
        return {
          success: false,
          message: 'User with this email is already a member of this circle'
        };
      }

      // If user exists, send user invite instead
      return await sendUserCircleInvite(circleId, existingUser.id, invitedBy, message);
    }
    
    // Check if there's already a pending email invite
    const existingEmailInviteQuery = query(
      collection(db, 'emailCircleInvites'),
      where('circleId', '==', circleId),
      where('invitedEmail', '==', normalizedEmail),
      where('status', '==', 'pending'),
      limit(1)
    );
    const existingEmailInviteSnapshot = await getDocs(existingEmailInviteQuery);
    
    if (!existingEmailInviteSnapshot.empty) {
      return {
        success: false,
        message: 'An invitation has already been sent to this email address'
      };
    }
    
    // Create expiration date (14 days for email invites - longer since user needs to register)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);
    
    // Create the email invite
    const emailInviteData: Omit<EmailCircleInvite, 'id'> = {
      circleId,
      invitedEmail: normalizedEmail,
      invitedBy,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      message: message || ''
    };
    
    const emailInviteRef = await addDoc(collection(db, 'emailCircleInvites'), emailInviteData);
    
    logger.info(`Email circle invite sent successfully: ${emailInviteRef.id}`);
    
    // Log audit event
    await logCircleInviteSent(
      circleId,
      invitedBy,
      undefined,
      normalizedEmail
    );
    
    return {
      success: true,
      message: 'Email invitation sent successfully',
      inviteId: emailInviteRef.id,
      inviteType: 'email'
    };

  } catch (error) {
    logger.error('Error sending email circle invite:', error);
    return {
      success: false,
      message: 'Failed to send email invitation'
    };
  }
}

/**
 * Get pending email invitations for a specific email address
 */
export async function getPendingEmailInvitesForEmail(email: string): Promise<EmailCircleInvite[]> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    logger.info(`Getting pending email invites for: ${normalizedEmail}`);
    
    const emailInvitesQuery = query(
      collection(db, 'emailCircleInvites'),
      where('invitedEmail', '==', normalizedEmail),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(emailInvitesQuery);
    
    const emailInvites: EmailCircleInvite[] = [];
    
    // Get circle information for each invite
    for (const doc of snapshot.docs) {
      const inviteData = { id: doc.id, ...doc.data() } as EmailCircleInvite;
      
      // Get circle details
      const circleDoc = await getDoc(doc(db, 'circles', inviteData.circleId));
      if (circleDoc.exists()) {
        inviteData.circle = { id: circleDoc.id, ...circleDoc.data() } as Circle;
      }
      
      emailInvites.push(inviteData);
    }
    
    logger.info(`Found ${emailInvites.length} pending email invites for ${normalizedEmail}`);
    
    return emailInvites;
    
  } catch (error) {
    logger.error('Error getting pending email invites:', error);
    return [];
  }
}

/**
 * Convert email invitations to user invitations when user registers
 */
export async function convertEmailInvitesToUserInvites(
  email: string,
  userId: string
): Promise<{
  success: boolean;
  convertedCount: number;
  failed: number;
  errors: string[];
}> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    logger.info(`Converting email invites to user invites: ${normalizedEmail} -> ${userId}`);
    
    const result = {
      success: true,
      convertedCount: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Get pending email invites
    const pendingEmailInvites = await getPendingEmailInvitesForEmail(normalizedEmail);
    
    if (pendingEmailInvites.length === 0) {
      logger.info('No pending email invites found for conversion');
      return result;
    }
    
    // Process each email invite
    for (const emailInvite of pendingEmailInvites) {
      try {
        await runTransaction(db, async (transaction) => {
          // Check if user is already a member of this circle
          const isAlreadyMember = await isCircleMember(emailInvite.circleId, userId);
          if (isAlreadyMember) {
            // User is already a member, mark email invite as converted but don't create user invite
            const emailInviteRef = doc(db, 'emailCircleInvites', emailInvite.id);
            transaction.update(emailInviteRef, {
              status: 'converted',
              convertedToUserId: userId,
              convertedAt: new Date().toISOString()
            });
            return;
          }
          
          // Create user invitation
          const userInviteData = {
            circleId: emailInvite.circleId,
            invitedUserId: userId,
            invitedBy: emailInvite.invitedBy,
            status: 'pending' as const,
            createdAt: serverTimestamp(),
            expiresAt: emailInvite.expiresAt,
            message: emailInvite.message || '',
            convertedFromEmailInvite: emailInvite.id
          };
          
          const userInviteRef = doc(collection(db, 'circleInvites'));
          transaction.set(userInviteRef, userInviteData);
          
          // Mark email invite as converted
          const emailInviteRef = doc(db, 'emailCircleInvites', emailInvite.id);
          transaction.update(emailInviteRef, {
            status: 'converted',
            convertedToUserId: userId,
            convertedAt: new Date().toISOString()
          });
        });
        
        result.convertedCount++;
        logger.info(`Converted email invite ${emailInvite.id} to user invite for ${userId}`);
        
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to convert invite ${emailInvite.id}: ${error}`);
        logger.error(`Error converting email invite ${emailInvite.id}:`, error);
      }
    }
    
    if (result.failed > 0) {
      result.success = false;
    }
    
    logger.info(`Email invite conversion completed: ${result.convertedCount} converted, ${result.failed} failed`);
    
    return result;
    
  } catch (error) {
    logger.error('Error converting email invites to user invites:', error);
    return {
      success: false,
      convertedCount: 0,
      failed: 0,
      errors: ['Conversion failed due to system error']
    };
  }
}

/**
 * Accept an email invitation directly (auto-joins circle if user exists)
 */
export async function acceptEmailInvitation(
  emailInviteId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(`User ${userId} accepting email invitation ${emailInviteId}`);
    
    const result = await runTransaction(db, async (transaction) => {
      // Get the email invitation
      const emailInviteRef = doc(db, 'emailCircleInvites', emailInviteId);
      const emailInviteDoc = await transaction.get(emailInviteRef);
      
      if (!emailInviteDoc.exists()) {
        throw new Error('Email invitation not found');
      }
      
      const emailInvite = { id: emailInviteDoc.id, ...emailInviteDoc.data() } as EmailCircleInvite;
      
      // Validate invitation
      if (emailInvite.status !== 'pending') {
        throw new Error('Invitation is no longer pending');
      }
      
      if (new Date(emailInvite.expiresAt) < new Date()) {
        throw new Error('Invitation has expired');
      }
      
      // Check if user is already a member
      const isAlreadyMember = await isCircleMember(emailInvite.circleId, userId);
      if (isAlreadyMember) {
        // Mark as accepted but user is already a member
        transaction.update(emailInviteRef, {
          status: 'accepted',
          convertedToUserId: userId,
          convertedAt: new Date().toISOString()
        });
        return { success: true, message: 'You are already a member of this circle' };
      }
      
      // Add user to circle
      await addUserToCircle(emailInvite.circleId, userId, 'member', emailInvite.invitedBy);
      
      // Mark email invitation as accepted
      transaction.update(emailInviteRef, {
        status: 'accepted',
        convertedToUserId: userId,
        convertedAt: new Date().toISOString()
      });
      
      return { success: true, message: 'Successfully joined the circle' };
    });
    
    logger.info(`Email invitation ${emailInviteId} accepted by user ${userId}`);
    return result;
    
  } catch (error) {
    logger.error('Error accepting email invitation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to accept invitation'
    };
  }
}

/**
 * Decline an email invitation
 */
export async function declineEmailInvitation(
  emailInviteId: string,
  userId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(`Declining email invitation ${emailInviteId}${userId ? ` by user ${userId}` : ''}`);
    
    const emailInviteRef = doc(db, 'emailCircleInvites', emailInviteId);
    
    await updateDoc(emailInviteRef, {
      status: 'declined',
      ...(userId && { convertedToUserId: userId }),
      convertedAt: new Date().toISOString()
    });
    
    logger.info(`Email invitation ${emailInviteId} declined`);
    
    return {
      success: true,
      message: 'Invitation declined'
    };
    
  } catch (error) {
    logger.error('Error declining email invitation:', error);
    return {
      success: false,
      message: 'Failed to decline invitation'
    };
  }
}

/**
 * Get all circle invitations (both user and email) for admin management
 */
export async function getAllCircleInvitations(
  circleId?: string,
  limit: number = 50
): Promise<{
  userInvites: CircleInviteWithEmail[];
  emailInvites: EmailCircleInvite[];
  total: number;
}> {
  try {
    logger.info('Getting all circle invitations', { circleId, limit });
    
    // Build queries
    const userInvitesQuery = circleId
      ? query(
          collection(db, 'circleInvites'),
          where('circleId', '==', circleId),
          orderBy('createdAt', 'desc'),
          limit(limit)
        )
      : query(
          collection(db, 'circleInvites'),
          orderBy('createdAt', 'desc'),
          limit(limit)
        );
    
    const emailInvitesQuery = circleId
      ? query(
          collection(db, 'emailCircleInvites'),
          where('circleId', '==', circleId),
          orderBy('createdAt', 'desc'),
          limit(limit)
        )
      : query(
          collection(db, 'emailCircleInvites'),
          orderBy('createdAt', 'desc'),
          limit(limit)
        );
    
    // Execute queries in parallel
    const [userInvitesSnapshot, emailInvitesSnapshot] = await Promise.all([
      getDocs(userInvitesQuery),
      getDocs(emailInvitesQuery)
    ]);
    
    // Process user invites and add email information
    const userInvites: CircleInviteWithEmail[] = await Promise.all(
      userInvitesSnapshot.docs.map(async (doc) => {
        const inviteData = { id: doc.id, ...doc.data() } as CircleInvite;
        
        // Get invited user's email
        if (inviteData.invitedUserId) {
          const user = await getUserDocument(inviteData.invitedUserId);
          return {
            ...inviteData,
            invitedUserEmail: user?.email
          } as CircleInviteWithEmail;
        }
        
        return inviteData as CircleInviteWithEmail;
      })
    );
    
    // Process email invites and add circle information
    const emailInvites: EmailCircleInvite[] = await Promise.all(
      emailInvitesSnapshot.docs.map(async (doc) => {
        const inviteData = { id: doc.id, ...doc.data() } as EmailCircleInvite;
        
        // Get circle details
        const circleDoc = await getDoc(doc(db, 'circles', inviteData.circleId));
        if (circleDoc.exists()) {
          inviteData.circle = { id: circleDoc.id, ...circleDoc.data() } as Circle;
        }
        
        return inviteData;
      })
    );
    
    return {
      userInvites,
      emailInvites,
      total: userInvites.length + emailInvites.length
    };
    
  } catch (error) {
    logger.error('Error getting all circle invitations:', error);
    return {
      userInvites: [],
      emailInvites: [],
      total: 0
    };
  }
}

/**
 * Clean up expired invitations
 */
export async function cleanupExpiredInvitations(): Promise<{
  success: boolean;
  userInvitesExpired: number;
  emailInvitesExpired: number;
  errors: string[];
}> {
  try {
    logger.info('Cleaning up expired circle invitations');
    
    const now = new Date().toISOString();
    const result = {
      success: true,
      userInvitesExpired: 0,
      emailInvitesExpired: 0,
      errors: [] as string[]
    };
    
    // Get expired user invites
    const expiredUserInvitesQuery = query(
      collection(db, 'circleInvites'),
      where('status', '==', 'pending'),
      where('expiresAt', '<', now)
    );
    
    const expiredUserInvitesSnapshot = await getDocs(expiredUserInvitesQuery);
    
    // Get expired email invites
    const expiredEmailInvitesQuery = query(
      collection(db, 'emailCircleInvites'),
      where('status', '==', 'pending'),
      where('expiresAt', '<', now)
    );
    
    const expiredEmailInvitesSnapshot = await getDocs(expiredEmailInvitesQuery);
    
    // Update expired user invites
    for (const doc of expiredUserInvitesSnapshot.docs) {
      try {
        await updateDoc(doc.ref, { status: 'expired' });
        result.userInvitesExpired++;
      } catch (error) {
        result.errors.push(`Failed to expire user invite ${doc.id}: ${error}`);
      }
    }
    
    // Update expired email invites
    for (const doc of expiredEmailInvitesSnapshot.docs) {
      try {
        await updateDoc(doc.ref, { status: 'expired' });
        result.emailInvitesExpired++;
      } catch (error) {
        result.errors.push(`Failed to expire email invite ${doc.id}: ${error}`);
      }
    }
    
    if (result.errors.length > 0) {
      result.success = false;
    }
    
    logger.info(`Cleanup completed: ${result.userInvitesExpired} user invites, ${result.emailInvitesExpired} email invites expired`);
    
    return result;
    
  } catch (error) {
    logger.error('Error cleaning up expired invitations:', error);
    return {
      success: false,
      userInvitesExpired: 0,
      emailInvitesExpired: 0,
      errors: ['Cleanup failed due to system error']
    };
  }
}

/**
 * Get invitation statistics for admin dashboard
 */
export async function getInvitationStats(): Promise<{
  userInvites: {
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
  };
  emailInvites: {
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
    converted: number;
  };
}> {
  try {
    logger.info('Getting invitation statistics');
    
    // This would be optimized with aggregation queries in a real implementation
    const [userInvitesSnapshot, emailInvitesSnapshot] = await Promise.all([
      getDocs(collection(db, 'circleInvites')),
      getDocs(collection(db, 'emailCircleInvites'))
    ]);
    
    const userInviteStats = { pending: 0, accepted: 0, declined: 0, expired: 0 };
    userInvitesSnapshot.docs.forEach(doc => {
      const status = doc.data().status;
      userInviteStats[status as keyof typeof userInviteStats]++;
    });
    
    const emailInviteStats = { pending: 0, accepted: 0, declined: 0, expired: 0, converted: 0 };
    emailInvitesSnapshot.docs.forEach(doc => {
      const status = doc.data().status;
      emailInviteStats[status as keyof typeof emailInviteStats]++;
    });
    
    return {
      userInvites: userInviteStats,
      emailInvites: emailInviteStats
    };
    
  } catch (error) {
    logger.error('Error getting invitation statistics:', error);
    return {
      userInvites: { pending: 0, accepted: 0, declined: 0, expired: 0 },
      emailInvites: { pending: 0, accepted: 0, declined: 0, expired: 0, converted: 0 }
    };
  }
}