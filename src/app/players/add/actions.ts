'use server';

import { revalidatePath } from 'next/cache';
import { safeAddPlayer } from '@/lib/database-admin';
import { createPlayerSchema, validateData } from '@/lib/validations';
import { getCurrentUser, requireAuthentication } from '@/lib/server-auth';
import { requirePermission } from '@/lib/permissions';

export async function addPlayer(values: { name: string; email?: string }) {
  // Check authentication and permissions
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);
  requirePermission(currentUser, 'canCreatePlayers');

  const validatedData = validateData(createPlayerSchema, values);
  const { name } = validatedData;

  try {
    // Use the safe add method that checks for duplicates
    const result = await safeAddPlayer({ name });
    
    if (result.success) {
      // Invalidate server-side caches
      revalidatePath('/');
      revalidatePath('/players');
      revalidatePath('/statistics');
      revalidatePath('/log-game');
      
      return { success: true, playerId: result.playerId, message: result.message };
    } else {
      // Player already exists or other error
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error adding player:', error);
    const message = error instanceof Error ? error.message : 'Failed to add player';
    throw new Error(message);
  }
}
