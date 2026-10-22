/** Public API of the debug module: gesture tuning panel and its saved settings. */
export { DebugPanel } from './panel';
export type { DebugPanelOptions } from './panel';
export { loadTuning, resetTuning, saveTuning, STORAGE_KEY, TUNABLES } from './settings';
export type { Tunable } from './settings';
