import { HapticStep } from '@/lib/haptics';
import { clamp01 } from '@/lib/rumble';

/*
 * Charge: hold to build toward a climax.
 * - Holding still builds on its own, accelerating as it climbs.
 * - Circling the finger clockwise winds it up faster; counter-clockwise pulls it back down.
 * - Keep holding after a climax and it drops to REARM_LEVEL and builds again, faster each time.
 */

export const HOLD_DELAY_MS = 250;
export const BASE_FILL_MS = 1800;
export const MIN_FILL_MS = 900;
// A full clockwise circle adds 60% charge; a counter-clockwise one removes 80%.
export const WIND_UP_PER_DEG = 0.6 / 360;
export const WIND_DOWN_PER_DEG = 0.8 / 360;
export const AFTERGLOW_MS = 700;
export const REARM_LEVEL = 0.3;

export interface ChargeState {
  level: number;
  /** Climaxes so far in this hold. */
  combo: number;
  heldMs: number;
  /** Counts down after a climax; building pauses until it reaches 0. */
  afterglowMs: number;
}

export const initialCharge = (): ChargeState => ({ level: 0, combo: 0, heldMs: 0, afterglowMs: 0 });

export function fillMs(combo: number): number {
  return Math.max(MIN_FILL_MS, BASE_FILL_MS / (1 + 0.25 * combo));
}

/** Advances the charge by dtMs, with windDeg of finger rotation (clockwise positive) since the last step. */
export function stepCharge(state: ChargeState, dtMs: number, windDeg: number): { state: ChargeState; climaxed: boolean } {
  const heldMs = state.heldMs + dtMs;

  if (state.afterglowMs > 0) {
    const afterglowMs = Math.max(0, state.afterglowMs - dtMs);
    const level = REARM_LEVEL + (state.level - REARM_LEVEL) * Math.pow(0.9, dtMs / 16.67);
    return { state: { ...state, level, heldMs, afterglowMs }, climaxed: false };
  }

  let level = state.level;
  if (heldMs > HOLD_DELAY_MS) level += (dtMs / fillMs(state.combo)) * (0.6 + level);
  level += windDeg * (windDeg > 0 ? WIND_UP_PER_DEG : WIND_DOWN_PER_DEG);
  level = clamp01(level);

  if (level >= 1) {
    return { state: { level: 1, combo: state.combo + 1, heldMs, afterglowMs: AFTERGLOW_MS }, climaxed: true };
  }
  return { state: { ...state, level, heldMs }, climaxed: false };
}

/** Rumble intensity for a charge level: silent at rest, a whisper at the start, flat out at the top. */
export function chargeIntensity(level: number): number {
  return level <= 0.001 ? 0 : 0.12 + 0.88 * Math.pow(clamp01(level), 1.4);
}

/** The release: a crackling burst, a success thump, then aftershocks fading out. Repeats in one hold crack harder. */
export function climaxPattern(combo: number): HapticStep[] {
  const extraCracks = Math.min(Math.max(combo - 1, 0), 4);
  const lead: HapticStep[] = Array.from({ length: extraCracks }, (_, i) => ({ at: i * 24, power: 'rigid' as const }));
  const offset = extraCracks * 24;
  const burst: HapticStep[] = [
    { at: 0, power: 'heavy' },
    { at: 22, power: 'rigid' },
    { at: 44, power: 'heavy' },
    { at: 70, power: 'rigid' },
    { at: 105, power: 'success' },
    { at: 230, power: 'medium' },
    { at: 380, power: 'light' },
    { at: 560, power: 'soft' },
    { at: 800, power: 'soft' },
    { at: 1100, power: 'soft' },
  ];
  return [...lead, ...burst.map(step => ({ ...step, at: step.at + offset }))];
}

export const RELEASE_PATTERN: HapticStep[] = [
  { at: 0, power: 'light' },
  { at: 70, power: 'soft' },
];
