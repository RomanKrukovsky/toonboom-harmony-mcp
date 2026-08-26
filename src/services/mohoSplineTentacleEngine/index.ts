export interface SplineTentacleConfig {
  tentacleName: string;
  startPos: [number, number];
  segmentCount?: number;
  segmentLengthPx?: number;
  baseAngleDeg?: number;
  hasCurvaturePhysics?: boolean;
}

export interface CompiledSplineTentacleResult {
  tentacleName: string;
  segmentCount: number;
  bones: Array<Record<string, unknown>>;
  smartActions: Array<{ actionName: string; curvatureProfile: number[] }>;
}

/**
 * MohoSplineTentacleEngine — Constructs flexible multi-joint spline IK chains
 * for tentacles, umbilical cords, tails, and hoses based on alien.moho and astronaft.moho.
 */
export class MohoSplineTentacleEngine {
  public static buildTentacleChain(params: SplineTentacleConfig): CompiledSplineTentacleResult {
    const name = params.tentacleName;
    const count = params.segmentCount ?? 10;
    const segLen = params.segmentLengthPx ?? 20;
    const baseAngle = params.baseAngleDeg ?? 0;
    const bones: Array<Record<string, unknown>> = [];

    let prevParent = -1;
    let currentX = params.startPos[0];
    let currentY = params.startPos[1];

    for (let i = 1; i <= count; i++) {
      const boneName = `${name}_Seg_${i < 10 ? '0' + i : i}`;
      bones.push({
        name: boneName,
        parent: prevParent,
        pos: [currentX, currentY],
        length: segLen,
        angle: (baseAngle * Math.PI) / 180,
        strength: 0.15,
        enable_physics: params.hasCurvaturePhysics !== false,
        mass: 1.0 - (i / count) * 0.5,
        spring: 0.8,
        damping: 0.5,
        tag_color: 2 // Yellow/Orange
      });

      currentX += segLen * Math.cos((baseAngle * Math.PI) / 180);
      currentY += segLen * Math.sin((baseAngle * Math.PI) / 180);
      prevParent = i - 1;
    }

    // Smart Actions for smooth Curvature Profiles
    const smartActions = [
      {
        actionName: `${name}_C_CURVE_LEFT`,
        curvatureProfile: Array.from({ length: count }, () => 15) // +15 deg each segment
      },
      {
        actionName: `${name}_C_CURVE_RIGHT`,
        curvatureProfile: Array.from({ length: count }, () => -15)
      },
      {
        actionName: `${name}_S_WAVE`,
        curvatureProfile: Array.from({ length: count }, (_, i) => (i < count / 2 ? 20 : -20))
      }
    ];

    return {
      tentacleName: name,
      segmentCount: count,
      bones,
      smartActions
    };
  }
}
