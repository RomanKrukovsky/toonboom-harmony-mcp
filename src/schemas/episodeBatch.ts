import { z } from 'zod';
import {
  SHOT_MANIFEST_SCHEMA_VERSION,
  shotBeatSchema,
  stagingSchema,
  shotTimingSchema
} from './shotManifest.js';

/**
 * episodeBatch.ts — the contract for compiling a whole episode in one
 * deterministic pass through the ShowBible-gated pipeline:
 *
 *   EpisodeBatch -> ShotManifest[] -> PerformancePIR[] -> CommandPlan V4[]
 *
 * An episode batch is NOT creative freedom: every shot still references only
 * stable IDs declared in the ShowBible family. The batch exists so the
 * factory can grind N shots per run instead of one, which is what makes
 * episode-scale throughput possible at all.
 */

export const EPISODE_BATCH_SCHEMA_VERSION = '1.0';

export const episodeShotSpecSchema = z
  .object({
    shotId: z.string().min(1),
    sceneName: z.string().min(1),
    description: z.string().min(1),
    staging: stagingSchema,
    timing: shotTimingSchema,
    beats: z.array(shotBeatSchema).min(1),
    fx: z
      .array(
        z.object({
          type: z.string().min(1),
          target: z.string().min(1),
          startFrame: z.number().int().min(1),
          endFrame: z.number().int().min(1)
        })
      )
      .default([]),
    render: z
      .object({
        preview: z.boolean().default(true),
        format: z.enum(['png', 'tiff', 'mp4', 'exr']).default('mp4'),
        quality: z.enum(['draft', 'standard', 'broadcast', 'cinematic']).default('standard')
      })
      .default({}),
    sourceScriptRef: z.string().min(1).describe('Path or URI to the originating script fragment.')
  })
  .strict();

export const episodeBatchSchema = z
  .object({
    schemaVersion: z.literal(EPISODE_BATCH_SCHEMA_VERSION),
    episodeId: z.string().min(1),
    production: z.string().min(1),
    showBibleRef: z.string().min(1).describe('Portable repo-relative path to show_bible.json.'),
    director: z.string().min(1).describe('LLM model or human director id.'),
    createdAt: z.string().datetime(),
    shots: z.array(episodeShotSpecSchema).min(1)
  })
  .strict()
  .refine(batch => new Set(batch.shots.map(s => s.shotId)).size === batch.shots.length, {
    message: 'shotId must be unique within an episode batch'
  });

export type EpisodeShotSpec = z.infer<typeof episodeShotSpecSchema>;
export type EpisodeBatch = z.infer<typeof episodeBatchSchema>;

/** Re-exported so downstream consumers need only this module. */
export const EPISODE_BATCH_SHOT_MANIFEST_VERSION = SHOT_MANIFEST_SCHEMA_VERSION;
