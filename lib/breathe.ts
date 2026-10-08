/*
 * Breathe: paced breathing felt through haptics. Inhale swells, holds tick faintly once a
 * second, exhale fades, so it works with eyes closed.
 */

export type PhaseKind = 'inhale' | 'hold' | 'exhale';

export interface Phase {
  kind: PhaseKind;
  seconds: number;
}

export const PATTERNS: Record<'box' | '478', Phase[]> = {
  box: [
    { kind: 'inhale', seconds: 4 },
    { kind: 'hold', seconds: 4 },
    { kind: 'exhale', seconds: 4 },
    { kind: 'hold', seconds: 4 },
  ],
  '478': [
    { kind: 'inhale', seconds: 4 },
    { kind: 'hold', seconds: 7 },
    { kind: 'exhale', seconds: 8 },
  ],
};

export interface PhaseAt {
  phase: Phase;
  index: number;
  /** 0..1 through this phase. */
  progress: number;
  /** Whole seconds left in this phase, counting down (4, 3, 2, 1). */
  countdown: number;
  cycle: number;
}

export function phaseAt(phases: Phase[], elapsedMs: number): PhaseAt {
  const cycleMs = phases.reduce((sum, p) => sum + p.seconds * 1000, 0);
  const cycle = Math.floor(elapsedMs / cycleMs);
  let t = elapsedMs - cycle * cycleMs;
  for (let index = 0; index < phases.length; index++) {
    const ms = phases[index].seconds * 1000;
    if (t < ms) {
      return { phase: phases[index], index, progress: t / ms, countdown: Math.ceil((ms - t) / 1000), cycle };
    }
    t -= ms;
  }
  const last = phases.length - 1;
  return { phase: phases[last], index: last, progress: 1, countdown: 0, cycle };
}

/** Continuous intensity: inhale ramps 0.1 -> 0.6, exhale 0.6 -> 0.1; holds are silent between ticks. */
export function breathIntensity(kind: PhaseKind, progress: number): number {
  if (kind === 'inhale') return 0.1 + 0.5 * progress;
  if (kind === 'exhale') return 0.6 - 0.5 * progress;
  return 0;
}

/** Circle size 0..1: grows on the inhale, stays full on the hold after it, shrinks on the exhale. */
export function breathSize(phases: Phase[], at: PhaseAt): number {
  if (at.phase.kind === 'inhale') return at.progress;
  if (at.phase.kind === 'exhale') return 1 - at.progress;
  const before = phases[(at.index - 1 + phases.length) % phases.length];
  return before.kind === 'inhale' ? 1 : 0;
}
