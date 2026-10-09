/*
 * Shared state for every haptic the app plays: the intensity multipliers from Settings
 * (global x the toy on screen), and a stop-everything hook for leaving a toy or backgrounding.
 * Kept free of other imports so every haptics module can depend on it.
 */

let globalIntensity = 1;
let toyIntensity: Record<string, number> = {};
let activeToy: string | null = null;
const stoppers = new Set<() => void>();
// After a toy closes, its screen lives on for the exit animation (~350 ms) and its loops can
// try to restart a vibration. For this long after a stop-all, continuous haptics are ignored.
const QUIET_MS = 800;
let quietUntil = 0;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function setIntensitySettings(global: number, perToy: Record<string, number>): void {
  globalIntensity = global;
  toyIntensity = perToy;
}

/** The toy currently on screen, so its own intensity multiplier applies. */
export function setActiveToy(id: string | null): void {
  activeToy = id;
  // Opening a toy ends the quiet period right away.
  if (id) quietUntil = 0;
}

export function getActiveToy(): string | null {
  return activeToy;
}

/** Global multiplier x the active toy's multiplier (each 0.25-1.5 in Settings). */
export function intensityScale(): number {
  return globalIntensity * (activeToy ? toyIntensity[activeToy] ?? 1 : 1);
}

/** An intensity after Settings are applied, clamped to 0..1. */
export function scaled(intensity: number): number {
  return clamp01(intensity * intensityScale());
}

/** Registers something to silence when a toy closes or the app backgrounds. Returns an unregister function. */
export function onStopAll(stop: () => void): () => void {
  stoppers.add(stop);
  return () => stoppers.delete(stop);
}

export function stopAllHaptics(): void {
  quietUntil = Date.now() + QUIET_MS;
  stoppers.forEach(stop => stop());
}

/** True just after a stop-all: continuous haptics must not start. */
export function isQuiet(): boolean {
  return Date.now() < quietUntil;
}
