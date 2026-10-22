import { describe, expect, it } from 'vitest';
import { DEFAULT_GESTURE_CONFIG } from './config';
import { createGestureController, flickPitchDeg, type GestureState, type Point } from './controller';
import { measureHand } from './metrics';
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

  it('reports the flick angle and its velocity while in the gun pose', () => {
    const states = run([...hold(0, 300, {}), ...rotate(290, 99, 0, 30)]);
    expect(states[0]!.flick).toEqual({ pitchDeg: expect.closeTo(0, 3), velocityDegPerSec: 0 });
    expect(last(states).flick!.pitchDeg).toBeCloseTo(30, 3);
    expect(last(states).flick!.velocityDegPerSec).toBeCloseTo((10 / FRAME_MS) * 1000, 0);
    expect(run([{ t: 0, opts: { others: 'extended' } }])[0]!.flick).toBeNull();
  });

  describe('flick robustness to depth (z) noise', () => {
    /** Adds an alternating depth error to the index finger joints, like noisy MediaPipe z. */
    const zNoisy = (opts: HandOptions, t: number, amount: number) => {
      const frame = handFrame({ ...opts, timestampMs: t });
      const sign = Math.round(t / FRAME_MS) % 2 ? 1 : -1;
      frame.landmarks = frame.landmarks.map((l, i) => (i >= 6 && i <= 8 ? { ...l, z: l.z + sign * amount } : l));
      return frame;
    };
    const runNoisy = (frames: { t: number; opts: HandOptions }[], controller = createGestureController()) =>
      frames.map(({ t, opts }) => controller.update(zNoisy(opts, t, 0.06), t));

    it('the flick angle ignores index-tip depth by default', () => {
      const frame = handFrame({ pitchDeg: 20 });
      const m = measureHand(frame.landmarks, DEFAULT_GESTURE_CONFIG.cameraAspect)!;
      const noisy = measureHand(zNoisy({ pitchDeg: 20 }, FRAME_MS, 0.06).landmarks, DEFAULT_GESTURE_CONFIG.cameraAspect)!;
      expect(flickPitchDeg(m, DEFAULT_GESTURE_CONFIG)).toBeCloseTo(20, 3);
      expect(flickPitchDeg(noisy, DEFAULT_GESTURE_CONFIG)).toBeCloseTo(20, 3);
      expect(Math.abs(noisy.pitchDeg - 20)).toBeGreaterThan(5);
    });

    it('depth weight blends in the 3D pitch', () => {
      const m = { ...measureHand(handFrame().landmarks, DEFAULT_GESTURE_CONFIG.cameraAspect)!, pitchDeg: 40 };
      expect(flickPitchDeg(m, { flickIndexLength: 0.85, flickDepthWeight: 0.5 })).toBeCloseTo(20, 3);
      expect(flickPitchDeg(m, { flickIndexLength: 0.85, flickDepthWeight: 1 })).toBeCloseTo(40, 3);
    });

    it('a still, tilted hand with noisy depth does not fire', () => {
      expect(shots(runNoisy(hold(0, 2000, { pitchDeg: 20 })))).toHaveLength(0);
    });

    it('a real flick with noisy depth still fires exactly once', () => {
      const states = runNoisy([
        ...hold(0, 1000, { pitchDeg: 10 }),
        ...rotate(990, 100, 10, 50),
        ...hold(1100, 1000, { pitchDeg: 50 }),
      ]);
      expect(shots(states)).toHaveLength(1);
    });

    it('with full depth weight the same noise causes false shots (why image-space is the default)', () => {
      const c = createGestureController({ flickDepthWeight: 1 });
      expect(shots(runNoisy(hold(0, 2000, { pitchDeg: 20 }), c)).length).toBeGreaterThan(0);
    });
  });

  it('setConfig changes thresholds live', () => {
    const c = createGestureController();
    c.setConfig({ flickMinAngleDeg: 80 });
    expect(c.config.flickMinAngleDeg).toBe(80);
    expect(shots(run([...hold(0, 500, {}), ...rotate(490, 100, 0, 45)], c))).toHaveLength(0);
  });
});
