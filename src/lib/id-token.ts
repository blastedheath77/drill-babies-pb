'use client';

import { auth } from '@/lib/firebase';

/**
 * Returns the signed-in user's Firebase ID token, to pass to server actions
 * (which verify it with requireUser). Throws if nobody is signed in.
 */
export async function getIdToken(): Promise<string> {
  const current = auth?.currentUser;
  if (!current) throw new Error('You must be signed in to do this');
  return current.getIdToken();
}
