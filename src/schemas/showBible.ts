import { z } from 'zod';

/**
 * showBible.ts — machine-readable production standard for ONE frozen show.
 *
 * This is the contract that locks the "factory of one series" described in
 * ROADMAP. The LLM is allowed to make directorial decisions ONLY within the
 * constraints declared here. Everything outside this bible is a QA rejection.
 *
 * The ShowBible is a FAMILY of six JSON documents:
 *   show_bible.json       — top-level lock (fps, resolution, style, lighting)
 *   character_bible.json  — per-character turnaround + controller map
 *   camera_rules.json     — allowed shot sizes, moves, framing
 *   motion_grammar.json   — allowed gestures, emotions, pose library refs
 *   palette_manifest.json — locked palette colours with stable IDs
 *   qa_thresholds.json    — numeric gates for QA Retake Engine
 *
 * Each document carries its own schemaVersion so they can evolve independently.
 * Provenance is mandatory: every ShowBible must declare its human approver.
 */

export const SHOW_BIBLE_SCHEMA_VERSION = '1.0';

// ─────────────────────────────────────────────────────────────────────────────
// Palette manifest — locked colours with stable IDs
// ─────────────────────────────────────────────────────────────────────────────

export const paletteColourSchema = z.object({
  colourId: z.string().min(1).describe('Stable ID used by rigs and drawings, e.g. "char_skin_base".'),
  name: z.string().min(1),
  rgba: z.string().regex(/^#?[0-9a-fA-F]{8}$/).describe('8-digit hex RGBA, e.g. "#FF8C6BFF".'),
  usage: z.string().describe('Where this colour may be used: "skin", "hair", "line", "shadow", ...'),
  locked: z.boolean().default(true).describe('Locked colours cannot be swapped by the LLM.')
}).strict();

export const paletteManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  paletteId: z.string().min(1),
  name: z.string().min(1),
  colours: z.array(paletteColourSchema).min(1),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime(),
    notes: z.string().optional()
  })
}).strict();

export type PaletteManifest = z.infer<typeof paletteManifestSchema>;
export type PaletteColour = z.infer<typeof paletteColourSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Character bible — turnaround + controller map for one character
// ─────────────────────────────────────────────────────────────────────────────

export const controllerBindingSchema = z.object({
  controllerId: z.string().min(1).describe('Stable ID used by HarmonyCommandPlan, e.g. "HEAD_ROT".'),
  nodePath: z.string().min(1).describe('Path inside the rig .xstage, e.g. "Top/Char/Head_Peg".'),
  purpose: z.string().describe('Human-readable role: "head rotation", "mouth open", ...'),
  range: z.object({
    min: z.number(),
    max: z.number(),
    units: z.enum(['degrees', 'normalized', 'frames', 'pixels'])
  }).optional(),
  libraryRef: z.string().optional().describe('Reference to a pose/gesture library entry.')
}).strict();

export const mouthShapeSchema = z.object({
  shapeId: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'X']),
  drawingName: z.string().min(1).describe('Drawing substitution name inside the mouth layer.'),
  phonemes: z.array(z.string()).default([])
}).strict();

export const expressionSchema = z.object({
  expressionId: z.string().min(1).describe('Stable ID, e.g. "neutral", "surprise", "angry".'),
  drawingName: z.string().min(1).optional(),
  controllerOverrides: z.array(z.object({
    controllerId: z.string().min(1),
    value: z.number()
  })).default([])
}).strict();

export const gestureLibraryEntrySchema = z.object({
  gestureId: z.string().min(1),
  durationFrames: z.number().int().positive(),
  controllerTrackRef: z.string().describe('Reference to a pre-baked PerformancePIR track set.')
}).strict();

export const characterBibleSchema = z.object({
  schemaVersion: z.literal('1.0'),
  characterId: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'background']),
  rigPath: z.string().describe('Path to the production .xstage rig.'),
  templatePath: z.string().describe('Path to the portable .tpl.'),
  turnaroundViews: z.array(
    z.enum(['front', 'front_3q_left', 'side_left', 'back_3q_left', 'back', 'back_3q_right', 'side_right', 'front_3q_right'])
  ).min(1),
  proportions: z.object({
    headHeightRatio: z.number().positive().optional(),
    armSpanRatio: z.number().positive().optional()
  }).optional(),
  lineRules: z.object({
    lineThicknessPt: z.number().positive(),
    lineColourId: z.string().min(1)
  }).optional(),
  controllers: z.array(controllerBindingSchema).min(1),
  mouthShapes: z.array(mouthShapeSchema).default([]),
  expressions: z.array(expressionSchema).default([]),
  gestureLibrary: z.array(gestureLibraryEntrySchema).default([]),
  paletteRef: z.string().min(1).describe('paletteId from palette_manifest.json.'),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime(),
    rigAuthor: z.string().min(1),
    licensePath: z.string().min(1).describe('Path to asset_license.json + contract.')
  })
}).strict();

export type CharacterBible = z.infer<typeof characterBibleSchema>;
export type ControllerBinding = z.infer<typeof controllerBindingSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Camera rules — allowed shot sizes, moves, framing
// ─────────────────────────────────────────────────────────────────────────────

