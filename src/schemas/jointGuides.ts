import { z } from 'zod';

/**
 * jointGuides.ts — the "draw a circle with a center at every joint" rigging
 * technique, formalised (Tatyana's hinge method).
 *
 * For every hinge joint the guide carries:
 *   - center: the rotation axis (becomes the child peg's pivot);
 *   - radius: k × the shorter adjacent bone — the overlap "ball" that keeps
 *     the joint covered while the limb bends (no popping elbow/knee);
 *   - slice chord: the line along which the parent artwork is cut so the
 *     child part keeps a circular overlap around the center;
 *   - part linkage: which assembly parts the guide binds.
 *
 * Deterministic pure geometry from the topology PIR — no guesses.
 */

export const JOINT_GUIDES_SCHEMA_VERSION = '1.0';

export const jointGuideSchema = z.object({
  jointName: z.enum(['elbow_left', 'elbow_right', 'knee_left', 'knee_right']),
  centerX: z.number(),
  centerY: z.number(),
  radiusPx: z.number().positive(),
  parentLandmark: z.string().min(1),
  childLandmark: z.string().min(1),
  /** Slice chord endpoints (perpendicular to the parent bone at the overlap distance). */
  sliceChord: z.object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number()
  }),
  /** How deep the child artwork must tuck under the parent (px). */
  overlapPx: z.number().positive(),
  confidence: z.number().min(0).max(1)
});

export const jointGuidesSchema = z.object({
  schemaVersion: z.literal(JOINT_GUIDES_SCHEMA_VERSION),
  characterId: z.string().min(1),
  overlapFactor: z.number().positive(),
  guides: z.array(jointGuideSchema)
});

export type JointGuide = z.infer<typeof jointGuideSchema>;
export type JointGuides = z.infer<typeof jointGuidesSchema>;

/** hinge -> [parent landmark, child landmark] in topology-PIR point names. */
export const HINGE_LANDMARKS: Record<JointGuide['jointName'], [string, string]> = {
  elbow_left: ['shoulder_left', 'wrist_left'],
  elbow_right: ['shoulder_right', 'wrist_right'],
  knee_left: ['hip_left', 'ankle_left'],
  knee_right: ['hip_right', 'ankle_right']
};
