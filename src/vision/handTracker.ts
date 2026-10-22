import type { HandLandmarker } from '@mediapipe/tasks-vision';
import type { HandFrame, HandListener } from '../types';
import { startCamera, stopCamera } from './camera';
import { toHandFrame } from './convert';
import { createHandLandmarker } from './landmarker';

/** Progress reported while `startHandTracking` is starting up. */
export type TrackingStage = 'loading-model' | 'starting-camera' | 'running';

export interface HandTrackingOptions {
  /** Video element to play the webcam in. A hidden one is created if omitted. */
  video?: HTMLVideoElement;
  /** Called as startup progresses. */
  onStage?: (stage: TrackingStage) => void;
}

/** A running webcam + hand detection loop. */
export interface HandTracker {
  /** The video element showing the raw (un-mirrored) webcam feed. */
  readonly video: HTMLVideoElement;
  /**
   * Subscribes to detection results, delivered once per new video frame.
   * Returns a function that unsubscribes.
   */
  onHands(listener: HandListener): () => void;
  /** Most recent result (`null` if no hand or nothing processed yet). */
  latest(): HandFrame | null;
  /** Stops detection and the camera. */
  stop(): void;
}

/**
 * Loads the hand model, starts the webcam and runs detection on each
 * animation frame. Rejects with `CameraError` if the camera can't start.
 */
export async function startHandTracking(options: HandTrackingOptions = {}): Promise<HandTracker> {
  const video = options.video ?? document.createElement('video');
  options.onStage?.('loading-model');
  const landmarker = await createHandLandmarker();
  options.onStage?.('starting-camera');
  let stream: MediaStream;
  try {
    stream = await startCamera(video);
  } catch (err) {
    landmarker.close();
    throw err;
  }
  options.onStage?.('running');
  return new RunningTracker(video, stream, landmarker);
}

class RunningTracker implements HandTracker {
  private readonly listeners = new Set<HandListener>();
  private last: HandFrame | null = null;
  private lastVideoTime = -1;
  private lastTimestampMs = -1;
  private rafId = 0;
  private stopped = false;

  constructor(
    readonly video: HTMLVideoElement,
    private readonly stream: MediaStream,
    private readonly landmarker: HandLandmarker,
  ) {
    this.rafId = requestAnimationFrame(this.tick);
  }

  onHands(listener: HandListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  latest(): HandFrame | null {
    return this.last;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    cancelAnimationFrame(this.rafId);
    stopCamera(this.stream);
    this.landmarker.close();
    this.listeners.clear();
  }

  private readonly tick = (): void => {
    if (this.stopped) return;
    this.rafId = requestAnimationFrame(this.tick);
    const { video } = this;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;

    // detectForVideo requires strictly increasing timestamps.
    const timestampMs = Math.max(performance.now(), this.lastTimestampMs + 1);
    this.lastTimestampMs = timestampMs;
    const result = this.landmarker.detectForVideo(video, timestampMs);
    this.last = toHandFrame(result, timestampMs);
    for (const listener of this.listeners) listener(this.last);
  };
}
