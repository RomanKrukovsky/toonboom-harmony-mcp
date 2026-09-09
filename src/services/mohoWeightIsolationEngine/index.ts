import type {
  BoneCapsule,
  PointDefinition,
  PointWeightResult,
  Vector2D,
  WeightIsolationInput
} from '../../schemas/mohoWeightIsolationSpec.js';

export class MohoWeightIsolationEngine {
  /**
   * Calculates distance from point P to line segment AB.
   */
  public static distanceToSegment(p: Vector2D, a: Vector2D, b: Vector2D): number {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const lenSq = vx * vx + vy * vy;

    if (lenSq === 0) {
      return Math.hypot(p.x - a.x, p.y - a.y);
    }

    const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / lenSq));
    const projX = a.x + t * vx;
    const projY = a.y + t * vy;

    return Math.hypot(p.x - projX, p.y - projY);
  }

  /**
   * Assigns normalized vertex weights to bones with strict isolation masks to prevent bone bleed.
   */
  public static computeIsolatedWeights(input: WeightIsolationInput): PointWeightResult[] {
    const rulesMap = new Map<string, Set<string>>();
    for (const rule of input.isolationRules) {
      rulesMap.set(rule.layerGroup, new Set(rule.allowedBones));
    }

    const results: PointWeightResult[] = [];

    for (const pt of input.points) {
      const allowed = rulesMap.get(pt.layerGroup);
      const rawWeights: Record<string, number> = {};
      let sum = 0;
      let closestBoneId: string | null = null;
      let minDistance = Infinity;

      for (const bone of input.bones) {
        // Enforce strict whitelist if an isolation rule exists for this layer
        if (allowed && !allowed.has(bone.boneId)) {
          continue;
        }

        const dist = this.distanceToSegment(pt.position, bone.start, bone.end);
        if (dist < minDistance) {
          minDistance = dist;
          closestBoneId = bone.boneId;
        }

        if (dist <= bone.influenceRadius) {
          // Quadratic smooth falloff
          const norm = 1 - dist / bone.influenceRadius;
          const weight = norm * norm;
          rawWeights[bone.boneId] = weight;
          sum += weight;
        }
      }

      const normalizedWeights: Record<string, number> = {};

      if (sum > 0) {
        for (const [bId, w] of Object.entries(rawWeights)) {
          const normWeight = +(w / sum).toFixed(4);
          if (normWeight > 0) {
            normalizedWeights[bId] = normWeight;
          }
        }
      } else if (closestBoneId) {
        // Point is outside influence radius of all allowed bones: clamp 100% to closest allowed bone
        normalizedWeights[closestBoneId] = 1.0;
      }

      // Ensure sum is exactly 1.0
      const currentSum = Object.values(normalizedWeights).reduce((a, b) => a + b, 0);
      if (currentSum > 0 && Math.abs(currentSum - 1.0) > 0.0001) {
        const firstKey = Object.keys(normalizedWeights)[0];
        normalizedWeights[firstKey] = +(normalizedWeights[firstKey] + (1.0 - currentSum)).toFixed(4);
      }

      results.push({
        pointId: pt.pointId,
        weights: normalizedWeights
      });
    }

    return results;
  }
}
