import type { HandFrame, Landmark } from '../types';

/** Pairs of landmark indices joined by a bone, per the MediaPipe hand model. */
export const HAND_BONES: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

/**
 * Small mirrored webcam thumbnail with the detected hand drawn on top.
 * Call `draw` once per frame (e.g. from an `onHands` listener).
 */
export class CornerPreview {
  private readonly ctx: CanvasRenderingContext2D;
  private bangUntil = -Infinity;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly video: HTMLVideoElement,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not supported.');
    this.ctx = ctx;
  }

  draw(frame: HandFrame | null): void {
    const { ctx, canvas, video } = this;
    const width = canvas.clientWidth || canvas.width;
    const aspect = video.videoWidth && video.videoHeight ? video.videoHeight / video.videoWidth : 0.75;
    const height = Math.round(width * aspect);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    if (frame) this.drawHand(frame.landmarks, width, height);
    ctx.restore();
    if (performance.now() < this.bangUntil) this.drawBang(width, height);
  }

  /** Shows a "BANG!" label on the preview for `durationMs`. */
  showBang(durationMs = 300): void {
    this.bangUntil = performance.now() + durationMs;
  }

  private drawBang(width: number, height: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.font = `bold ${Math.round(height * 0.22)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#ffd23f';
    ctx.strokeText('BANG!', width / 2, height / 2);
    ctx.fillText('BANG!', width / 2, height / 2);
    ctx.restore();
  }

  private drawHand(landmarks: readonly Landmark[], width: number, height: number): void {
    const { ctx } = this;
    ctx.strokeStyle = '#3cf';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [a, b] of HAND_BONES) {
      const p = landmarks[a];
      const q = landmarks[b];
      if (!p || !q) continue;
      ctx.moveTo(p.x * width, p.y * height);
      ctx.lineTo(q.x * width, q.y * height);
    }
    ctx.stroke();

    ctx.fillStyle = '#f53';
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
