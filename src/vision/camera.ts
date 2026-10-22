/** Why the webcam could not be started. */
export type CameraErrorKind = 'permission-denied' | 'not-found' | 'unsupported' | 'other';

export class CameraError extends Error {
  readonly kind: CameraErrorKind;

  constructor(kind: CameraErrorKind, message: string) {
    super(message);
    this.name = 'CameraError';
    this.kind = kind;
  }
}

function toCameraError(err: unknown): CameraError {
  const name = err instanceof DOMException ? err.name : '';
  const detail = err instanceof Error ? err.message : String(err);
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new CameraError('permission-denied', 'Camera permission was denied.');
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return new CameraError('not-found', 'No camera was found.');
  }
  return new CameraError('other', `Could not start the camera: ${detail}`);
}

/**
 * Asks for webcam access and plays the stream in `video`.
 * Resolves once the first frame is available. Throws `CameraError`.
 */
export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('unsupported', 'This browser cannot access a camera.');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });
  } catch (err) {
    throw toCameraError(err);
  }
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return stream;
}

/** Stops all tracks of a stream started by `startCamera`. */
export function stopCamera(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}
