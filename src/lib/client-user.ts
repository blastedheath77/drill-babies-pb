'use client';

import { auth } from '@/lib/firebase';
import { getUserDocument } from '@/lib/user-management';
import type { User } from '@/lib/auth-types';

/**
 * The signed-in member, for code that writes to Firestore from the browser.
 * Firestore security rules are what actually enforce access; this just gives
 * friendly errors and a real user id for createdBy fields.
 */
export async function getCurrentUser(): Promise<User | null> {
  const uid = auth?.currentUser?.uid;
  if (!uid) return null;
  return getUserDocument(uid);
}

export class AuthenticationError extends Error {
  constructor(message = 'You must be signed in to do this') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export function requireAuthentication(user: User | null): asserts user is User {
  if (!user) throw new AuthenticationError();
}
