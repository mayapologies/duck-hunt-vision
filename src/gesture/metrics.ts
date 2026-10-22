import { HandLandmark, LANDMARK_COUNT, type Landmark } from '../types';

/** Scale-free measurements of one hand, computed from its landmarks. */
export interface HandMetrics {
  /** Wrist to middle-finger knuckle distance (aspect-corrected units). */
  palmSize: number;
  /** Index tip-to-wrist distance / palm length. */
  indexExtension: number;
  /** Largest tip-to-wrist distance / palm length among middle, ring, pinky. */
  othersExtension: number;
  /** Thumb tip to index knuckle distance / palm length. */
  thumbSpread: number;
  /** Angle between thumb (2→4) and index (5→8), degrees. */
  thumbAngleDeg: number;
  /** Index knuckle position in mirrored screen space (0–1). */
  handPosition: { x: number; y: number };
  /** Index knuckle→tip in mirrored screen space, in palm lengths. */
  pointDirection: { x: number; y: number };
  /** Upward tilt of the index finger (5→8), degrees; positive = pointing up. Uses depth (z). */
  pitchDeg: number;
  /** How far the index tip is above its knuckle in the image, in palm lengths. Ignores the tips' depth (z). */
  indexRise: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);
const dist = (a: Vec3, b: Vec3): number => len(sub(a, b));
const RAD_TO_DEG = 180 / Math.PI;

function angleDeg(a: Vec3, b: Vec3): number {
  const la = len(a);
  const lb = len(b);
  if (la === 0 || lb === 0) return 0;
  const cos = (a.x * b.x + a.y * b.y + a.z * b.z) / (la * lb);
  return Math.acos(Math.min(1, Math.max(-1, cos))) * RAD_TO_DEG;
}

/** Returns `null` when the hand is incomplete or degenerate. */
export function measureHand(landmarks: readonly Landmark[], cameraAspect: number): HandMetrics | null {
  if (landmarks.length < LANDMARK_COUNT) return null;
  // Aspect-corrected copy so x, y and z share one unit.
  const p = landmarks.map((l) => ({ x: l.x * cameraAspect, y: l.y, z: l.z * cameraAspect }));
  const at = (i: number): Vec3 => p[i] as Vec3;

  const wrist = at(HandLandmark.WRIST);
  const palmSize = dist(wrist, at(HandLandmark.MIDDLE_MCP));
  if (!(palmSize > 0)) return null;
  const ratio = (i: number) => dist(wrist, at(i)) / palmSize;

  const indexMcp = at(HandLandmark.INDEX_MCP);
  const index = sub(at(HandLandmark.INDEX_TIP), indexMcp);
  const thumb = sub(at(HandLandmark.THUMB_TIP), at(HandLandmark.THUMB_MCP));
  const rawMcp = landmarks[HandLandmark.INDEX_MCP] as Landmark;

  return {
    palmSize,
    indexExtension: ratio(HandLandmark.INDEX_TIP),
    othersExtension: Math.max(
      ratio(HandLandmark.MIDDLE_TIP),
      ratio(HandLandmark.RING_TIP),
      ratio(HandLandmark.PINKY_TIP),
    ),
    thumbSpread: dist(at(HandLandmark.THUMB_TIP), indexMcp) / palmSize,
    thumbAngleDeg: angleDeg(thumb, index),
    handPosition: { x: 1 - rawMcp.x, y: rawMcp.y },
    pointDirection: { x: -index.x / palmSize, y: index.y / palmSize },
    pitchDeg: Math.atan2(-index.y, Math.hypot(index.x, index.z)) * RAD_TO_DEG,
    indexRise: -index.y / palmSize,
  };
}
