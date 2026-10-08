/** Purring cat: strength oscillates 0.3-0.6 about 1.5 times a second. */
export const PURR_HZ = 1.5;
export function purrIntensity(seconds: number): number {
  return 0.45 + 0.15 * Math.sin(2 * Math.PI * PURR_HZ * seconds);
}

/** Stress ball: squeeze pressure ramps 0.2 -> 1.0 over 1.5 s of holding, then stays there. */
export const SQUEEZE_RAMP_MS = 1500;
export function squeezeIntensity(heldMs: number): number {
  return 0.2 + 0.8 * Math.min(1, heldMs / SQUEEZE_RAMP_MS);
}
