import type { GestureConfig } from './config';
import type { HandMetrics } from './metrics';

export type Pose = 'none' | 'gun';

/** True when the hand forms a finger gun under the enter (strict) or exit (loose) thresholds. */
export function isFingerGun(m: HandMetrics, cfg: GestureConfig, strict: boolean): boolean {
  if (strict) {
    return (
      m.indexExtension >= cfg.indexExtendedEnter &&
      m.othersExtension <= cfg.curledEnter &&
      m.thumbSpread >= cfg.thumbSpreadEnter &&
      m.thumbAngleDeg >= cfg.thumbAngleEnterDeg
    );
  }
  return (
    m.indexExtension >= cfg.indexExtendedExit &&
    m.othersExtension <= cfg.curledExit &&
    m.thumbSpread >= cfg.thumbSpreadExit &&
    m.thumbAngleDeg >= cfg.thumbAngleExitDeg
  );
}

export interface PoseClassifier {
  /** `metrics` is `null` when no hand is visible, which drops the pose immediately. */
  update(metrics: HandMetrics | null, timestampMs: number): Pose;
  reset(): void;
}

/**
 * Finger-gun classifier with hysteresis: enters on the strict thresholds,
 * and leaves only after the loose thresholds have failed for `poseReleaseMs`.
 */
export function createPoseClassifier(config: () => GestureConfig): PoseClassifier {
  let pose: Pose = 'none';
  let lastHeldMs = 0;

  return {
    update(metrics, timestampMs) {
      const cfg = config();
      if (!metrics) {
        pose = 'none';
      } else if (pose === 'none') {
        if (isFingerGun(metrics, cfg, true)) {
          pose = 'gun';
          lastHeldMs = timestampMs;
        }
      } else if (isFingerGun(metrics, cfg, false)) {
        lastHeldMs = timestampMs;
      } else if (timestampMs - lastHeldMs > cfg.poseReleaseMs) {
        pose = 'none';
      }
      return pose;
    },
    reset() {
      pose = 'none';
    },
  };
}
