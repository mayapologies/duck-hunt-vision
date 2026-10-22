import { describe, expect, it } from 'vitest';
import { createGestureController, type GestureState, type Point } from './controller';
import { handFrame, type HandOptions } from './testFixtures';

const FRAME_MS = 33;

/** Feeds a sequence of frames and collects every result. */
function run(frames: { t: number; opts: HandOptions | null }[], controller = createGestureController()) {
  return frames.map(({ t, opts }) => controller.update(opts ? handFrame({ ...opts, timestampMs: t }) : null, t));
}

/** Holds a pose for `durationMs`, starting at `start`. */
function hold(start: number, durationMs: number, opts: HandOptions) {
  const frames = [];
  for (let t = start; t < start + durationMs; t += FRAME_MS) frames.push({ t, opts });
  return frames;
}

/** Rotates the index upward from `fromDeg` to `toDeg` over `durationMs`. */
function rotate(start: number, durationMs: number, fromDeg: number, toDeg: number, base: HandOptions = {}) {
  const frames = [];
  const steps = Math.max(1, Math.round(durationMs / FRAME_MS));
  for (let i = 1; i <= steps; i++) {
    frames.push({ t: start + i * FRAME_MS, opts: { ...base, pitchDeg: fromDeg + ((toDeg - fromDeg) * i) / steps } });
  }
  return frames;
}

const shots = (states: GestureState[]) => states.map((s) => s.shot).filter((s): s is Point => s !== null);
const last = (states: GestureState[]) => states[states.length - 1] as GestureState;

describe('createGestureController', () => {
  it('reports pose none and no aim without a hand or with an open hand', () => {
    const states = run([
      { t: 0, opts: null },
      { t: 33, opts: { others: 'extended' } },
    ]);
    expect(states.map((s) => [s.pose, s.aim])).toEqual([
      ['none', null],
      ['none', null],
    ]);
    expect(states[0]?.metrics).toBeNull();
    expect(states[1]?.metrics).not.toBeNull();
  });

  it('accepts a list of hands and uses the first', () => {
    const c = createGestureController();
    expect(c.update([handFrame()], 0).pose).toBe('gun');
    expect(c.update([], 33).pose).toBe('none');
  });

  it('mirrors aim: pointing to the player\u2019s right moves the crosshair right', () => {
    const right = last(run(hold(0, 500, { yawDeg: 40 }))).aim!;
    const left = last(run(hold(0, 500, { yawDeg: -40 }))).aim!;
    expect(right.x).toBeGreaterThan(0.6);
    expect(left.x).toBeLessThan(0.4);
  });

  it('mirrors hand position: moving the hand to the player\u2019s right (smaller raw x) moves the crosshair right', () => {
    const right = last(run(hold(0, 500, { origin: { x: 0.3, y: 0.6 } }))).aim!;
    const left = last(run(hold(0, 500, { origin: { x: 0.7, y: 0.6 } }))).aim!;
    expect(right.x).toBeGreaterThan(left.x);
  });

  it('pointing up moves the crosshair up', () => {
    const up = last(run(hold(0, 500, { pitchDeg: 25 }))).aim!;
    const down = last(run(hold(0, 500, { pitchDeg: -25 }))).aim!;
    expect(up.y).toBeLessThan(down.y);
  });

  it('smooths jitter in the aim', () => {
    const frames = hold(0, 1000, {}).map((f, i) => ({
      ...f,
      opts: { ...f.opts, origin: { x: 0.5 + (i % 2 ? 0.01 : -0.01), y: 0.6 } },
    }));
    const xs = run(frames).slice(-10).map((s) => s.aim!.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.01);
  });

  it('one quick flick fires exactly one shot', () => {
    const states = run([...hold(0, 1000, {}), ...rotate(990, 100, 0, 45), ...hold(1100, 1000, { pitchDeg: 45 })]);
    expect(shots(states)).toHaveLength(1);
  });

  it('a long flick still fires only one shot', () => {
    const states = run([...hold(0, 1000, {}), ...rotate(990, 330, 0, 90), ...hold(1330, 1000, { pitchDeg: 90 })]);
    expect(shots(states)).toHaveLength(1);
  });

  it('a slow upward drift does not fire', () => {
    const states = run([...hold(0, 500, {}), ...rotate(490, 2000, 0, 60), ...rotate(2490, 2000, 60, 0)]);
    expect(shots(states)).toHaveLength(0);
  });

  it('a fast downward flick does not fire', () => {
    const states = run([...hold(0, 500, { pitchDeg: 45 }), ...rotate(490, 100, 45, 0)]);
    expect(shots(states)).toHaveLength(0);
  });

  it('does not fire without the finger-gun pose', () => {
    const open = { others: 'extended' } as const;
    const states = run([...hold(0, 500, open), ...rotate(490, 100, 0, 45, open)]);
    expect(shots(states)).toHaveLength(0);
  });

  it('respects the cooldown between flicks', () => {
    const flick = (start: number) => [...rotate(start, 100, 0, 45), ...rotate(start + 100, 100, 45, 0)];
    const quick = run([...hold(0, 500, {}), ...flick(490), ...flick(700)]);
    expect(shots(quick)).toHaveLength(1);
    const spaced = run([...hold(0, 500, {}), ...flick(490), ...hold(700, 300, {}), ...flick(1000)]);
    expect(shots(spaced)).toHaveLength(2);
  });

  it('shoots at the aim from just before the flick started', () => {
    const base = { yawDeg: 25, pitchDeg: -10 };
    const states = run([...hold(0, 1000, base), ...rotate(990, 100, -10, 40, { yawDeg: 25 })]);
    const steadyAim = states[Math.round(950 / FRAME_MS)]!.aim!;
    const [shot] = shots(states);
    expect(shot).toBeDefined();
    expect(shot!.x).toBeCloseTo(steadyAim.x, 3);
    expect(shot!.y).toBeCloseTo(steadyAim.y, 3);
    expect(last(states).aim!.y).toBeLessThan(steadyAim.y - 0.05);
  });

  it('setConfig changes thresholds live', () => {
    const c = createGestureController();
    c.setConfig({ flickMinAngleDeg: 80 });
    expect(c.config.flickMinAngleDeg).toBe(80);
    expect(shots(run([...hold(0, 500, {}), ...rotate(490, 100, 0, 45)], c))).toHaveLength(0);
  });
});
