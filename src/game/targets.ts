import { isHit, normToPixel, type Circle, type NormPoint, type Size } from './geometry';

/** A round target. Position and velocity are in normalized screen space. */
export interface Target {
  x: number;
  y: number;
  /** Normalized units per second. */
  vx: number;
  vy: number;
  /** Radius as a fraction of the smaller canvas dimension. */
  radius: number;
  /** Seconds left in the pop animation, or `null` while the target is alive. */
  popTime: number | null;
}

export const TARGET_COUNT = 3;
export const POP_DURATION = 0.35;
const MIN_RADIUS = 0.045;
const MAX_RADIUS = 0.07;
const MIN_SPEED = 0.08;
const MAX_SPEED = 0.18;

export type Rng = () => number;

/** Creates a target entering from the left or right edge, drifting across. */
export function spawnTarget(rng: Rng = Math.random): Target {
  const fromLeft = rng() < 0.5;
  const speed = MIN_SPEED + rng() * (MAX_SPEED - MIN_SPEED);
  const radius = MIN_RADIUS + rng() * (MAX_RADIUS - MIN_RADIUS);
  return {
    x: fromLeft ? -radius : 1 + radius,
    y: 0.15 + rng() * 0.55,
    vx: fromLeft ? speed : -speed,
    vy: (rng() - 0.5) * speed * 0.5,
    radius,
    popTime: null,
  };
}

/** The target's circle in pixel space (centre may lie off-canvas). */
export function targetCircle(t: Target, size: Size): Circle {
  return {
    x: t.x * size.width,
    y: t.y * size.height,
    radius: t.radius * Math.min(size.width, size.height),
  };
}

/** Index of the topmost live target under the shot, or -1 for a miss. */
export function findHitTarget(targets: readonly Target[], shot: NormPoint, size: Size): number {
  const p = normToPixel(shot, size);
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i]!;
    if (t.popTime === null && isHit(targetCircle(t, size), p)) return i;
  }
  return -1;
}

/**
 * Advances targets by `dt` seconds. Targets that leave the screen or finish
 * popping are replaced by new ones. Returns the new array.
 */
export function updateTargets(targets: readonly Target[], dt: number, rng: Rng = Math.random): Target[] {
  return targets.map((t) => {
    if (t.popTime !== null) {
      const popTime = t.popTime - dt;
      return popTime <= 0 ? spawnTarget(rng) : { ...t, popTime };
    }
    let { x, y, vy } = t;
    x += t.vx * dt;
    y += vy * dt;
    if ((y < 0.1 && vy < 0) || (y > 0.75 && vy > 0)) vy = -vy;
    const offscreen = x < -t.radius * 2 || x > 1 + t.radius * 2;
    return offscreen ? spawnTarget(rng) : { ...t, x, y, vy };
  });
}
