import { describe, expect, it } from 'vitest';
import { DEFAULT_GESTURE_CONFIG } from './config';
import { measureHand, type HandMetrics } from './metrics';
import { createPoseClassifier, isFingerGun } from './pose';
import { handLandmarks, type HandOptions } from './testFixtures';

const cfg = DEFAULT_GESTURE_CONFIG;
const metrics = (opts: HandOptions): HandMetrics => {
  const m = measureHand(handLandmarks(opts), cfg.cameraAspect);
  if (!m) throw new Error('fixture produced no metrics');
  return m;
};

const GUN: HandOptions = {};
const OPEN: HandOptions = { others: 'extended' };
const FIST: HandOptions = { index: 'curled', thumbOpen: 0 };
const POINT_THUMB_TUCKED: HandOptions = { thumbOpen: 0 };

describe('isFingerGun', () => {
  it.each([
    ['finger gun', GUN, true],
    ['open hand', OPEN, false],
    ['fist', FIST, false],
    ['pointing with the thumb tucked', POINT_THUMB_TUCKED, false],
  ])('%s → %s', (_name, opts, expected) => {
    expect(isFingerGun(metrics(opts), cfg, true)).toBe(expected);
  });

  it('works near and far from the camera and in different directions', () => {
    for (const scale of [0.06, 0.15, 0.3]) {
      for (const [yawDeg, pitchDeg] of [[0, 0], [40, 0], [-40, 10], [20, -20]] as const) {
        expect(isFingerGun(metrics({ scale, yawDeg, pitchDeg }), cfg, true)).toBe(true);
        expect(isFingerGun(metrics({ scale, yawDeg, pitchDeg, thumbOpen: 0 }), cfg, true)).toBe(false);
        expect(isFingerGun(metrics({ scale, yawDeg, pitchDeg, others: 'extended' }), cfg, true)).toBe(false);
      }
    }
  });

  it('returns null metrics for an incomplete hand', () => {
    expect(measureHand(handLandmarks().slice(0, 10), cfg.cameraAspect)).toBeNull();
  });
});

describe('createPoseClassifier hysteresis', () => {
  // A thumb position between the exit and enter thresholds.
  const inBetween = (() => {
    for (let t = 0; t <= 1; t += 0.01) {
      const m = metrics({ thumbOpen: t });
      if (!isFingerGun(m, cfg, true) && isFingerGun(m, cfg, false)) return m;
    }
    throw new Error('no in-between thumb position found');
  })();

  it('does not enter the gun pose from in-between values', () => {
    const c = createPoseClassifier(() => cfg);
    for (let t = 0; t < 500; t += 33) expect(c.update(inBetween, t)).toBe('none');
  });

  it('stays in the gun pose with in-between values', () => {
    const c = createPoseClassifier(() => cfg);
    expect(c.update(metrics(GUN), 0)).toBe('gun');
    for (let t = 33; t < 1000; t += 33) expect(c.update(inBetween, t)).toBe('gun');
  });

  it('ignores a brief clear failure but releases after poseReleaseMs', () => {
    const c = createPoseClassifier(() => cfg);
    c.update(metrics(GUN), 0);
    expect(c.update(metrics(OPEN), 33)).toBe('gun');
    expect(c.update(metrics(OPEN), 66)).toBe('gun');
    expect(c.update(metrics(GUN), 99)).toBe('gun');
    let pose = 'gun';
    for (let t = 132; t <= 132 + cfg.poseReleaseMs + 33; t += 33) pose = c.update(metrics(OPEN), t);
    expect(pose).toBe('none');
  });

  it('drops immediately when the hand disappears', () => {
    const c = createPoseClassifier(() => cfg);
    c.update(metrics(GUN), 0);
    expect(c.update(null, 33)).toBe('none');
  });
});
