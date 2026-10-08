import { useCallback } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { playEvents } from '@/lib/haptics';
import { fromAhap } from '@/lib/patterns';

/**
 * For simple tap toys: returns a function that plays the pattern assigned to this toy in the
 * Haptics Lab, or the toy's own haptic when none is assigned.
 */
export function useTapFeel(toyId: string): (ownHaptic: () => void) => void {
  const { settings, patterns } = useSettings();
  const patternId = settings.tapPatterns[toyId];
  const pattern = patternId ? patterns.find(p => p.id === patternId) : undefined;
  return useCallback((ownHaptic: () => void) => {
    if (pattern) playEvents(fromAhap(pattern.ahap));
    else ownHaptic();
  }, [pattern]);
}
