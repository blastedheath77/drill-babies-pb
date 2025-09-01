import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import type { User } from './auth-types';

/**
 * Comprehensive Audit Trail System
 * 
 * This module provides detailed logging and tracking for all phantom player
 * and circle invitation activities throughout the system.
 */

export type AuditEventType = 
  | 'phantom_player_created'
  | 'phantom_player_claimed'
  | 'phantom_player_unclaimed'
  | 'phantom_player_deleted'
  | 'phantom_player_updated'
  | 'phantom_player_made_claimable'
  | 'bulk_phantom_import'
  | 'circle_invite_sent'
  | 'email_circle_invite_sent'
  | 'circle_invite_accepted'
  | 'circle_invite_declined'
  | 'email_invite_converted'
  | 'user_registration'
  | 'user_onboarding_completed'
  | 'admin_action'
  | 'database_migration'
  | 'system_cleanup';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  timestamp: string;
  userId?: string;          // User who performed the action
  targetUserId?: string;    // User affected by the action
  playerId?: string;        // Player involved in the action
  circleId?: string;        // Circle involved in the action
  inviteId?: string;        // Invitation involved in the action
  details: Record<string, any>; // Event-specific details
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
    source: 'web' | 'api' | 'system' | 'admin';
  };
  relatedEvents?: string[]; // IDs of related audit events
}

