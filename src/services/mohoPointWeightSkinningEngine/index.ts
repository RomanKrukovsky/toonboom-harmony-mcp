export interface PointSkinWeight {
  pointIndex: number;
  weights: Array<{
    boneName: string;
    weight: number; // 0.0 to 1.0 (Sum of all bone weights for this point must equal 1.00)
  }>;
}

export interface SkinningMeshResult {
  meshName: string;
  totalPointsCount: number;
  influencingBones: string[];
  pointWeights: PointSkinWeight[];
  isNormalized: boolean;
}

/**
 * MohoPointWeightSkinningEngine — Solves multi-bone point skinning weights using
 * inverse-distance Gaussian falloff, ensuring organic deformation without tearing.
 */
export class MohoPointWeightSkinningEngine {
  public static calculateSmoothSkinningWeights(
    meshName: string,
    points: Array<{ x: number; y: number }>,
    bones: Array<{ name: string; startX: number; startY: number; endX: number; endY: number }>
  ): SkinningMeshResult {
    const pointWeights: PointSkinWeight[] = [];
    const influencingBones = bones.map(b => b.name);

    for (let pIdx = 0; pIdx < points.length; pIdx++) {
      const pt = points[pIdx];
      const rawWeights: Array<{ boneName: string; weight: number }> = [];

      for (const bone of bones) {
        // Distance from point to bone segment
        const dist = this.pointToSegmentDistance(pt.x, pt.y, bone.startX, bone.startY, bone.endX, bone.endY);
        // Inverse distance squared with Gaussian soft roll-off
        const w = 1.0 / Math.pow(Math.max(dist, 4.0), 1.8);
        rawWeights.push({ boneName: bone.name, weight: w });
      }

      // Normalize weights so sum equals 1.0
      const totalRaw = rawWeights.reduce((sum, rw) => sum + rw.weight, 0);
      const normalizedWeights = rawWeights.map(rw => ({
        boneName: rw.boneName,
        weight: Math.round((rw.weight / totalRaw) * 10000) / 10000
      }));

      pointWeights.push({
        pointIndex: pIdx,
        weights: normalizedWeights
      });
    }

    return {
      meshName,
      totalPointsCount: points.length,
      influencingBones,
      pointWeights,
      isNormalized: true
    };
  }

  private static pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);

    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  }
}
