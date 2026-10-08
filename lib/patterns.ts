import { HapticEvent } from '@/lib/haptics';

/*
 * Haptic patterns recorded in the Haptics Lab, stored in Apple's AHAP format
 * (the JSON Core Haptics reads) so they could be exported as-is later.
 */

export interface AhapEvent {
  Event: {
    Time: number;
    EventType: 'HapticTransient';
    EventParameters: { ParameterID: 'HapticIntensity' | 'HapticSharpness'; ParameterValue: number }[];
  };
}

export interface Ahap {
  Version: 1;
  Pattern: AhapEvent[];
}

export interface SavedPattern {
  id: string;
  name: string;
  createdAt: number;
  ahap: Ahap;
}

export const MAX_RECORDING_MS = 5000;

const round = (v: number, places = 3) => Math.round(v * 10 ** places) / 10 ** places;

/** Taps (ms from the first tap) to AHAP; times become seconds, shifted so the first tap is at 0. */
export function toAhap(events: HapticEvent[]): Ahap {
  const start = events.length ? events[0].time : 0;
  return {
    Version: 1,
    Pattern: events
      .filter(e => e.time - start <= MAX_RECORDING_MS)
      .map(e => ({
        Event: {
          Time: round((e.time - start) / 1000),
          EventType: 'HapticTransient' as const,
          EventParameters: [
            { ParameterID: 'HapticIntensity' as const, ParameterValue: round(e.intensity, 2) },
            { ParameterID: 'HapticSharpness' as const, ParameterValue: round(e.sharpness, 2) },
          ],
        },
      })),
  };
}

export function fromAhap(ahap: Ahap): HapticEvent[] {
  return ahap.Pattern.map(({ Event }) => ({
    time: Math.round(Event.Time * 1000),
    intensity: Event.EventParameters.find(p => p.ParameterID === 'HapticIntensity')?.ParameterValue ?? 0.5,
    sharpness: Event.EventParameters.find(p => p.ParameterID === 'HapticSharpness')?.ParameterValue ?? 0.5,
  }));
}

export function patternDurationMs(pattern: SavedPattern): number {
  const events = fromAhap(pattern.ahap);
  return events.length ? events[events.length - 1].time : 0;
}
