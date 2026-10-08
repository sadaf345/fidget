import { breathIntensity, breathSize, PATTERNS, phaseAt } from '@/lib/breathe';
import { createRng } from '@/lib/pick';
import { makeFlakes, stepSnow, swirl } from '@/lib/snow';

describe('breathing', () => {
  it('walks through box breathing 4-4-4-4', () => {
    const box = PATTERNS.box;
    expect(phaseAt(box, 0)).toMatchObject({ index: 0, countdown: 4, cycle: 0 });
    expect(phaseAt(box, 4500).phase.kind).toBe('hold');
    expect(phaseAt(box, 8000).phase.kind).toBe('exhale');
    expect(phaseAt(box, 16000)).toMatchObject({ index: 0, cycle: 1 });
  });

  it('4-7-8 holds for 7 and exhales for 8', () => {
    expect(phaseAt(PATTERNS['478'], 4000)).toMatchObject({ phase: { kind: 'hold', seconds: 7 }, countdown: 7 });
    expect(phaseAt(PATTERNS['478'], 11000)).toMatchObject({ phase: { kind: 'exhale', seconds: 8 }, countdown: 8 });
  });

  it('inhale swells 0.1 -> 0.6, exhale fades back, holds stay quiet', () => {
    expect(breathIntensity('inhale', 0)).toBeCloseTo(0.1);
    expect(breathIntensity('inhale', 1)).toBeCloseTo(0.6);
    expect(breathIntensity('exhale', 1)).toBeCloseTo(0.1);
    expect(breathIntensity('hold', 0.5)).toBe(0);
  });

  it('the circle stays full after an inhale and empty after an exhale', () => {
    const box = PATTERNS.box;
    expect(breathSize(box, phaseAt(box, 6000))).toBe(1);
    expect(breathSize(box, phaseAt(box, 14000))).toBe(0);
  });
});

describe('snow globe', () => {
  const globe = { cx: 150, cy: 150, radius: 120, groundY: 216 };

  it('flakes stay inside the glass and settle on the ground after a swirl', () => {
    const rng = createRng(3);
    const flakes = makeFlakes(globe, 60, rng);
    swirl(flakes, globe, 1, rng);
    for (let i = 0; i < 60 * 20; i++) stepSnow(flakes, globe, 1 / 60);
    for (const f of flakes) {
      expect(Math.hypot(f.x - globe.cx, f.y - globe.cy)).toBeLessThanOrEqual(globe.radius);
      expect(f.y).toBeGreaterThan(globe.groundY - 10);
    }
  });
});
