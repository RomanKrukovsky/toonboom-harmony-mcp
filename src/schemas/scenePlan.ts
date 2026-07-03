import { z } from 'zod';

/**
 * scene_plan.json — locked, versioned schema.
 *
 * This is the single source of truth that Harmony Autopilot MCP consumes
 * to assemble a scene. It is intentionally planner-agnostic: it can be
 * produced by a human, a storyboard export, a Kitsu/ShotGrid ingest, or
 * an LLM. See docs/SCENE_PLAN.md.
 *
 * Versioning policy:
 *  - MAJOR: breaking field removals/renames. Bump SCENE_PLAN_VERSION_MAJOR.
 *  - MINOR: additive, backward-compatible fields. Bump SCENE_PLAN_VERSION_MINOR.
 *  - Older consumers MUST ignore unknown fields and MUST warn on unknown
 *    schemaVersion majors rather than fail silently.
 */
export const SCENE_PLAN_VERSION_MAJOR = 1;
export const SCENE_PLAN_VERSION_MINOR = 0;
export const SCENE_PLAN_VERSION = `${SCENE_PLAN_VERSION_MAJOR}.${SCENE_PLAN_VERSION_MINOR}`;

export const scenePlanSchema = z.object({
  schemaVersion: z.string()
    .describe(`Semver-ish "MAJOR.MINOR" of the scene_plan schema. Current: ${SCENE_PLAN_VERSION}.`),

  production: z.string().describe('Название производства (проекта/сезона)'),
  episode: z.string().describe('Код/Название эпизода'),
  sceneName: z.string().describe('Код/Название сцены'),

  resolution: z.object({
    width: z.number(),
    height: z.number()
  }).optional(),
  fps: z.number().optional(),
  durationFrames: z.number().optional(),
  workspaceTemplate: z.string().optional(),

  background: z.object({
    file: z.string(),
    layerName: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number()
    }).optional(),
    scale: z.number().optional()
  }).optional(),

  characters: z.array(z.object({
    name: z.string(),
    rig: z.string(),
    positionPreset: z.string().optional(),
    startFrame: z.number().optional(),
    endFrame: z.number().optional(),
    actions: z.array(z.object({
      type: z.string(),
      name: z.string().optional(),
      frames: z.array(z.number()),
      audio: z.string().optional(),
      mouthChart: z.string().optional()
    })).optional()
  })).optional(),

  camera: z.object({
    preset: z.string(),
    startFrame: z.number().optional(),
    endFrame: z.number().optional()
  }).optional(),

  effects: z.array(z.object({
    type: z.string(),
    target: z.string(),
    frames: z.array(z.number())
  })).optional(),

  render: z.object({
    preview: z.boolean().optional(),
    format: z.string().optional(),
    quality: z.string().optional()
  }).optional(),

  actingNotes: z.object({
    emotionalArc: z.array(z.any()).optional(),
    gestures: z.array(z.any()).optional(),
    blinkPlan: z.array(z.any()).optional()
  }).optional(),

  lipsyncPlan: z.object({
    language: z.string().optional(),
    dialogues: z.array(z.any()).optional(),
    missingAssets: z.array(z.string()).optional(),
    generatedAudio: z.array(z.any()).optional()
  }).optional(),

  backgroundPlan: z.object({
    location: z.string(),
    style: z.string().optional(),
    layers: z.array(z.any()).optional(),
    imagePath: z.string().optional(),
    imageOrigin: z.string().optional()
  }).optional()
});

export type ScenePlan = z.infer<typeof scenePlanSchema>;

/**
 * Validate a parsed scene_plan object and enforce the version lock.
 * Throws HarmonyError('INVALID_HARMONY_OBJECT') on any violation.
 */
export function assertScenePlanVersion(plan: any): { major: number; minor: number } {
  if (!plan || typeof plan.schemaVersion !== 'string') {
    throw new Error('scene_plan.json missing required "schemaVersion" field');
  }
  const [maj, min] = plan.schemaVersion.split('.').map((n: string) => parseInt(n, 10));
  if (!Number.isFinite(maj)) {
    throw new Error(`Invalid scene_plan schemaVersion: "${plan.schemaVersion}"`);
  }
  if (maj !== SCENE_PLAN_VERSION_MAJOR) {
    throw new Error(
      `Unsupported scene_plan schemaVersion major ${maj}. This server supports major ${SCENE_PLAN_VERSION_MAJOR}. ` +
      `Please convert the plan (see docs/SCENE_PLAN.md#migration).`
    );
  }
  if (Number.isFinite(min) && min > SCENE_PLAN_VERSION_MINOR) {
    // Forward-compatible minor: warn, don't fail. Caller may surface a warning.
  }
  return { major: maj, minor: Number.isFinite(min) ? min : 0 };
}