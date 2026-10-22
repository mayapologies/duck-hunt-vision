import type { HandFrame } from '../types';
import { DEFAULT_GESTURE_CONFIG, type GestureConfig } from './config';
import { measureHand, type HandMetrics } from './metrics';
import { createOneEuroFilter } from './oneEuro';
import { createPoseClassifier, type Pose } from './pose';

export interface Point {
  x: number;
  y: number;
}

export interface GestureState {
  pose: Pose;
  /** Smoothed crosshair in mirrored, normalized screen space (0–1); `null` unless `pose` is `'gun'`. */
  aim: Point | null;
  /** Set on exactly the frame a shot fires: the aim from just before the flick. */
  shot: Point | null;
  /** Raw measurements for the tuning panel; `null` when no hand is visible. */
  metrics: HandMetrics | null;
}

export interface GestureController {
  /** Feed one frame. `hands` may be a single hand, a list (first hand is used), or `null`. */
  update(hands: HandFrame | readonly HandFrame[] | null, timestampMs: number): GestureState;
  /** The live config; change it with `setConfig`. */
  readonly config: Readonly<GestureConfig>;
  setConfig(patch: Partial<GestureConfig>): void;
  reset(): void;
}

interface Sample {
  t: number;
  pitch: number;
  aim: Point;
}

const HISTORY_MS = 600;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function createGestureController(overrides: Partial<GestureConfig> = {}): GestureController {
  let config: GestureConfig = { ...DEFAULT_GESTURE_CONFIG, ...overrides };
  const getConfig = () => config;
  const smoothing = () => ({
    minCutoff: config.smoothingMinCutoff,
    beta: config.smoothingBeta,
    derivativeCutoff: config.smoothingDerivativeCutoff,
  });
  const filterX = createOneEuroFilter(smoothing);
  const filterY = createOneEuroFilter(smoothing);
  const classifier = createPoseClassifier(getConfig);
  let history: Sample[] = [];
  let lastTimestamp: number | null = null;
  let cooldownUntil = -Infinity;

  function resetTracking() {
    filterX.reset();
    filterY.reset();
    history = [];
  }

  function rawAim(m: HandMetrics): Point {
    const c = config;
    return {
      x: 0.5 + c.aimPositionGain * (m.handPosition.x - 0.5) + c.aimDirectionGain * m.pointDirection.x + c.aimOffsetX,
      y: 0.5 + c.aimPositionGain * (m.handPosition.y - 0.5) + c.aimDirectionGain * m.pointDirection.y + c.aimOffsetY,
    };
  }

  /** Returns the pre-flick aim when the latest sample completes a fast upward flick. */
  function detectFlick(now: Sample): Point | null {
    const c = config;
    let fired = false;
    for (const s of history) {
      const dt = now.t - s.t;
      if (dt <= 0 || dt > c.flickWindowMs) continue;
      const delta = now.pitch - s.pitch;
      if (delta >= c.flickMinAngleDeg && (delta / dt) * 1000 >= c.flickMinVelocityDegPerSec) {
        fired = true;
        break;
      }
    }
    if (!fired) return null;

    // Walk back to where the upward rotation began, then look a little further back.
    let start = history.length - 1;
    while (start > 0 && (history[start - 1] as Sample).pitch < (history[start] as Sample).pitch) start--;
    const startT = (history[start] as Sample).t - c.shotAimLookbackMs;
    let before = history[0] as Sample;
    for (const s of history) if (s.t <= startT) before = s;
    return { x: clamp01(before.aim.x), y: clamp01(before.aim.y) };
  }

  return {
    update(hands, timestampMs) {
      const hand = hands === null ? null : 'landmarks' in hands ? hands : (hands[0] ?? null);
      if (lastTimestamp !== null && timestampMs - lastTimestamp > config.trackingGapResetMs) resetTracking();
      lastTimestamp = timestampMs;

      const metrics = hand ? measureHand(hand.landmarks, config.cameraAspect) : null;
      const pose = classifier.update(metrics, timestampMs);
      if (pose !== 'gun' || !metrics) {
        resetTracking();
        return { pose, aim: null, shot: null, metrics };
      }

      const raw = rawAim(metrics);
      const aim = { x: clamp01(filterX.filter(raw.x, timestampMs)), y: clamp01(filterY.filter(raw.y, timestampMs)) };
      const sample: Sample = { t: timestampMs, pitch: metrics.pitchDeg, aim };

      let shot: Point | null = null;
      if (timestampMs >= cooldownUntil) {
        shot = detectFlick(sample);
        if (shot) {
          cooldownUntil = timestampMs + config.shotCooldownMs;
          history = [];
        }
      }
      if (!shot) {
        history.push(sample);
        while (history.length > 0 && timestampMs - (history[0] as Sample).t > HISTORY_MS) history.shift();
      }
      return { pose, aim, shot, metrics };
    },
    get config() {
      return config;
    },
    setConfig(patch) {
      config = { ...config, ...patch };
    },
    reset() {
      resetTracking();
      classifier.reset();
      lastTimestamp = null;
      cooldownUntil = -Infinity;
    },
  };
}
