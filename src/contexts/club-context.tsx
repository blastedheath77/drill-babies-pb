'use client';

import React from 'react';
import { CLUB } from '@/config/club';
import type { Club } from '@/lib/types';

/**
 * Single-club shim. The app used to support several clubs; it now serves one.
 * `useClub()` keeps its old shape so existing callers keep working, but always
 * returns the one configured club. New code should import CLUB / CLUB_ID from
 * '@/config/club' directly.
 */
interface ClubContextType {
  selectedClub: Club;
  isLoading: false;
  hasAnyClubs: true;
}

const VALUE: ClubContextType = { selectedClub: CLUB, isLoading: false, hasAnyClubs: true };

export function ClubProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useClub(): ClubContextType {
  return VALUE;
}
