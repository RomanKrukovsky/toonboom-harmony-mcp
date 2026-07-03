import { z } from 'zod';
import { honestyOriginSchema } from './onePrompt.js';

/**
 * episodePlan.ts — the per-episode plan produced by EpisodePlanner.
 *
 * One EpisodePlan contains: scenes → shot list → asset requirements.
 * It is the bridge between SeriesPlanner and the per-scene Autopilot
 * pipeline (ACTOR §9).
 */

export const scenePlanRefSchema = z.object({
  sceneId: z.string(),
  sceneName: z.string(),
  durationFrames: z.number(),
  startFrame: z.number().optional(),
  endFrame: z.number().optional(),
  shotCount: z.number().default(0),
  characters: z.array(z.string()).default([]),
  location: z.string().optional(),
  mood: z.string().optional(),
  cameraNotes: z.string().optional(),
  fxNotes: z.string().optional()
});

export const shotSchema = z.object({
  shotId: z.string(),
  sceneId: z.string(),
  shotType: z.string(),
  framing: z.string().optional(),
  durationFrames: z.number().optional(),
  startFrame: z.number().optional(),
  endFrame: z.number().optional(),
  cameraMove: z.string().optional(),
  charactersInFrame: z.array(z.string()).default([]),
  dialogue: z.string().optional(),
  description: z.string().optional()
});

export const assetRequirementSchema = z.object({
  type: z.enum(['character','background','prop','fx','audio','rig','palette']),
  name: z.string(),
  status: z.enum(['missing','placeholder','provided','generated']).default('missing'),
  description: z.string().optional()
});

export const episodePlanSchema = z.object({
  episodeTitle: z.string(),
  episodeNumber: z.number().optional(),
  durationMinutes: z.number(),
  fps: z.number().default(24),
  resolution: z.object({ width: z.number(), height: z.number() }).default({ width: 1920, height: 1080 }),
  scriptLogLine: z.string().optional(),
  scenes: z.array(scenePlanRefSchema).default([]),
  shots: z.array(shotSchema).default([]),
  assetRequirements: z.array(assetRequirementSchema).default([]),
  recurringAssetsNeeded: z.array(z.string()).default([]),
  origin: honestyOriginSchema.default('planned'),
  readiness: z.enum([
    'planned',
    'assets_ready',
    'scenes_assembled',
    'preview_rendered',
    'reviewed',
    'final_package'
  ]).default('planned')
});

export type EpisodePlan = z.infer<typeof episodePlanSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type AssetRequirement = z.infer<typeof assetRequirementSchema>;
export type ScenePlanRef = z.infer<typeof scenePlanRefSchema>;