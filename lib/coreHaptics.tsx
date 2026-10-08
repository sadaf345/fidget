import { useEffect } from 'react';
import { Platform, TurboModuleRegistry } from 'react-native';
import type { RealtimeComposer } from 'react-native-pulsar';
import { onStopAll, scaled } from '@/lib/hapticState';

/*
 * Core Haptics: continuous vibration with live strength (amplitude) and sharpness (frequency),
 * both 0..1, through react-native-pulsar.
 *
 * The native half only exists in our own build of the app (dev build / TestFlight), not in
 * Expo Go, and the library throws on import when it's missing. So we look for the native
 * module first and only then load the library; otherwise `coreHaptics.available` is false
 * and callers fall back to discrete taps from expo-haptics.
 */

type PulsarLib = typeof import('react-native-pulsar');

function loadPulsar(): PulsarLib | null {
  // The web build (used for layout screenshots) has no native modules at all.
  if (Platform.OS === 'web' || !TurboModuleRegistry?.get?.('RNPulsar')) return null;
  try {
    // A static import would crash Expo Go, which lacks the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pulsar = require('react-native-pulsar') as PulsarLib;
    return pulsar.Settings.getHapticsSupportLevel() === pulsar.HapticSupport.NO_SUPPORT ? null : pulsar;
  } catch (e) {
    console.warn('Core Haptics unavailable, falling back to taps:', e);
    return null;
  }
}

const pulsar = loadPulsar();
let composer: RealtimeComposer | null = null;
let lastAmplitude = -1;
let lastFrequency = -1;
let lastTap = 0;
// Roughly 60 taps a second at most, so fast drags and collisions don't saturate the actuator.
const MIN_TAP_GAP_MS = 16;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const coreHaptics = {
  /** True when continuous haptics are actually playable (our own build, on a supported iPhone). */
  get available(): boolean {
    return composer !== null;
  },

  /**
   * Start or update the continuous vibration. Strength is scaled by the intensity settings.
   * Cheap to call every frame; tiny changes are skipped.
   */
  set(amplitude: number, frequency: number): void {
    if (!composer) return;
    const a = scaled(amplitude);
    const f = clamp01(frequency);
    if (Math.abs(a - lastAmplitude) < 0.01 && Math.abs(f - lastFrequency) < 0.01) return;
    lastAmplitude = a;
    lastFrequency = f;
    composer.set(a, f);
  },

  stop(): void {
    // Skip when nothing continuous is playing; callers stop freely every frame.
    if (!composer || lastAmplitude < 0) return;
    lastAmplitude = -1;
    lastFrequency = -1;
    composer.stop();
  },

  /** One crisp tap at any strength (scaled by the intensity settings) and sharpness, mixed with the continuous vibration. */
  tap(amplitude: number, frequency: number): void {
    if (!composer) return;
    const now = Date.now();
    if (now - lastTap < MIN_TAP_GAP_MS) return;
    const a = scaled(amplitude);
    if (a < 0.01) return;
    lastTap = now;
    composer.playDiscrete(a, clamp01(frequency));
  },
};

onStopAll(() => coreHaptics.stop());

/**
 * Mounted once at the app root. Pulsar exposes its realtime composer as a hook,
 * so this hands it to the module-level `coreHaptics` used everywhere else.
 */
function PulsarBridge({ lib }: { lib: PulsarLib }) {
  const realtime = lib.useRealtimeComposer();
  useEffect(() => {
    composer = realtime;
    return () => {
      composer = null;
    };
  }, [realtime]);
  return null;
}

export function CoreHapticsBridge() {
  return pulsar ? <PulsarBridge lib={pulsar} /> : null;
}
