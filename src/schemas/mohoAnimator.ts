import { z } from 'zod';

export const MOTION_STYLES = ['default', 'snappy', 'fluid', 'robotic', 'expressive'] as const;
export type MotionStyle = (typeof MOTION_STYLES)[number];

export const EMOTIONS = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'surprised',
  'scheming',
  'sarcastic'
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const CAMERA_CONSTRAINTS = ['static', 'push-in', 'whip-pan', 'tracking'] as const;
export type CameraConstraint = (typeof CAMERA_CONSTRAINTS)[number];

export const LANGUAGES = ['en', 'ru', 'auto'] as const;
export type Language = (typeof LANGUAGES)[number];

export const PHONEME_SHAPES = [
  'Rest',
  'Closed',
  'A',
  'E',
  'I',
  'O',
  'U',
  'F_V',
  'M_B_P'
] as const;
export type PhonemeShape = (typeof PHONEME_SHAPES)[number];

export const DialogueLineSchema = z.object({
  text: z.string().describe('The spoken dialogue or lyrics phrase.'),
  startFrame: z.number().int().min(0).describe('Start frame of the line.'),
  endFrame: z.number().int().min(1).describe('End frame of the line.')
});
export type DialogueLine = z.infer<typeof DialogueLineSchema>;

export const MohoAnimationSceneSchema = z.object({
  id: z.union([z.number(), z.string()]),
  duration: z.number().int().positive(),
  description: z.string().optional()
});
export type MohoAnimationScene = z.infer<typeof MohoAnimationSceneSchema>;

export const MohoAnimationBeatSchema = z.object({
  beat: z.number().int().positive(),
  description: z.string(),
  frame: z.number().int().min(0)
});
export type MohoAnimationBeat = z.infer<typeof MohoAnimationBeatSchema>;

export const MohoAnimationActionSchema = z.object({
  type: z.enum(['walk', 'run', 'idle', 'gesture', 'turn']),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().positive(),
  parameters: z.record(z.any()).optional()
});
export type MohoAnimationAction = z.infer<typeof MohoAnimationActionSchema>;

export const MohoAnimationKeyPoseSchema = z.object({
  frame: z.number().int().min(0),
  pose: z.string(),
  intensity: z.number().min(0).max(1).optional()
});
export type MohoAnimationKeyPose = z.infer<typeof MohoAnimationKeyPoseSchema>;

export const MohoAnimationTransitionSchema = z.object({
  fromAction: z.string(),
  toAction: z.string(),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().positive(),
  easing: z.string().optional().default('easeInOut')
});
export type MohoAnimationTransition = z.infer<typeof MohoAnimationTransitionSchema>;

