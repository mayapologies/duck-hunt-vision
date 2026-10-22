import { describe, expect, it } from 'vitest';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { LANDMARK_COUNT } from '../types';
import { toHandFrame } from './convert';

function result(label: string, count = LANDMARK_COUNT): HandLandmarkerResult {
  const hand = Array.from({ length: count }, (_, i) => ({ x: i / 100, y: 0.5, z: 0, visibility: 1 }));
  const category = { score: 0.9, index: 0, categoryName: label, displayName: label };
  return { landmarks: [hand], worldLandmarks: [], handedness: [[category]], handednesses: [[category]] };
}

describe('toHandFrame', () => {
  it('returns null when no hand is detected', () => {
    const empty: HandLandmarkerResult = { landmarks: [], worldLandmarks: [], handedness: [], handednesses: [] };
    expect(toHandFrame(empty, 10)).toBeNull();
  });

  it('returns null for an incomplete hand', () => {
    expect(toHandFrame(result('Left', 5), 10)).toBeNull();
  });

  it('copies 21 landmarks as {x,y,z} and keeps the timestamp', () => {
    const frame = toHandFrame(result('Left'), 42);
    expect(frame?.landmarks).toHaveLength(LANDMARK_COUNT);
    expect(frame?.landmarks[8]).toEqual({ x: 0.08, y: 0.5, z: 0 });
    expect(frame?.timestampMs).toBe(42);
    expect(frame?.handednessScore).toBe(0.9);
  });

  it("swaps MediaPipe's mirrored handedness label to the player's real hand", () => {
    expect(toHandFrame(result('Left'), 0)?.handedness).toBe('Right');
    expect(toHandFrame(result('Right'), 0)?.handedness).toBe('Left');
  });
});
