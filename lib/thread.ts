import { Rng } from '@/lib/pick';

/*
 * Loose thread: pulling the yarn unravels a knit patch one stitch at a time. Each stitch takes
 * 16 pt of pull; now and then one resists for an extra 30 pt, then gives.
 */

export const STITCH_PULL = 16;
export const RESIST_EXTRA = 30;

export interface ThreadState {
  /** Stitches unraveled so far. */
  done: number;
  /** Pull put into the current stitch. */
  pull: number;
}

export type ThreadEvent = 'tug' | 'resist' | 'give';

/** Which stitches resist: roughly one in six, never two in a row. */
export function makeResists(count: number, rng: Rng): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < count; i++) out.push(i > 0 && !out[i - 1] && rng() < 0.18);
  return out;
}

/**
 * Feeds pull distance into the knit. Returns the new state, what happened (a tug per plain
 * stitch; 'resist' when a stubborn one starts holding, 'give' when it lets go), and the current
 * tension 0..1 while a stubborn stitch is holding.
 */
export function pullThread(state: ThreadState, distance: number, resists: boolean[]): { state: ThreadState; events: ThreadEvent[]; tension: number } {
  let { done, pull } = state;
  const events: ThreadEvent[] = [];
  let remaining = Math.max(0, distance);
  while (remaining > 0 && done < resists.length) {
    const stubborn = resists[done];
    const cost = STITCH_PULL + (stubborn ? RESIST_EXTRA : 0);
    const before = pull;
    const take = Math.min(remaining, cost - pull);
    pull += take;
    remaining -= take;
    if (stubborn && before < STITCH_PULL && pull >= STITCH_PULL && pull < cost) events.push('resist');
    if (pull >= cost) {
      events.push(stubborn ? 'give' : 'tug');
      done += 1;
      pull = 0;
    }
  }
  const holding = done < resists.length && resists[done] && pull >= STITCH_PULL;
  return { state: { done, pull }, events, tension: holding ? (pull - STITCH_PULL) / RESIST_EXTRA : 0 };
}
