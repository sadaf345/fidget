import { AFTERGLOW_MS, chargeIntensity, climaxPattern, initialCharge, REARM_LEVEL, stepCharge, ChargeState } from '@/lib/charge';
import { rumbleBeat, rumbleGapMs, rumbleTap, rumbleWave } from '@/lib/rumble';

const FRAME = 16.67;

function hold(state: ChargeState, ms: number, windPerFrame = 0) {
  let s = state;
  for (let t = 0; t + FRAME <= ms; t += FRAME) s = stepCharge(s, FRAME, windPerFrame).state;
  return s;
}

/** Milliseconds of holding until the next climax, and the state right at that moment. */
function untilClimax(state: ChargeState, windPerFrame = 0, maxMs = 10000) {
  let s = state;
  for (let t = FRAME; t <= maxMs; t += FRAME) {
    const r = stepCharge(s, FRAME, windPerFrame);
    s = r.state;
    if (r.climaxed) return { ms: t, state: s };
  }
  return { ms: Infinity, state: s };
}

describe('stepCharge', () => {
  it('waits briefly, then builds to a climax in about two seconds of holding still', () => {
    expect(hold(initialCharge(), 200).level).toBe(0);
    const { ms } = untilClimax(initialCharge());
    expect(ms).toBeGreaterThan(1700);
    expect(ms).toBeLessThan(2300);
  });

  it('winding clockwise (about a circle a second) gets there much faster', () => {
    expect(untilClimax(initialCharge(), 6).ms).toBeLessThan(1300);
  });

  it('winding counter-clockwise reverses the build', () => {
    const built = hold(initialCharge(), 1000);
    expect(hold(built, 500, -6).level).toBeLessThan(built.level);
  });

  it('keeps going after a climax: re-arms partway up and repeats faster', () => {
    const first = untilClimax(initialCharge());
    expect(first.state.combo).toBe(1);
    const rearmed = hold(first.state, AFTERGLOW_MS + FRAME);
    expect(rearmed.afterglowMs).toBe(0);
    expect(rearmed.level).toBeCloseTo(REARM_LEVEL, 1);
    const second = untilClimax(rearmed);
    expect(second.state.combo).toBe(2);
    expect(second.ms).toBeLessThan(first.ms);
  });
});

describe('haptic shaping', () => {
  it('rumble taps get closer together and heavier as intensity rises', () => {
    expect(rumbleGapMs(0)).toBeGreaterThan(rumbleGapMs(0.5));
    expect(rumbleGapMs(0.5)).toBeGreaterThan(rumbleGapMs(1));
    expect(rumbleTap(0.1)).toBe('soft');
    expect(rumbleTap(0.8)).toBe('heavy');
    expect(chargeIntensity(0)).toBe(0);
    expect(chargeIntensity(1)).toBeCloseTo(1);
  });

  it('later climaxes in one hold crack harder', () => {
    expect(climaxPattern(3).length).toBeGreaterThan(climaxPattern(1).length);
    const times = climaxPattern(3).map(s => s.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('continuous rumble shaping', () => {
  it('swells stronger and sharper as intensity rises', () => {
    const low = rumbleWave(0.1);
    const high = rumbleWave(0.9);
    expect(high.amplitude).toBeGreaterThan(low.amplitude);
    expect(high.frequency).toBeGreaterThan(low.frequency);
    expect(rumbleBeat(1).amplitude).toBeLessThanOrEqual(1);
  });

  it('a climax with continuous aftershocks keeps only the burst', () => {
    const tapsOnly = climaxPattern(1, true);
    const withFade = climaxPattern(1, false);
    expect(withFade.length).toBeLessThan(tapsOnly.length);
    expect(withFade[withFade.length - 1].power).toBe('success');
  });
});
