/**
 * Shared types used across modules (vision, gesture, game).
 *
 * Coordinate convention: landmarks are normalized to the camera image,
 * NOT mirrored. x = 0 is the left edge of the raw camera frame, y = 0 is the
 * top, both in [0, 1]. Because the raw webcam frame is not mirrored, a hand
 * moving to the player's right moves toward smaller x. Convert to screen
 * space (mirrored) with `screenX = 1 - x`.
 */

/** One hand landmark in normalized image space. */
export interface Landmark {
  /** Horizontal position, 0 (left of raw camera frame) to 1 (right). */
  x: number;
  /** Vertical position, 0 (top) to 1 (bottom). */
  y: number;
  /**
   * Depth relative to the wrist; smaller (more negative) is closer to the
   * camera. Roughly the same scale as `x`.
   */
  z: number;
}

/** Number of landmarks MediaPipe reports per hand. */
export const LANDMARK_COUNT = 21;

/**
 * Indices into `HandFrame.landmarks`, following the MediaPipe hand model.
 * See https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
 */
export const HandLandmark = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

export type HandLandmarkIndex = (typeof HandLandmark)[keyof typeof HandLandmark];

/** Which of the player's hands was detected (the real hand, not the mirror image). */
export type Handedness = 'Left' | 'Right';

/** One detected hand at one point in time. */
export interface HandFrame {
  /** Exactly `LANDMARK_COUNT` (21) landmarks, indexed by `HandLandmark`. */
  landmarks: readonly Landmark[];
  /** The player's real hand. */
  handedness: Handedness;
  /** Model confidence for `handedness`, 0 to 1. */
  handednessScore: number;
  /** Frame time in milliseconds (`performance.now()` clock), strictly increasing. */
  timestampMs: number;
}

/** Called once per processed video frame; `null` means no hand is visible. */
export type HandListener = (frame: HandFrame | null) => void;
