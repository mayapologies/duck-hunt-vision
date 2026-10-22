import { normToPixel, pixelToNorm, type NormPoint, type Size } from './geometry';
import { findHitTarget, POP_DURATION, spawnTarget, TARGET_COUNT, targetCircle, updateTargets, type Target } from './targets';

/** What the status display shows. */
export type TrackingState = 'no-hand' | 'hand' | 'ready';

/** Input interface for the game. All coordinates are normalized (0–1, origin top-left). */
export interface GameInput {
  setAim(x: number, y: number): void;
  shoot(x: number, y: number): void;
  setTracking(state: TrackingState): void;
}

export interface Score {
  score: number;
  hits: number;
  shots: number;
}

export const TRACKING_TEXT: Record<TrackingState, string> = {
  'no-hand': 'No hand',
  hand: 'Hand detected — make a finger gun',
  ready: 'Ready',
};

const FLASH_DURATION = 0.12;
const POINTS_PER_HIT = 100;

/** Canvas shooting scene: drifting targets, crosshair, hit feedback and HUD. */
export class GameScene implements GameInput {
  private readonly ctx: CanvasRenderingContext2D;
  private size: Size = { width: 0, height: 0 };
  private targets: Target[] = Array.from({ length: TARGET_COUNT }, () => spawnTarget());
  private aim: NormPoint = { x: 0.5, y: 0.5 };
  private tracking: TrackingState = 'no-hand';
  private mouseMode = false;
  private flash = 0;
  private lastShot: NormPoint | null = null;
  private lastTime: number | null = null;
  private frameId = 0;
  readonly stats: Score = { score: 0, hits: 0, shots: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  start(): void {
    const tick = (now: number): void => {
      const dt = this.lastTime === null ? 0 : Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.update(dt);
      this.draw();
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.resize);
  }

  setAim(x: number, y: number): void {
    this.aim = { x, y };
  }

  shoot(x: number, y: number): void {
    this.stats.shots++;
    this.flash = FLASH_DURATION;
    this.lastShot = { x, y };
    const i = findHitTarget(this.targets, { x, y }, this.size);
    const target = this.targets[i];
    if (target) {
      target.popTime = POP_DURATION;
      this.stats.hits++;
      this.stats.score += POINTS_PER_HIT;
    }
  }

  setTracking(state: TrackingState): void {
    this.tracking = state;
  }

  /** In mouse mode the crosshair is always bright; otherwise it is dimmed unless tracking is `'ready'`. */
  setMouseMode(on: boolean): void {
    this.mouseMode = on;
  }

  /** Converts a mouse/pointer event position (client pixels) to normalized canvas space. */
  toNorm(clientX: number, clientY: number): NormPoint {
    const rect = this.canvas.getBoundingClientRect();
    return pixelToNorm({ x: clientX - rect.left, y: clientY - rect.top }, { width: rect.width, height: rect.height });
  }

  private readonly resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = { width, height };
  };

  private update(dt: number): void {
    this.targets = updateTargets(this.targets, dt);
    this.flash = Math.max(0, this.flash - dt);
  }

  private draw(): void {
    const { ctx, size } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, size.height);
    sky.addColorStop(0, '#4a9fe0');
    sky.addColorStop(1, '#bfe3f7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.fillStyle = '#5a9e3a';
    ctx.fillRect(0, size.height * 0.85, size.width, size.height * 0.15);

    for (const t of this.targets) this.drawTarget(t);

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(this.flash / FLASH_DURATION) * 0.35})`;
      ctx.fillRect(0, 0, size.width, size.height);
      if (this.lastShot) {
        const p = normToPixel(this.lastShot, size);
        ctx.fillStyle = `rgba(255, 220, 80, ${this.flash / FLASH_DURATION})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.drawCrosshair();
    this.drawHud();
  }

  private drawTarget(t: Target): void {
    const { ctx } = this;
    const c = targetCircle(t, this.size);
    if (t.popTime !== null) {
      const progress = 1 - t.popTime / POP_DURATION;
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius * (1 + progress), 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    const rings = ['#d62828', '#ffffff', '#d62828'];
    rings.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius * (1 - i / rings.length), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawCrosshair(): void {
    const { ctx } = this;
    const p = normToPixel(this.aim, this.size);
    const r = 16;
    ctx.strokeStyle = this.mouseMode || this.tracking === 'ready' ? '#111' : 'rgba(17, 17, 17, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.moveTo(p.x - r * 1.6, p.y);
    ctx.lineTo(p.x - r * 0.4, p.y);
    ctx.moveTo(p.x + r * 0.4, p.y);
    ctx.lineTo(p.x + r * 1.6, p.y);
    ctx.moveTo(p.x, p.y - r * 1.6);
    ctx.lineTo(p.x, p.y - r * 0.4);
    ctx.moveTo(p.x, p.y + r * 0.4);
    ctx.lineTo(p.x, p.y + r * 1.6);
    ctx.stroke();
  }

  private drawHud(): void {
    const { ctx } = this;
    const lines = [
      this.mouseMode ? 'Mouse mode (press M for camera)' : TRACKING_TEXT[this.tracking],
      `Score: ${this.stats.score}   Hits: ${this.stats.hits}   Shots: ${this.stats.shots}`,
    ];
    ctx.font = '16px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    const width = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(12, 12, width, lines.length * 22 + 12);
    ctx.fillStyle = '#fff';
    lines.forEach((line, i) => ctx.fillText(line, 22, 18 + i * 22));
  }
}