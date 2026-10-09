import { createRng } from '@/lib/pick';
import { addNoise, addPartials, addTone, finish, makeBuffer, SAMPLE_RATE, seamless } from '@/lib/sound/dsp';

/*
 * The sound library. One-shots are short (mostly under 150 ms) so they land with the haptic
 * they pair with; loops are seamless and get shaped live (volume, pitch, filter) by the toys.
 * Each recipe is tunable: pitch and level vary per play too (see lib/sound/engine.ts).
 */

export const ONE_SHOTS = {
  // Generic ticks and clicks
  tick: () => {
    const b = makeBuffer(0.03);
    addNoise(b, { filter: { type: 'bandpass', freq: 2500, q: 1 }, decay: 0.0015 });
    addTone(b, { freq: 1500, decay: 0.004, amp: 0.25 });
    return finish(b, 0.6);
  },
  click: () => {
    const b = makeBuffer(0.04);
    addNoise(b, { filter: { type: 'bandpass', freq: 5000, q: 1.1 }, decay: 0.0022 });
    addTone(b, { freq: 3700, decay: 0.006, amp: 0.45 });
    addTone(b, { freq: 1200, decay: 0.008, amp: 0.06 });
    return finish(b, 0.9);
  },

  // Switch tester: Blue click-clack, Brown bump, Red thud, Topre thock
  clack: () => {
    const b = makeBuffer(0.045);
    addNoise(b, { filter: { type: 'bandpass', freq: 2600, q: 1 }, decay: 0.003 });
    addTone(b, { freq: 1900, decay: 0.01, amp: 0.45 });
    return finish(b, 0.85);
  },
  bump: () => {
    const b = makeBuffer(0.05);
    addNoise(b, { filter: { type: 'lowpass', freq: 1600 }, decay: 0.004 });
    addTone(b, { freq: 520, to: 380, glide: 0.01, decay: 0.014, amp: 0.6 });
    return finish(b, 0.8);
  },
  thud: () => {
    const b = makeBuffer(0.09);
    addTone(b, { freq: 230, to: 110, glide: 0.012, decay: 0.028 });
    addNoise(b, { filter: { type: 'lowpass', freq: 800 }, decay: 0.006, amp: 0.5 });
    return finish(b, 0.9);
  },
  thock: () => {
    const b = makeBuffer(0.14);
    addTone(b, { freq: 180, to: 92, glide: 0.016, decay: 0.04, harmonics: [0.25] });
    addNoise(b, { filter: { type: 'bandpass', freq: 1100, q: 0.8 }, decay: 0.009, amp: 0.7 });
    addTone(b, { freq: 430, decay: 0.022, amp: 0.25 });
    return finish(b, 0.95);
  },
  thockUp: () => {
    const b = makeBuffer(0.07);
    addTone(b, { freq: 260, to: 160, glide: 0.01, decay: 0.016, amp: 0.7 });
    addNoise(b, { filter: { type: 'bandpass', freq: 1500, q: 1 }, decay: 0.004, amp: 0.4 });
    return finish(b, 0.55);
  },

  // Pen: a double click with a little spring shimmer, and a single click back
  penIn: () => {
    const b = makeBuffer(0.12);
    addNoise(b, { filter: { type: 'bandpass', freq: 3600, q: 1.2 }, decay: 0.002 });
    addTone(b, { freq: 2800, decay: 0.006, amp: 0.45 });
    addNoise(b, { filter: { type: 'bandpass', freq: 3000, q: 1 }, decay: 0.0018, amp: 0.55, start: 0.03, seed: 2 });
    addTone(b, { freq: 2300, decay: 0.005, amp: 0.3, start: 0.03 });
    addTone(b, { freq: 5200, decay: 0.045, amp: 0.05, vibrato: { rate: 30, depth: 40 } });
    return finish(b, 0.85);
  },
  penOut: () => {
    const b = makeBuffer(0.05);
    addNoise(b, { filter: { type: 'bandpass', freq: 3300, q: 1 }, decay: 0.0022 });
    addTone(b, { freq: 2500, decay: 0.007, amp: 0.4 });
    addTone(b, { freq: 700, decay: 0.012, amp: 0.15 });
    return finish(b, 0.8);
  },

  // Toggle wall
  toggle: () => {
    const b = makeBuffer(0.03);
    addNoise(b, { filter: { type: 'bandpass', freq: 2100, q: 2 }, decay: 0.0016, amp: 0.8 });
    addTone(b, { freq: 1500, decay: 0.006, amp: 0.3 });
    return finish(b, 0.55);
  },
  lightSwitch: () => {
    // The snap of the spring-loaded lever over a firm plastic body.
    const b = makeBuffer(0.09);
    addNoise(b, { filter: { type: 'highpass', freq: 2000 }, decay: 0.0022 });
    addNoise(b, { filter: { type: 'bandpass', freq: 1400, q: 1.2 }, decay: 0.012, amp: 0.6, seed: 3 });
    addTone(b, { freq: 320, to: 220, glide: 0.01, decay: 0.022, amp: 0.4 });
    return finish(b, 0.9);
  },
  rocker: () => {
    const b = makeBuffer(0.13);
    addTone(b, { freq: 170, to: 105, glide: 0.015, decay: 0.045 });
    addNoise(b, { filter: { type: 'bandpass', freq: 900, q: 0.9 }, decay: 0.014, amp: 0.45 });
    addNoise(b, { filter: { type: 'highpass', freq: 2500 }, decay: 0.0015, amp: 0.5, seed: 4 });
    return finish(b, 0.95);
  },

  // Tally counter: a bright metal click, and a heavier clunk on reset
  tally: () => {
    const b = makeBuffer(0.13);
    addNoise(b, { filter: { type: 'bandpass', freq: 5200, q: 1 }, decay: 0.0015, amp: 0.7 });
    addPartials(b, { freqs: [3150, 4720, 6280, 8150], amps: [0.5, 0.35, 0.25, 0.12], decays: [0.045, 0.03, 0.02, 0.012] });
    return finish(b, 0.75);
  },
  tallyReset: () => {
    const b = makeBuffer(0.2);
    addTone(b, { freq: 320, to: 180, glide: 0.02, decay: 0.05, amp: 0.9 });
    addPartials(b, { freqs: [1210, 1830, 2690], amps: [0.4, 0.25, 0.15], decays: [0.06, 0.045, 0.03] });
    addNoise(b, { filter: { type: 'bandpass', freq: 3000, q: 1 }, decay: 0.002, amp: 0.5 });
    return finish(b, 0.9);
  },

  // Dial and ratchet
  detent: () => {
    const b = makeBuffer(0.02);
    addNoise(b, { filter: { type: 'bandpass', freq: 6200, q: 3 }, decay: 0.0012, amp: 0.8 });
    addTone(b, { freq: 4300, decay: 0.0035, amp: 0.35 });
    return finish(b, 0.5);
  },
  ratchet: () => {
    const b = makeBuffer(0.035);
    addNoise(b, { filter: { type: 'bandpass', freq: 3800, q: 2 }, decay: 0.0018 });
    addTone(b, { freq: 2400, decay: 0.006, amp: 0.35 });
    addTone(b, { freq: 600, decay: 0.01, amp: 0.2 });
    return finish(b, 0.7);
  },

  // Pop-it
  pop: () => {
    // A crisp "pok": a quick downward chirp with a snap on top and just a hint of thump.
    const b = makeBuffer(0.1);
    addTone(b, { freq: 1100, to: 330, glide: 0.008, decay: 0.022, attack: 0.0006 });
    addNoise(b, { filter: { type: 'bandpass', freq: 1500, q: 1.2 }, decay: 0.004, amp: 0.8 });
    addTone(b, { freq: 140, decay: 0.02, amp: 0.1 });
    return finish(b, 0.9);
  },
  dud: () => {
    const b = makeBuffer(0.06);
    addTone(b, { freq: 260, to: 170, glide: 0.012, decay: 0.015, amp: 0.7 });
    addNoise(b, { filter: { type: 'lowpass', freq: 900 }, decay: 0.003, amp: 0.3 });
    return finish(b, 0.45);
  },
  flip: () => {
    const b = makeBuffer(0.45);
    addNoise(b, { filter: { type: 'bandpass', freq: 380, to: 2600, glide: 0.12, q: 0.9 }, attack: 0.09, decay: 0.12 });
    addTone(b, { freq: 190, to: 110, glide: 0.012, decay: 0.035, amp: 0.9, start: 0.3 });
    addNoise(b, { filter: { type: 'lowpass', freq: 900 }, decay: 0.008, amp: 0.4, start: 0.3, seed: 5 });
    return finish(b, 0.85);
  },

  // Pick and peel
  catch: () => {
    const b = makeBuffer(0.035);
    addNoise(b, { filter: { type: 'bandpass', freq: 3600, q: 1.1 }, decay: 0.0018 });
    addTone(b, { freq: 620, decay: 0.006, amp: 0.35 });
    return finish(b, 0.7);
  },
  snag: () => {
    const b = makeBuffer(0.05);
    addNoise(b, { filter: { type: 'bandpass', freq: 2800, q: 1 }, decay: 0.0015, grit: 0.6 });
    addNoise(b, { filter: { type: 'bandpass', freq: 1800, q: 1 }, decay: 0.002, amp: 0.6, start: 0.012, seed: 2 });
    return finish(b, 0.75);
  },
  tear: () => {
    const b = makeBuffer(0.16);
    addNoise(b, { filter: { type: 'bandpass', freq: 2200, to: 6500, glide: 0.02, q: 0.8 }, attack: 0.002, decay: 0.035, grit: 0.5 });
    addTone(b, { freq: 420, to: 140, glide: 0.01, decay: 0.025, amp: 0.5, start: 0.01 });
    return finish(b, 0.9);
  },
  reward: () => {
    const b = makeBuffer(0.35);
    addTone(b, { freq: 2093, decay: 0.12, amp: 0.6, harmonics: [0, 0.15] });
    addTone(b, { freq: 3136, decay: 0.09, amp: 0.25, start: 0.015 });
    return finish(b, 0.35);
  },
  peelOff: () => {
    const b = makeBuffer(0.25);
    addNoise(b, { filter: { type: 'bandpass', freq: 1500, to: 5200, glide: 0.05, q: 0.7 }, attack: 0.01, decay: 0.06, grit: 0.2 });
    addTone(b, { freq: 240, to: 140, glide: 0.012, decay: 0.03, amp: 0.5, start: 0.09 });
    return finish(b, 0.85);
  },
  crackle: () => {
    const b = makeBuffer(0.012);
    addNoise(b, { filter: { type: 'bandpass', freq: 3200, q: 1.5 }, decay: 0.0007 });
    return finish(b, 0.5);
  },
  tug: () => {
    const b = makeBuffer(0.07);
    addNoise(b, { filter: { type: 'lowpass', freq: 950 }, decay: 0.011 });
    addTone(b, { freq: 220, to: 150, glide: 0.015, decay: 0.02, amp: 0.6 });
    return finish(b, 0.75);
  },
  snap: () => {
    const b = makeBuffer(0.09);
    addNoise(b, { filter: { type: 'highpass', freq: 1800 }, decay: 0.003 });
    addNoise(b, { filter: { type: 'bandpass', freq: 2600, q: 1 }, decay: 0.01, amp: 0.7, seed: 3 });
    addTone(b, { freq: 300, to: 160, glide: 0.01, decay: 0.018, amp: 0.2 });
    return finish(b, 0.9);
  },

  // Rewards
  chime: () => {
    const b = makeBuffer(1.2);
    [1047, 1319, 1568, 2093].forEach((f, k) => {
      addTone(b, { freq: f, decay: 0.35, amp: 0.5, harmonics: [0, 0.12], start: k * 0.07 });
      addTone(b, { freq: f * 2.76, decay: 0.12, amp: 0.08, start: k * 0.07 });
    });
    return finish(b, 0.6);
  },

  // Charge
  boom: () => {
    const b = makeBuffer(1.0);
    addTone(b, { freq: 72, to: 38, glide: 0.09, decay: 0.32, attack: 0.002 });
    addNoise(b, { filter: { type: 'lowpass', freq: 1800, to: 300, glide: 0.1 }, decay: 0.09, amp: 0.6 });
    [2637, 3136, 3951].forEach(f => addTone(b, { freq: f, decay: 0.45, amp: 0.1, start: 0.02 }));
    return finish(b, 0.95);
  },
  exhale: () => {
    const b = makeBuffer(0.25);
    addTone(b, { freq: 620, to: 300, glide: 0.06, decay: 0.08, amp: 0.5, attack: 0.01 });
    addNoise(b, { filter: { type: 'bandpass', freq: 900, q: 1 }, decay: 0.05, amp: 0.2, attack: 0.01 });
    return finish(b, 0.4);
  },

  // Marbles and snow
  marble: () => {
    const b = makeBuffer(0.07);
    addPartials(b, { freqs: [2900, 4250, 5800], amps: [0.6, 0.35, 0.2], decays: [0.018, 0.012, 0.008] });
    addNoise(b, { filter: { type: 'bandpass', freq: 6500, q: 1 }, decay: 0.0008, amp: 0.6 });
    return finish(b, 0.8);
  },
  marbleWall: () => {
    const b = makeBuffer(0.09);
    addTone(b, { freq: 420, to: 260, glide: 0.01, decay: 0.02, amp: 0.8 });
    addPartials(b, { freqs: [1900, 2950], amps: [0.3, 0.15], decays: [0.012, 0.008] });
    addNoise(b, { filter: { type: 'bandpass', freq: 2500, q: 1 }, decay: 0.0012, amp: 0.5 });
    return finish(b, 0.85);
  },
  twinkle: () => {
    const b = makeBuffer(0.5);
    addTone(b, { freq: 2349, decay: 0.18, amp: 0.5, harmonics: [0, 0.1] });
    addTone(b, { freq: 2349 * 2.76, decay: 0.05, amp: 0.06 });
    return finish(b, 0.35);
  },

  // Squish
  blip: () => {
    const b = makeBuffer(0.09);
    addTone(b, { freq: 170, to: 420, glide: 0.02, decay: 0.025, attack: 0.002 });
    addNoise(b, { filter: { type: 'lowpass', freq: 700 }, decay: 0.006, amp: 0.2 });
    return finish(b, 0.55);
  },
  wobble: () => {
    const b = makeBuffer(0.45);
    addTone(b, { freq: 150, decay: 0.14, attack: 0.005, vibrato: { rate: 9, depth: 30 } });
    addNoise(b, { filter: { type: 'lowpass', freq: 500 }, decay: 0.03, amp: 0.25 });
    return finish(b, 0.6);
  },
  chirp: () => {
    const b = makeBuffer(0.26);
    addTone(b, { freq: 430, to: 780, glide: 0.05, attack: 0.02, decay: 0.08, harmonics: [0.3, 0.1], vibrato: { rate: 24, depth: 18 } });
    return finish(b, 0.45);
  },
  boing: () => {
    const b = makeBuffer(0.45);
    addTone(b, { freq: 240, decay: 0.13, attack: 0.003, vibrato: { rate: 12, depth: 40 } });
    addTone(b, { freq: 120, decay: 0.05, amp: 0.4 });
    return finish(b, 0.6);
  },

  // Zipper and texture
  zipTick: () => {
    const b = makeBuffer(0.015);
    addNoise(b, { filter: { type: 'bandpass', freq: 4400, q: 2 }, decay: 0.001 });
    addTone(b, { freq: 3100, decay: 0.0028, amp: 0.3 });
    return finish(b, 0.45);
  },
  zipEnd: () => {
    const b = makeBuffer(0.18);
    addPartials(b, { freqs: [1750, 2620, 3900], amps: [0.5, 0.3, 0.18], decays: [0.05, 0.035, 0.02] });
    addTone(b, { freq: 210, to: 130, glide: 0.01, decay: 0.03, amp: 0.7 });
    addNoise(b, { filter: { type: 'bandpass', freq: 2800, q: 1 }, decay: 0.002, amp: 0.5 });
    return finish(b, 0.9);
  },
  rib: () => {
    const b = makeBuffer(0.03);
    addNoise(b, { filter: { type: 'lowpass', freq: 1300 }, decay: 0.0035 });
    addTone(b, { freq: 320, decay: 0.007, amp: 0.3 });
    return finish(b, 0.45);
  },

  // Heartbeat
  lub: () => {
    const b = makeBuffer(0.2);
    addTone(b, { freq: 62, to: 44, glide: 0.03, decay: 0.06, attack: 0.004 });
    addNoise(b, { filter: { type: 'lowpass', freq: 220 }, decay: 0.02, amp: 0.5 });
    return finish(b, 0.95);
  },
  dub: () => {
    const b = makeBuffer(0.16);
    addTone(b, { freq: 78, to: 54, glide: 0.025, decay: 0.045, amp: 0.9, attack: 0.003 });
    addNoise(b, { filter: { type: 'lowpass', freq: 260 }, decay: 0.015, amp: 0.4 });
    return finish(b, 0.8);
  },

  // Haptics Lab glass: a little run of crackles as the cracks spread
  crack: () => {
    const b = makeBuffer(0.35);
    const rng = createRng(9);
    let t = 0;
    for (let k = 0; k < 10; k++) {
      addNoise(b, {
        filter: { type: 'bandpass', freq: 3000 + rng() * 4000, q: 1.5 },
        decay: 0.0008 + rng() * 0.0008,
        amp: 0.4 + rng() * 0.6,
        start: t,
        seed: k + 1,
      });
      t += 0.008 + rng() * 0.03;
    }
    addTone(b, { freq: 4200, decay: 0.08, amp: 0.08, start: 0.02 });
    return finish(b, 0.75);
  },
} satisfies Record<string, () => Float32Array>;

