import './style.css';
import { DebugPanel } from './debug';
import { GameScene, type TrackingState } from './game';
import { createGestureController, type GestureState } from './gesture';
import { CameraError, CornerPreview, startHandTracking, type TrackingStage } from './vision';

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const message = byId<HTMLDivElement>('message');
const video = byId<HTMLVideoElement>('webcam');
const previewCanvas = byId<HTMLCanvasElement>('preview');
const gameCanvas = byId<HTMLCanvasElement>('game-canvas');

const game = new GameScene(gameCanvas);
game.start();

const gestures = createGestureController();
const panel = new DebugPanel({ config: () => gestures.config, onChange: (patch) => gestures.setConfig(patch) });
document.body.append(panel.element);

let mouseMode = false;
let lastGesture: GestureState | null = null;
let fps = 0;
let lastFrameMs: number | null = null;

function setMouseMode(on: boolean): void {
  mouseMode = on;
  game.setMouseMode(on);
  gestures.reset();
  refreshPanel();
}

function refreshPanel(): void {
  panel.update(mouseMode ? null : lastGesture, { fps, mouseMode, shots: game.stats.shots }, performance.now());
}

function trackingState(state: GestureState): TrackingState {
  if (!state.metrics) return 'no-hand';
  return state.pose === 'gun' ? 'ready' : 'hand';
}

window.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'm') setMouseMode(!mouseMode);
  else if (key === 'd') {
    panel.toggle();
    refreshPanel();
  }
});

gameCanvas.addEventListener('mousemove', (e) => {
  if (!mouseMode) return;
  const p = game.toNorm(e.clientX, e.clientY);
  game.setAim(p.x, p.y);
});
gameCanvas.addEventListener('mousedown', (e) => {
  if (!mouseMode || e.button !== 0) return;
  const p = game.toNorm(e.clientX, e.clientY);
  game.setAim(p.x, p.y);
  game.shoot(p.x, p.y);
});

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
    tracker.onHands((frame) => {
      const now = performance.now();
      if (lastFrameMs !== null && now > lastFrameMs) {
        const instant = 1000 / (now - lastFrameMs);
        fps = fps === 0 ? instant : fps * 0.9 + instant * 0.1;
      }
      lastFrameMs = now;

      if (!mouseMode) {
        const state = gestures.update(frame, frame?.timestampMs ?? now);
        lastGesture = state;
        game.setTracking(trackingState(state));
        if (state.aim) game.setAim(state.aim.x, state.aim.y);
        if (state.shot) {
          game.shoot(state.shot.x, state.shot.y);
          preview.showBang();
        }
      } else {
        game.setTracking(frame ? 'hand' : 'no-hand');
      }
      preview.draw(frame);
      refreshPanel();
    });
  } catch (err) {
    console.error(err);
    showMessage(errorText(err), true);
    setMouseMode(true);
  }
}

void main();
