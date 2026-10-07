import { HapticPower } from '@/types/fidget';
import { playHaptic } from '@/lib/haptics';
import { coreHaptics } from '@/lib/coreHaptics';

/*
 * A vibration that rises and falls with an intensity (0..1). Everything that should feel
 * continuous (Charge's build-up, Pick's tension) goes through here.
 *
 * - In our own build, Core Haptics plays a real continuous swell whose strength and
 *   sharpness climb with intensity, with heartbeat taps layered on top.
 * - In Expo Go, which only has discrete taps, the taps get closer together and heavier.
 */

const SLOWEST_GAP_MS = 240;
// About as fast as the Taptic Engine can still separate taps.
const FASTEST_GAP_MS = 32;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function rumbleGapMs(intensity: number): number {
  const t = clamp01(intensity);
  return Math.round(SLOWEST_GAP_MS - (SLOWEST_GAP_MS - FASTEST_GAP_MS) * Math.pow(t, 0.8));
}

/** Which tap to play at a given intensity. `beat` alternates the top tier for texture. */
export function rumbleTap(intensity: number, beat = 0): HapticPower {
  const t = clamp01(intensity);
  if (t < 0.2) return 'soft';
  if (t < 0.45) return 'light';
  if (t < 0.7) return 'medium';
  if (t < 0.9) return 'heavy';
  return beat % 2 === 0 ? 'rigid' : 'heavy';
}

/** Continuous layer: a low, soft rumble that tightens into a strong buzz. */
export function rumbleWave(intensity: number): { amplitude: number; frequency: number } {
  const t = clamp01(intensity);
  return { amplitude: 0.08 + 0.92 * Math.pow(t, 1.15), frequency: 0.12 + 0.55 * t };
}

/** Heartbeat taps over the continuous layer: harder and crisper as it climbs. */
export function rumbleBeat(intensity: number): { amplitude: number; frequency: number } {
  const t = clamp01(intensity);
  return { amplitude: 0.45 + 0.55 * t, frequency: 0.35 + 0.6 * t };
}

export class Rumble {
  private intensity = 0;
  private lastTap = 0;
  private beat = 0;
  private frame: ReturnType<typeof setTimeout> | null = null;
  private fading: { from: number; start: number; duration: number } | null = null;

  /** Called on every tap, so visuals can pulse in sync with the vibration. */
  constructor(private onTap?: (intensity: number) => void) {}

  set(intensity: number): void {
    this.fading = null;
    this.apply(intensity);
  }

  /** Let it die away from `from` to nothing over `ms`, like aftershocks. Any set() cancels it. */
  fade(from: number, ms: number): void {
    this.fading = { from: clamp01(from), start: Date.now(), duration: ms };
    this.apply(from);
  }

  stop(): void {
    this.intensity = 0;
    this.fading = null;
    if (this.frame !== null) clearTimeout(this.frame);
    this.frame = null;
    coreHaptics.stop();
  }

  private apply(intensity: number) {
    this.intensity = clamp01(intensity);
    if (this.intensity > 0.01 && this.frame === null) this.loop();
  }

  private loop = () => {
    const now = Date.now();
    if (this.fading) {
      const t = (now - this.fading.start) / this.fading.duration;
      this.intensity = t >= 1 ? 0 : this.fading.from * Math.pow(1 - t, 2);
      if (t >= 1) this.fading = null;
    }
    if (this.intensity <= 0.01) {
      this.frame = null;
      coreHaptics.stop();
      return;
    }

    const continuous = coreHaptics.available;
    if (continuous) {
      const wave = rumbleWave(this.intensity);
      coreHaptics.set(wave.amplitude, wave.frequency);
    }
    if (now - this.lastTap >= rumbleGapMs(this.intensity)) {
      this.lastTap = now;
      this.beat += 1;
      if (continuous) {
        const beat = rumbleBeat(this.intensity);
        coreHaptics.tap(beat.amplitude, beat.frequency);
      } else {
        playHaptic(rumbleTap(this.intensity, this.beat));
      }
      this.onTap?.(this.intensity);
    }
    // Poll every frame so a sudden jump in intensity is felt right away.
    this.frame = setTimeout(this.loop, 16);
  };
}
