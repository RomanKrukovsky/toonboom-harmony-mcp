import { z } from 'zod';

export const PointSchema = z.object({
  name: z.string(),
  x: z.number(),
  y: z.number(),
  normalizedX: z.number(),
  normalizedY: z.number(),
  confidence: z.number(),
  visible: z.boolean(),
  sourceModel: z.string()
});

export const CharacterTopologyPIRSchema = z.object({
  version: z.string(),
  characterId: z.string(),
  points: z.array(PointSchema),
  requiresHumanReview: z.boolean(),
  missingOrUnreliableJoints: z.array(z.string())
});

export type Point = z.infer<typeof PointSchema>;
export type CharacterTopologyPIR = z.infer<typeof CharacterTopologyPIRSchema>;

export class PivotEstimator {
  static estimate(rawSkeleton: any, characterId: string): CharacterTopologyPIR {
    const points: Point[] = rawSkeleton.points || [];
    let requiresHumanReview = false;
    const missingOrUnreliableJoints: string[] = [];

    // Analyze points
    points.forEach(pt => {
      if (pt.confidence < 0.5) {
        requiresHumanReview = true;
        missingOrUnreliableJoints.push(pt.name);
      }
    });

    if (points.length < 10) {
      requiresHumanReview = true;
      missingOrUnreliableJoints.push('General Skeleton Completeness');
    }

    return CharacterTopologyPIRSchema.parse({
      version: '1.0',
      characterId,
      points,
      requiresHumanReview,
      missingOrUnreliableJoints
    });
  }
}
