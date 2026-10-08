/*
 * Scratch-off: a coarse grid tracks how much foil has been rubbed away.
 */

export interface Coverage {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  cleared: boolean[];
  count: number;
}

export function createCoverage(width: number, height: number, cols = 24, rows = 32): Coverage {
  return { cols, rows, cellW: width / cols, cellH: height / rows, cleared: Array(cols * rows).fill(false), count: 0 };
}

/** Clears cells whose centers fall inside the brush. Returns how many were newly cleared. */
export function scratchAt(c: Coverage, x: number, y: number, radius: number): number {
  let fresh = 0;
  const c0 = Math.max(0, Math.floor((x - radius) / c.cellW));
  const c1 = Math.min(c.cols - 1, Math.floor((x + radius) / c.cellW));
  const r0 = Math.max(0, Math.floor((y - radius) / c.cellH));
  const r1 = Math.min(c.rows - 1, Math.floor((y + radius) / c.cellH));
  for (let r = r0; r <= r1; r++) {
    for (let col = c0; col <= c1; col++) {
      const i = r * c.cols + col;
      if (c.cleared[i]) continue;
      const cx = (col + 0.5) * c.cellW;
      const cy = (r + 0.5) * c.cellH;
      if (Math.hypot(cx - x, cy - y) <= radius) {
        c.cleared[i] = true;
        c.count += 1;
        fresh += 1;
      }
    }
  }
  return fresh;
}

export const clearedFraction = (c: Coverage) => c.count / c.cleared.length;

export const PHRASES = [
  "You're doing okay.",
  'Unclench your jaw.',
  'Drop your shoulders.',
  'Breathe out slowly.',
  'This feeling will pass.',
  'Be gentle with yourself.',
  'Name five things you can see.',
  'Your hands are safe here.',
  'One breath at a time.',
  'Rest is allowed.',
  'Soften your hands.',
  'You noticed. That counts.',
];
