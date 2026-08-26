import { z } from 'zod';

/**
 * mohoProductionRig.ts — Zod schemas for the 360° Turnaround Full Production Rig
 * standard derived from the 20 benchmark rigs and Evgeny Borsch's 2024 masterclass.
 */

export const TURNAROUND_ANGLES = [
  'Front',
  '3/4 R',
  'Side R',
  '1/4 R',
  'Back',
  '1/4 L',
  'Side L',
  '3/4 L'
] as const;

export type TurnaroundAngle = (typeof TURNAROUND_ANGLES)[number];

export const BONE_COLOR_PALETTE = {
  PLAIN: 0,
  RED_RIGHT: 1,
  ORANGE_RIGHT: 2,
  YELLOW_ROOT: 3,
  GREEN_LEFT: 4,
  BLUE_LEFT: 5,
  PURPLE_DIALS: 6,
  PINK_AUX: 7
} as const;

export type BoneColor = (typeof BONE_COLOR_PALETTE)[keyof typeof BONE_COLOR_PALETTE];

export const SmartActionPoseSchema = z.object({
  frame: z.number().int().nonnegative(),
  angleDeg: z.number().optional(),
  pos: z.object({ x: z.number(), y: z.number() }).optional(),
  scale: z.object({ x: z.number(), y: z.number() }).optional(),
  switchChoice: z.string().optional(),
  pointDeltas: z.array(
    z.object({
      pointIndex: z.number().int().nonnegative(),
      dx: z.number(),
      dy: z.number()
    })
  ).optional()
});

export type SmartActionPose = z.infer<typeof SmartActionPoseSchema>;

export const SmartBoneDialSpecSchema = z.object({
  dialName: z.string(),
  boneName: z.string(),
  minAngleDeg: z.number().default(-45),
  maxAngleDeg: z.number().default(270),
  neutralAngleDeg: z.number().default(0),
  controlledTarget: z.string(),
  poses: z.array(SmartActionPoseSchema)
});

export type SmartBoneDialSpec = z.infer<typeof SmartBoneDialSpecSchema>;

export const VitruvianGroupSpecSchema = z.object({
  groupName: z.string(),
  activeBoneName: z.string(),
  branches: z.array(
    z.object({
      branchName: z.string(),
      angleName: z.enum(TURNAROUND_ANGLES).optional(),
      boneNames: z.array(z.string())
    })
  )
});

export type VitruvianGroupSpec = z.infer<typeof VitruvianGroupSpecSchema>;

export const JointFlexionCorrectionSchema = z.object({
  jointName: z.string(),
  boneName: z.string(),
  flexionAnglesDeg: z.array(z.number()).default([90, 135]),
  bulgeBicepScale: z.number().default(1.18),
  cuffDeformers: z.array(
    z.object({
      name: z.string(),
      angleOffsetDeg: z.number(),
      lengthPx: z.number()
    })
  ).default([]),
  patchLayerName: z.string().optional()
});

export type JointFlexionCorrection = z.infer<typeof JointFlexionCorrectionSchema>;

export const SquashStretchSpecSchema = z.object({
  targetPart: z.enum(['Head', 'Body', 'Limbs']),
  controlBoneName: z.string(),
  horizontalSpreaderBones: z.array(z.string()),
  scaleRatioYtoX: z.number().default(-0.95),
  eyelidCompensationEnabled: z.boolean().default(true)
});

export type SquashStretchSpec = z.infer<typeof SquashStretchSpecSchema>;

export const SmartShadowSpecSchema = z.object({
  enabled: z.boolean().default(true),
  layerName: z.string().default('shadow'),
  rootBoneName: z.string().default('Master'),
  scaleY: z.number().default(-0.25),
  skewX: z.number().default(0.1),
  opacity: z.number().min(0).max(1).default(0.35)
});

export type SmartShadowSpec = z.infer<typeof SmartShadowSpecSchema>;

export const AnimatorContractSpecSchema = z.object({
  hideHelperBonesShy: z.boolean().default(true),
  colorCodeBones: z.boolean().default(true),
  lockNonControllerChannels: z.boolean().default(true),
  frameZeroCleanAudit: z.boolean().default(true)
});

export type AnimatorContractSpec = z.infer<typeof AnimatorContractSpecSchema>;

export const MohoProductionRigSpecSchema = z.object({
  characterId: z.string(),
  characterName: z.string(),
  turnaroundAngles: z.array(z.enum(TURNAROUND_ANGLES)).default([...TURNAROUND_ANGLES]),
  smartDials: z.array(SmartBoneDialSpecSchema).default([]),
  vitruvianGroups: z.array(VitruvianGroupSpecSchema).default([]),
  jointCorrections: z.array(JointFlexionCorrectionSchema).default([]),
  squashStretch: z.array(SquashStretchSpecSchema).default([]),
  shadow: SmartShadowSpecSchema.default({}),
  animatorContract: AnimatorContractSpecSchema.default({})
});

export type MohoProductionRigSpec = z.infer<typeof MohoProductionRigSpecSchema>;
