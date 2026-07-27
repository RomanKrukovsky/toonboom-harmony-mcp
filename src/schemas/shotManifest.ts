import { z } from 'zod';

/**
 * shotManifest.ts — the deterministic contract between the LLM director
 * and the HarmonyCommandPlan compiler.
 *
 * Pipeline (see ROADMAP):
 *   script  ->  ShotManifest  ->  PerformancePIR  ->  HarmonyCommandPlan
 *
 * The ShotManifest is produced by the LLM and MUST stay within the bounds of
 * the ShowBible family. Anything not declared in the ShowBible is a QA
 * rejection. The manifest is intentionally machine-checkable: every gesture,
 * emotion, and camera move references a stable ID from the ShowBible so the
 * compiler can refuse unknown moves instead of guessing.
 */

export const SHOT_MANIFEST_SCHEMA_VERSION = '1.0';

// ─────────────────────────────────────────────────────────────────────────────
// Beat — atomic dramatic unit inside one shot
// ─────────────────────────────────────────────────────────────────────────────

export const shotBeatSchema = z.object({
  beatId: z.string().min(1),
  startFrame: z.number().int().min(1),
  endFrame: z.number().int().min(1),
  characterId: z.string().min(1).describe('Must match a character_bible characterId.'),
  intent: z.string().min(1).describe('Active verb: "accuse", "reveal", "look_away", ...'),
  emotion: z.string().min(1).describe('Must be listed in motion_grammar.allowedEmotions.'),
  gestureId: z.string().optional().describe('References motion_grammar.poseLibraryRefs / gestureLibrary.'),
  poseLibraryRef: z.string().optional().describe('Approved pose entry from the library.'),
  audioCue: z.object({
    audioPath: z.string().optional(),
    transcript: z.string().optional(),
    language: z.string().optional(),
    startFrame: z.number().int().min(1).optional(),
    endFrame: z.number().int().min(1).optional()
  }).optional()
}).strict().refine(b => b.endFrame >= b.startFrame, {
  message: 'beat endFrame must be >= startFrame',
  path: ['endFrame']
});

// ─────────────────────────────────────────────────────────────────────────────
// Staging — where characters stand and which shot size frames them
// ─────────────────────────────────────────────────────────────────────────────

export const stagingPositionSchema = z.object({
  characterId: z.string().min(1),
  preset: z.enum(['left', 'center', 'right', 'close_up', 'background']).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  facing: z.number().optional().describe('Degrees, 0 = camera-facing.')
}).strict();

