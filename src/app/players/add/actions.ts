'use server';

import { requireUser } from '@/lib/server/auth';
import { adminDb, admin } from '@/lib/firebase-admin';
import { createPlayerSchema, validateData } from '@/lib/validations';
import { CLUB_ID } from '@/config/club';
import { DEFAULT_RATING } from '@/lib/constants';

/**
 * Creates a player with fresh stats. Runs on the server because the browser
 * may not write rating/stat fields.
 */
export async function addPlayer(
  idToken: string,
  values: { name: string; email?: string; gender?: 'he' | 'she' | 'they' }
) {
  await requireUser(idToken, { permission: 'canCreatePlayers' });
  const { name } = validateData(createPlayerSchema, { name: values.name });
  const trimmed = name.trim();
  const nameLower = trimmed.toLowerCase();

  const db = adminDb();
  const existing = await db
    .collection('players')
    .where('clubId', '==', CLUB_ID)
    .where('nameLower', '==', nameLower)
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new Error(`Player "${trimmed}" already exists`);
  }

  const ref = await db.collection('players').add({
    name: trimmed,
    nameLower,
    clubId: CLUB_ID,
    avatar: '',
    rating: DEFAULT_RATING,
    wins: 0,
    losses: 0,
    draws: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(values.gender ? { gender: values.gender } : {}),
  });

  return { success: true, playerId: ref.id, message: `Player "${trimmed}" added` };
}
