/*
 * Preview every sound on your Mac before building:
 *   npm run sounds            renders them all to ./sound-preview and plays each in turn
 *   npm run sounds -- pop zipTick   plays just those
 * Uses the same recipes the app plays, rendered to WAV and played with macOS afplay.
 * NO_PLAY=1 only writes the files.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOOPS, ONE_SHOTS } from '../lib/sound/recipes';
import { SAMPLE_RATE } from '../lib/sound/dsp';

function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const only = process.argv.slice(2);
const out = join(process.cwd(), 'sound-preview');
mkdirSync(out, { recursive: true });

const all: [string, () => Float32Array][] = [
  ...Object.entries(ONE_SHOTS),
  // Loops are played twice through so you can hear the seam (or rather, not hear it).
  ...Object.entries(LOOPS).map(([n, r]) => [`loop-${n}`, () => { const a = r(); const b = new Float32Array(a.length * 2); b.set(a); b.set(a, a.length); return b; }] as [string, () => Float32Array]),
];

for (const [name, render] of all) {
  if (only.length && !only.includes(name) && !only.includes(name.replace('loop-', ''))) continue;
  const file = join(out, `${name}.wav`);
  writeFileSync(file, wav(render()));
  console.log(`▶ ${name}`);
  if (process.env.NO_PLAY) continue;
  try {
    execFileSync('afplay', [file]);
    execFileSync('sleep', ['0.35']);
  } catch {
    // Not on a Mac: the files are still in ./sound-preview.
  }
}
console.log(`\nAll files are in ${out}`);