export const MohoAnimationLookTargetSchema = z.object({
  target: z.string().describe('Target descriptor: camera | left | right | up | down | objectId'),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().positive(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional()
});
export type MohoAnimationLookTarget = z.infer<typeof MohoAnimationLookTargetSchema>;

export const MohoAnimationBlinkSchema = z.object({
  frame: z.number().int().min(0),
  duration: z.number().int().positive().default(3)
});
export type MohoAnimationBlink = z.infer<typeof MohoAnimationBlinkSchema>;

export const MohoAnimationPhonemeSchema = z.object({
  word: z.string().optional(),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().positive(),
  phonemeSequence: z.array(z.string()).describe('Sequence of 6+1 phoneme shapes (Rest, A, E, I, O, U, etc.)')
});
export type MohoAnimationPhoneme = z.infer<typeof MohoAnimationPhonemeSchema>;

export const MohoAnimationGestureSchema = z.object({
  frame: z.number().int().min(0),
  type: z.string().describe('Gesture type: hand-swap | wave | point | shrug | nod'),
  newHand: z.string().optional(),
  arm: z.enum(['L', 'R', 'both']).optional()
});
export type MohoAnimationGesture = z.infer<typeof MohoAnimationGestureSchema>;

export const MohoAnimationIKTargetSchema = z.object({
  bone: z.string(),
  lock: z.boolean(),
  frame: z.number().int().min(0)
});
export type MohoAnimationIKTarget = z.infer<typeof MohoAnimationIKTargetSchema>;

export const MohoAnimationSecondaryMotionSchema = z.object({
  type: z.string().describe('Secondary motion type: hair-follow-through | breathing | clothing'),
  magnitude: z.number().min(0).max(1).default(0.5)
});
export type MohoAnimationSecondaryMotion = z.infer<typeof MohoAnimationSecondaryMotionSchema>;

export const MohoAnimationCameraSchema = z.object({
  type: z.enum(['static', 'push-in', 'whip-pan', 'tracking']),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().positive(),
  scaleZ: z.number().optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
  target: z.string().optional()
});
export type MohoAnimationCamera = z.infer<typeof MohoAnimationCameraSchema>;

export const MohoAnimationPlanSchema = z.object({
  scenes: z.array(MohoAnimationSceneSchema).default([]),
  beats: z.array(MohoAnimationBeatSchema).default([]),
  actions: z.array(MohoAnimationActionSchema).default([]),
  keyPoses: z.array(MohoAnimationKeyPoseSchema).default([]),
  transitions: z.array(MohoAnimationTransitionSchema).default([]),
  gaze: z.array(MohoAnimationLookTargetSchema).default([]),
  blinks: z.array(MohoAnimationBlinkSchema).default([]),
  phonemes: z.array(MohoAnimationPhonemeSchema).default([]),
  gestures: z.array(MohoAnimationGestureSchema).default([]),
  ikTargets: z.array(MohoAnimationIKTargetSchema).default([]),
  secondaryMotion: z.array(MohoAnimationSecondaryMotionSchema).default([]),
  camera: z.array(MohoAnimationCameraSchema).default([]),
  diagnosticFrames: z.array(z.number().int().min(0)).default([1, 12, 24]),
  inspectionFrames: z.array(z.number().int().min(0)).optional(),
  fingerprint: z.string().optional()
});
export type MohoAnimationPlan = z.infer<typeof MohoAnimationPlanSchema>;

export const MohoAnimateFromBriefInputSchema = z
  .object({
    rigPath: z.string().describe('Path to the base .moho rig file.'),
    brief: z.string().optional().describe('Text brief or script describing the desired animation.'),
    briefText: z.string().optional().describe('Alias for brief (backwards compatibility).'),
    durationSeconds: z.number().positive().optional().describe('Scene duration in seconds (e.g. 5.0).'),
    durationFrames: z.number().int().positive().optional().describe('Scene duration in frames (overrides or derived from durationSeconds).'),
    fps: z.number().int().positive().default(24).describe('Playback framerate.'),
    canvasWidth: z.number().int().positive().default(1920).describe('Canvas width in pixels.'),
    canvasHeight: z.number().int().positive().default(1080).describe('Canvas height in pixels.'),
    resolution: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    }).optional().describe('Alias for canvasWidth / canvasHeight.'),
    motionStyle: z.enum(MOTION_STYLES).default('default').describe('Motion aesthetic style.'),
    emotion: z.enum(EMOTIONS).default('neutral').describe('Base emotional state.'),
    dialogue: z.string().optional().describe('Spoken dialogue transcript or text.'),
    lyrics: z.string().optional().describe('Lyrics for musical / rhythmic timing.'),
    dialogueLines: z.array(DialogueLineSchema).optional().describe('Pre-timed dialogue segments.'),
    language: z.enum(LANGUAGES).default('en').describe('Language code for phoneme synthesis.'),
    outputPath: z.string().describe('Path to save the generated animated .moho project.'),
    cameraConstraints: z.enum(CAMERA_CONSTRAINTS).default('static').describe('Camera move style.')
  })
  .refine(
    (data) => Boolean((data.brief && data.brief.trim().length > 0) || (data.briefText && data.briefText.trim().length > 0)),
    { message: 'Either brief or briefText must be provided as a non-empty string.' }
  );
export type MohoAnimateFromBriefInput = z.infer<typeof MohoAnimateFromBriefInputSchema>;

export const MohoAnimationGateSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  mandatory: z.boolean(),
  weight: z.number().optional(),
  earned: z.number().optional(),
  detail: z.string().optional()
});
export type MohoAnimationGate = z.infer<typeof MohoAnimationGateSchema>;

export const MohoAnimateFromBriefOutputSchema = z.object({
  status: z.enum(['certified', 'failed']),
  outputPath: z.string(),
  animationPlan: MohoAnimationPlanSchema,
  score: z.number(),
  certified: z.boolean(),
  gates: z.array(MohoAnimationGateSchema),
  evidenceDirectory: z.string(),
  errors: z.array(z.string()),
  renderResult: z.any().optional()
});
export type MohoAnimateFromBriefOutput = z.infer<typeof MohoAnimateFromBriefOutputSchema>;
