import { z } from 'zod';

export const transformTrackSchema = z.object({
  nodeId: z.string(), // The stable node ID in the RigTemplate (e.g. NODE_LEFT_ARM_PEG)
  keys: z.array(z.object({
    frame: z.number().int().min(1),
    // All coordinates are expected to be normalized to the RigTemplate's coordinate space
    rotation: z.number().optional(), // in degrees
    x: z.number().optional(),
    y: z.number().optional(),
    scaleX: z.number().optional(),
    scaleY: z.number().optional(),
    interpolation: z.enum(['LINEAR', 'CONSTANT', 'BEZIER']).default('LINEAR')
  }))
});

/**
 * performancePirSchema — the motion PIR consumed by the retargeting resolver
 * and the HarmonyCommandPlan compiler.
 *
 * v1 fields (schema, performanceId, characterId, durationFrames, fps, tracks,
 * holds) are unchanged. The following OPTIONAL fields were added so the factory
 * compiler can carry ShotManifest staging/timing context through the pipeline
 * without a separate side-channel:
 *   - shotManifestRef: URI/path back to the originating shot_manifest.json
 *   - staging: per-shot staging snapshot (positions, shot size, camera move)
 *   - timing: frame budget + rhythm constraints (mirror of ShotManifest.timing)
 *   - beatFrameMap: beatId -> startFrame, so the compiler can place keys on beats
 *
 * Older consumers ignore these fields; the schema literal stays at v1.
 */
export const performancePirSchema = z.object({
  schema: z.literal('toon-boom-mcp/performance-pir-v1'),
  performanceId: z.string(),
  characterId: z.string(),
  durationFrames: z.number().int().positive(),
  fps: z.number().int().positive().default(24),
  tracks: z.array(transformTrackSchema),
  holds: z.array(z.object({
    startFrame: z.number().int().min(1),
    endFrame: z.number().int().min(1)
  })).optional().default([]),

  shotManifestRef: z.string().optional().describe('Path/URI to the originating shot_manifest.json.'),
  staging: z.object({
    shotSize: z.enum(['extreme_close_up', 'close_up', 'medium_close_up', 'medium_shot', 'medium_full_shot', 'full_shot', 'long_shot', 'extreme_long_shot']),
    cameraMove: z.enum(['static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'dolly_in', 'dolly_out', 'truck_left', 'truck_right', 'pedestal_up', 'pedestal_down', 'zoom_in', 'zoom_out', 'arc_left', 'arc_right', 'crane_up', 'crane_down']),
    backgroundRef: z.string().optional()
  }).optional(),
  timing: z.object({
    totalFrames: z.number().int().positive(),
    minBeatFrames: z.number().int().positive().default(2),
    maxBeatFrames: z.number().int().positive().default(96),
    anticipationFrames: z.number().int().min(0).default(4),
    followThroughFrames: z.number().int().min(0).default(6)
  }).optional(),
  beatFrameMap: z.array(z.object({
    beatId: z.string().min(1),
    startFrame: z.number().int().min(1),
    endFrame: z.number().int().min(1)
  })).optional().describe('Beat boundaries placed by the director; keys should align to these.')
});

export type PerformancePIR = z.infer<typeof performancePirSchema>;
export type TransformTrack = z.infer<typeof transformTrackSchema>;