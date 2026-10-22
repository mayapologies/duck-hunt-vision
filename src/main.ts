import './style.css';
import { CameraError, CornerPreview, startHandTracking, type TrackingStage } from './vision';

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const message = byId<HTMLDivElement>('message');
const video = byId<HTMLVideoElement>('webcam');
const previewCanvas = byId<HTMLCanvasElement>('preview');

const STAGE_TEXT: Record<TrackingStage, string> = {
  'loading-model': 'Loading hand tracking model…',
  'starting-camera': 'Waiting for camera permission… Please allow camera access.',
  running: '',
};

function showMessage(text: string, isError = false): void {
  message.textContent = text;
  message.classList.toggle('error', isError);
  message.hidden = text === '';
}

function errorText(err: unknown): string {
  if (err instanceof CameraError) {
    switch (err.kind) {
      case 'permission-denied':
        return 'Camera permission denied. Allow camera access in the address bar, then reload the page.';
      case 'not-found':
        return 'No camera found. Connect a webcam and reload the page.';
      case 'unsupported':
        return 'This browser cannot use the camera. Try desktop Chrome or Edge.';
      default:
        return err.message;
    }
  }
  return `Could not start hand tracking: ${err instanceof Error ? err.message : String(err)}`;
}

async function main(): Promise<void> {
  previewCanvas.hidden = true;
  try {
    const tracker = await startHandTracking({
      video,
      onStage: (stage) => showMessage(STAGE_TEXT[stage]),
    });
    const preview = new CornerPreview(previewCanvas, tracker.video);
    previewCanvas.hidden = false;
    tracker.onHands((frame) => preview.draw(frame));
  } catch (err) {
    console.error(err);
    showMessage(errorText(err), true);
  }
}

void main();
