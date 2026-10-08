/*
 * Shake: beads loose inside the phone. They feel gravity and every shake (from the
 * accelerometer), bounce off the walls and each other, and each hit is a haptic.
 */

export interface Bead {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface Impact {
  /** Closing speed in points per second. */
  speed: number;
  kind: 'wall' | 'bead';
}

const WALL_BOUNCE = 0.5;
const BEAD_BOUNCE = 0.8;
// Fraction of velocity lost per second to air and rolling.
const DRAG = 0.6;
const SUBSTEPS = 3;

/**
 * Converts an iOS accelerometer reading (in g, Apple's convention: upright at rest reads y = -1)
 * into the acceleration beads feel relative to the screen, in points/s². Gravity pulls them
 * down; shaking the phone one way throws them the other way.
 */
export function beadAcceleration(reading: { x: number; y: number }, pointsPerG: number): { ax: number; ay: number } {
  return { ax: reading.x * pointsPerG, ay: -reading.y * pointsPerG };
}

/** Keeps a bead inside a rounded corner: its center must stay within radius - r of the corner's arc center. */
function cornerBounce(b: Bead, cx: number, cy: number, radius: number, impacts: Impact[] | null) {
  const limit = radius - b.r;
  if (limit <= 0) return;
  const dx = b.x - cx;
  const dy = b.y - cy;
  const dist = Math.hypot(dx, dy);
  if (dist <= limit) return;
  const nx = dx / dist;
  const ny = dy / dist;
  b.x = cx + nx * limit;
  b.y = cy + ny * limit;
  const outward = b.vx * nx + b.vy * ny;
  if (outward > 0) {
    impacts?.push({ speed: outward, kind: 'wall' });
    b.vx -= (1 + WALL_BOUNCE) * outward * nx;
    b.vy -= (1 + WALL_BOUNCE) * outward * ny;
  }
}

function roundedCorners(b: Bead, width: number, height: number, radius: number, impacts: Impact[] | null) {
  if (radius <= 0) return;
  const left = b.x < radius;
  const right = b.x > width - radius;
  const top = b.y < radius;
  const bottom = b.y > height - radius;
  if (left && top) cornerBounce(b, radius, radius, radius, impacts);
  else if (right && top) cornerBounce(b, width - radius, radius, radius, impacts);
  else if (left && bottom) cornerBounce(b, radius, height - radius, radius, impacts);
  else if (right && bottom) cornerBounce(b, width - radius, height - radius, radius, impacts);
}

/**
 * Advances every bead by dt seconds inside a width x height box with rounded corners
 * (mutates in place). Returns the hits.
 */
export function stepRattle(
  beads: Bead[],
  width: number,
  height: number,
  ax: number,
  ay: number,
  dt: number,
  cornerRadius = 0,
): Impact[] {
  const impacts: Impact[] = [];
  const h = dt / SUBSTEPS;
  const keep = Math.pow(1 - DRAG, h);

  for (let step = 0; step < SUBSTEPS; step++) {
    for (const b of beads) {
      b.vx = (b.vx + ax * h) * keep;
      b.vy = (b.vy + ay * h) * keep;
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (b.x < b.r) {
        if (b.vx < 0) impacts.push({ speed: -b.vx, kind: 'wall' });
        b.x = b.r;
        b.vx = -b.vx * WALL_BOUNCE;
      } else if (b.x > width - b.r) {
        if (b.vx > 0) impacts.push({ speed: b.vx, kind: 'wall' });
        b.x = width - b.r;
        b.vx = -b.vx * WALL_BOUNCE;
      }
      if (b.y < b.r) {
        if (b.vy < 0) impacts.push({ speed: -b.vy, kind: 'wall' });
        b.y = b.r;
        b.vy = -b.vy * WALL_BOUNCE;
      } else if (b.y > height - b.r) {
        if (b.vy > 0) impacts.push({ speed: b.vy, kind: 'wall' });
        b.y = height - b.r;
        b.vy = -b.vy * WALL_BOUNCE;
      }
      roundedCorners(b, width, height, cornerRadius, impacts);
    }

    for (let i = 0; i < beads.length; i++) {
      for (let j = i + 1; j < beads.length; j++) {
        const a = beads[i];
        const b = beads[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const overlap = a.r + b.r - dist;
        if (overlap <= 0 || dist === 0) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= (nx * overlap) / 2;
        a.y -= (ny * overlap) / 2;
        b.x += (nx * overlap) / 2;
        b.y += (ny * overlap) / 2;
        const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (closing < 0) {
          const impulse = (-(1 + BEAD_BOUNCE) * closing) / 2;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
          impacts.push({ speed: -closing, kind: 'bead' });
        }
      }
    }

    // Pushing overlapping beads apart can shove one through a wall; put it back.
    for (const b of beads) {
      if (b.x < b.r) { b.x = b.r; if (b.vx < 0) b.vx = 0; }
      if (b.x > width - b.r) { b.x = width - b.r; if (b.vx > 0) b.vx = 0; }
      if (b.y < b.r) { b.y = b.r; if (b.vy < 0) b.vy = 0; }
      if (b.y > height - b.r) { b.y = height - b.r; if (b.vy > 0) b.vy = 0; }
      roundedCorners(b, width, height, cornerRadius, null);
    }
  }
  return impacts;
}

/** Pushes beads away from a touch, harder the closer they are. */
export function flick(beads: Bead[], x: number, y: number, radius: number, strength: number): void {
  for (const b of beads) {
    const dx = b.x - x;
    const dy = b.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist >= radius || dist === 0) continue;
    const push = (1 - dist / radius) * strength;
    b.vx += (dx / dist) * push;
    b.vy += (dy / dist) * push;
  }
}
