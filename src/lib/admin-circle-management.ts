'use server';

import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import { getPlayers } from './data';
import { getUserCircles, updateCircleMemberCount } from './circles';
import type { Player, Circle } from './types';

/**
 * Admin functions for managing circle memberships directly
 */

// Get all circles and their member counts
export async function getAllCirclesWithStats(): Promise<Array<Circle & { memberCount: number }>> {
  try {
    const circlesSnapshot = await getDocs(collection(db, 'circles'));
    const circles: Array<Circle & { memberCount: number }> = [];

    for (const circleDoc of circlesSnapshot.docs) {
      const circleData = circleDoc.data();
      
      // Get actual member count from memberships
      const membershipsQuery = query(
        collection(db, 'circleMemberships'),
        where('circleId', '==', circleDoc.id)
      );
      const membershipsSnapshot = await getDocs(membershipsQuery);
      const actualMemberCount = membershipsSnapshot.size;

      circles.push({
        id: circleDoc.id,
        name: circleData.name,
        description: circleData.description,
        createdBy: circleData.createdBy,
        createdAt: circleData.createdAt?.toDate?.()?.toISOString() || circleData.createdAt,
        updatedAt: circleData.updatedAt?.toDate?.()?.toISOString() || circleData.updatedAt,
        isPrivate: circleData.isPrivate,
        memberCount: actualMemberCount,
        settings: circleData.settings
      });
    }

    return circles.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    logger.error('Failed to get all circles:', error);
    return [];
  }
}

// Get players and their circle memberships
export async function getPlayersWithCircleInfo(): Promise<Array<Player & { 
  circleIds: string[];
  circleNames: string[];
}>> {
  try {
    const [players, circles] = await Promise.all([
      getPlayers(),
      getAllCirclesWithStats()
    ]);

    const circleMap = circles.reduce((map, circle) => {
      map[circle.id] = circle.name;
      return map;
    }, {} as Record<string, string>);

    // Get all memberships
    const membershipsSnapshot = await getDocs(collection(db, 'circleMemberships'));
    const userCircles = new Map<string, { circleIds: string[]; circleNames: string[] }>();

    membershipsSnapshot.docs.forEach(doc => {
      const membership = doc.data();
      const userId = membership.userId;
      const circleId = membership.circleId;
      const circleName = circleMap[circleId] || 'Unknown Circle';

      if (!userCircles.has(userId)) {
        userCircles.set(userId, { circleIds: [], circleNames: [] });
      }

      const userCircleData = userCircles.get(userId)!;
      userCircleData.circleIds.push(circleId);
      userCircleData.circleNames.push(circleName);
    });

    return players.map(player => ({
      ...player,
      circleIds: userCircles.get(player.id)?.circleIds || [],
      circleNames: userCircles.get(player.id)?.circleNames || []
    }));
  } catch (error) {
    logger.error('Failed to get players with circle info:', error);
    return [];
  }
}

// Add a player to a circle
export async function addPlayerToCircle(
  playerId: string,
  circleId: string,
  adminUserId: string
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(`Admin ${adminUserId} adding player ${playerId} to circle ${circleId}`);

    // Check if membership already exists
    const existingMembershipQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId),
      where('userId', '==', playerId)
    );
    const existingSnapshot = await getDocs(existingMembershipQuery);

    if (!existingSnapshot.empty) {
      return {
        success: false,
        message: 'Player is already a member of this circle'
      };
    }

    // Add the membership
    await addDoc(collection(db, 'circleMemberships'), {
      circleId,
      userId: playerId,
      role: 'member',
      joinedAt: serverTimestamp(),
      invitedBy: adminUserId // Track that admin added them
    });

    // ALSO update the player document with circleId for fast queries
    const playerRef = doc(db, 'players', playerId);
    await updateDoc(playerRef, {
      circleId: circleId
    });

    // Update circle member count
    await updateCircleMemberCount(circleId);

    logger.info(`Player ${playerId} added to circle ${circleId} by admin (updated both membership and player.circleId)`);
    return {
      success: true,
      message: 'Player added to circle successfully'
    };
  } catch (error) {
    logger.error('Failed to add player to circle:', error);
    return {
      success: false,
      message: `Failed to add player to circle: ${error}`
    };
  }
}