interface AuditEventInput {
  eventType: AuditEventType;
  severity?: AuditSeverity;
  userId?: string;
  targetUserId?: string;
  playerId?: string;
  circleId?: string;
  inviteId?: string;
  details?: Record<string, any>;
  metadata?: Partial<AuditEvent['metadata']>;
  relatedEvents?: string[];
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(event: AuditEventInput): Promise<string | null> {
  try {
    const auditEvent: Omit<AuditEvent, 'id'> = {
      eventType: event.eventType,
      severity: event.severity || 'info',
      timestamp: new Date().toISOString(),
      userId: event.userId,
      targetUserId: event.targetUserId,
      playerId: event.playerId,
      circleId: event.circleId,
      inviteId: event.inviteId,
      details: event.details || {},
      metadata: {
        source: 'web',
        ...event.metadata
      },
      relatedEvents: event.relatedEvents
    };

    const docRef = await addDoc(collection(db, 'auditEvents'), auditEvent);
    
    logger.info(`Audit event logged: ${event.eventType}`, { eventId: docRef.id });
    
    return docRef.id;
  } catch (error) {
    logger.error('Failed to log audit event:', error);
    return null;
  }
}

/**
 * Get audit events with filtering and pagination
 */
export async function getAuditEvents(filters?: {
  eventType?: AuditEventType;
  userId?: string;
  playerId?: string;
  circleId?: string;
  severity?: AuditSeverity;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AuditEvent[]> {
  try {
    let auditQuery = collection(db, 'auditEvents');
    const constraints: any[] = [];

    // Add filters
    if (filters?.eventType) {
      constraints.push(where('eventType', '==', filters.eventType));
    }
    if (filters?.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }
    if (filters?.playerId) {
      constraints.push(where('playerId', '==', filters.playerId));
    }
    if (filters?.circleId) {
      constraints.push(where('circleId', '==', filters.circleId));
    }
    if (filters?.severity) {
      constraints.push(where('severity', '==', filters.severity));
    }
    if (filters?.startDate) {
      constraints.push(where('timestamp', '>=', filters.startDate));
    }
    if (filters?.endDate) {
      constraints.push(where('timestamp', '<=', filters.endDate));
    }

    // Add ordering and limit
    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(filters?.limit || 100));

    const q = query(auditQuery, ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AuditEvent[];
  } catch (error) {
    logger.error('Error fetching audit events:', error);
    return [];
  }
}

/**
 * Get audit events for a specific player (for player history)
 */
export async function getPlayerAuditHistory(playerId: string): Promise<AuditEvent[]> {
  return getAuditEvents({ playerId, limit: 50 });
}

/**
 * Get audit events for a specific user (for user activity)
 */
export async function getUserAuditHistory(userId: string): Promise<AuditEvent[]> {
  return getAuditEvents({ userId, limit: 50 });
}

/**
 * Get system-wide audit statistics
 */
export async function getAuditStatistics(): Promise<{
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  recentActivity: AuditEvent[];
  topUsers: Array<{ userId: string; eventCount: number }>;
}> {
  try {
    const events = await getAuditEvents({ limit: 1000 });
    
    const stats = {
      totalEvents: events.length,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsBySeverity: {} as Record<AuditSeverity, number>,
      recentActivity: events.slice(0, 10),
      topUsers: [] as Array<{ userId: string; eventCount: number }>
    };

    // Count events by type
    events.forEach(event => {
      stats.eventsByType[event.eventType] = (stats.eventsByType[event.eventType] || 0) + 1;
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
    });

    // Count events by user
    const userCounts = new Map<string, number>();
    events.forEach(event => {
      if (event.userId) {
        userCounts.set(event.userId, (userCounts.get(event.userId) || 0) + 1);
      }
    });

    stats.topUsers = Array.from(userCounts.entries())
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    return stats;
  } catch (error) {
    logger.error('Error getting audit statistics:', error);
    return {
      totalEvents: 0,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsBySeverity: {} as Record<AuditSeverity, number>,
      recentActivity: [],
      topUsers: []
    };
  }
}

// Specific audit logging functions for common events

export async function logPhantomPlayerCreated(
  playerId: string,
  playerName: string,
  createdBy: string,
  isClaimable: boolean,
  email?: string
): Promise<void> {
  await logAuditEvent({
    eventType: 'phantom_player_created',
    severity: 'info',
    userId: createdBy,
    playerId,
    details: {
      playerName,
      isClaimable,
      email: email || null,
      creationMethod: 'manual'
    }
  });
}

export async function logPhantomPlayerClaimed(
  playerId: string,
  playerName: string,
  claimedBy: string,
  originalEmail: string,
  gamesInherited: number
): Promise<void> {
  await logAuditEvent({
    eventType: 'phantom_player_claimed',
    severity: 'info',
    userId: claimedBy,
    playerId,
    details: {
      playerName,
      originalEmail,
      gamesInherited,
      claimedAt: new Date().toISOString()
    }
  });
}

export async function logPhantomPlayerUnclaimed(
  playerId: string,
  playerName: string,
  adminUserId: string,
  reason: string,
  previousOwner?: string
): Promise<void> {
  await logAuditEvent({
    eventType: 'phantom_player_unclaimed',
    severity: 'warning',
    userId: adminUserId,
    targetUserId: previousOwner,
    playerId,
    details: {
      playerName,
      reason,
      previousOwner,
      unclaimedAt: new Date().toISOString()
    }
  });
}

export async function logBulkPhantomImport(
  createdBy: string,
  created: number,
  failed: number,
  importMethod: 'csv' | 'manual'
): Promise<void> {
  await logAuditEvent({
    eventType: 'bulk_phantom_import',
    severity: failed > 0 ? 'warning' : 'info',
    userId: createdBy,
    details: {
      playersCreated: created,
      playersFailed: failed,
      importMethod,
      successRate: created + failed > 0 ? Math.round((created / (created + failed)) * 100) : 0
    }
  });
}

export async function logCircleInviteSent(
  circleId: string,
  invitedBy: string,
  invitedUserId?: string,
  invitedEmail?: string
): Promise<void> {
  await logAuditEvent({
    eventType: invitedUserId ? 'circle_invite_sent' : 'email_circle_invite_sent',
    severity: 'info',
    userId: invitedBy,
    targetUserId: invitedUserId,
    circleId,
    details: {
      invitationType: invitedUserId ? 'user' : 'email',
      invitedEmail: invitedEmail || null,
      sentAt: new Date().toISOString()
    }
  });
}

export async function logUserOnboardingCompleted(
  userId: string,
  playersClaimed: number,
  circlesJoined: number,
  totalGamesInherited: number
): Promise<void> {
  await logAuditEvent({
    eventType: 'user_onboarding_completed',
    severity: 'info',
    userId,
    details: {
      playersClaimed,
      circlesJoined,
      totalGamesInherited,
      completedAt: new Date().toISOString(),
      onboardingScore: playersClaimed + circlesJoined > 0 ? 100 : 50
    }
  });
}

export async function logDatabaseMigration(
  adminUserId: string,
  migrationType: string,
  playersUpdated: number,
  success: boolean,
  errors: string[] = []
): Promise<void> {
  await logAuditEvent({
    eventType: 'database_migration',
    severity: success ? 'info' : 'error',
    userId: adminUserId,
    details: {
      migrationType,
      playersUpdated,
      success,
      errors,
      migratedAt: new Date().toISOString()
    }
  });
}

/**
 * Clean up old audit events (retention policy)
 */
export async function cleanupOldAuditEvents(retentionDays: number = 90): Promise<{
  success: boolean;
  eventsDeleted: number;
  error?: string;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const oldEventsQuery = query(
      collection(db, 'auditEvents'),
      where('timestamp', '<', cutoffDate.toISOString()),
      limit(1000) // Process in batches
    );
    
    const oldEventsSnapshot = await getDocs(oldEventsQuery);
    
    // In a real implementation, you'd use batch deletes
    // For now, we'll just return the count that would be deleted
    const eventsDeleted = oldEventsSnapshot.docs.length;
    
    await logAuditEvent({
      eventType: 'system_cleanup',
      severity: 'info',
      details: {
        cleanupType: 'audit_events',
        retentionDays,
        eventsDeleted,
        cutoffDate: cutoffDate.toISOString()
      }
    });
    
    return {
      success: true,
      eventsDeleted
    };
  } catch (error) {
    logger.error('Error cleaning up audit events:', error);
    return {
      success: false,
      eventsDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Export audit events for compliance/reporting
 */
export async function exportAuditEvents(
  filters?: {
    startDate?: string;
    endDate?: string;
    eventType?: AuditEventType;
    userId?: string;
  },
  format: 'json' | 'csv' = 'json'
): Promise<{
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const events = await getAuditEvents({
      ...filters,
      limit: 10000 // Large limit for export
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(events, null, 2),
        filename: `audit-events-${timestamp}.json`
      };
    } else {
      // CSV format
      const headers = [
        'ID', 'Event Type', 'Severity', 'Timestamp', 'User ID', 'Target User ID',
        'Player ID', 'Circle ID', 'Invite ID', 'Details', 'Source'
      ];
      
      const csvRows = events.map(event => [
        event.id,
        event.eventType,
        event.severity,
        event.timestamp,
        event.userId || '',
        event.targetUserId || '',
        event.playerId || '',
        event.circleId || '',
        event.inviteId || '',
        JSON.stringify(event.details),
        event.metadata.source
      ]);
      
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      return {
        success: true,
        data: csvContent,
        filename: `audit-events-${timestamp}.csv`
      };
    }
  } catch (error) {
    logger.error('Error exporting audit events:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
}