/** Mathematical modulo: always returns a value in [0, n). */
export function mod(value: number, n: number): number {
  return ((value % n) + n) % n;
}

/** Shortest signed difference between two angles in degrees, in (-180, 180]. */
export function angleDelta(from: number, to: number): number {
  const d = mod(to - from, 360);
  return d > 180 ? d - 360 : d;
}

/** Angle in degrees of point (x, y) around center (cx, cy). */
export function angleAround(cx: number, cy: number, x: number, y: number): number {
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
}

export interface Sample {
  t: number;
  value: number;
}

/** Velocity in units/ms over the samples in the trailing window; 0 if the finger paused. */
export function releaseVelocity(samples: Sample[], now: number, windowMs = 80): number {
  const recent = samples.filter(s => now - s.t <= windowMs);
  if (recent.length < 2) return 0;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const dt = last.t - first.t;
  return dt > 0 ? (last.value - first.value) / dt : 0;
}

export interface MomentumOptions {
  /** Starting velocity in units per millisecond. */
  velocity: number;
  /** Fraction of velocity kept per 60fps frame (0.97 coasts long, 0.9 stops fast). */
  friction: number;
  /** Stop once |velocity| drops below this (units/ms). */
  minVelocity: number;
  /** Called every frame with the distance travelled since the last frame. */
  onStep: (delta: number) => void;
  onEnd: () => void;
}

/** Coasts a value after a flick. Returns a cancel function. */
export function startMomentum({ velocity, friction, minVelocity, onStep, onEnd }: MomentumOptions): () => void {
  let v = velocity;
  let last: number | null = null;
  let frame: number | null = null;

  const step = (ts: number) => {
    const dt = last === null ? 16.67 : Math.min(ts - last, 34);
    last = ts;
    onStep(v * dt);
    v *= Math.pow(friction, dt / 16.67);
    if (Math.abs(v) < minVelocity) {
      frame = null;
      onEnd();
      return;
    }
    frame = requestAnimationFrame(step);
  };

  frame = requestAnimationFrame(step);
  return () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };
}
