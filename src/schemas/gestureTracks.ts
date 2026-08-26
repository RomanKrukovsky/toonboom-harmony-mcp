import { z } from 'zod';

/**
 * gestureTracks.ts — the library that turns declared gestures into real
 * transform values.
 *
 * ShotManifestCompiler deliberately emits keys with frames but NO values
 * ("WHERE keys live, not WHAT they do"). This schema defines the missing
 * WHAT: per-gesture, per-controller key curves that MotionValueResolver
 * resamples onto beat boundaries. Precedents: showBible.ts
 * gestureLibraryEntrySchema (controllerTrackRef pointer — deliberately not
 * used because it dangles) and digitalActor.ts gestureLibraryEntrySchema
 * (concrete per-frame keys — the value shape reused here).
 *
 * Honesty contract: until a commissioned rig defines real controller ranges,
 * every entry must carry provenance 'placeholder_curve' and consumers must
 * surface that in warnings/evidence.
 */

export const GESTURE_TRACKS_SCHEMA_VERSION = '1.0';

export const gestureKeySchema = z.object({
  offsetFrame: z.number().int().min(0),
  rotation: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
  interpolation: z.enum(['LINEAR', 'CONSTANT', 'BEZIER']).default('LINEAR')
});

export const gestureTrackEntrySchema = z.object({
  controllerId: z.string().min(1),
  keys: z.array(gestureKeySchema).min(2)
});

export const gestureTrackSetSchema = z.object({
  gestureId: z.string().min(1),
  description: z.string().min(1),
  durationFrames: z.number().int().positive(),
  provenance: z.enum(['placeholder_curve', 'commissioned_rig', 'motion_capture']),
  tracks: z.array(gestureTrackEntrySchema).min(1)
});

export const gestureTrackLibrarySchema = z.object({
  schemaVersion: z.literal(GESTURE_TRACKS_SCHEMA_VERSION),
  characterId: z.string().min(1),
  gestures: z.array(gestureTrackSetSchema).min(1)
});

export type GestureKey = z.infer<typeof gestureKeySchema>;
export type GestureTrackEntry = z.infer<typeof gestureTrackEntrySchema>;
export type GestureTrackSet = z.infer<typeof gestureTrackSetSchema>;
export type GestureTrackLibrary = z.infer<typeof gestureTrackLibrarySchema>;
