/**
 * Every gesture threshold in one place. Distances are ratios of the hand's
 * palm length (wrist to middle-finger knuckle), so they work near and far
 * from the camera. "Enter" thresholds are stricter than "exit" thresholds
 * (hysteresis), so the pose does not flicker on and off.
 */
export interface GestureConfig {
  /** Camera frame width / height; corrects x (and z) so angles are not squashed. */
  cameraAspect: number;

  /** Index tip-to-wrist distance / palm length needed to count as extended. */
  indexExtendedEnter: number;
  indexExtendedExit: number;
  /** Middle/ring/pinky tip-to-wrist distance / palm length must stay below this to count as curled. */
  curledEnter: number;
  curledExit: number;
  /** Thumb tip to index knuckle distance / palm length ("hammer up" spread). */
  thumbSpreadEnter: number;
  thumbSpreadExit: number;
  /** Angle between the thumb (landmarks 2→4) and the index (5→8), in degrees. */
  thumbAngleEnterDeg: number;
  thumbAngleExitDeg: number;
  /** The gun pose is kept this long after the exit thresholds start failing. */
  poseReleaseMs: number;

  /** How much hand position (index knuckle) moves the crosshair. 1 = one-to-one. */
  aimPositionGain: number;
  /** How much the pointing direction (knuckle→tip, in palm lengths) moves the crosshair. */
  aimDirectionGain: number;
  aimOffsetX: number;
  aimOffsetY: number;
  /** One Euro filter: lower minCutoff = smoother when still; higher beta = less lag when moving fast. */
  smoothingMinCutoff: number;
  smoothingBeta: number;
  smoothingDerivativeCutoff: number;

  /**
   * The flick angle comes mainly from how far the index tip rises above its
   * knuckle in the image (no depth). Index length (knuckle to tip) / palm
   * length turns that rise into an angle.
   */
  flickIndexLength: number;
  /**
   * How much the 3D pitch (which uses MediaPipe's noisy depth/z) is blended
   * into the flick angle. 0 = image only (default), 1 = full 3D pitch.
   */
  flickDepthWeight: number;
  /** The upward rotation must happen within this window. */
  flickWindowMs: number;
  /** Minimum upward rotation of the index finger within the window, in degrees. */
  flickMinAngleDeg: number;
  /** Minimum average upward angular velocity over the flick, in degrees per second. */
  flickMinVelocityDegPerSec: number;
  /** No further shot is fired for this long after a shot. */
  shotCooldownMs: number;
  /** The shot uses the aim from this long before the flick started. */
  shotAimLookbackMs: number;
  /** A gap between frames longer than this resets smoothing and flick history. */
  trackingGapResetMs: number;
}

export const DEFAULT_GESTURE_CONFIG: Readonly<GestureConfig> = Object.freeze({
  cameraAspect: 4 / 3,

  indexExtendedEnter: 1.55,
  indexExtendedExit: 1.4,
  curledEnter: 1.3,
  curledExit: 1.45,
  thumbSpreadEnter: 0.55,
  thumbSpreadExit: 0.42,
  thumbAngleEnterDeg: 40,
  thumbAngleExitDeg: 28,
  poseReleaseMs: 120,

  aimPositionGain: 1,
  aimDirectionGain: 0.6,
  aimOffsetX: 0,
  aimOffsetY: 0,
  smoothingMinCutoff: 1.2,
  smoothingBeta: 3,
  smoothingDerivativeCutoff: 1,

  flickIndexLength: 0.85,
  flickDepthWeight: 0,
  flickWindowMs: 150,
  flickMinAngleDeg: 18,
  flickMinVelocityDegPerSec: 250,
  shotCooldownMs: 400,
  shotAimLookbackMs: 30,
  trackingGapResetMs: 250,
});
