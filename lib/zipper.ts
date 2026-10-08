/*
 * Zipper: a pull that slides along a track of teeth. Pull at the top = closed; dragging it
 * down opens the zipper behind it, dragging up closes it again.
 */

export const TOOTH_PITCH = 12;

/** Intensity for one tooth click: 0.5 at a crawl, 0.9 at a fast drag (points per ms). */
export function toothIntensity(speed: number): number {
  return 0.5 + 0.4 * Math.min(1, Math.abs(speed) / 1.2);
}

/** Teeth per second at a given drag speed; above ~45/s individual taps blur into a buzz. */
export function teethPerSecond(speed: number): number {
  return (Math.abs(speed) * 1000) / TOOTH_PITCH;
}

/**
 * How far a tooth at `y` sits out from the center line (each side moves this far out).
 * Teeth below the pull are meshed (0); behind it they spread in a widening V, capped at maxSpread.
 */
export function toothSpread(y: number, pullY: number, maxSpread: number): number {
  return y >= pullY ? 0 : Math.min(maxSpread, (pullY - y) * 0.32);
}