export const cameraRulesSchema = z.object({
  schemaVersion: z.literal('1.0'),
  allowedShotSizes: z.array(
    z.enum(['extreme_close_up', 'close_up', 'medium_close_up', 'medium_shot', 'medium_full_shot', 'full_shot', 'long_shot', 'extreme_long_shot'])
  ).min(1),
  allowedCameraMoves: z.array(
    z.enum(['static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'dolly_in', 'dolly_out', 'truck_left', 'truck_right', 'pedestal_up', 'pedestal_down', 'zoom_in', 'zoom_out', 'arc_left', 'arc_right', 'crane_up', 'crane_down'])
  ).min(1),
  defaultShotSize: z.enum(['extreme_close_up', 'close_up', 'medium_close_up', 'medium_shot', 'medium_full_shot', 'full_shot', 'long_shot', 'extreme_long_shot']),
  safeMargins: z.object({
    top: z.number().min(0).max(1),
    bottom: z.number().min(0).max(1),
    left: z.number().min(0).max(1),
    right: z.number().min(0).max(1)
  }),
  forbiddenMoves: z.array(z.string()).default([]).describe('Human-readable list of moves that are out of style.'),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime()
  })
}).strict();

export type CameraRules = z.infer<typeof cameraRulesSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Motion grammar — allowed gestures, emotions, pose library refs, timing
// ─────────────────────────────────────────────────────────────────────────────

export const motionGrammarRuleSchema = z.object({
  ruleId: z.string().min(1),
  description: z.string().min(1),
  allowedGestures: z.array(z.string()).default([]),
  forbiddenGestures: z.array(z.string()).default([]),
  allowedEmotions: z.array(z.string()).default([]),
  poseLibraryRefs: z.array(z.string()).default([]).describe('References to approved pose entries.'),
  timing: z.object({
    minHoldFrames: z.number().int().positive().default(2),
    maxHoldFrames: z.number().int().positive().default(48),
    anticipationFrames: z.number().int().min(0).default(4),
    followThroughFrames: z.number().int().min(0).default(6)
  }).default({})
}).strict();

export const motionGrammarSchema = z.object({
  schemaVersion: z.literal('1.0'),
  grammarId: z.string().min(1),
  rules: z.array(motionGrammarRuleSchema).min(1),
  defaultTiming: z.object({
    fps: z.number().int().positive().default(24),
    minBeatFrames: z.number().int().positive().default(2),
    maxBeatFrames: z.number().int().positive().default(96)
  }).default({}),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime()
  })
}).strict();

export type MotionGrammar = z.infer<typeof motionGrammarSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// QA thresholds — numeric gates for the Retake Engine
// ─────────────────────────────────────────────────────────────────────────────

export const qaThresholdsSchema = z.object({
  schemaVersion: z.literal('1.0'),
  thresholdsId: z.string().min(1),
  silhouetteQualityMin: z.number().min(0).max(1).default(0.7),
  lipsyncDriftMaxMs: z.number().int().positive().default(80),
  continuityMaxDeltaFrames: z.number().int().positive().default(2),
  lineThicknessTolerancePt: z.number().positive().default(0.5),
  paletteDeltaMax: z.number().min(0).max(1).default(0.02),
  poseLibraryMatchMin: z.number().min(0).max(1).default(0.85),
  autoFixableSeverityMax: z.enum(['low', 'medium']).default('medium'),
  requireHumanApprovalFor: z.array(z.string()).default(['key_pose', 'camera_move', 'dialogue_timing']),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime()
  })
}).strict();

export type QaThresholds = z.infer<typeof qaThresholdsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Show bible — top-level lock that references the other five documents
// ─────────────────────────────────────────────────────────────────────────────

export const showBibleSchema = z.object({
  schemaVersion: z.literal(SHOW_BIBLE_SCHEMA_VERSION),
  showId: z.string().min(1).describe('Stable show identifier, e.g. "polygon_show_v1".'),
  title: z.string().min(1),
  logLine: z.string().min(1),
  fps: z.number().int().positive().default(24),
  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }),
  visualStyle: z.string().min(1).describe('Short human-readable style description.'),
  lineRules: z.object({
    defaultThicknessPt: z.number().positive(),
    lineColourId: z.string().min(1).describe('palette colourId for outlines.'),
    fillColourId: z.string().min(1).describe('palette colourId for fills.')
  }),
  lighting: z.object({
    type: z.string().min(1).describe('e.g. "flat", "soft_top_left", "rim".'),
    shadowColourId: z.string().min(1)
  }),
  allowedDeformations: z.array(
    z.enum(['peg_transform', 'curve_deformer', 'envelope_deformer', 'bone_deformer', 'drawing_substitution', 'frame_by_frame_vector'])
  ).min(1),
  characterBibles: z.array(z.object({
    characterId: z.string().min(1),
    ref: z.string().min(1).describe('Path or URI to character_bible.json.')
  })).min(1),
  paletteManifestRef: z.string().min(1).describe('Path or URI to palette_manifest.json.'),
  cameraRulesRef: z.string().min(1).describe('Path or URI to camera_rules.json.'),
  motionGrammarRef: z.string().min(1).describe('Path or URI to motion_grammar.json.'),
  qaThresholdsRef: z.string().min(1).describe('Path or URI to qa_thresholds.json.'),
  forbiddenSources: z.array(z.string()).default([]).describe('Licences/styles that must NOT be used (e.g. "NC", "third_party_series").'),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime(),
    notes: z.string().optional()
  })
}).strict();

export type ShowBible = z.infer<typeof showBibleSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

export function assertShowBibleVersion(doc: unknown): { major: number; minor: number } {
  if (!doc || typeof (doc as any).schemaVersion !== 'string') {
    throw new Error('show_bible.json missing required "schemaVersion" field');
  }
  const [maj, min] = (doc as any).schemaVersion.split('.').map((n: string) => parseInt(n, 10));
  if (!Number.isFinite(maj) || maj !== 1) {
    throw new Error(`Unsupported show_bible schemaVersion major ${maj}. This server supports major 1.`);
  }
  return { major: maj, minor: Number.isFinite(min) ? min : 0 };
}