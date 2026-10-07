import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPrefs, loadStats, savePrefs, saveStats } from '@/lib/storage';

// One shared copy per app run, loaded once, so screens never overwrite each other's keys
// and nothing is written before the saved values have been read.
let statsLoad: Promise<Record<string, number>> | null = null;
let prefsLoad: Promise<Record<string, string>> | null = null;
const getStats = () => (statsLoad ??= loadStats());
const getPrefs = () => (prefsLoad ??= loadPrefs());

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** A lifetime number that survives app restarts. `add` increments; `max` keeps the highest value seen. */
export function useStat(key: string) {
  const [value, setValue] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getStats().then(stats => {
      if (mounted.current) setValue(stats[key] ?? 0);
    });
    return () => {
      mounted.current = false;
    };
  }, [key]);

  const update = useCallback((next: (prev: number) => number) => {
    getStats().then(stats => {
      stats[key] = next(stats[key] ?? 0);
      if (mounted.current) setValue(stats[key]);
      // Batch rapid updates (a popping spree) into one write.
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveStats(stats), 400);
    });
  }, [key]);

  const add = useCallback((n = 1) => update(prev => prev + n), [update]);
  const max = useCallback((n: number) => update(prev => Math.max(prev, n)), [update]);

  return { value, add, max };
}

/** A small saved preference, like the chosen skin tone. */
export function usePref(key: string, fallback: string) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    getPrefs().then(prefs => {
      if (!cancelled && prefs[key]) setValue(prefs[key]);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const set = useCallback((next: string) => {
    setValue(next);
    getPrefs().then(prefs => {
      prefs[key] = next;
      savePrefs(prefs);
    });
  }, [key]);

  return [value, set] as const;
}
