import { Rng } from '@/lib/pick';

/*
 * Snow globe: flakes drift down slowly inside a round globe and settle on the ground.
 * A shake (or a stir) throws them into a swirl; the rumble fades over 3 s as they settle.
 */

export interface Flake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface Globe {
  cx: number;
  cy: number;
  radius: number;
  /** Height of the snowy ground inside the globe. */
  groundY: number;
}

// Slow fall: gravity balanced by heavy drag gives flakes a gentle terminal speed.
const GRAVITY = 45;
const DRAG = 1.6;
export const SETTLE_SECONDS = 3;

export function makeFlakes(globe: Globe, count: number, rng: Rng): Flake[] {
  return Array.from({ length: count }, () => {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * globe.radius * 0.85;
    return { x: globe.cx + Math.cos(a) * d, y: Math.min(globe.groundY - 2, globe.cy + Math.sin(a) * d), vx: 0, vy: 0, r: 1.2 + rng() * 2.2 };
  });
}

/** Throws every flake into a swirl, harder for a stronger shake (0..1). */
export function swirl(flakes: Flake[], globe: Globe, strength: number, rng: Rng): void {
  for (const f of flakes) {
    const dx = f.x - globe.cx;
    const dy = f.y - globe.cy;
    const d = Math.hypot(dx, dy) || 1;
    const spin = (120 + rng() * 160) * strength;
    const kick = (80 + rng() * 220) * strength;
    const a = rng() * Math.PI * 2;
    // Around the center plus a random toss, with extra lift so settled snow rises.
    f.vx += (-dy / d) * spin + Math.cos(a) * kick;
    f.vy += (dx / d) * spin + Math.sin(a) * kick - 160 * strength;
  }
}

/** Advances flakes by dt seconds with gravity along (gx, gy) (a unit-ish vector toward down). */
export function stepSnow(flakes: Flake[], globe: Globe, dt: number, gx = 0, gy = 1): void {
  const keep = Math.exp(-DRAG * dt);
  for (const f of flakes) {
    f.vx = (f.vx + gx * GRAVITY * dt) * keep;
    f.vy = (f.vy + gy * GRAVITY * dt) * keep;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    // Stay inside the glass.
    const dx = f.x - globe.cx;
    const dy = f.y - globe.cy;
    const d = Math.hypot(dx, dy);
    const limit = globe.radius - f.r - 2;
    if (d > limit) {
      f.x = globe.cx + (dx / d) * limit;
      f.y = globe.cy + (dy / d) * limit;
      const out = (f.vx * dx + f.vy * dy) / d;
      if (out > 0) {
        f.vx -= 1.4 * out * (dx / d);
        f.vy -= 1.4 * out * (dy / d);
      }
    }
    // Settle on the ground.
    if (f.y > globe.groundY - f.r) {
      f.y = globe.groundY - f.r;
      f.vy = 0;
      f.vx *= 0.6;
    }
  }
}