// Remove a player from a circle
export async function removePlayerFromCircle(
  playerId: string,
  circleId: string,
  adminUserId: string
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(`Admin ${adminUserId} removing player ${playerId} from circle ${circleId}`);

    // Find the membership
    const membershipQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId),
      where('userId', '==', playerId)
    );
    const membershipSnapshot = await getDocs(membershipQuery);

    if (membershipSnapshot.empty) {
      return {
        success: false,
        message: 'Player is not a member of this circle'
      };
    }

    // Delete the membership
    const membershipDoc = membershipSnapshot.docs[0];
    await deleteDoc(membershipDoc.ref);

    // ALSO remove the circleId from the player document
    const playerRef = doc(db, 'players', playerId);
    await updateDoc(playerRef, {
      circleId: null
    });

    // Update circle member count
    await updateCircleMemberCount(circleId);

    logger.info(`Player ${playerId} removed from circle ${circleId} by admin (removed both membership and player.circleId)`);
    return {
      success: true,
      message: 'Player removed from circle successfully'
    };
  } catch (error) {
    logger.error('Failed to remove player from circle:', error);
    return {
      success: false,
      message: `Failed to remove player from circle: ${error}`
    };
  }
}

// Bulk assign players to a circle
export async function bulkAssignPlayersToCircle(
  playerIds: string[],
  circleId: string,
  adminUserId: string,
  replace: boolean = false // If true, removes all existing members first
): Promise<{ success: boolean; message: string; added: number; skipped: number }> {
  try {
    logger.info(`Admin ${adminUserId} bulk assigning ${playerIds.length} players to circle ${circleId}, replace=${replace}`);

    const batch = writeBatch(db);
    let added = 0;
    let skipped = 0;

    // If replace mode, remove all existing members first
    if (replace) {
      const existingMembersQuery = query(
        collection(db, 'circleMemberships'),
        where('circleId', '==', circleId)
      );
      const existingMembersSnapshot = await getDocs(existingMembersQuery);
      
      existingMembersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // Get existing memberships to avoid duplicates
    const existingMembershipQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId)
    );
    const existingSnapshot = await getDocs(existingMembershipQuery);
    const existingMemberIds = new Set(
      existingSnapshot.docs.map(doc => doc.data().userId)
    );

    // Add new memberships
    for (const playerId of playerIds) {
      if (!replace && existingMemberIds.has(playerId)) {
        skipped++;
        continue;
      }

      const membershipRef = doc(collection(db, 'circleMemberships'));
      batch.set(membershipRef, {
        circleId,
        userId: playerId,
        role: 'member',
        joinedAt: serverTimestamp(),
        invitedBy: adminUserId
      });
      added++;
    }

    await batch.commit();

    // Update circle member count
    await updateCircleMemberCount(circleId);

    const message = replace 
      ? `Circle membership replaced: ${added} players added`
      : `Bulk assignment complete: ${added} added, ${skipped} skipped (already members)`;

    logger.info(`Bulk assignment complete for circle ${circleId}: ${added} added, ${skipped} skipped`);
    return {
      success: true,
      message,
      added,
      skipped
    };
  } catch (error) {
    logger.error('Failed to bulk assign players:', error);
    return {
      success: false,
      message: `Failed to bulk assign players: ${error}`,
      added: 0,
      skipped: 0
    };
  }
}

// Get circle management statistics
export async function getCircleManagementStats(): Promise<{
  totalCircles: number;
  totalMemberships: number;
  playersWithCircles: number;
  playersWithoutCircles: number;
  averageMembersPerCircle: number;
}> {
  try {
    const [circlesSnapshot, membershipsSnapshot, players] = await Promise.all([
      getDocs(collection(db, 'circles')),
      getDocs(collection(db, 'circleMemberships')),
      getPlayers()
    ]);

    const totalCircles = circlesSnapshot.size;
    const totalMemberships = membershipsSnapshot.size;

    // Count unique players with circles
    const playersWithCircles = new Set(
      membershipsSnapshot.docs.map(doc => doc.data().userId)
    ).size;

    const playersWithoutCircles = players.length - playersWithCircles;
    const averageMembersPerCircle = totalCircles > 0 ? totalMemberships / totalCircles : 0;

    return {
      totalCircles,
      totalMemberships,
      playersWithCircles,
      playersWithoutCircles,
      averageMembersPerCircle: Math.round(averageMembersPerCircle * 10) / 10
    };
  } catch (error) {
    logger.error('Failed to get circle management stats:', error);
    return {
      totalCircles: 0,
      totalMemberships: 0,
      playersWithCircles: 0,
      playersWithoutCircles: 0,
      averageMembersPerCircle: 0
    };
  }
}