export const stagingSchema = z.object({
  positions: z.array(stagingPositionSchema).min(1),
  shotSize: z.enum(['extreme_close_up', 'close_up', 'medium_close_up', 'medium_shot', 'medium_full_shot', 'full_shot', 'long_shot', 'extreme_long_shot']),
  cameraMove: z.enum(['static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'dolly_in', 'dolly_out', 'truck_left', 'truck_right', 'pedestal_up', 'pedestal_down', 'zoom_in', 'zoom_out', 'arc_left', 'arc_right', 'crane_up', 'crane_down']),
  cameraStartFrame: z.number().int().min(1).optional(),
  cameraEndFrame: z.number().int().min(1).optional(),
  backgroundRef: z.string().min(1).describe('Approved background asset path.')
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Timing — frame budget and rhythm constraints for the shot
// ─────────────────────────────────────────────────────────────────────────────

export const shotTimingSchema = z.object({
  totalFrames: z.number().int().positive(),
  fps: z.number().int().positive().default(24),
  minBeatFrames: z.number().int().positive().default(2),
  maxBeatFrames: z.number().int().positive().default(96),
  anticipationFrames: z.number().int().min(0).default(4),
  followThroughFrames: z.number().int().min(0).default(6),
  pauseBeforeBeats: z.record(z.string(), z.number().int().min(0)).default({}).describe('beatId -> pause frames before beat.')
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Shot manifest — the full compiler input
// ─────────────────────────────────────────────────────────────────────────────

export const shotManifestSchema = z.object({
  schemaVersion: z.literal(SHOT_MANIFEST_SCHEMA_VERSION),
  shotId: z.string().min(1),
  showBibleRef: z.string().min(1).describe('Path or URI to show_bible.json.'),
  production: z.string().min(1),
  episode: z.string().min(1),
  sceneName: z.string().min(1),
  description: z.string().min(1).describe('Human-readable shot description from the script.'),
  staging: stagingSchema,
  timing: shotTimingSchema,
  beats: z.array(shotBeatSchema).min(1),
  fx: z.array(z.object({
    type: z.string().min(1),
    target: z.string().min(1),
    startFrame: z.number().int().min(1),
    endFrame: z.number().int().min(1)
  })).default([]),
  render: z.object({
    preview: z.boolean().default(true),
    format: z.enum(['png', 'tiff', 'mp4', 'exr']).default('mp4'),
    quality: z.enum(['draft', 'standard', 'broadcast', 'cinematic']).default('standard')
  }).default({}),
  provenance: z.object({
    director: z.string().min(1).describe('LLM model or human director id.'),
    createdAt: z.string().datetime(),
    sourceScriptRef: z.string().min(1).describe('Path or URI to the originating script fragment.')
  })
}).strict();

export type ShotManifest = z.infer<typeof shotManifestSchema>;
export type ShotBeat = z.infer<typeof shotBeatSchema>;
export type Staging = z.infer<typeof stagingSchema>;
export type ShotTiming = z.infer<typeof shotTimingSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

export function assertShotManifestVersion(doc: unknown): { major: number; minor: number } {
  if (!doc || typeof (doc as any).schemaVersion !== 'string') {
    throw new Error('shot_manifest.json missing required "schemaVersion" field');
  }
  const [maj, min] = (doc as any).schemaVersion.split('.').map((n: string) => parseInt(n, 10));
  if (!Number.isFinite(maj) || maj !== 1) {
    throw new Error(`Unsupported shot_manifest schemaVersion major ${maj}. This server supports major 1.`);
  }
  return { major: maj, minor: Number.isFinite(min) ? min : 0 };
}

/**
 * Cross-reference a ShotManifest against a ShowBible family and reject any
 * move/emotion/gesture that is not declared. This is the deterministic gate
 * that keeps the LLM inside the frozen show.
 */
export interface ShowBibleCrossRefs {
  cameraRules?: { allowedShotSizes?: string[]; allowedCameraMoves?: string[] };
  motionGrammar?: { allowedEmotions?: string[]; allowedGestures?: string[] };
  characterIds?: string[];
}

export interface CrossReferenceViolation {
  kind: 'unknown_shot_size' | 'unknown_camera_move' | 'unknown_emotion' | 'unknown_character';
  ref: string;
  beatId?: string;
}

export function crossReferenceShotManifest(
  manifest: ShotManifest,
  refs: ShowBibleCrossRefs
): CrossReferenceViolation[] {
  const violations: CrossReferenceViolation[] = [];

  if (refs.cameraRules?.allowedShotSizes &&
      !refs.cameraRules.allowedShotSizes.includes(manifest.staging.shotSize)) {
    violations.push({ kind: 'unknown_shot_size', ref: manifest.staging.shotSize });
  }
  if (refs.cameraRules?.allowedCameraMoves &&
      !refs.cameraRules.allowedCameraMoves.includes(manifest.staging.cameraMove)) {
    violations.push({ kind: 'unknown_camera_move', ref: manifest.staging.cameraMove });
  }
  if (refs.characterIds) {
    for (const pos of manifest.staging.positions) {
      if (!refs.characterIds.includes(pos.characterId)) {
        violations.push({ kind: 'unknown_character', ref: pos.characterId });
      }
    }
    for (const beat of manifest.beats) {
      if (!refs.characterIds.includes(beat.characterId)) {
        violations.push({ kind: 'unknown_character', ref: beat.characterId, beatId: beat.beatId });
      }
    }
  }
  if (refs.motionGrammar?.allowedEmotions) {
    for (const beat of manifest.beats) {
      if (!refs.motionGrammar.allowedEmotions.includes(beat.emotion)) {
        violations.push({ kind: 'unknown_emotion', ref: beat.emotion, beatId: beat.beatId });
      }
    }
  }
  return violations;
}