import crypto from 'crypto';
import {
  jointGuidesSchema,
  HINGE_LANDMARKS,
  type JointGuide,
  type JointGuides,
  type JointGuide as JointGuideType
} from '../../schemas/jointGuides.js';
import { type CharacterTopologyPIR } from '../pivotEstimator/index.js';

/**
 * JointGuideSolver — computes the hinge circles a cut-out rigger draws by
 * hand: center on the joint, radius from the shorter adjacent bone so the
 * forearm/shin tucks under the arm/thigh and the elbow or knee never pokes
 * out mid-rotation.
 *
 * Geometry rules (deterministic):
 *   center  = the topology landmark position (the future peg pivot)
 *   boneUp  = |center - parentLandmark|, boneDown = |center - childLandmark|
 *   radius  = clamp(overlapFactor * min(boneUp, boneDown), minRadius, maxRadius)
 *   chord   = perpendicular to the parent-bone direction, through the point
 *             `radius` away from the center toward the parent (the cut line
 *             that preserves the circular overlap)
 */

export interface JointGuideSolverOptions {
  /** Fraction of the shorter adjacent bone used as the overlap radius. */
  overlapFactor?: number;
  minRadiusPx?: number;
  maxRadiusPx?: number;
}

export interface JointGuideSolveResult {
  guides: JointGuides;
  missingLandmarks: string[];
}

export class JointGuideSolver {
  solve(topologyPir: CharacterTopologyPIR, options: JointGuideSolverOptions = {}): JointGuideSolveResult {
    const overlapFactor = options.overlapFactor ?? 0.3;
    const minRadiusPx = options.minRadiusPx ?? 4;
    const maxRadiusPx = options.maxRadiusPx ?? 80;

    const byName = new Map(topologyPir.points.map(p => [p.name, p]));
    const guides: JointGuideType[] = [];
    const missingLandmarks: string[] = [];

    for (const [jointName, [parentName, childName]] of Object.entries(HINGE_LANDMARKS)) {
      const center = byName.get(jointName);
      const parent = byName.get(parentName);
      const child = byName.get(childName);
      if (!center || !parent || !child) {
        for (const n of [jointName, parentName, childName]) {
          if (!byName.get(n)) missingLandmarks.push(n);
        }
        continue;
      }

      const boneUp = Math.hypot(center.x - parent.x, center.y - parent.y);
      const boneDown = Math.hypot(child.x - center.x, child.y - center.y);
      const shorterBone = Math.min(boneUp, boneDown);
      const radius = Math.min(maxRadiusPx, Math.max(minRadiusPx, overlapFactor * shorterBone));

      // Unit vector from center toward the parent bone.
      const ux = (parent.x - center.x) / (boneUp || 1);
      const uy = (parent.y - center.y) / (boneUp || 1);
      // Point on the parent bone at distance `radius` from the center.
      const cx = center.x + ux * radius;
      const cy = center.y + uy * radius;
      // Chord: perpendicular direction, half-length 1.4*radius.
      const px = -uy;
      const py = ux;
      const half = radius * 1.4;

      guides.push({
        jointName: jointName as JointGuideType['jointName'],
        centerX: center.x,
        centerY: center.y,
        radiusPx: radius,
        parentLandmark: parentName,
        childLandmark: childName,
        sliceChord: {
          x1: +(cx + px * half).toFixed(2),
          y1: +(cy + py * half).toFixed(2),
          x2: +(cx - px * half).toFixed(2),
          y2: +(cy - py * half).toFixed(2)
        },
        overlapPx: radius,
        confidence: Math.min(center.confidence, parent.confidence, child.confidence)
      });
    }

    guides.sort((a, b) => a.jointName.localeCompare(b.jointName));
    const parsed = jointGuidesSchema.parse({
      schemaVersion: '1.0',
      characterId: topologyPir.characterId,
      overlapFactor,
      guides
    });
    void crypto;
    return { guides: parsed, missingLandmarks };
  }
}
