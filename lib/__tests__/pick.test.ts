import { createRng, flakeAt, makeFlake, peelProgress, snagsCrossed, Flake, FLAKE_MAX_SIZE } from '@/lib/pick';
import { mixColor } from '@/lib/color';

const bounds = { width: 390, height: 844, top: 100, bottom: 120 };

const flake = (overrides: Partial<Flake> = {}): Flake => ({
  id: 1,
  x: 100,
  y: 100,
  size: 15,
  outline: [],
  edgeAngle: 0,
  resistance: 50,
  loosened: 0,
  snags: [0.5],
  ...overrides,
});

describe('makeFlake', () => {
  it('places flakes inside the playable area, clear of header and footer', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const f = makeFlake(rng, i, bounds);
      expect(f.x).toBeGreaterThan(0);
      expect(f.x).toBeLessThan(bounds.width);
      expect(f.y).toBeGreaterThan(bounds.top);
      expect(f.y).toBeLessThan(bounds.height - bounds.bottom);
      expect(f.size).toBeLessThanOrEqual(FLAKE_MAX_SIZE);
      expect(f.outline.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('is reproducible from a seed', () => {
    expect(makeFlake(createRng(42), 1, bounds)).toEqual(makeFlake(createRng(42), 1, bounds));
  });
});

describe('peeling', () => {
  it('catches a flake when the fingertip lands near it', () => {
    const f = flake();
    expect(flakeAt([f], 100 + 15 + 10, 100)).toBe(f);
    expect(flakeAt([f], 200, 200)).toBeNull();
  });

  it('progress grows with pull distance and caps at 1', () => {
    const f = flake({ edgeAngle: 90 });
    expect(peelProgress(f, { x: 0, y: 0 }, { x: 25, y: 0 })).toBeCloseTo(0.5);
    expect(peelProgress(f, { x: 0, y: 0 }, { x: 500, y: 0 })).toBe(1);
  });

  it('pulling along the loose edge is easier than against it', () => {
    const f = flake({ edgeAngle: 0 });
    const along = peelProgress(f, { x: 0, y: 0 }, { x: 20, y: 0 });
    const against = peelProgress(f, { x: 0, y: 0 }, { x: -20, y: 0 });
    expect(along).toBeGreaterThan(against);
  });

  it('a worried-at flake starts partway lifted', () => {
    expect(peelProgress(flake({ loosened: 0.4 }), { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0.4);
  });

  it('reports snags only when crossing them upward', () => {
    const f = flake({ snags: [0.4, 0.7] });
    expect(snagsCrossed(f, 0.3, 0.8)).toBe(2);
    expect(snagsCrossed(f, 0.8, 0.3)).toBe(0);
  });
});

describe('mixColor', () => {
  it('blends hex colors', () => {
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixColor('#123456', '#ffffff', 0)).toBe('#123456');
  });
});
