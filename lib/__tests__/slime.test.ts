import { createSlime, POINTS, pressureFor, slimePath, stepSlime, targetOffsets } from '@/lib/slime';
import { purrIntensity, squeezeIntensity } from '@/lib/squish';

describe('slime', () => {
  it('builds pressure the longer a finger is held, capped at 1', () => {
    expect(pressureFor(0)).toBe(0);
    expect(pressureFor(450)).toBeCloseTo(0.5);
    expect(pressureFor(5000)).toBe(1);
  });

  it('a finger pressed in dents the nearby edge and the far side bulges (volume kept)', () => {
    const targets = targetOffsets(100, [{ x: 60, y: 0, pressure: 1 }]);
    expect(targets[0]).toBeLessThan(0);
    expect(targets[POINTS / 2]).toBeGreaterThan(0);
    expect(targets.reduce((a, b) => a + b, 0)).toBeCloseTo(0);
  });

  it('dragging a finger outside stretches the edge toward it', () => {
    expect(targetOffsets(100, [{ x: 0, y: 160, pressure: 0.5 }])[POINTS / 4]).toBeGreaterThan(0);
  });

  it('springs settle back to round after release', () => {
    const slime = createSlime();
    const dent = targetOffsets(100, [{ x: 50, y: 0, pressure: 1 }]);
    for (let i = 0; i < 60; i++) stepSlime(slime, dent, 1 / 60);
    const rest = Array(POINTS).fill(0);
    let motion = 1;
    for (let i = 0; i < 600; i++) motion = stepSlime(slime, rest, 1 / 60);
    expect(motion).toBeLessThan(0.05);
    expect(Math.max(...slime.offsets.map(Math.abs))).toBeLessThan(0.5);
  });

  it('draws a closed path', () => {
    expect(slimePath(0, 0, 100, Array(POINTS).fill(0))).toMatch(/^M .* Z$/);
  });
});

describe('cat and stress ball', () => {
  it('purr swings between 0.3 and 0.6', () => {
    const samples = Array.from({ length: 200 }, (_, i) => purrIntensity(i / 100));
    expect(Math.min(...samples)).toBeCloseTo(0.3, 1);
    expect(Math.max(...samples)).toBeCloseTo(0.6, 1);
  });

  it('squeeze ramps 0.2 to 1.0 over 1.5 s and holds', () => {
    expect(squeezeIntensity(0)).toBeCloseTo(0.2);
    expect(squeezeIntensity(750)).toBeCloseTo(0.6);
    expect(squeezeIntensity(5000)).toBe(1);
  });
});
