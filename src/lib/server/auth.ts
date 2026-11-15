import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { CLUB_ID } from '@/config/club';
import { getUserPermissions, isAdminUser, type Permission } from '@/lib/permissions';
import type { User, UserRole } from '@/lib/auth-types';

export class AuthenticationError extends Error {
  constructor(message = 'You must be signed in to do this') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission to do this') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

interface RequireUserOptions {
  /** Require admin rights (including legacy club admins). */
  admin?: boolean;
  /** Require a specific permission from ROLE_PERMISSIONS. */
  permission?: keyof Permission;
}

/**
 * Verifies a Firebase ID token sent from the browser and loads the caller's
 * user document. Server actions must call this before touching data, because
 * server actions are public HTTP endpoints.
 */
export async function requireUser(
  idToken: string | undefined | null,
  options: RequireUserOptions = {}
): Promise<User> {
  if (!idToken) throw new AuthenticationError();

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    throw new AuthenticationError('Your session has expired. Please sign in again.');
  }

  const snap = await adminDb().collection('users').doc(uid).get();
  if (!snap.exists) throw new AuthorizationError('No member profile found for this account');

  const data = snap.data()!;
  const user: User = {
    id: uid,
    name: data.name,
    email: data.email,
    role: data.role as UserRole,
    createdAt: data.createdAt?.toDate?.().toISOString?.() ?? '',
    clubMemberships: data.clubMemberships,
    clubRoles: data.clubRoles,
  };

  const isMember = isAdminUser(user) || (user.clubMemberships ?? []).includes(CLUB_ID);
  if (!isMember) throw new AuthorizationError('You are not a member of this club');

  if (options.admin && !isAdminUser(user)) {
    throw new AuthorizationError('Admin access required');
  }
  if (options.permission && !getUserPermissions(user)[options.permission]) {
    throw new AuthorizationError();
  }

  return user;
}
