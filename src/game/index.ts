/** Public API of the game module: canvas target scene driven by `GameInput`. */
export { GameScene, TRACKING_TEXT } from './scene';
export type { GameInput, Score, TrackingState } from './scene';
export { normToPixel, pixelToNorm, isHit } from './geometry';
export type { NormPoint, PixelPoint, Size, Circle } from './geometry';
