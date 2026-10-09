import { LOOPS, ONE_SHOTS } from '@/lib/sound/recipes';
import { Biquad, SAMPLE_RATE } from '@/lib/sound/dsp';

const peak = (b: Float32Array) => b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (b: Float32Array) => Math.sqrt(b.reduce((s, v) => s + v * v, 0) / b.length);

describe('sound library', () => {
  it.each(Object.keys(ONE_SHOTS))('%s is audible, finite and never clips', name => {
    const b = ONE_SHOTS[name as keyof typeof ONE_SHOTS]();
    expect(b.every(Number.isFinite)).toBe(true);
    expect(peak(b)).toBeGreaterThan(0.3);
    expect(peak(b)).toBeLessThanOrEqual(1);
    expect(rms(b)).toBeGreaterThan(0.001);
    // Starts and ends at silence so it never pops on its own.
    expect(Math.abs(b[0])).toBeLessThan(0.05);
    expect(Math.abs(b[b.length - 1])).toBeLessThan(0.02);
  });

  it('touch sounds are short enough to land with their haptic', () => {
    const quick = ['tick', 'click', 'clack', 'bump', 'toggle', 'detent', 'ratchet', 'zipTick', 'crackle', 'rib', 'catch', 'marble', 'pop'] as const;
    for (const name of quick) expect(ONE_SHOTS[name]().length / SAMPLE_RATE).toBeLessThanOrEqual(0.13);
  });

  it.each(Object.keys(LOOPS))('%s loop repeats without a jump at the seam', name => {
    const b = LOOPS[name as keyof typeof LOOPS]();
    expect(b.every(Number.isFinite)).toBe(true);
    expect(peak(b)).toBeLessThanOrEqual(1);
    expect(rms(b)).toBeGreaterThan(0.01);
    // The step from the last sample back to the first is no bigger than a typical step inside.
    let typical = 0;
    for (let i = 1; i < b.length; i++) typical = Math.max(typical, Math.abs(b[i] - b[i - 1]));
    expect(Math.abs(b[0] - b[b.length - 1])).toBeLessThanOrEqual(typical * 1.05);
  });

  it('a lowpass filter passes lows and cuts highs', () => {
    const energyAt = (freq: number) => {
      const f = new Biquad('lowpass', 500);
      let e = 0;
      for (let i = 0; i < SAMPLE_RATE / 10; i++) {
        const y = f.process(Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE));
        if (i > 1000) e += y * y;
      }
      return e;
    };
    expect(energyAt(100)).toBeGreaterThan(energyAt(5000) * 50);
  });
});
