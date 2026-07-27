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

const COCO_LANDMARK_MAP: Record<string, string> = {
  'body_0': 'head_top',
  'body_1': 'neck',
  'body_2': 'shoulder_right',
  'body_3': 'elbow_right',
  'body_4': 'wrist_right',
  'body_5': 'shoulder_left',
  'body_6': 'elbow_left',
  'body_7': 'wrist_left',
  'body_8': 'hip_right',
  'body_9': 'knee_right',
  'body_10': 'ankle_right',
  'body_11': 'hip_left',
  'body_12': 'knee_left',
  'body_13': 'ankle_left'
};

export class PivotEstimator {
  static estimate(rawSkeleton: any, characterId: string): CharacterTopologyPIR {
    const rawPoints: Point[] = rawSkeleton.points || [];
    let requiresHumanReview = false;
    const missingOrUnreliableJoints: string[] = [];

    const mappedPoints: Point[] = [];

    rawPoints.forEach(pt => {
      if (pt.confidence < 0.5) {
        requiresHumanReview = true;
        missingOrUnreliableJoints.push(pt.name);
      }

      // Add raw point
      mappedPoints.push(pt);

      // If raw point corresponds to a standard landmark, also add landmark alias point
      if (COCO_LANDMARK_MAP[pt.name]) {
        const landmarkName = COCO_LANDMARK_MAP[pt.name];
        mappedPoints.push({
          ...pt,
          name: landmarkName
        });
      }
    });

    if (rawPoints.length < 10) {
      requiresHumanReview = true;
      missingOrUnreliableJoints.push('General Skeleton Completeness');
    }

    return CharacterTopologyPIRSchema.parse({
      version: '1.0',
      characterId,
      points: mappedPoints,
      requiresHumanReview,
      missingOrUnreliableJoints
    });
  }
}
