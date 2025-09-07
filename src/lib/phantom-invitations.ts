/**
 * Phantom Player Email Invitation System
 * 
 * Handles sending email invitations to phantom players so they can
 * claim their player profiles when registering.
 */

import { 
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import type { Player } from './types';

export interface PhantomInvitation {
  id: string;
  playerId: string;
  playerName: string;
  email: string;
  invitedBy: string;
  invitedByName: string;
  status: 'pending' | 'registered' | 'expired';
  message?: string;
  createdAt: string;
  expiresAt: string;
  registeredAt?: string;
  registeredUserId?: string;
}

/**
 * Send an invitation email to a phantom player
 */
export async function invitePhantomPlayer(
  playerId: string,
  inviterUserId: string,
  inviterName: string,
  message?: string
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  try {
    logger.info('Sending phantom player invitation', { playerId, inviterUserId });

    // Get the phantom player details
    const playerDoc = await getDoc(doc(db, 'players', playerId));
    if (!playerDoc.exists()) {
      return {
        success: false,
        error: 'Player not found'
      };
    }

    const player = { id: playerDoc.id, ...playerDoc.data() } as Player;

    // Verify it's a phantom player with an email
    if (!player.isPhantom) {
      return {
        success: false,
        error: 'This player is not a phantom player'
      };
    }

    if (!player.email) {
      return {
        success: false,
        error: 'No email address associated with this phantom player'
      };
    }

    // Check if there's already a pending invitation
    const existingInviteQuery = query(
      collection(db, 'phantomInvitations'),
      where('playerId', '==', playerId),
      where('email', '==', player.email),
      where('status', '==', 'pending')
    );
    const existingInvites = await getDocs(existingInviteQuery);

    if (!existingInvites.empty) {
      return {
        success: false,
        error: 'There is already a pending invitation for this player'
      };
    }

    // Create the invitation record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expire in 30 days

    const invitationData = {
      playerId,
      playerName: player.name,
      email: player.email,
      invitedBy: inviterUserId,
      invitedByName: inviterName,
      status: 'pending' as const,
      message: message?.trim() || '',
      createdAt: serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
    };

    const invitationRef = await addDoc(collection(db, 'phantomInvitations'), invitationData);

    logger.info('Phantom player invitation created', { 
      invitationId: invitationRef.id,
      playerId,
      email: player.email 
    });

    // Here you would integrate with your email service (like Resend)
    // For now, we'll just log the invitation
    logger.info('Email invitation would be sent', {
      to: player.email,
      playerName: player.name,
      inviterName,
      message
    });

    // TODO: Integrate with email service
    // await sendPhantomInvitationEmail({
    //   to: player.email,
    //   playerName: player.name,
    //   inviterName,
    //   message,
    //   invitationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/register?phantom=${playerId}&email=${player.email}`
    // });

    return {
      success: true,
      invitationId: invitationRef.id
    };

  } catch (error) {
    logger.error('Error sending phantom player invitation', { playerId, error });
    return {
      success: false,
      error: 'Failed to send invitation. Please try again.'
    };
  }
}

/**
 * Get all invitations sent for a specific phantom player
 */
export async function getPhantomPlayerInvitations(
  playerId: string
): Promise<PhantomInvitation[]> {
  try {
    const invitationsQuery = query(
      collection(db, 'phantomInvitations'),
      where('playerId', '==', playerId)
    );

    const snapshot = await getDocs(invitationsQuery);
    const invitations: PhantomInvitation[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      invitations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        registeredAt: data.registeredAt?.toDate?.()?.toISOString() || data.registeredAt,
      } as PhantomInvitation);
    });

    return invitations;

  } catch (error) {
    logger.error('Error fetching phantom player invitations', { playerId, error });
    return [];
  }
}

/**
 * Get all invitations sent by a specific user
 */
export async function getUserSentInvitations(
  userId: string
): Promise<PhantomInvitation[]> {
  try {
    const invitationsQuery = query(
      collection(db, 'phantomInvitations'),
      where('invitedBy', '==', userId)
    );

    const snapshot = await getDocs(invitationsQuery);
    const invitations: PhantomInvitation[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      invitations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        registeredAt: data.registeredAt?.toDate?.()?.toISOString() || data.registeredAt,
      } as PhantomInvitation);
    });

    return invitations.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  } catch (error) {
    logger.error('Error fetching user sent invitations', { userId, error });
    return [];
  }
}

/**
 * Mark an invitation as registered when the phantom player claims their profile
 */
export async function markInvitationAsRegistered(
  email: string,
  playerId: string,
  registeredUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the pending invitation
    const invitationsQuery = query(
      collection(db, 'phantomInvitations'),
      where('playerId', '==', playerId),
      where('email', '==', email),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(invitationsQuery);
    
    if (snapshot.empty) {
      // No pending invitation found, which is fine
      return { success: true };
    }

    // Update all pending invitations for this player/email combo
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        status: 'registered',
        registeredAt: serverTimestamp(),
        registeredUserId
      })
    );

    await Promise.all(updatePromises);

    logger.info('Phantom invitations marked as registered', {
      playerId,
      email,
      registeredUserId,
      count: snapshot.docs.length
    });

    return { success: true };

  } catch (error) {
    logger.error('Error marking invitation as registered', { 
      email, 
      playerId, 
      registeredUserId, 
      error 
    });
    return {
      success: false,
      error: 'Failed to update invitation status'
    };
  }
}

/**
 * Check if a phantom player has any pending invitations
 */
export async function hasPhantomPlayerBeenInvited(
  playerId: string
): Promise<boolean> {
  try {
    const invitationsQuery = query(
      collection(db, 'phantomInvitations'),
      where('playerId', '==', playerId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(invitationsQuery);
    return !snapshot.empty;

  } catch (error) {
    logger.error('Error checking phantom player invitations', { playerId, error });
    return false;
  }
}

/**
 * Get phantom players that can be invited (have email but haven't been invited)
 */
export async function getInvitablePhantomPlayers(
  createdBy?: string,
  circleId?: string
): Promise<Player[]> {
  try {
    let playersQuery = query(
      collection(db, 'players'),
      where('isPhantom', '==', true)
    );

    // Filter by circle if provided
    if (circleId) {
      playersQuery = query(
        playersQuery,
        where('circleId', '==', circleId)
      );
    } else if (createdBy) {
      // Optionally filter by creator if no circle specified
      playersQuery = query(
        playersQuery,
        where('createdBy', '==', createdBy)
      );
    }

    const snapshot = await getDocs(playersQuery);
    const invitablePlayers: Player[] = [];

    for (const playerDoc of snapshot.docs) {
      const playerData = playerDoc.data();
      const player = { id: playerDoc.id, ...playerData } as Player;

      // Only include players with email addresses
      if (player.email) {
        // Check if they haven't been invited yet
        const hasInvitation = await hasPhantomPlayerBeenInvited(player.id);
        if (!hasInvitation) {
          invitablePlayers.push(player);
        }
      }
    }

    return invitablePlayers;

  } catch (error) {
    logger.error('Error fetching invitable phantom players', { createdBy, error });
    return [];
  }
}