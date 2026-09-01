import { z } from 'zod';

export const MOHO_CHARACTER_BIBLE_SCHEMA_VERSION = '1.0';

export const mohoControllerBindingSchema = z.object({
  controllerId: z.string().min(1),
  boneId: z.number().int().min(0),
  boneName: z.string().min(1),
  purpose: z.string().min(1),
  range: z.object({
    min: z.number(),
    max: z.number(),
    units: z.enum(['degrees', 'normalized', 'pixels'])
  }).strict().optional(),
  channel: z.enum(['rotation', 'translation', 'scale', 'opacity']),
  libraryRef: z.string().optional(),
  parentBoneName: z.string().min(1).optional(),
  layerName: z.string().min(1).optional(),
  restPose: z.object({
    xPixels: z.number().describe('Bone start X in pixels, local to parent bone when parentBoneName is set.'),
    yPixels: z.number().describe('Bone start Y in pixels, local to parent bone when parentBoneName is set.'),
    lengthPixels: z.number().positive(),
    angleDeg: z.number().describe('Bone angle in degrees, local to parent bone when parentBoneName is set.')
  }).strict().optional()
}).strict();

export const mohoSwitchLayerSchema = z.object({
  switchId: z.string().min(1),
  layerName: z.string().min(1),
  choices: z.array(z.object({
    choiceId: z.string().min(1),
    drawingName: z.string().min(1)
  }).strict()).min(1)
}).strict();

export const mohoMouthShapeSchema = z.object({
  shapeId: z.enum(['Rest', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'O', 'Smile', 'Frown']),
  drawingName: z.string().min(1),
  phonemes: z.array(z.string()).default([])
}).strict();

export const mohoExpressionSchema = z.object({
  expressionId: z.string().min(1),
  drawingName: z.string().min(1).optional(),
  controllerOverrides: z.array(z.object({
    controllerId: z.string().min(1),
    value: z.number()
  }).strict()).default([])
}).strict();

export const mohoGestureLibraryEntrySchema = z.object({
  gestureId: z.string().min(1),
  durationFrames: z.number().int().positive(),
  controllerTrackRef: z.string().min(1),
  targetControllerId: z.string().min(1).optional()
}).strict();

export const mohoCharacterBibleSchema = z.object({
  schemaVersion: z.literal('1.0'),
  characterId: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'background']),
  rigType: z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical']),
  rigPath: z.string().min(1),
  turnaroundViews: z.array(
    z.enum(['front', 'front_3q_left', 'side_left', 'back_3q_left', 'back', 'back_3q_right', 'side_right', 'front_3q_right'])
  ).min(1),
  proportions: z.object({
    headHeightRatio: z.number().positive().optional(),
    armSpanRatio: z.number().positive().optional()
  }).strict().optional(),
  lineRules: z.object({
    lineThicknessPt: z.number().positive(),
    lineColourId: z.string().min(1)
  }).strict().optional(),
  controllers: z.array(mohoControllerBindingSchema).min(1),
  switchLayers: z.array(mohoSwitchLayerSchema).default([]),
  mouthShapes: z.array(mohoMouthShapeSchema).default([]),
  expressions: z.array(mohoExpressionSchema).default([]),
  gestureLibrary: z.array(mohoGestureLibraryEntrySchema).default([]),
  paletteRef: z.string().min(1),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime(),
    rigAuthor: z.string().min(1),
    licensePath: z.string().min(1)
  }).strict()
}).strict();

export type MohoControllerBinding = z.infer<typeof mohoControllerBindingSchema>;
export type MohoSwitchLayer = z.infer<typeof mohoSwitchLayerSchema>;
export type MohoMouthShape = z.infer<typeof mohoMouthShapeSchema>;
export type MohoExpression = z.infer<typeof mohoExpressionSchema>;
export type MohoGestureLibraryEntry = z.infer<typeof mohoGestureLibraryEntrySchema>;
export type MohoCharacterBible = z.infer<typeof mohoCharacterBibleSchema>;
