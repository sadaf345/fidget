import { createRng } from '@/lib/pick';
import { makeResists, pullThread, RESIST_EXTRA, STITCH_PULL } from '@/lib/thread';
import { clearedFraction, createCoverage, scratchAt } from '@/lib/scratch';

describe('loose thread', () => {
  it('tugs once per 16 pt of pull', () => {
    const resists = Array(10).fill(false);
    const r = pullThread({ done: 0, pull: 0 }, STITCH_PULL * 3 + 5, resists);
    expect(r.events).toEqual(['tug', 'tug', 'tug']);
    expect(r.state).toEqual({ done: 3, pull: 5 });
  });

  it('a stubborn stitch holds for 30 pt more, with rising tension, then gives', () => {
    const resists = [true, false];
    let r = pullThread({ done: 0, pull: 0 }, STITCH_PULL, resists);
    expect(r.events).toEqual(['resist']);
    r = pullThread(r.state, RESIST_EXTRA / 2, resists);
    expect(r.tension).toBeCloseTo(0.5);
    r = pullThread(r.state, RESIST_EXTRA / 2, resists);
    expect(r.events).toEqual(['give']);
    expect(r.state.done).toBe(1);
  });

  it('about one stitch in six resists, never two in a row', () => {
    const resists = makeResists(600, createRng(4));
    const share = resists.filter(Boolean).length / resists.length;
    expect(share).toBeGreaterThan(0.08);
    expect(share).toBeLessThan(0.25);
    expect(resists.some((v, i) => v && resists[i + 1])).toBe(false);
  });
});

describe('scratch-off coverage', () => {
  it('rubbing clears cells once and tracks the fraction cleared', () => {
    const c = createCoverage(240, 320);
    const first = scratchAt(c, 120, 160, 30);
    expect(first).toBeGreaterThan(0);
    expect(scratchAt(c, 120, 160, 30)).toBe(0);
    for (let y = 0; y <= 320; y += 10) for (let x = 0; x <= 240; x += 10) scratchAt(c, x, y, 20);
    expect(clearedFraction(c)).toBe(1);
  });
});
