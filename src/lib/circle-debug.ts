/**
 * Circle Filtering Debug Utilities
 * 
 * These functions help diagnose circle filtering issues by providing
 * detailed information about circle memberships, player associations,
 * and data integrity.
 */

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import type { Circle, Player } from './types';

export interface CircleDebugInfo {
  circleId: string;
  circleName: string;
  memberships: Array<{
    userId: string;
    joinedAt: any;
  }>;
  claimedPlayers: Player[];
  phantomPlayers: Player[];
  totalPlayers: number;
}

export interface UserCircleDebugInfo {
  userId: string;
  circles: CircleDebugInfo[];
  totalUniquePlayersAcrossCircles: number;
}

/**
 * Get detailed debugging information for a specific circle
 */
export async function debugCircleData(circleId: string): Promise<CircleDebugInfo> {
  logger.info(`[debugCircleData] Starting debug for circle: ${circleId}`);
  
  try {
    // Get circle info
    const circleDoc = await getDoc(doc(db, 'circles', circleId));
    const circleName = circleDoc.exists() ? circleDoc.data().name : 'Unknown Circle';
    
    // Get memberships
    const membershipsQuery = query(
      collection(db, 'circleMemberships'),
      where('circleId', '==', circleId)
    );
    const membershipsSnapshot = await getDocs(membershipsQuery);
    const memberships = membershipsSnapshot.docs.map(doc => ({
      userId: doc.data().userId,
      joinedAt: doc.data().joinedAt
    }));
    
    logger.info(`[debugCircleData] Circle ${circleName} has ${memberships.length} memberships`);
    
    // Get claimed players for these users
    const userIds = memberships.map(m => m.userId);
    const claimedPlayers: Player[] = [];
    
    if (userIds.length > 0) {
      const BATCH_SIZE = 10;
      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);
        
        const playersQuery = query(
          collection(db, 'players'),
          where('claimedByUserId', 'in', batch)
        );
        
        const playersSnapshot = await getDocs(playersQuery);
        const batchPlayers = playersSnapshot.docs.map(doc => {
          const data = doc.data();
          const { createdAt, updatedAt, nameLower, ...cleanData } = data;
          return { id: doc.id, ...cleanData } as Player;
        });
        
        claimedPlayers.push(...batchPlayers);
      }
    }
    
    // Get phantom players for this circle
    const phantomQuery = query(
      collection(db, 'players'),
      where('circleId', '==', circleId),
      where('isPhantom', '==', true)
    );
    const phantomSnapshot = await getDocs(phantomQuery);
    const phantomPlayers = phantomSnapshot.docs.map(doc => {
      const data = doc.data();
      const { createdAt, updatedAt, nameLower, ...cleanData } = data;
      return { id: doc.id, ...cleanData } as Player;
    });
    
    const debugInfo: CircleDebugInfo = {
      circleId,
      circleName,
      memberships,
      claimedPlayers,
      phantomPlayers,
      totalPlayers: claimedPlayers.length + phantomPlayers.length
    };
    
    logger.info(`[debugCircleData] Circle ${circleName} debug complete:`, {
      memberships: memberships.length,
      claimedPlayers: claimedPlayers.length,
      phantomPlayers: phantomPlayers.length,
      totalPlayers: debugInfo.totalPlayers
    });
    
    return debugInfo;
    
  } catch (error) {
    logger.error(`[debugCircleData] Error debugging circle ${circleId}:`, error);
    return {
      circleId,
      circleName: 'Error',
      memberships: [],
      claimedPlayers: [],
      phantomPlayers: [],
      totalPlayers: 0
    };
  }
}

/**
 * Get detailed debugging information for a user's circles
 */
