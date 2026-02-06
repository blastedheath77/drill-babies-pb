import type { User, UserRole } from './auth-types';

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
  // Club permissions
  canCreateClubs: boolean;
  canManageAllClubs: boolean;
  canManageOwnClub: boolean;
  canInviteToClub: boolean;
  canRemoveFromClub: boolean;
  // Event permissions
  canCreateEvents: boolean;
  canModifyEvents: boolean;
  canDeleteEvents: boolean;
  canViewEvents: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
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
    canCreateClubs: true,
    canManageAllClubs: true,
    canManageOwnClub: true,
    canInviteToClub: true,
    canRemoveFromClub: true,
    canCreateEvents: true,
    canModifyEvents: true,
    canDeleteEvents: true,
    canViewEvents: true,
  },
  club_admin: {
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
    canCreateClubs: false,
    canManageAllClubs: false,
    canManageOwnClub: true,
    canInviteToClub: true,
    canRemoveFromClub: true,
    canCreateEvents: true,
    canModifyEvents: true,
    canDeleteEvents: true,
    canViewEvents: true,
  },
  player: {
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
    canCreateClubs: false,
    canManageAllClubs: false,
    canManageOwnClub: false,
    canInviteToClub: false,
    canRemoveFromClub: false,
    canCreateEvents: false,
    canModifyEvents: false,
    canDeleteEvents: false,
    canViewEvents: true,
  },
  viewer: {
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
    canCreateClubs: false,
    canManageAllClubs: false,
    canManageOwnClub: false,
    canInviteToClub: false,
    canRemoveFromClub: false,
    canCreateEvents: false,
    canModifyEvents: false,
    canDeleteEvents: false,
    canViewEvents: true,
  },
};

export function getUserPermissions(user: User | null): Permission {
  if (!user) {
    return ROLE_PERMISSIONS.viewer; // Non-authenticated users have viewer permissions
  }
  return ROLE_PERMISSIONS[user.role];
}

export function hasPermission(user: User | null, permission: keyof Permission): boolean {
  const permissions = getUserPermissions(user);
  return permissions[permission];
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

// Club-specific permission helpers
export function isClubAdmin(user: User | null, clubId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true; // Global admin has access to all clubs
  return user.clubRoles?.[clubId] === 'club_admin';
}

export function hasClubAccess(user: User | null, clubId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true; // Global admin has access to all clubs
  return user.clubMemberships?.includes(clubId) ?? false;
}