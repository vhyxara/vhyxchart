/** A 2D point. */
export interface Point {
  x: number;
  y: number;
}

/** Axis-aligned rectangle (x/y = top-left). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One cubic Bézier segment. */
export interface Cubic {
  p0: Point;
  c1: Point;
  c2: Point;
  p1: Point;
}

/** A routed edge path made of cubic segments. */
export interface Route {
  segments: Cubic[];
}

const r = (n: number): number => Math.round(n * 100) / 100;

/** SVG `d` attribute for a route. */
export function routeToPath(route: Route): string {
  const first = route.segments[0];
  if (!first) return '';
  let d = `M${r(first.p0.x)},${r(first.p0.y)}`;
  for (const s of route.segments) {
    d += ` C${r(s.c1.x)},${r(s.c1.y)} ${r(s.c2.x)},${r(s.c2.y)} ${r(s.p1.x)},${r(s.p1.y)}`;
  }
  return d;
}

function cubicAt(s: Cubic, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * s.p0.x + b * s.c1.x + c * s.c2.x + d * s.p1.x,
    y: a * s.p0.y + b * s.c1.y + c * s.c2.y + d * s.p1.y,
  };
}

/** Samples a route into a polyline with cumulative arc length. */
export function sampleRoute(route: Route, samplesPerSegment = 24): { points: Point[]; lengths: number[]; total: number } {
  const points: Point[] = [];
  for (const s of route.segments) {
    for (let i = points.length === 0 ? 0 : 1; i <= samplesPerSegment; i++) points.push(cubicAt(s, i / samplesPerSegment));
  }
  const lengths = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    total += Math.hypot(b.x - a.x, b.y - a.y);
    lengths.push(total);
  }
  return { points, lengths, total };
}

/** Point at arc-length fraction `t` (0..1) along a route. */
export function pointAt(route: Route, t: number): Point {
  const { points, lengths, total } = sampleRoute(route);
  if (points.length === 0) return { x: 0, y: 0 };
  const target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < points.length; i++) {
    const l1 = lengths[i] as number;
    if (l1 >= target) {
      const l0 = lengths[i - 1] as number;
      const a = points[i - 1] as Point;
      const b = points[i] as Point;
      const f = l1 === l0 ? 0 : (target - l0) / (l1 - l0);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
  }
  return points[points.length - 1] as Point;
}

/** Smooth route through points: vertical-ish (TB) or horizontal-ish (LR) tangents. */
export function smoothRoute(points: readonly Point[], axis: 'y' | 'x'): Route {
  const segments: Cubic[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i] as Point;
    const p1 = points[i + 1] as Point;
    if (axis === 'y') {
      const dy = (p1.y - p0.y) / 2;
      segments.push({ p0, c1: { x: p0.x, y: p0.y + dy }, c2: { x: p1.x, y: p1.y - dy }, p1 });
    } else {
      const dx = (p1.x - p0.x) / 2;
      segments.push({ p0, c1: { x: p0.x + dx, y: p0.y }, c2: { x: p1.x - dx, y: p1.y }, p1 });
    }
  }
  return { segments };
}

/** Straight route between two points. */
export function straightRoute(a: Point, b: Point): Route {
  return {
    segments: [
      { p0: a, c1: { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 }, c2: { x: a.x + ((b.x - a.x) * 2) / 3, y: a.y + ((b.y - a.y) * 2) / 3 }, p1: b },
    ],
  };
}
