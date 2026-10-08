import { crackNetwork, distanceToEdge } from '@/lib/glass';
import { beadAcceleration, Bead, flick, stepRattle } from '@/lib/rattle';

describe('crackNetwork', () => {
  const W = 358;
  const H = 76;

  it('measures the distance to the edge of the box', () => {
    expect(distanceToEdge(100, 50, 50, 25, 1, 0)).toBeCloseTo(50);
    expect(distanceToEdge(100, 50, 50, 25, 0, -1)).toBeCloseTo(25);
  });

  it('runs cracks out to the edges on every side, wherever the press lands', () => {
    for (const origin of [{ x: W / 2, y: H / 2 }, { x: 20, y: 10 }, { x: W - 5, y: H - 5 }]) {
      const lines = crackNetwork(W, H, origin, 7);
      const ends = lines.filter(l => l.weight === 1).map(l => l.points[l.points.length - 1]);
      expect(ends.some(p => p.x <= 2)).toBe(true);
      expect(ends.some(p => p.x >= W - 2)).toBe(true);
      expect(ends.some(p => p.y <= 2)).toBe(true);
      expect(ends.some(p => p.y >= H - 2)).toBe(true);
    }
  });

  it('gives every crack a valid drawing window', () => {
    for (const l of crackNetwork(W, H, { x: 100, y: 30 }, 3)) {
      expect(l.start).toBeGreaterThanOrEqual(0);
      expect(l.end).toBeGreaterThan(l.start);
      expect(l.end).toBeLessThanOrEqual(1);
      expect(l.length).toBeGreaterThan(0);
    }
  });
});

describe('rattle physics', () => {
  const bead = (x: number, y: number): Bead => ({ x, y, vx: 0, vy: 0, r: 15 });

  it('maps an upright phone at rest to gravity pulling beads down the screen', () => {
    const { ax, ay } = beadAcceleration({ x: 0, y: -1 }, 6000);
    expect(ax).toBeCloseTo(0);
    expect(ay).toBe(6000);
  });

  it('beads fall, hit the floor, and come to rest inside the box', () => {
    const beads = [bead(50, 20)];
    let hits = 0;
    for (let i = 0; i < 240; i++) hits += stepRattle(beads, 100, 300, 0, 6000, 1 / 60).length;
    expect(hits).toBeGreaterThan(0);
    expect(beads[0].y).toBeCloseTo(300 - 15, 0);
    expect(Math.abs(beads[0].vy)).toBeLessThan(60);
  });

  it('beads never overlap or leave the box', () => {
    const beads = Array.from({ length: 10 }, (_, i) => bead(20 + (i % 5) * 30, 20 + Math.floor(i / 5) * 30));
    for (let i = 0; i < 300; i++) {
      const sideways = i % 30 < 15 ? 9000 : -9000;
      stepRattle(beads, 200, 300, sideways, 6000, 1 / 60);
    }
    for (const b of beads) {
      expect(b.x).toBeGreaterThanOrEqual(b.r - 0.01);
      expect(b.x).toBeLessThanOrEqual(200 - b.r + 0.01);
      expect(b.y).toBeLessThanOrEqual(300 - b.r + 0.01);
    }
  });

  it('rounded corners keep beads inside the curve', () => {
    const beads = [bead(20, 280)];
    for (let i = 0; i < 120; i++) stepRattle(beads, 200, 300, -9000, 6000, 1 / 60, 40);
    const b = beads[0];
    // Pressed into the bottom-left corner, the bead's edge stays within the arc.
    expect(Math.hypot(b.x - 40, b.y - 260) + b.r).toBeLessThanOrEqual(40 + 0.01);
  });

  it('a flick pushes nearby beads away from the touch', () => {
    const beads = [bead(110, 100), bead(400, 100)];
    flick(beads, 100, 100, 120, 1000);
    expect(beads[0].vx).toBeGreaterThan(0);
    expect(beads[1].vx).toBe(0);
  });
});
