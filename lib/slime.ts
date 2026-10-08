import { angleDelta } from '@/lib/spin';

/*
 * Slime: a soft blob outline made of springy points. Fingers pull the nearby edge toward them
 * (pressing in dents it, dragging out stretches it), the rest bulges to keep its volume, and
 * on release the springs wobble it back.
 */

export const POINTS = 32;
const SPRING = 170;
const DAMPING = 7;
// Width (radians) of the stretch of edge one finger moves.
const SPREAD = 0.55;
/** Pressure builds the longer a finger is held, as if sinking in (React Native can't read finger size or force). */
export const SINK_MS = 900;

export interface SlimeTouch {
  /** Relative to the blob center. */
  x: number;
  y: number;
  /** 0..1 */
  pressure: number;
}

export interface Slime {
  offsets: number[];
  velocities: number[];
}

export const createSlime = (): Slime => ({ offsets: Array(POINTS).fill(0), velocities: Array(POINTS).fill(0) });

export function pressureFor(heldMs: number): number {
  return Math.min(1, heldMs / SINK_MS);
}

/** Where each edge point wants to be (radial offset), given the fingers on it. */
export function targetOffsets(radius: number, touches: SlimeTouch[]): number[] {
  const targets = Array(POINTS).fill(0);
  for (const t of touches) {
    const angle = (Math.atan2(t.y, t.x) * 180) / Math.PI;
    const dist = Math.hypot(t.x, t.y);
    const stick = 0.35 + 0.55 * t.pressure;
    for (let i = 0; i < POINTS; i++) {
      const pointAngle = (i / POINTS) * 360;
      const diff = (angleDelta(pointAngle, angle) * Math.PI) / 180;
      const weight = Math.exp(-(diff * diff) / (2 * SPREAD * SPREAD));
      targets[i] += weight * (dist - radius) * stick;
    }
  }
  // Keep the volume: whatever is pulled in or out here bulges or shrinks elsewhere.
  const mean = targets.reduce((a, b) => a + b, 0) / POINTS;
  return targets.map(t => t - mean);
}

/** Springs every edge point toward its target. Returns how much it's still moving. */
export function stepSlime(slime: Slime, targets: number[], dt: number): number {
  let motion = 0;
  for (let i = 0; i < POINTS; i++) {
    const accel = SPRING * (targets[i] - slime.offsets[i]) - DAMPING * slime.velocities[i];
    slime.velocities[i] += accel * dt;
    slime.offsets[i] += slime.velocities[i] * dt;
    motion += Math.abs(slime.velocities[i]);
  }
  return motion / POINTS;
}

/** A smooth closed SVG path through the edge points (Catmull-Rom as cubic Beziers). */
export function slimePath(cx: number, cy: number, radius: number, offsets: number[]): string {
  const pts = offsets.map((o, i) => {
    const a = (i / POINTS) * Math.PI * 2;
    const r = Math.max(radius * 0.25, radius + o);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  const n = pts.length;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d + ' Z';
}
