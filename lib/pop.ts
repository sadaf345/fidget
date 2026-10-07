export interface GridLayout {
  cols: number;
  rows: number;
  /** Bubble diameter. */
  size: number;
  gap: number;
  /** Inset from the sheet edge to the first bubble. */
  pad: number;
  width: number;
  height: number;
}

/** Fits as many rows of `cols` bubbles as the space allows (between minRows and maxRows). */
export function layoutGrid(width: number, height: number, cols = 5, minRows = 5, maxRows = 9): GridLayout {
  const pad = 14;
  const gap = 10;
  const size = Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);
  const fit = Math.floor((height - pad * 2 + gap) / (size + gap));
  const rows = Math.max(minRows, Math.min(maxRows, fit));
  return { cols, rows, size, gap, pad, width, height: pad * 2 + rows * size + (rows - 1) * gap };
}

export function cellCenter(layout: GridLayout, index: number): { x: number; y: number } {
  const col = index % layout.cols;
  const row = Math.floor(index / layout.cols);
  const step = layout.size + layout.gap;
  return { x: layout.pad + col * step + layout.size / 2, y: layout.pad + row * step + layout.size / 2 };
}

/** Index of the bubble under (x, y), or -1 between bubbles and outside the grid. */
export function cellAt(layout: GridLayout, x: number, y: number, slop = 4): number {
  const step = layout.size + layout.gap;
  const col = Math.floor((x - layout.pad + layout.gap / 2) / step);
  const row = Math.floor((y - layout.pad + layout.gap / 2) / step);
  if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) return -1;
  const index = row * layout.cols + col;
  const c = cellCenter(layout, index);
  return Math.hypot(x - c.x, y - c.y) <= layout.size / 2 + slop ? index : -1;
}
