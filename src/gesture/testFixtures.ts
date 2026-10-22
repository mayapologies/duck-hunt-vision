/**
 * Synthetic hand landmarks for tests. A hand is built in a local frame
 * (f = pointing direction, u = thumb/"hammer" side, n = palm side, unit =
 * one palm length) and then rotated and placed into raw camera space.
 */
import { DEFAULT_GESTURE_CONFIG } from './config';
import type { HandFrame, Landmark } from '../types';

type Local = [f: number, u: number, n: number];

export interface HandOptions {
  /** Degrees; positive points toward the player's right. */
  yawDeg?: number;
  /** Degrees; positive points up. */
  pitchDeg?: number;
  /** Wrist position in raw (un-mirrored) normalized camera space. */
  origin?: { x: number; y: number };
  /** Palm length as a fraction of frame height. */
  scale?: number;
  index?: 'extended' | 'curled';
  others?: 'extended' | 'curled';
  /** 1 = thumb up ("hammer up"), 0 = tucked against the index; in between blends. */
  thumbOpen?: number;
  timestampMs?: number;
}

const MCP: Record<'index' | 'middle' | 'ring' | 'pinky', Local> = {
  index: [0.95, 0.15, 0],
  middle: [1, 0, 0],
  ring: [0.95, -0.15, 0],
  pinky: [0.85, -0.3, 0],
};
const EXTENDED: Local[] = [
  [0.4, 0, 0],
  [0.65, 0, 0],
  [0.85, 0, 0],
];
const CURLED: Local[] = [
  [0.35, 0, 0.15],
  [0.3, 0, 0.4],
  [0, 0, 0.45],
];
const THUMB_UP: Local[] = [
  [0.45, 0.4, 0.05],
  [0.5, 0.7, 0.05],
  [0.55, 0.95, 0.05],
];
const THUMB_TUCKED: Local[] = [
  [0.4, 0.25, 0.1],
  [0.65, 0.15, 0.15],
  [0.95, 0.1, 0.2],
];

const add = (a: Local, b: Local): Local => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp = (a: Local, b: Local, t: number): Local => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

function finger(mcp: Local, shape: 'extended' | 'curled'): Local[] {
  return [mcp, ...(shape === 'extended' ? EXTENDED : CURLED).map((j) => add(mcp, j))];
}

export function handLandmarks(opts: HandOptions = {}): Landmark[] {
  const yaw = ((opts.yawDeg ?? 0) * Math.PI) / 180;
  const pitch = ((opts.pitchDeg ?? 0) * Math.PI) / 180;
  const origin = opts.origin ?? { x: 0.5, y: 0.6 };
  const scale = opts.scale ?? 0.15;
  const thumbOpen = opts.thumbOpen ?? 1;
  const others = opts.others ?? 'curled';

  const f = [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  const u = [Math.sin(yaw) * Math.sin(pitch), -Math.cos(pitch), Math.cos(yaw) * Math.sin(pitch)];
  const n = [f[1]! * u[2]! - f[2]! * u[1]!, f[2]! * u[0]! - f[0]! * u[2]!, f[0]! * u[1]! - f[1]! * u[0]!];

  const local: Local[] = [
    [0, 0, 0],
    [0.25, 0.2, 0.05],
    ...THUMB_TUCKED.map((t, i) => lerp(t, THUMB_UP[i]!, thumbOpen)),
    ...finger(MCP.index, opts.index ?? 'extended'),
    ...finger(MCP.middle, others),
    ...finger(MCP.ring, others),
    ...finger(MCP.pinky, others),
  ];

  const aspect = DEFAULT_GESTURE_CONFIG.cameraAspect;
  return local.map(([lf, lu, ln]) => {
    const w = [0, 1, 2].map((k) => scale * (lf * f[k]! + lu * u[k]! + ln * n[k]!));
    return { x: origin.x + w[0]! / aspect, y: origin.y + w[1]!, z: w[2]! / aspect };
  });
}

export function handFrame(opts: HandOptions = {}): HandFrame {
  return {
    landmarks: handLandmarks(opts),
    handedness: 'Right',
    handednessScore: 1,
    timestampMs: opts.timestampMs ?? 0,
  };
}
