import * as Haptics from 'expo-haptics';
import { HapticPower } from '@/types/fidget';
import { coreHaptics } from '@/lib/coreHaptics';
import { clamp01, intensityScale, isQuiet, onStopAll, scaled } from '@/lib/hapticState';

/*
 * The app's one haptics service. Every toy goes through it, so the intensity settings,
 * rate limiting and "stop everything" apply everywhere.
 *
 * - playHaptic / playSequence: iOS system taps (light, medium, heavy, success...).
 * - transient / continuous / playEvents: Core Haptics-style taps and sustained vibration with
 *   explicit intensity and sharpness (0..1). In our own build these use Core Haptics; in Expo Go
 *   they fall back to the closest system tap.
 */

function systemHaptic(power: HapticPower): void {
  let result: Promise<void>;
  switch (power) {
    case 'light': result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
    case 'heavy': result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break;
    case 'soft': result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); break;
    case 'rigid': result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid); break;
    case 'success': result = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
    case 'warning': result = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break;
    case 'error': result = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
    case 'selection': result = Haptics.selectionAsync(); break;
    default: result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
  }
  result.catch(() => {});
}

// System taps only come in fixed strengths, so intensity settings step along this ladder.
const LADDER: HapticPower[] = ['soft', 'light', 'medium', 'heavy'];

export function adjustPower(power: HapticPower, scale: number): HapticPower | null {
  const index = LADDER.indexOf(power);
  if (index < 0) return power;
  const shift = scale < 0.4 ? -2 : scale < 0.8 ? -1 : scale > 1.25 ? 1 : 0;
  const next = index + shift;
  if (next < 0) return null;
  return LADDER[Math.min(LADDER.length - 1, next)];
}

/** A system tap, adjusted for the intensity settings. `raw` skips that (the Haptics Lab demo cards). */
export function playHaptic(power: HapticPower = 'medium', options?: { raw?: boolean }): void {
  const adjusted = options?.raw ? power : adjustPower(power, intensityScale());
  if (adjusted) systemHaptic(adjusted);
}

export type HapticStep = { at: number; power: HapticPower };

const pendingTimers = new Set<ReturnType<typeof setTimeout>>();

function schedule(fn: () => void, ms: number): () => void {
  const timer = setTimeout(() => {
    pendingTimers.delete(timer);
    fn();
  }, ms);
  pendingTimers.add(timer);
  return () => {
    clearTimeout(timer);
    pendingTimers.delete(timer);
  };
}

/** Plays system taps on a timeline (ms from now). Returns a cancel function. */
export function playSequence(steps: HapticStep[], onStep?: (step: HapticStep, index: number) => void): () => void {
  const cancels = steps.map((step, i) =>
    schedule(() => {
      playHaptic(step.power);
      onStep?.(step, i);
    }, step.at),
  );
  return () => cancels.forEach(cancel => cancel());
}

/** The system tap closest to a Core Haptics transient, for Expo Go. */
export function styleFor(intensity: number, sharpness: number): HapticPower {
  if (intensity < 0.2) return sharpness >= 0.8 ? 'selection' : 'soft';
  if (intensity < 0.45) return sharpness < 0.35 ? 'soft' : 'light';
  if (intensity < 0.7) return 'medium';
  return sharpness >= 0.75 ? 'rigid' : 'heavy';
}

/** Gap between taps when faking a continuous vibration: 240 ms at a whisper, 32 ms flat out. */
export function tapGapMs(intensity: number): number {
  const t = clamp01(intensity);
  return Math.round(240 - (240 - 32) * Math.pow(t, 0.8));
}

let lastFallbackTap = 0;
const MIN_TAP_GAP_MS = 16;

/** One tap with explicit intensity and sharpness (0..1). */
export function transient(intensity: number, sharpness: number): void {
  if (coreHaptics.available) {
    coreHaptics.tap(intensity, sharpness);
    return;
  }
  const i = scaled(intensity);
  const now = Date.now();
  if (i < 0.04 || now - lastFallbackTap < MIN_TAP_GAP_MS) return;
  lastFallbackTap = now;
  systemHaptic(styleFor(i, sharpness));
}

/** Expo Go stand-in for a continuous vibration: taps whose rate and weight follow intensity. */
const fallbackLoop = {
  intensity: 0,
  sharpness: 0.5,
  lastTap: 0,
  timer: null as ReturnType<typeof setTimeout> | null,
  tick() {
    if (fallbackLoop.intensity <= 0.02 || isQuiet()) {
      fallbackLoop.intensity = 0;
      fallbackLoop.timer = null;
      return;
    }
    const now = Date.now();
    if (now - fallbackLoop.lastTap >= tapGapMs(fallbackLoop.intensity)) {
      fallbackLoop.lastTap = now;
      systemHaptic(styleFor(fallbackLoop.intensity, fallbackLoop.sharpness));
    }
    fallbackLoop.timer = setTimeout(fallbackLoop.tick, 16);
  },
};

/** A sustained vibration you keep updating (every touch move is fine) until stop(). */
export const continuous = {
  set(intensity: number, sharpness: number): void {
    if (isQuiet()) return;
    if (coreHaptics.available) {
      coreHaptics.set(intensity, sharpness);
      return;
    }
    fallbackLoop.intensity = scaled(intensity);
    fallbackLoop.sharpness = sharpness;
    if (fallbackLoop.timer === null && fallbackLoop.intensity > 0.02) fallbackLoop.tick();
  },
  stop(): void {
    coreHaptics.stop();
    fallbackLoop.intensity = 0;
    if (fallbackLoop.timer !== null) clearTimeout(fallbackLoop.timer);
    fallbackLoop.timer = null;
  },
};

export type HapticEvent = { time: number; intensity: number; sharpness: number };

/** Plays transients at the given times (ms from now). Returns a cancel function. */
export function playEvents(events: HapticEvent[]): () => void {
  const cancels = events.map(e => schedule(() => transient(e.intensity, e.sharpness), e.time));
  return () => cancels.forEach(cancel => cancel());
}

onStopAll(() => {
  continuous.stop();
  pendingTimers.forEach(timer => clearTimeout(timer));
  pendingTimers.clear();
});
