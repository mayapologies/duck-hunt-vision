import { describe, expect, it } from 'vitest';
import { DEFAULT_GESTURE_CONFIG } from '../gesture';
import { loadTuning, resetTuning, saveTuning, STORAGE_KEY, TUNABLES } from './settings';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('tuning settings', () => {
  it('every tunable is a numeric config key whose default lies inside its slider range', () => {
    for (const t of TUNABLES) {
      const v = DEFAULT_GESTURE_CONFIG[t.key];
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(t.min);
      expect(v).toBeLessThanOrEqual(t.max);
    }
  });

  it('round-trips saved values', () => {
    const storage = memoryStorage();
    saveTuning(storage, { ...DEFAULT_GESTURE_CONFIG, shotCooldownMs: 600, flickDepthWeight: 0.3 });
    expect(loadTuning(storage)).toMatchObject({ shotCooldownMs: 600, flickDepthWeight: 0.3 });
  });

  it('only saves tunable keys', () => {
    const storage = memoryStorage();
    saveTuning(storage, DEFAULT_GESTURE_CONFIG);
    expect(Object.keys(JSON.parse(storage.data.get(STORAGE_KEY)!)).sort()).toEqual(TUNABLES.map((t) => t.key).sort());
  });

  it('ignores missing, corrupt, unknown and non-numeric values and clamps out-of-range ones', () => {
    expect(loadTuning(memoryStorage())).toEqual({});
    expect(loadTuning(memoryStorage({ [STORAGE_KEY]: '{not json' }))).toEqual({});
    expect(loadTuning(memoryStorage({ [STORAGE_KEY]: 'null' }))).toEqual({});
    const saved = JSON.stringify({ cameraAspect: 2, shotCooldownMs: 'x', flickDepthWeight: 5, smoothingBeta: -1 });
    expect(loadTuning(memoryStorage({ [STORAGE_KEY]: saved }))).toEqual({ flickDepthWeight: 1, smoothingBeta: 0 });
  });

  it('reset clears storage and returns defaults', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{"shotCooldownMs":900}' });
    const defaults = resetTuning(storage);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
    expect(defaults.shotCooldownMs).toBe(DEFAULT_GESTURE_CONFIG.shotCooldownMs);
  });
});
