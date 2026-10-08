import { Point } from '@/lib/pick';

/*
 * Peeling a sheet from one corner. The fold line is the perpendicular bisector between the
 * corner and the finger: everything on the corner's side is lifted and flipped over the fold
 * (so the corner lands under the finger); the rest stays stuck down.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectPoints(r: Rect): Point[] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height },
  ];
}

export function polygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

/** Keeps the part of a polygon where (p - m) . n <= 0 (Sutherland-Hodgman against one line). */
export function clipHalfPlane(points: Point[], m: Point, n: Point): Point[] {
  const side = (p: Point) => (p.x - m.x) * n.x + (p.y - m.y) * n.y;
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

export function reflect(p: Point, m: Point, n: Point): Point {
  const d = (p.x - m.x) * n.x + (p.y - m.y) * n.y;
  return { x: p.x - 2 * d * n.x, y: p.y - 2 * d * n.y };
}

export interface PeelShapes {
  /** The part still stuck down. */
  attached: Point[];
  /** The lifted part, flipped over the fold. */
  flap: Point[];
  /** The fold line's two ends on the sheet (for the highlight), if any. */
  fold: [Point, Point] | null;
  /** Fraction of the sheet lifted, 0..1. */
  progress: number;
}

export function peelShapes(rect: Rect, corner: Point, finger: Point): PeelShapes {
  const sheet = rectPoints(rect);
  const dx = finger.x - corner.x;
  const dy = finger.y - corner.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return { attached: sheet, flap: [], fold: null, progress: 0 };
  const n = { x: dx / len, y: dy / len };
  const m = { x: (corner.x + finger.x) / 2, y: (corner.y + finger.y) / 2 };
  const lifted = clipHalfPlane(sheet, m, n);
  const attached = clipHalfPlane(sheet, m, { x: -n.x, y: -n.y });
  const flap = lifted.map(p => reflect(p, m, n));
  const onFold = lifted.filter(p => Math.abs((p.x - m.x) * n.x + (p.y - m.y) * n.y) < 0.01);
  const total = rect.width * rect.height;
  return {
    attached,
    flap,
    fold: onFold.length >= 2 ? [onFold[0], onFold[onFold.length - 1]] : null,
    progress: Math.min(1, polygonArea(lifted) / total),
  };
}

export function pointsString(points: Point[]): string {
  return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}
