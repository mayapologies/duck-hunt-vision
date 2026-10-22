import { HandLandmarker } from '@mediapipe/tasks-vision';
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';

/** Local model path (served from `public/models/`). */
export const MODEL_URL = `${import.meta.env.BASE_URL}models/hand_landmarker.task`;

function create(delegate: 'GPU' | 'CPU'): Promise<HandLandmarker> {
  return HandLandmarker.createFromOptions(
    { wasmLoaderPath, wasmBinaryPath },
    {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numHands: 1,
    },
  );
}

/**
 * Loads the MediaPipe HandLandmarker (VIDEO mode, 1 hand) from local files.
 * Tries the GPU delegate first and falls back to CPU.
 */
export async function createHandLandmarker(): Promise<HandLandmarker> {
  try {
    return await create('GPU');
  } catch (err) {
    console.warn('HandLandmarker GPU delegate failed, falling back to CPU.', err);
    return create('CPU');
  }
}
