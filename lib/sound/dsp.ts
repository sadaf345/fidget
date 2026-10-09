import { createRng } from '@/lib/pick';

/*
 * A tiny synthesizer. Every sound in the app is built from these pieces in code (no recorded
 * files): tones that can glide in pitch, filtered noise whose filter can sweep, and ringing
 * partials for metal and glass. Output is mono Float32 at SAMPLE_RATE.
 */

export const SAMPLE_RATE = 44100;
const TWO_PI = Math.PI * 2;

export type FilterType = 'lowpass' | 'highpass' | 'bandpass';

/** A biquad filter (RBJ cookbook). Bandpass has 0 dB peak gain. */
export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(private type: FilterType, freq: number, private q = 0.707) {
    this.set(freq, q);
  }

  set(freq: number, q = this.q): void {
    this.q = q;
    const w0 = (TWO_PI * Math.min(Math.max(freq, 10), SAMPLE_RATE * 0.45)) / SAMPLE_RATE;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);
    let b0: number;
    let b1: number;
    let b2: number;
    if (this.type === 'lowpass') {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
    } else if (this.type === 'highpass') {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    const a0 = 1 + alpha;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

export function makeBuffer(seconds: number): Float32Array {
  return new Float32Array(Math.max(1, Math.round(seconds * SAMPLE_RATE)));
}

/** Linear attack, then exponential decay with time constant `decay` (seconds). */
export function envelope(t: number, attack: number, decay: number): number {
  if (t < attack) return attack > 0 ? t / attack : 1;
  return Math.exp(-(t - attack) / decay);
}

/** A value gliding from `from` toward `to` with time constant `glide`. */
const glideAt = (t: number, from: number, to: number | undefined, glide: number) =>
  to === undefined ? from : to + (from - to) * Math.exp(-t / glide);

export interface ToneOptions {
  freq: number;
  /** Pitch it glides toward. */
  to?: number;
  /** Glide time constant, seconds. */
  glide?: number;
  amp?: number;
  attack?: number;
  decay: number;
  /** Start time, seconds. */
  start?: number;
  vibrato?: { rate: number; depth: number };
  /** Amplitudes of the 2nd, 3rd... harmonics, relative to the fundamental. */
  harmonics?: number[];
}

export function addTone(out: Float32Array, o: ToneOptions): void {
  const { amp = 1, attack = 0.0005, glide = 0.02, harmonics = [] } = o;
  const start = Math.round((o.start ?? 0) * SAMPLE_RATE);
  let phase = 0;
  for (let i = start; i < out.length; i++) {
    const t = (i - start) / SAMPLE_RATE;
    const env = envelope(t, attack, o.decay);
    if (t > attack && env < 1e-4) break;
    let f = glideAt(t, o.freq, o.to, glide);
    if (o.vibrato) f += o.vibrato.depth * Math.sin(TWO_PI * o.vibrato.rate * t);
    phase += (TWO_PI * f) / SAMPLE_RATE;
    let s = Math.sin(phase);
    for (let k = 0; k < harmonics.length; k++) s += harmonics[k] * Math.sin((k + 2) * phase);
    out[i] += amp * env * s;
  }
}

export interface NoiseOptions {
  amp?: number;
  attack?: number;
  decay: number;
  start?: number;
  seed?: number;
  filter?: { type: FilterType; freq: number; to?: number; glide?: number; q?: number };
  /** Random amplitude flutter per sample block (0..1), for crackly textures. */
  grit?: number;
}

export function addNoise(out: Float32Array, o: NoiseOptions): void {
  const { amp = 1, attack = 0.0002, grit = 0 } = o;
  const rng = createRng(o.seed ?? 1);
  const start = Math.round((o.start ?? 0) * SAMPLE_RATE);
  const f = o.filter;
  const filter = f ? new Biquad(f.type, f.freq, f.q) : null;
  let flutter = 1;
  for (let i = start; i < out.length; i++) {
    const t = (i - start) / SAMPLE_RATE;
    const env = envelope(t, attack, o.decay);
    if (t > attack && env < 1e-4) break;
    if (filter && f && f.to !== undefined && (i - start) % 16 === 0) filter.set(glideAt(t, f.freq, f.to, f.glide ?? 0.05));
    if (grit > 0 && (i - start) % 64 === 0) flutter = 1 - grit + grit * rng() * 2;
    const x = rng() * 2 - 1;
    out[i] += amp * env * flutter * (filter ? filter.process(x) : x);
  }
}

export interface PartialOptions {
  freqs: number[];
  amps: number[];
  decays: number[];
  start?: number;
  attack?: number;
}

/** Inharmonic ringing partials: the "ting" of metal and the "clack" of glass. */
export function addPartials(out: Float32Array, o: PartialOptions): void {
  o.freqs.forEach((freq, k) => addTone(out, { freq, amp: o.amps[k] ?? 0.2, decay: o.decays[k] ?? 0.02, start: o.start, attack: o.attack ?? 0.0003 }));
}

/** Scales to a peak level and softens the very start and end so nothing clicks unintentionally. */
export function finish(out: Float32Array, peak = 0.9): Float32Array {
  let max = 0;
  for (let i = 0; i < out.length; i++) max = Math.max(max, Math.abs(out[i]));
  const gain = max > 0 ? peak / max : 0;
  const fadeIn = Math.min(out.length, Math.round(0.0004 * SAMPLE_RATE));
  const fadeOut = Math.min(out.length, Math.round(0.003 * SAMPLE_RATE));
  for (let i = 0; i < out.length; i++) {
    let g = gain;
    if (i < fadeIn) g *= i / fadeIn;
    if (i >= out.length - fadeOut) g *= (out.length - 1 - i) / fadeOut;
    out[i] *= g;
  }
  return out;
}

/** Crossfades the tail into the head so the buffer loops without a seam. */
export function seamless(out: Float32Array, fadeSeconds = 0.05): Float32Array {
  const fade = Math.min(Math.floor(out.length / 2), Math.round(fadeSeconds * SAMPLE_RATE));
  const loop = out.slice(0, out.length - fade);
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    loop[i] = out[i] * w + out[out.length - fade + i] * (1 - w);
  }
  return loop;
}
