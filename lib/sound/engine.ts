import { useEffect, useRef } from 'react';
import { Platform, TurboModuleRegistry } from 'react-native';
import { getActiveToy, onActiveToyChange, onStopAll } from '@/lib/hapticState';
import { FilterType, SAMPLE_RATE } from '@/lib/sound/dsp';
import { LOOPS, LoopName, ONE_SHOTS, SoundName } from '@/lib/sound/recipes';

/*
 * The app's one sound service. Every toy sound goes through here, so the Sounds switch,
 * volume, each toy's mute, Discreet mode and the phone's silent switch apply everywhere.
 *
 * Built on react-native-audio-api (Web Audio on iOS) for click-accurate timing. That's native
 * code our own build has and Expo Go doesn't; without it every call is a silent no-op.
 */

type AudioLib = typeof import('react-native-audio-api');
// Loose types: the library's node classes differ between its native and web builds.
type Ctx = any;
type Node = any;

function loadAudio(): AudioLib | null {
  if (Platform.OS !== 'web' && !TurboModuleRegistry?.get?.('AudioAPIModule')) return null;
  try {
    // A static import would crash builds without the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-audio-api') as AudioLib;
  } catch (e) {
    console.warn('Sound unavailable:', e);
    return null;
  }
}

let audio = loadAudio();
let ctx: Ctx = null;
let master: Node = null;

interface SoundSettings {
  enabled: boolean;
  volume: number;
  discreet: boolean;
  toyMuted: Record<string, boolean>;
}
let settings: SoundSettings = { enabled: true, volume: 0.8, discreet: false, toyMuted: {} };

function allowed(): boolean {
  const toy = getActiveToy();
  return settings.enabled && !settings.discreet && !(toy && settings.toyMuted[toy]);
}

function refreshMaster(): void {
  if (!ctx || !master) return;
  try {
    master.gain.setTargetAtTime(allowed() ? settings.volume : 0, ctx.currentTime, 0.02);
  } catch {
    master.gain.value = allowed() ? settings.volume : 0;
  }
}

export function setSoundSettings(next: SoundSettings): void {
  settings = next;
  refreshMaster();
  if (!allowed()) stopAllLoops();
}

onActiveToyChange(() => refreshMaster());

