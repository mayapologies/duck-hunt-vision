import { DEFAULT_GESTURE_CONFIG, type GestureConfig } from '../gesture';

/** A gesture setting that gets a slider in the tuning panel. */
export interface Tunable {
  key: keyof GestureConfig;
  label: string;
  min: number;
  max: number;
  step: number;
}

export const TUNABLES: readonly Tunable[] = [
  { key: 'aimPositionGain', label: 'Aim gain: hand position', min: 0, max: 3, step: 0.05 },
  { key: 'aimDirectionGain', label: 'Aim gain: pointing direction', min: 0, max: 2, step: 0.05 },
  { key: 'smoothingMinCutoff', label: 'Smoothing: min cutoff (lower = steadier)', min: 0.05, max: 5, step: 0.05 },
  { key: 'smoothingBeta', label: 'Smoothing: beta (higher = less lag)', min: 0, max: 20, step: 0.1 },
  { key: 'flickMinVelocityDegPerSec', label: 'Flick: min speed (°/s)', min: 50, max: 1000, step: 10 },
  { key: 'flickMinAngleDeg', label: 'Flick: min angle (°)', min: 2, max: 60, step: 1 },
  { key: 'flickDepthWeight', label: 'Flick: depth (z) weight', min: 0, max: 1, step: 0.05 },
  { key: 'flickIndexLength', label: 'Flick: index length / palm', min: 0.4, max: 1.4, step: 0.01 },
  { key: 'shotCooldownMs', label: 'Shot cooldown (ms)', min: 0, max: 1500, step: 10 },
];

export const STORAGE_KEY = 'duck-hunt-vision.gesture-config';

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Reads saved tunable values. Unknown keys and invalid values are ignored; values are clamped to the slider range. */
export function loadTuning(storage: KeyValueStore): Partial<GestureConfig> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null) return {};
  const saved = parsed as Record<string, unknown>;
  const result: Partial<GestureConfig> = {};
  for (const t of TUNABLES) {
    const v = saved[t.key];
    if (typeof v === 'number' && Number.isFinite(v)) result[t.key] = Math.min(t.max, Math.max(t.min, v));
  }
  return result;
}

/** Saves only the tunable values of `config`. */
export function saveTuning(storage: KeyValueStore, config: Readonly<GestureConfig>): void {
  const values: Partial<Record<keyof GestureConfig, number>> = {};
  for (const t of TUNABLES) values[t.key] = config[t.key];
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Storage full or blocked: tuning still applies for this session.
  }
}

/** Forgets saved values and returns the defaults for every tunable. */
export function resetTuning(storage: KeyValueStore): Partial<GestureConfig> {
  storage.removeItem(STORAGE_KEY);
  const defaults: Partial<GestureConfig> = {};
  for (const t of TUNABLES) defaults[t.key] = DEFAULT_GESTURE_CONFIG[t.key];
  return defaults;
}
