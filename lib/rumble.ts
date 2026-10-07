import { HapticPower } from '@/types/fidget';
import { playHaptic } from '@/lib/haptics';

/*
 * A stand-in for a continuous vibration. Expo's haptics can only fire discrete taps,
 * so intensity (0..1) becomes taps that get closer together and heavier as it rises.
 * Everything that wants a "rumble" goes through here, so swapping in Core Haptics
 * (real continuous vibration) later means changing only this file.
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

export class Rumble {
  private intensity = 0;
  private lastTap = 0;
  private beat = 0;
  private frame: ReturnType<typeof setTimeout> | null = null;

  /** Called on every tap, so visuals can pulse in sync with the vibration. */
  constructor(private onTap?: (intensity: number) => void) {}

  set(intensity: number): void {
    this.intensity = clamp01(intensity);
    if (this.intensity > 0.01 && this.frame === null) this.loop();
  }

  stop(): void {
    this.intensity = 0;
    if (this.frame !== null) clearTimeout(this.frame);
    this.frame = null;
  }

  private loop = () => {
    if (this.intensity <= 0.01) {
      this.frame = null;
      return;
    }
    const now = Date.now();
    if (now - this.lastTap >= rumbleGapMs(this.intensity)) {
      this.lastTap = now;
      this.beat += 1;
      playHaptic(rumbleTap(this.intensity, this.beat));
      this.onTap?.(this.intensity);
    }
    // Poll every frame so a sudden jump in intensity is felt right away.
    this.frame = setTimeout(this.loop, 16);
  };
}
