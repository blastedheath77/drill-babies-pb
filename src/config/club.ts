import type { Club } from '@/lib/types';

/**
 * PBstats runs for a single club. Every stored document still carries this
 * clubId (kept so existing data and Firestore indexes stay valid), but there
 * is no club selection or per-club membership any more.
 */
export const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID ?? 'N2M9BCBuEdE1JKbC93IK';
export const CLUB_NAME = process.env.NEXT_PUBLIC_CLUB_NAME ?? 'DLWest';

export const CLUB: Club = {
  id: CLUB_ID,
  name: CLUB_NAME,
  createdDate: '2025-01-01T00:00:00.000Z',
  createdBy: 'system',
  isActive: true,
};
