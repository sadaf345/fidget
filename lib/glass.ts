import { createRng, Point } from '@/lib/pick';

/*
 * Cracked glass for a pressed button: cracks run from the press point out to every edge,
 * joined by a spider-web ring and a few side branches, so the whole surface fractures.
 */

export interface CrackLine {
  points: Point[];
  length: number;
  /** When this crack starts and finishes drawing, as fractions of the whole animation (0..1). */
  start: number;
  end: number;
  /** 1 for the main cracks, lower for the web and branches. */
  weight: number;
}

/** Distance from (ox, oy) along the unit direction (dx, dy) to the edge of a width x height box. */
export function distanceToEdge(width: number, height: number, ox: number, oy: number, dx: number, dy: number): number {
  const tx = dx > 1e-9 ? (width - ox) / dx : dx < -1e-9 ? -ox / dx : Infinity;
  const ty = dy > 1e-9 ? (height - oy) / dy : dy < -1e-9 ? -oy / dy : Infinity;
  return Math.max(0, Math.min(tx, ty));
}

export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return total;
}

const RAYS = 9;
const SEGMENTS = 4;
// The main cracks draw at a constant speed, so the longest takes this share of the animation.
const RAY_DRAW = 0.7;

export function crackNetwork(width: number, height: number, origin: Point, seed: number): CrackLine[] {
  const rng = createRng(seed);
  const o = { x: Math.max(0, Math.min(width, origin.x)), y: Math.max(0, Math.min(height, origin.y)) };
  const farthest = (Math.hypot(Math.max(o.x, width - o.x), Math.max(o.y, height - o.y)) || 1) + 3;
  const lines: CrackLine[] = [];
  const rays: { points: Point[]; angle: number; reach: number }[] = [];

  // Aim the main cracks at points spread around the whole perimeter, so long buttons crack
  // end to end, and make sure every side gets at least one.
  const perimeter = 2 * (width + height);
  const pointOnEdge = (d: number): Point => {
    let t = ((d % perimeter) + perimeter) % perimeter;
    if (t < width) return { x: t, y: 0 };
    t -= width;
    if (t < height) return { x: width, y: t };
    t -= height;
    if (t < width) return { x: width - t, y: height };
    return { x: 0, y: height - (t - width) };
  };
  const offset = rng() * perimeter;
  const targets: Point[] = Array.from({ length: RAYS }, (_, k) => pointOnEdge(offset + ((k + 0.5 + (rng() - 0.5) * 0.6) / RAYS) * perimeter));
  const sides: [(p: Point) => boolean, () => Point][] = [
    [p => p.y <= 0.01, () => ({ x: width * (0.2 + rng() * 0.6), y: 0 })],
    [p => p.y >= height - 0.01, () => ({ x: width * (0.2 + rng() * 0.6), y: height })],
    [p => p.x <= 0.01, () => ({ x: 0, y: height * (0.2 + rng() * 0.6) })],
    [p => p.x >= width - 0.01, () => ({ x: width, y: height * (0.2 + rng() * 0.6) })],
  ];
  for (const [onSide, make] of sides) if (!targets.some(onSide)) targets.push(make());

  const aimed = targets
    .map(t => ({ t, angle: Math.atan2(t.y - o.y, t.x - o.x) }))
    .sort((a, b) => a.angle - b.angle);
  for (const { t, angle } of aimed) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    // Overshoot slightly so every crack visibly reaches the edge (the card clips it).
    const reach = Math.hypot(t.x - o.x, t.y - o.y) + 3;
    const points: Point[] = [o];
    for (let s = 1; s <= SEGMENTS; s++) {
      const f = s / SEGMENTS;
      const wobble = s === SEGMENTS ? 0 : (rng() - 0.5) * Math.min(12, reach * 0.14);
      points.push({ x: o.x + dx * reach * f - dy * wobble, y: o.y + dy * reach * f + dx * wobble });
    }
    rays.push({ points, angle, reach });
    lines.push({ points, length: polylineLength(points), start: 0, end: 0.05 + RAY_DRAW * (reach / farthest), weight: 1 });
  }

  // Web rings joining neighboring cracks, appearing as the cracks pass through them.
  for (const ring of [1, 2]) {
    for (let i = 0; i < rays.length; i++) {
      if (rng() < 0.25) continue;
      const a = rays[i].points[ring];
      const b = rays[(i + 1) % rays.length].points[ring];
      const mid = { x: (a.x + b.x) / 2 + (rng() - 0.5) * 6, y: (a.y + b.y) / 2 + (rng() - 0.5) * 6 };
      const points = [a, mid, b];
      const passes = Math.max(rays[i].reach, rays[(i + 1) % rays.length].reach) * (ring / SEGMENTS);
      const start = 0.05 + RAY_DRAW * (passes / farthest);
      lines.push({ points, length: polylineLength(points), start, end: Math.min(1, start + 0.18), weight: 0.6 });
    }
  }

  // A few short side branches off the main cracks.
  for (let k = 0; k < 4; k++) {
    const ray = rays[Math.floor(rng() * rays.length)];
    const from = ray.points[2];
    const angle = ray.angle + (rng() > 0.5 ? 1 : -1) * (0.5 + rng() * 0.5);
    const length = 10 + rng() * 22;
    const points = [from, { x: from.x + Math.cos(angle) * length, y: from.y + Math.sin(angle) * length }];
    const start = 0.05 + RAY_DRAW * ((ray.reach * 0.5) / farthest);
    lines.push({ points, length: polylineLength(points), start, end: Math.min(1, start + 0.15), weight: 0.5 });
  }

  return lines;
}
