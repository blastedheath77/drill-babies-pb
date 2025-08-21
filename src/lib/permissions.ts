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