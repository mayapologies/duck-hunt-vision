/**
 * Public API of the gesture module: hand landmarks → finger-gun pose,
 * crosshair aim, and flick-to-shoot events. Pure logic, no DOM.
 *
 * Usage:
 *   const gestures = createGestureController();
 *   tracker.onHands((frame) => {
 *     const { pose, aim, shot } = gestures.update(frame, performance.now());
 *   });
 */
export { createGestureController } from './controller';
export type { GestureController, GestureState, Point } from './controller';
export { DEFAULT_GESTURE_CONFIG } from './config';
export type { GestureConfig } from './config';
export type { Pose } from './pose';
export type { HandMetrics } from './metrics';
