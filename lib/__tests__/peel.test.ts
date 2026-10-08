import { clipHalfPlane, peelShapes, polygonArea, rectPoints, reflect } from '@/lib/peel';

const rect = { x: 0, y: 0, width: 200, height: 100 };
const corner = { x: 200, y: 100 };

describe('peel geometry', () => {
  it('measures and clips polygons', () => {
    expect(polygonArea(rectPoints(rect))).toBe(20000);
    const left = clipHalfPlane(rectPoints(rect), { x: 100, y: 0 }, { x: 1, y: 0 });
    expect(polygonArea(left)).toBeCloseTo(10000);
  });

  it('reflects a point across a line', () => {
    expect(reflect({ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 1, y: 0 })).toEqual({ x: 10, y: 0 });
  });

  it('nothing is lifted with the finger on the corner', () => {
    expect(peelShapes(rect, corner, corner).progress).toBe(0);
  });

  it('pulling the corner inward lifts a flap whose corner lands under the finger', () => {
    const finger = { x: 160, y: 60 };
    const s = peelShapes(rect, corner, finger);
    expect(s.progress).toBeGreaterThan(0);
    expect(s.progress).toBeLessThan(0.2);
    expect(s.flap.some(p => Math.hypot(p.x - finger.x, p.y - finger.y) < 0.5)).toBe(true);
    expect(polygonArea(s.attached) + polygonArea(s.flap)).toBeCloseTo(20000);
    expect(s.fold).not.toBeNull();
  });

  it('pulling far enough lifts the whole sheet', () => {
    const s = peelShapes(rect, corner, { x: -300, y: -200 });
    expect(s.progress).toBeCloseTo(1);
    expect(polygonArea(s.attached)).toBeCloseTo(0);
  });
});
