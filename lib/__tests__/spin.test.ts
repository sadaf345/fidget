import { angleAround, angleDelta, mod, releaseVelocity, startMomentum } from '@/lib/spin';

describe('angle math', () => {
  it('mod is always non-negative', () => {
    expect(mod(-1, 360)).toBe(359);
    expect(mod(725, 360)).toBe(5);
  });

  it('angleDelta takes the short way across the ±180° seam', () => {
    expect(angleDelta(170, -170)).toBe(20);
    expect(angleDelta(-170, 170)).toBe(-20);
    expect(angleDelta(10, 30)).toBe(20);
  });

  it('a full circle of finger movement turns the dial exactly 360°', () => {
    let total = 0;
    let prev = angleAround(0, 0, 1, 0);
    for (let deg = 10; deg <= 360; deg += 10) {
      const rad = (deg * Math.PI) / 180;
      const next = angleAround(0, 0, Math.cos(rad), Math.sin(rad));
      total += angleDelta(prev, next);
      prev = next;
    }
    expect(total).toBeCloseTo(360);
  });
});

describe('releaseVelocity', () => {
  it('measures speed over the recent window only', () => {
    const samples = [
      { t: 0, value: 0 },
      { t: 900, value: 0 },
      { t: 950, value: 50 },
      { t: 1000, value: 100 },
    ];
    expect(releaseVelocity(samples, 1000)).toBeCloseTo(1);
  });

  it('is zero when the finger paused before lifting', () => {
    expect(releaseVelocity([{ t: 0, value: 0 }, { t: 10, value: 90 }], 500)).toBe(0);
  });
});

describe('startMomentum', () => {
  let now = 0;
  beforeEach(() => {
    now = 0;
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(cb => {
      now += 16.67;
      return setTimeout(() => cb(now), 0) as unknown as number;
    });
    jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('coasts in the flick direction, slows down, then stops', () => {
    const steps: number[] = [];
    const onEnd = jest.fn();
    startMomentum({ velocity: 2, friction: 0.95, minVelocity: 0.05, onStep: d => steps.push(d), onEnd });
    jest.runAllTimers();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(steps.every(d => d > 0)).toBe(true);
    expect(steps[steps.length - 1]).toBeLessThan(steps[0]);
  });

  it('can be cancelled mid-spin', () => {
    const onEnd = jest.fn();
    const cancel = startMomentum({ velocity: 2, friction: 0.99, minVelocity: 0.01, onStep: () => {}, onEnd });
    jest.advanceTimersByTime(5);
    cancel();
    jest.runAllTimers();
    expect(onEnd).not.toHaveBeenCalled();
  });
});
