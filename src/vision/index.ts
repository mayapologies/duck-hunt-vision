/**
 * Public API of the vision module: webcam + MediaPipe hand tracking.
 *
 * Usage:
 *   const tracker = await startHandTracking();
 *   const unsubscribe = tracker.onHands((frame) => { ... });
 *
 * `frame` is a `HandFrame` (see `src/types.ts`) or `null` when no hand is
 * visible. Landmarks are in raw (un-mirrored) normalized image space.
 */
export { startHandTracking } from './handTracker';
export type { HandTracker, HandTrackingOptions, TrackingStage } from './handTracker';
export { CameraError } from './camera';
export type { CameraErrorKind } from './camera';
export { CornerPreview, HAND_BONES } from './preview';
export { toHandFrame } from './convert';
