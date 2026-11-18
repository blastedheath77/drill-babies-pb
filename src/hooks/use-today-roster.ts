'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * "Here today": the players checked in at this session, remembered on this
 * device for the current day only. Stored in localStorage; every access is
 * wrapped so private mode or blocked storage just means an empty roster.
 */
const PREFIX = 'pbstats.roster.';

function todayKey() {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return PREFIX + ymd;
}

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(todayKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(todayKey(), JSON.stringify(ids));
    // Drop rosters from earlier days
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX) && k !== todayKey()) window.localStorage.removeItem(k);
    }
  } catch {
    /* storage unavailable: roster lives only in memory */
  }
}

const listeners = new Set<(ids: string[]) => void>();

export function useTodayRoster() {
  const [roster, setRoster] = useState<string[]>([]);

  useEffect(() => {
    setRoster(read());
    const onChange = (ids: string[]) => setRoster(ids);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const update = useCallback((next: string[]) => {
    const unique = [...new Set(next)];
    write(unique);
    listeners.forEach((l) => l(unique));
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const current = read();
      update(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
    },
    [update]
  );

  return { roster, setRoster: update, toggle, has: (id: string) => roster.includes(id) };
}