export async function debugUserCircles(userId: string): Promise<UserCircleDebugInfo> {
  logger.info(`[debugUserCircles] Starting debug for user: ${userId}`);
  
  try {
    // Get user's circle memberships
    const membershipsQuery = query(
      collection(db, 'circleMemberships'),
      where('userId', '==', userId)
    );
    const membershipsSnapshot = await getDocs(membershipsQuery);
    const circleIds = membershipsSnapshot.docs.map(doc => doc.data().circleId);
    
    logger.info(`[debugUserCircles] User ${userId} is member of ${circleIds.length} circles`);
    
    // Debug each circle
    const circles: CircleDebugInfo[] = [];
    for (const circleId of circleIds) {
      const circleDebugInfo = await debugCircleData(circleId);
      circles.push(circleDebugInfo);
    }
    
    // Calculate total unique players across all circles
    const allPlayerIds = new Set<string>();
    circles.forEach(circle => {
      circle.claimedPlayers.forEach(player => allPlayerIds.add(player.id));
      circle.phantomPlayers.forEach(player => allPlayerIds.add(player.id));
    });
    
    const debugInfo: UserCircleDebugInfo = {
      userId,
      circles,
      totalUniquePlayersAcrossCircles: allPlayerIds.size
    };
    
    logger.info(`[debugUserCircles] User ${userId} debug complete:`, {
      circleCount: circles.length,
      totalUniquePlayersAcrossCircles: debugInfo.totalUniquePlayersAcrossCircles
    });
    
    return debugInfo;
    
  } catch (error) {
    logger.error(`[debugUserCircles] Error debugging user circles for ${userId}:`, error);
    return {
      userId,
      circles: [],
      totalUniquePlayersAcrossCircles: 0
    };
  }
}

/**
 * Console log formatted debug information
 */
export function logCircleDebugInfo(debugInfo: CircleDebugInfo) {
  console.group(`🔍 Circle Debug: ${debugInfo.circleName} (${debugInfo.circleId})`);
  console.log(`👥 Memberships: ${debugInfo.memberships.length}`);
  debugInfo.memberships.forEach(membership => {
    console.log(`  - User: ${membership.userId}`);
  });
  console.log(`🎾 Claimed Players: ${debugInfo.claimedPlayers.length}`);
  debugInfo.claimedPlayers.forEach(player => {
    console.log(`  - ${player.name} (${player.id}) - Claimed by: ${player.claimedByUserId}`);
  });
  console.log(`👻 Phantom Players: ${debugInfo.phantomPlayers.length}`);
  debugInfo.phantomPlayers.forEach(player => {
    console.log(`  - ${player.name} (${player.id})`);
  });
  console.log(`📊 Total Players: ${debugInfo.totalPlayers}`);
  console.groupEnd();
}

/**
 * Console log formatted user debug information
 */
export function logUserCircleDebugInfo(debugInfo: UserCircleDebugInfo) {
  console.group(`🔍 User Circle Debug: ${debugInfo.userId}`);
  console.log(`🎯 Total Circles: ${debugInfo.circles.length}`);
  console.log(`🎾 Total Unique Players Across All Circles: ${debugInfo.totalUniquePlayersAcrossCircles}`);
  
  debugInfo.circles.forEach(circle => {
    console.log(`\n📍 Circle: ${circle.circleName}`);
    console.log(`  Memberships: ${circle.memberships.length}, Players: ${circle.totalPlayers}`);
  });
  
  console.groupEnd();
}

/**
 * Quick debugging function for development
 * Call this from browser console: window.debugCircleFiltering()
 */
export function setupCircleDebugging() {
  if (typeof window !== 'undefined') {
    (window as any).debugCircleFiltering = async (circleId?: string, userId?: string) => {
      if (circleId) {
        const debugInfo = await debugCircleData(circleId);
        logCircleDebugInfo(debugInfo);
        return debugInfo;
      }
      
      if (userId) {
        const debugInfo = await debugUserCircles(userId);
        logUserCircleDebugInfo(debugInfo);
        return debugInfo;
      }
      
      console.log('Usage: debugCircleFiltering(circleId) or debugCircleFiltering(null, userId)');
    };
    
    console.log('🔧 Circle debugging available: call debugCircleFiltering(circleId) or debugCircleFiltering(null, userId)');
  }
}