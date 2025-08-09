'use server';

import { revalidatePath } from 'next/cache';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_RATING, DEFAULT_AVATAR_URL } from '@/lib/constants';
import { handleDatabaseError } from '@/lib/errors';
import { createPlayerSchema, validateData } from '@/lib/validations';

export async function addPlayer(values: { name: string; email?: string }) {
  const validatedData = validateData(createPlayerSchema, values);

  const { name, email } = validatedData;

  try {
    await addDoc(collection(db, 'players'), {
      name,
      email: email || '',
      avatar: DEFAULT_AVATAR_URL,
      rating: DEFAULT_RATING,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });

    revalidatePath('/');
    revalidatePath('/players');
    revalidatePath('/statistics');
  } catch (error) {
    handleDatabaseError(error, 'add player');
  }
}