export type SoundName = keyof typeof ONE_SHOTS;

/** Sustained sounds, all exactly periodic or crossfaded so they loop without a seam. */
export const LOOPS = {
  /** White noise, shaped live by a filter (rasp, peel, sandpaper, breath). */
  noise: () => {
    const b = makeBuffer(1.05);
    addNoise(b, { decay: 1e9, seed: 21 });
    return finish(seamless(b), 0.5);
  },
  /** Soft, dark noise (slosh, stone, squish). */
  brown: () => {
    const b = makeBuffer(1.05);
    addNoise(b, { decay: 1e9, seed: 22, filter: { type: 'lowpass', freq: 500 } });
    return finish(seamless(b), 0.6);
  },
  /** A cat's purr: dark noise pulsing 26 times a second. */
  purr: () => {
    // 2 s after a 1/26 s crossfade: whole cycles of the 26 Hz pulse, so the seam is invisible.
    const b = makeBuffer(2 + 1 / 26);
    addNoise(b, { decay: 1e9, seed: 23, filter: { type: 'lowpass', freq: 260 } });
    for (let i = 0; i < b.length; i++) {
      const m = 0.55 + 0.45 * Math.sin((2 * Math.PI * 26 * i) / SAMPLE_RATE);
      b[i] *= m * m;
    }
    addTone(b, { freq: 52, decay: 1e9, amp: 0.02 });
    return finish(seamless(b, 1 / 26), 0.7);
  },
  /** A bright buzzy tone at 110 Hz (Charge's rising hum, the zipper's zzzip). */
  buzz: () => {
    const b = makeBuffer(1);
    for (let i = 0; i < b.length; i++) {
      let s = 0;
      for (let k = 1; k <= 8; k++) s += Math.sin((2 * Math.PI * 110 * k * i) / SAMPLE_RATE) / k;
      b[i] = s;
    }
    return finish(b, 0.5);
  },
  /** A strained creak (tension while peeling and pulling). */
  creak: () => {
    const b = makeBuffer(1.05);
    addNoise(b, { decay: 1e9, seed: 24, filter: { type: 'bandpass', freq: 700, q: 9 } });
    for (let i = 0; i < b.length; i++) b[i] *= 0.6 + 0.4 * Math.sin((2 * Math.PI * 13 * i) / SAMPLE_RATE);
    return finish(seamless(b), 0.6);
  },
  /** A spinning bearing's whir. */
  whir: () => {
    // 1 s of 100 Hz after the crossfade: whole cycles again.
    const b = makeBuffer(1.05);
    for (let i = 0; i < b.length; i++) {
      const t = i / SAMPLE_RATE;
      b[i] = Math.sin(2 * Math.PI * 100 * t) + 0.4 * Math.sin(2 * Math.PI * 200 * t) + 0.2 * Math.sin(2 * Math.PI * 300 * t);
    }
    addNoise(b, { decay: 1e9, seed: 25, amp: 0.6, filter: { type: 'bandpass', freq: 900, q: 2 } });
    return finish(seamless(b), 0.6);
  },
} satisfies Record<string, () => Float32Array>;

export type LoopName = keyof typeof LOOPS;
