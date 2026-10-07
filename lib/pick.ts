/*
 * Pick: a surface with rough flakes you can feel for, catch, and peel off.
 * Pure geometry and rules here; the screen handles touches, haptics and drawing.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Flake {
  id: number;
  x: number;
  y: number;
  /** Rough radius in points. */
  size: number;
  /** Irregular outline, relative to the center. */
  outline: Point[];
  /** Direction (degrees) the loose edge points; pulling this way peels easiest. */
  edgeAngle: number;
  /** Finger travel (points) needed to tear it free from scratch. */
  resistance: number;
  /** Peel progress kept from earlier attempts (0..1); a worried-at flake stays half-lifted. */
  loosened: number;
  /** Progress points where it snags, then gives a little. */
  snags: number[];
}

export interface Bump {
  x: number;
  y: number;
  r: number;
}

export interface Bounds {
  width: number;
  height: number;
  /** Keep flakes out of the header and footer areas. */
  top: number;
  bottom: number;
}

export type Rng = () => number;

/** Small deterministic PRNG (mulberry32), so tests and layouts are reproducible. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);

export const FLAKE_MIN_SIZE = 9;
export const FLAKE_MAX_SIZE = 22;
const EDGE_MARGIN = 28;
// Fingertips are imprecise; a flake catches if the touch lands within this much of its edge.
export const CATCH_SLOP = 14;

export function makeFlake(rng: Rng, id: number, bounds: Bounds, avoid: Flake[] = []): Flake {
  const size = between(rng, FLAKE_MIN_SIZE, FLAKE_MAX_SIZE);
  let x = 0;
  let y = 0;
  // Try a few spots that don't overlap existing flakes; settle for the last one.
  for (let attempt = 0; attempt < 12; attempt++) {
    x = between(rng, EDGE_MARGIN, bounds.width - EDGE_MARGIN);
    y = between(rng, bounds.top + EDGE_MARGIN, bounds.height - bounds.bottom - EDGE_MARGIN);
    if (avoid.every(f => Math.hypot(f.x - x, f.y - y) > f.size + size + 18)) break;
  }
  const vertices = 6 + Math.floor(rng() * 4);
  const outline = Array.from({ length: vertices }, (_, i) => {
    const angle = (i / vertices) * Math.PI * 2 + between(rng, -0.25, 0.25);
    const radius = size * between(rng, 0.55, 1);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
  const resistance = 30 + size * 2.2 + between(rng, 0, 20);
  const snags = size > 14 ? (rng() > 0.5 ? [0.38, 0.72] : [0.55]) : rng() > 0.6 ? [0.5] : [];
  return { id, x, y, size, outline, edgeAngle: between(rng, 0, 360), resistance, loosened: 0, snags };
}

export function makeBumps(rng: Rng, width: number, height: number, count: number): Bump[] {
  return Array.from({ length: count }, () => ({
    x: between(rng, 10, width - 10),
    y: between(rng, 10, height - 10),
    r: between(rng, 1.6, 3.2),
  }));
}

export function outlinePoints(outline: Point[]): string {
  return outline.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/** The flake under a fingertip, nearest first, or null. */
export function flakeAt(flakes: Flake[], x: number, y: number, slop = CATCH_SLOP): Flake | null {
  let best: Flake | null = null;
  let bestDist = Infinity;
  for (const f of flakes) {
    const d = Math.hypot(f.x - x, f.y - y);
    if (d <= f.size + slop && d < bestDist) {
      best = f;
      bestDist = d;
    }
  }
  return best;
}

/** Index of the bump under a fingertip, or -1. */
export function bumpAt(bumps: Bump[], x: number, y: number, slop = 6): number {
  return bumps.findIndex(b => Math.hypot(b.x - x, b.y - y) <= b.r + slop);
}

/**
 * Peel progress (0..1) for a pull from `start` to `current`.
 * Pulling along the loose edge counts up to 15% extra; pulling against it, 15% less.
 */
export function peelProgress(flake: Flake, start: Point, current: Point): number {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return flake.loosened;
  const pullAngle = Math.atan2(dy, dx);
  const edge = (flake.edgeAngle * Math.PI) / 180;
  const alignment = Math.cos(pullAngle - edge);
  const effective = dist * (1 + 0.15 * alignment);
  return Math.min(1, flake.loosened + effective / flake.resistance);
}

/** Snag thresholds crossed going from one progress value to the next (only counts upward). */
export function snagsCrossed(flake: Flake, from: number, to: number): number {
  return flake.snags.filter(s => from < s && to >= s).length;
}
