import type {
  InpaintLimbRequest,
  InpaintedCapResult,
  LimbJointInput
} from '../../schemas/mohoJointInpainterSpec.js';
import type { Vector2D } from '../../schemas/mohoWeightIsolationSpec.js';

export interface InpaintLimbResult {
  characterId: string;
  layerName: string;
  caps: InpaintedCapResult[];
}

export class MohoJointInpainter {
  /**
   * Generates rounded semicircular joint caps with minimum 16px padding
   * to eliminate joint cracks and holes during rotational deformation in Moho.
   */
  public static inpaintJointCaps(request: InpaintLimbRequest): InpaintLimbResult {
    const caps: InpaintedCapResult[] = [];

    for (const joint of request.joints) {
      const cap = this.generateJointCap(joint);
      caps.push(cap);
    }

    return {
      characterId: request.characterId,
      layerName: request.layerName,
      caps
    };
  }

  /**
   * Generates an individual rounded joint cap contour and SVG path.
   */
  public static generateJointCap(joint: LimbJointInput): InpaintedCapResult {
    const radius = Math.max(16, joint.radiusPx); // Guarantee >= 16px overlap padding
    const dirLen = Math.hypot(joint.direction.x, joint.direction.y);
    const unitDirX = dirLen === 0 ? 0 : joint.direction.x / dirLen;
    const unitDirY = dirLen === 0 ? 1 : joint.direction.y / dirLen;

    // Normal vector perpendicular to limb direction
    const normalX = -unitDirY;
    const normalY = unitDirX;

    const baseAngleRad = Math.atan2(unitDirY, unitDirX);
    const arcHalfRad = (joint.arcAngleDeg * Math.PI) / 360;

    const steps = 12;
    const contourPoints: Vector2D[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Angle sweeps backwards around joint cap (away from limb body)
      const currentAngle = baseAngleRad + Math.PI - arcHalfRad + t * (2 * arcHalfRad);

      const px = joint.pivot.x + Math.cos(currentAngle) * radius;
      const py = joint.pivot.y + Math.sin(currentAngle) * radius;

      contourPoints.push({
        x: +px.toFixed(2),
        y: +py.toFixed(2)
      });
    }

    // Connect back across base diameter
    const startPt = contourPoints[0];
    const endPt = contourPoints[contourPoints.length - 1];

    const pathData = [
      `M ${startPt.x} ${startPt.y}`,
      ...contourPoints.slice(1).map(p => `L ${p.x} ${p.y}`),
      `Z`
    ].join(' ');

    return {
      jointId: joint.jointId,
      contourPoints,
      overlapPaddingPx: radius,
      svgPath: pathData
    };
  }
}
