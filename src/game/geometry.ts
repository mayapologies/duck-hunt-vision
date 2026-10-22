/** A point in normalized screen space: x and y in [0, 1], origin top-left. */
export interface NormPoint {
  x: number;
  y: number;
}

/** A point in canvas pixel space. */
export interface PixelPoint {
  x: number;
  y: number;
}

/** Canvas size in pixels. */
export interface Size {
  width: number;
  height: number;
}

/** Converts a normalized point to pixels. Values outside [0, 1] are clamped. */
export function normToPixel(p: NormPoint, size: Size): PixelPoint {
  return { x: clamp01(p.x) * size.width, y: clamp01(p.y) * size.height };
}

/** Converts a pixel point to normalized space. Values outside the canvas are clamped. */
export function pixelToNorm(p: PixelPoint, size: Size): NormPoint {
  return {
    x: size.width > 0 ? clamp01(p.x / size.width) : 0,
    y: size.height > 0 ? clamp01(p.y / size.height) : 0,
  };
}

/** A circle in pixel space. */
export interface Circle {
  x: number;
  y: number;
  radius: number;
}

/** True when the pixel point lies inside or on the edge of the circle. */
export function isHit(circle: Circle, p: PixelPoint): boolean {
  const dx = p.x - circle.x;
  const dy = p.y - circle.y;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

export function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
