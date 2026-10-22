import { describe, expect, it } from 'vitest';
import { isHit, normToPixel, pixelToNorm } from './geometry';
import { findHitTarget, spawnTarget, updateTargets, type Target } from './targets';

const size = { width: 800, height: 400 };

function target(x: number, y: number, radius = 0.1, popTime: number | null = null): Target {
  return { x, y, vx: 0.1, vy: 0, radius, popTime };
}

describe('normToPixel / pixelToNorm', () => {
  it('maps corners and centre', () => {
    expect(normToPixel({ x: 0, y: 0 }, size)).toEqual({ x: 0, y: 0 });
    expect(normToPixel({ x: 1, y: 1 }, size)).toEqual({ x: 800, y: 400 });
    expect(normToPixel({ x: 0.5, y: 0.25 }, size)).toEqual({ x: 400, y: 100 });
  });

  it('clamps out-of-range values', () => {
    expect(normToPixel({ x: -0.5, y: 2 }, size)).toEqual({ x: 0, y: 400 });
    expect(pixelToNorm({ x: -10, y: 900 }, size)).toEqual({ x: 0, y: 1 });
  });

  it('round-trips', () => {
    const p = { x: 0.3, y: 0.7 };
    const back = pixelToNorm(normToPixel(p, size), size);
    expect(back.x).toBeCloseTo(0.3);
    expect(back.y).toBeCloseTo(0.7);
  });

  it('handles a zero-sized canvas', () => {
    expect(pixelToNorm({ x: 5, y: 5 }, { width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('isHit', () => {
  const circle = { x: 100, y: 100, radius: 20 };
  it('hits inside and on the edge', () => {
    expect(isHit(circle, { x: 100, y: 100 })).toBe(true);
    expect(isHit(circle, { x: 120, y: 100 })).toBe(true);
  });
  it('misses outside', () => {
    expect(isHit(circle, { x: 115, y: 115 })).toBe(false);
    expect(isHit(circle, { x: 121, y: 100 })).toBe(false);
  });
});

describe('findHitTarget', () => {
  it('uses the smaller canvas dimension for the radius', () => {
    // radius 0.1 * min(800, 400) = 40px; centre at (400, 200)
    const targets = [target(0.5, 0.5)];
    expect(findHitTarget(targets, { x: 0.5 + 39 / 800, y: 0.5 }, size)).toBe(0);
    expect(findHitTarget(targets, { x: 0.5 + 41 / 800, y: 0.5 }, size)).toBe(-1);
  });

  it('returns the topmost overlapping target', () => {
    const targets = [target(0.5, 0.5), target(0.52, 0.5)];
    expect(findHitTarget(targets, { x: 0.51, y: 0.5 }, size)).toBe(1);
  });

  it('ignores targets that are already popping', () => {
    const targets = [target(0.5, 0.5, 0.1, 0.2)];
    expect(findHitTarget(targets, { x: 0.5, y: 0.5 }, size)).toBe(-1);
  });
});

describe('updateTargets', () => {
  it('moves live targets by velocity * dt', () => {
    const [t] = updateTargets([target(0.5, 0.5)], 0.5);
    expect(t?.x).toBeCloseTo(0.55);
  });

  it('respawns targets that finished popping or left the screen', () => {
    const rng = () => 0.25;
    const fresh = spawnTarget(rng);
    const out = updateTargets([target(0.5, 0.5, 0.1, 0.01), target(1.5, 0.5)], 0.1, rng);
    expect(out).toEqual([fresh, fresh]);
  });
});
