import type { GestureConfig, GestureState } from '../gesture';
import { loadTuning, resetTuning, saveTuning, TUNABLES } from './settings';

export interface DebugPanelOptions {
  /** Current gesture config, used for the initial slider positions. */
  config: () => Readonly<GestureConfig>;
  /** Applies a config change (from a slider or reset). */
  onChange: (patch: Partial<GestureConfig>) => void;
  storage?: Storage;
}

const PEAK_HOLD_MS = 1000;

/** Tuning panel: sliders for gesture settings (saved in localStorage) and a live readout. */
export class DebugPanel {
  readonly element: HTMLElement;
  private readonly readout: HTMLElement;
  private readonly inputs = new Map<keyof GestureConfig, { input: HTMLInputElement; value: HTMLElement }>();
  private readonly storage: Storage;
  private peak = { value: 0, at: -Infinity };

  constructor(private readonly options: DebugPanelOptions) {
    this.storage = options.storage ?? window.localStorage;
    options.onChange(loadTuning(this.storage));

    this.element = document.createElement('aside');
    this.element.className = 'debug-panel';
    this.element.hidden = true;
    this.element.innerHTML = '<h2>Tuning (D to close)</h2>';

    this.readout = document.createElement('pre');
    this.readout.className = 'debug-readout';
    this.element.append(this.readout);

    for (const t of TUNABLES) {
      const row = document.createElement('label');
      row.className = 'debug-row';
      const name = document.createElement('span');
      name.textContent = t.label;
      const value = document.createElement('output');
      const input = document.createElement('input');
      Object.assign(input, { type: 'range', min: String(t.min), max: String(t.max), step: String(t.step) });
      input.addEventListener('input', () => {
        this.options.onChange({ [t.key]: Number(input.value) });
        this.sync();
        saveTuning(this.storage, this.options.config());
      });
      row.append(name, value, input);
      this.element.append(row);
      this.inputs.set(t.key, { input, value });
    }

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset to defaults';
    reset.addEventListener('click', () => {
      this.options.onChange(resetTuning(this.storage));
      this.sync();
    });
    this.element.append(reset);
    this.sync();
  }

  get visible(): boolean {
    return !this.element.hidden;
  }

  toggle(): void {
    this.element.hidden = !this.element.hidden;
  }

  /** Updates the live readout. Cheap to call every frame. */
  update(state: GestureState | null, info: { fps: number; mouseMode: boolean; shots: number }, nowMs: number): void {
    const v = state?.flick?.velocityDegPerSec ?? 0;
    if (v >= this.peak.value || nowMs - this.peak.at > PEAK_HOLD_MS) this.peak = { value: v, at: nowMs };
    if (!this.visible) return;
    const fmt = (n: number | undefined, digits = 0) => (n === undefined ? '–' : n.toFixed(digits));
    const threshold = this.options.config().flickMinVelocityDegPerSec;
    this.readout.textContent = [
      `Input:        ${info.mouseMode ? 'mouse' : 'camera'}`,
      `Pose:         ${state === null ? '–' : state.metrics ? state.pose : 'no hand'}`,
      `Flick angle:  ${fmt(state?.flick?.pitchDeg, 1)}°  (3D pitch ${fmt(state?.metrics?.pitchDeg, 1)}°)`,
      `Flick speed:  ${fmt(state?.flick?.velocityDegPerSec)} °/s`,
      `Peak (1 s):   ${fmt(this.peak.value)} °/s  (fires ≥ ${threshold})`,
      `Tracking FPS: ${fmt(info.fps, 1)}`,
      `Shots fired:  ${info.shots}`,
    ].join('\n');
  }

  private sync(): void {
    const config = this.options.config();
    for (const [key, { input, value }] of this.inputs) {
      input.value = String(config[key]);
      value.textContent = String(Number((config[key] as number).toFixed(3)));
    }
  }
}
