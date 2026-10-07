import { cellAt, cellCenter, layoutGrid } from '@/lib/pop';

describe('pop grid', () => {
  const layout = layoutGrid(358, 640);

  it('fits five columns across and a sensible number of rows', () => {
    expect(layout.cols).toBe(5);
    expect(layout.size).toBeGreaterThan(50);
    expect(layout.rows).toBeGreaterThanOrEqual(5);
    expect(layout.height).toBeLessThanOrEqual(640);
  });

  it('finds the bubble under every bubble center', () => {
    for (let i = 0; i < layout.cols * layout.rows; i++) {
      const c = cellCenter(layout, i);
      expect(cellAt(layout, c.x, c.y)).toBe(i);
    }
  });

  it('misses outside the grid', () => {
    expect(cellAt(layout, -10, 10)).toBe(-1);
    expect(cellAt(layout, 10, layout.height + 40)).toBe(-1);
  });
});
