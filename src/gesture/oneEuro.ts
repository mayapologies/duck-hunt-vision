/**
 * One Euro filter (Casiez et al. 2012): an adaptive low-pass filter that is
 * smooth when the signal is still and responsive when it moves fast.
 */
export interface OneEuroParams {
  minCutoff: number;
  beta: number;
  derivativeCutoff: number;
}

export interface OneEuroFilter {
  filter(value: number, timestampMs: number): number;
  reset(): void;
}

function alpha(cutoffHz: number, dtSec: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSec);
}

export function createOneEuroFilter(params: () => OneEuroParams): OneEuroFilter {
  let prev: { value: number; derivative: number; timestampMs: number } | null = null;

  return {
    filter(value, timestampMs) {
      if (!prev) {
        prev = { value, derivative: 0, timestampMs };
        return value;
      }
      const dt = (timestampMs - prev.timestampMs) / 1000;
      if (dt <= 0) return prev.value;
      const { minCutoff, beta, derivativeCutoff } = params();
      const rawDerivative = (value - prev.value) / dt;
      const aD = alpha(derivativeCutoff, dt);
      const derivative = aD * rawDerivative + (1 - aD) * prev.derivative;
      const a = alpha(minCutoff + beta * Math.abs(derivative), dt);
      const filtered = a * value + (1 - a) * prev.value;
      prev = { value: filtered, derivative, timestampMs };
      return filtered;
    },
    reset() {
      prev = null;
    },
  };
}
