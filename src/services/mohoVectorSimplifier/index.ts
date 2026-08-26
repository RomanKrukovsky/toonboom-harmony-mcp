export interface VectorPoint {
  x: number;
  y: number;
  handleIn?: { dx: number; dy: number };
  handleOut?: { dx: number; dy: number };
  curvature?: number;
}

export interface MohoVectorShape {
  name: string;
  points: VectorPoint[];
  fillColor: { r: number; g: number; b: number; a: number };
  strokeColor: { r: number; g: number; b: number; a: number };
  strokeWidth: number;
  isClosed: boolean;
}

/**
 * MohoVectorSimplifier — Converts raw boundaries / contours into minimal, clean,
 * production-ready cartoon vector curves for Moho (4-12 Bezier points per part).
 */
export class MohoVectorSimplifier {
  /**
   * Simplifies a 2D polygonal contour using Ramer-Douglas-Peucker (RDP) algorithm.
   */
  public static simplifyContour(points: Array<{ x: number; y: number }>, epsilon = 2.5): Array<{ x: number; y: number }> {
    if (points.length <= 2) return points;

    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const d = this.perpendicularDistance(points[i], points[0], points[end]);
      if (d > dmax) {
        index = i;
        dmax = d;
      }
    }

    if (dmax > epsilon) {
      const recResults1 = this.simplifyContour(points.slice(0, index + 1), epsilon);
      const recResults2 = this.simplifyContour(points.slice(index), epsilon);
      return recResults1.slice(0, -1).concat(recResults2);
    } else {
      return [points[0], points[end]];
    }
  }

  /**
   * Fits smooth Bezier curvature handles to simplified points.
   */
  public static fitBezierHandles(points: Array<{ x: number; y: number }>, tension = 0.35): VectorPoint[] {
    const n = points.length;
    if (n === 0) return [];
    if (n === 1) return [{ x: points[0].x, y: points[0].y, curvature: 0 }];

    const result: VectorPoint[] = [];

    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n];
      const curr = points[i];
      const next = points[(i + 1) % n];

      // Tangent vector between prev and next
      const vx = next.x - prev.x;
      const vy = next.y - prev.y;

      const handleIn = { dx: -vx * tension, dy: -vy * tension };
      const handleOut = { dx: vx * tension, dy: vy * tension };

      result.push({
        x: +curr.x.toFixed(2),
        y: +curr.y.toFixed(2),
        handleIn: { dx: +handleIn.dx.toFixed(2), dy: +handleIn.dy.toFixed(2) },
        handleOut: { dx: +handleOut.dx.toFixed(2), dy: +handleOut.dy.toFixed(2) },
        curvature: 0.35
      });
    }

    return result;
  }

  /**
   * Generates a clean cartoon capsule/ellipse vector shape (ideal for limbs, torso, head).
   */
  public static generateCapsuleShape(params: {
    name: string;
    centerX: number;
    centerY: number;
    radiusX: number;
    radiusY: number;
    fillRgba: [number, number, number, number];
    strokeRgba?: [number, number, number, number];
    strokeWidth?: number;
    jointCapPadding?: boolean; // Expands bottom/top joint cap by +15% to prevent holes
  }): MohoVectorShape {
    const rx = params.jointCapPadding ? params.radiusX * 1.15 : params.radiusX;
    const ry = params.radiusY;
    const cx = params.centerX;
    const cy = params.centerY;

    // 8-point smooth cartoon ellipse with optimal Bezier handles
    const kappa = 0.552284749831; // Standard cubic bezier circle approximation constant
    const points: VectorPoint[] = [
      { x: cx, y: cy + ry, handleIn: { dx: -rx * kappa, dy: 0 }, handleOut: { dx: rx * kappa, dy: 0 }, curvature: 0.35 },
      { x: cx + rx * 0.7, y: cy + ry * 0.7, handleIn: { dx: -rx * 0.3, dy: ry * 0.3 }, handleOut: { dx: rx * 0.3, dy: -ry * 0.3 } },
      { x: cx + rx, y: cy, handleIn: { dx: 0, dy: ry * kappa }, handleOut: { dx: 0, dy: -ry * kappa }, curvature: 0.35 },
      { x: cx + rx * 0.7, y: cy - ry * 0.7, handleIn: { dx: rx * 0.3, dy: ry * 0.3 }, handleOut: { dx: -rx * 0.3, dy: -ry * 0.3 } },
      { x: cx, y: cy - ry, handleIn: { dx: rx * kappa, dy: 0 }, handleOut: { dx: -rx * kappa, dy: 0 }, curvature: 0.35 },
      { x: cx - rx * 0.7, y: cy - ry * 0.7, handleIn: { dx: rx * 0.3, dy: -ry * 0.3 }, handleOut: { dx: -rx * 0.3, dy: ry * 0.3 } },
      { x: cx - rx, y: cy, handleIn: { dx: 0, dy: -ry * kappa }, handleOut: { dx: 0, dy: ry * kappa }, curvature: 0.35 },
      { x: cx - rx * 0.7, y: cy + ry * 0.7, handleIn: { dx: -rx * 0.3, dy: -ry * 0.3 }, handleOut: { dx: rx * 0.3, dy: ry * 0.3 } }
    ];

    return {
      name: params.name,
      points,
      fillColor: {
        r: params.fillRgba[0],
        g: params.fillRgba[1],
        b: params.fillRgba[2],
        a: params.fillRgba[3]
      },
      strokeColor: params.strokeRgba
        ? { r: params.strokeRgba[0], g: params.strokeRgba[1], b: params.strokeRgba[2], a: params.strokeRgba[3] }
        : { r: 26, g: 26, b: 26, a: 255 },
      strokeWidth: params.strokeWidth ?? 3.0,
      isClosed: true
    };
  }

  private static perpendicularDistance(
    p: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return Math.sqrt((p.x - p1.x) ** 2 + (p.y - p1.y) ** 2);
    return Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / mag;
  }
}
