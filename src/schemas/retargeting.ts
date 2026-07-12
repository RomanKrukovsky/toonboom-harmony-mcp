import { z } from "zod";

export const JointLimitSchema = z.object({
  minAngle: z.number(),
  maxAngle: z.number(),
});

export const RigJointSchema = z.object({
  name: z.string(),
  parent: z.string().nullable().optional(),
  pegNodePath: z.string(),
  pivotX: z.number(),
  pivotY: z.number(),
  length: z.number().default(1.0),
  limits: JointLimitSchema.optional().nullable(),
});

export const RigProfileSchema = z.object({
  name: z.string(),
  joints: z.array(RigJointSchema),
  restPose: z.record(z.number()).default({}),
});

export const JointMappingSchema = z.object({
  pegNodePath: z.string(),
  sourceJoints: z.array(z.string()),
  transformType: z.enum(["rotation", "translation", "scale"]).default("rotation"),
  minAngleLimit: z.number().optional().default(-180.0),
  maxAngleLimit: z.number().optional().default(180.0),
  scaleFactor: z.number().optional().default(1.0),
});

export const TransformKeyframeSchema = z.object({
  frame: z.number(),
  value: z.number(),
  confidence: z.number().min(0.0).max(1.0).default(1.0),
});

export const TrackSchema = z.object({
  pegNodePath: z.string(),
  transformType: z.enum(["rotation", "translation", "scale"]),
  keyframes: z.array(TransformKeyframeSchema),
});

export const RetargetingManifestSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  manifestId: z.string(),
  createdAt: z.string(),
  characterName: z.string(),
  rigProfile: RigProfileSchema,
  mappings: z.array(JointMappingSchema),
  tracks: z.array(TrackSchema),
  fidelityMetrics: z.record(z.any()).default({}),
  provenance: z.record(z.any()).optional().nullable(),
});

export type JointLimit = z.infer<typeof JointLimitSchema>;
export type RigJoint = z.infer<typeof RigJointSchema>;
export type RigProfile = z.infer<typeof RigProfileSchema>;
export type JointMapping = z.infer<typeof JointMappingSchema>;
export type TransformKeyframe = z.infer<typeof TransformKeyframeSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type RetargetingManifest = z.infer<typeof RetargetingManifestSchema>;
