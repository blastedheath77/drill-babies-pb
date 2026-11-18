import type { User, UserRole } from './auth-types';
import { CLUB_ID } from '@/config/club';

export interface Permission {
  canCreateTournaments: boolean;
  canModifyTournaments: boolean;
  canDeleteTournaments: boolean;
  canCreatePlayers: boolean;
  canModifyPlayers: boolean;
  canDeletePlayers: boolean;
  canRecordGameResults: boolean;
  canViewTournaments: boolean;
  canViewPlayers: boolean;
  canViewStatistics: boolean;
  // Event permissions
  canCreateEvents: boolean;
  canModifyEvents: boolean;
  canDeleteEvents: boolean;
  canViewEvents: boolean;
}

const ADMIN: Permission = {
  canCreateTournaments: true,
  canModifyTournaments: true,
  canDeleteTournaments: true,
  canCreatePlayers: true,
  canModifyPlayers: true,
  canDeletePlayers: true,
  canRecordGameResults: true,
  canViewTournaments: true,
  canViewPlayers: true,
  canViewStatistics: true,
  canCreateEvents: true,
  canModifyEvents: true,
  canDeleteEvents: true,
  canViewEvents: true,
};

const PLAYER: Permission = {
  canCreateTournaments: true,
  canModifyTournaments: true,
  canDeleteTournaments: false,
  canCreatePlayers: true,
  canModifyPlayers: false,
  canDeletePlayers: false,
  canRecordGameResults: true,
  canViewTournaments: true,
  canViewPlayers: true,
  canViewStatistics: true,
  canCreateEvents: false,
  canModifyEvents: false,
  canDeleteEvents: false,
  canViewEvents: true,
};

const VIEWER: Permission = {
  canCreateTournaments: false,
  canModifyTournaments: false,
  canDeleteTournaments: false,
  canCreatePlayers: false,
  canModifyPlayers: false,
  canDeletePlayers: false,
  canRecordGameResults: false,
  canViewTournaments: true,
  canViewPlayers: true,
  canViewStatistics: true,
  canCreateEvents: false,
  canModifyEvents: false,
  canDeleteEvents: false,
  canViewEvents: true,
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  admin: ADMIN,
  // Legacy role from the multi-club era; treated as a full admin of the club.
  club_admin: ADMIN,
  player: PLAYER,
  viewer: VIEWER,
};

/**
 * Admin of the (single) club. Users who were club admins under the old
 * multi-club model keep admin rights via their legacy clubRoles entry.
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'admin' ||
    user.role === 'club_admin' ||
    user.clubRoles?.[CLUB_ID] === 'club_admin'
  );
}

export function getUserPermissions(user: User | null): Permission {
  if (!user) return VIEWER;
  if (isAdminUser(user)) return ADMIN;
  return ROLE_PERMISSIONS[user.role] ?? VIEWER;
}

export function hasPermission(user: User | null, permission: keyof Permission): boolean {
  return getUserPermissions(user)[permission];
}

export class PermissionError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'PermissionError';
  }
}

export function requirePermission(user: User | null, permission: keyof Permission): void {
  if (!hasPermission(user, permission)) {
    throw new PermissionError(`Permission required: ${permission}`);
  }
}

export function requireAdmin(user: User | null): void {
  if (!isAdminUser(user)) {
    throw new PermissionError('Admin access required');
  }
}