function context(): Ctx {
  if (!audio) return null;
  if (!ctx) {
    try {
      // Ambient: respects the silent switch and mixes with whatever music is playing.
      (audio as any).AudioManager?.setAudioSessionOptions?.({ iosCategory: 'ambient', iosOptions: ['mixWithOthers'], iosMode: 'default' });
      ctx = new audio.AudioContext();
      master = ctx.createGain();
      master.gain.value = allowed() ? settings.volume : 0;
      master.connect(ctx.destination);
    } catch (e) {
      console.warn('Could not start audio:', e);
      audio = null;
      ctx = null;
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume?.()?.catch?.(() => {});
  return ctx;
}

const buffers = new Map<string, Node>();
function bufferFor(c: Ctx, key: string, render: () => Float32Array): Node {
  let buf = buffers.get(key);
  if (!buf) {
    const data = render();
    buf = c.createBuffer(1, data.length, SAMPLE_RATE);
    buf.copyToChannel(data, 0);
    buffers.set(key, buf);
  }
  return buf;
}

const lastPlayed = new Map<string, number>();
// The same sound can't retrigger faster than this; fast drags would otherwise turn to mush.
const MIN_GAP_MS = 12;

export interface PlayOptions {
  /** 0..1.5 */
  volume?: number;
  /** Playback speed; 2 = an octave up. */
  rate?: number;
  /** Random pitch spread per play (0.04 = +/-4%) so repeats never sound machine-made. */
  vary?: number;
  /** Delay in ms. */
  delay?: number;
}

export interface LoopFilter {
  type: FilterType;
  freq: number;
  q?: number;
}

export interface LoopHandle {
  /** Update any of volume (0..1), rate and filter freq/q; changes glide smoothly. */
  set(params: { volume?: number; rate?: number; freq?: number; q?: number }): void;
  stop(fadeMs?: number): void;
}

const liveLoops = new Set<LoopHandle>();
function stopAllLoops(): void {
  liveLoops.forEach(l => l.stop(60));
}
onStopAll(stopAllLoops);

function makeLoop(name: LoopName, filter?: LoopFilter): LoopHandle {
  let src: Node = null;
  let gain: Node = null;
  let filt: Node = null;

  const handle: LoopHandle = {
    set({ volume, rate, freq, q }) {
      const c = context();
      if (!c) return;
      const now = c.currentTime;
      const target = allowed() ? Math.max(0, Math.min(1, volume ?? 0)) : 0;
      if (!src) {
        if (volume === undefined || target <= 0.001) return;
        try {
          src = c.createBufferSource();
          src.buffer = bufferFor(c, `loop:${name}`, LOOPS[name]);
          src.loop = true;
          gain = c.createGain();
          gain.gain.value = 0;
          if (filter) {
            filt = c.createBiquadFilter();
            filt.type = filter.type;
            filt.frequency.value = filter.freq;
            filt.Q.value = filter.q ?? 0.707;
            src.connect(filt);
            filt.connect(gain);
          } else {
            src.connect(gain);
          }
          gain.connect(master);
          src.start(now);
          liveLoops.add(handle);
        } catch (e) {
          console.warn('Loop failed:', e);
          src = null;
          return;
        }
      }
      if (volume !== undefined) gain.gain.setTargetAtTime(target, now, 0.03);
      if (rate !== undefined) src.playbackRate.setTargetAtTime(Math.max(0.1, rate), now, 0.03);
      if (filt && freq !== undefined) filt.frequency.setTargetAtTime(Math.max(20, freq), now, 0.03);
      if (filt && q !== undefined) filt.Q.setTargetAtTime(q, now, 0.03);
    },
    stop(fadeMs = 80) {
      if (!src || !ctx) return;
      const now = ctx.currentTime;
      const s = src;
      try {
        gain.gain.setTargetAtTime(0, now, fadeMs / 4000);
        s.stop(now + fadeMs / 1000 + 0.05);
      } catch {
        // Already stopped.
      }
      src = null;
      gain = null;
      filt = null;
      liveLoops.delete(handle);
    },
  };
  return handle;
}

export const sound = {
  /** True when this build can play sound at all (our own build or web; not Expo Go). */
  get available(): boolean {
    return audio !== null;
  },

  play(name: SoundName, { volume = 1, rate = 1, vary = 0.04, delay = 0 }: PlayOptions = {}): void {
    if (!audio || !allowed()) return;
    const now = Date.now();
    if (delay === 0 && now - (lastPlayed.get(name) ?? 0) < MIN_GAP_MS) return;
    lastPlayed.set(name, now);
    const c = context();
    if (!c) return;
    try {
      const src = c.createBufferSource();
      src.buffer = bufferFor(c, name, ONE_SHOTS[name]);
      src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * vary);
      const g = c.createGain();
      g.gain.value = Math.max(0, Math.min(1.5, volume));
      src.connect(g);
      g.connect(master);
      src.start(c.currentTime + delay / 1000);
    } catch (e) {
      console.warn(`Sound ${name} failed:`, e);
    }
  },

  /** A sustained sound you shape live. Starts on the first set() with volume > 0. */
  loop: makeLoop,

  /** Renders sounds ahead of time so the first play has no hiccup. */
  preload(names: SoundName[]): void {
    const c = context();
    if (!c) return;
    names.forEach(n => bufferFor(c, n, ONE_SHOTS[n]));
  },
};

/** A loop owned by a component: created once, silenced when the component goes away. */
export function useLoop(name: LoopName, filter?: LoopFilter): LoopHandle {
  const ref = useRef<LoopHandle | null>(null);
  if (!ref.current) ref.current = makeLoop(name, filter);
  const handle = ref.current;
  useEffect(() => () => handle.stop(40), [handle]);
  return handle;
}
