import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { LANDMARK_COUNT, type HandFrame, type Handedness } from '../types';

/**
 * MediaPipe labels handedness assuming a mirrored (selfie) image. We feed it
 * raw, un-mirrored webcam frames, so its label is swapped to get the
 * player's real hand.
 */
function realHandedness(mediapipeLabel: string): Handedness {
  return mediapipeLabel === 'Left' ? 'Right' : 'Left';
}

/**
 * Converts a HandLandmarker result into a `HandFrame` for the first hand,
 * or `null` when no complete hand was detected.
 */
export function toHandFrame(result: HandLandmarkerResult, timestampMs: number): HandFrame | null {
  const points = result.landmarks[0];
  if (!points || points.length !== LANDMARK_COUNT) return null;
  const category = result.handedness[0]?.[0];
  return {
    landmarks: points.map(({ x, y, z }) => ({ x, y, z })),
    handedness: realHandedness(category?.categoryName ?? ''),
    handednessScore: category?.score ?? 0,
    timestampMs,
  };
}
