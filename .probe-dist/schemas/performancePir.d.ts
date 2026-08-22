import { z } from 'zod';
export declare const transformTrackSchema: z.ZodObject<{
    nodeId: z.ZodString;
    keys: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        rotation: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
        scaleX: z.ZodOptional<z.ZodNumber>;
        scaleY: z.ZodOptional<z.ZodNumber>;
        interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        x?: number | undefined;
        y?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
    }, {
        frame: number;
        x?: number | undefined;
        y?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
        interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    keys: {
        frame: number;
        interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        x?: number | undefined;
        y?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
    }[];
    nodeId: string;
}, {
    keys: {
        frame: number;
        x?: number | undefined;
        y?: number | undefined;
        rotation?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
        interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
    }[];
    nodeId: string;
}>;
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
export declare const performancePirSchema: z.ZodObject<{
    schema: z.ZodLiteral<"toon-boom-mcp/performance-pir-v1">;
    performanceId: z.ZodString;
    characterId: z.ZodString;
    durationFrames: z.ZodNumber;
    fps: z.ZodDefault<z.ZodNumber>;
    tracks: z.ZodArray<z.ZodObject<{
        nodeId: z.ZodString;
        keys: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            rotation: z.ZodOptional<z.ZodNumber>;
            x: z.ZodOptional<z.ZodNumber>;
            y: z.ZodOptional<z.ZodNumber>;
            scaleX: z.ZodOptional<z.ZodNumber>;
            scaleY: z.ZodOptional<z.ZodNumber>;
            interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }, {
            frame: number;
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        keys: {
            frame: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }[];
        nodeId: string;
    }, {
        keys: {
            frame: number;
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }[];
        nodeId: string;
    }>, "many">;
    holds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        startFrame: number;
        endFrame: number;
    }, {
        startFrame: number;
        endFrame: number;
    }>, "many">>>;
    shotManifestRef: z.ZodOptional<z.ZodString>;
    staging: z.ZodOptional<z.ZodObject<{
        shotSize: z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>;
        cameraMove: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>;
        backgroundRef: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        backgroundRef?: string | undefined;
    }, {
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        backgroundRef?: string | undefined;
    }>>;
    timing: z.ZodOptional<z.ZodObject<{
        totalFrames: z.ZodNumber;
        minBeatFrames: z.ZodDefault<z.ZodNumber>;
        maxBeatFrames: z.ZodDefault<z.ZodNumber>;
        anticipationFrames: z.ZodDefault<z.ZodNumber>;
        followThroughFrames: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        totalFrames: number;
        anticipationFrames: number;
        followThroughFrames: number;
        minBeatFrames: number;
        maxBeatFrames: number;
    }, {
        totalFrames: number;
        anticipationFrames?: number | undefined;
        followThroughFrames?: number | undefined;
        minBeatFrames?: number | undefined;
        maxBeatFrames?: number | undefined;
    }>>;
    beatFrameMap: z.ZodOptional<z.ZodArray<z.ZodObject<{
        beatId: z.ZodString;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        startFrame: number;
        endFrame: number;
        beatId: string;
    }, {
        startFrame: number;
        endFrame: number;
        beatId: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    characterId: string;
    durationFrames: number;
    tracks: {
        keys: {
            frame: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
        }[];
        nodeId: string;
    }[];
    schema: "toon-boom-mcp/performance-pir-v1";
    performanceId: string;
    holds: {
        startFrame: number;
        endFrame: number;
    }[];
    timing?: {
        totalFrames: number;
        anticipationFrames: number;
        followThroughFrames: number;
        minBeatFrames: number;
        maxBeatFrames: number;
    } | undefined;
    staging?: {
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        backgroundRef?: string | undefined;
    } | undefined;
    shotManifestRef?: string | undefined;
    beatFrameMap?: {
        startFrame: number;
        endFrame: number;
        beatId: string;
    }[] | undefined;
}, {
    characterId: string;
    durationFrames: number;
    tracks: {
        keys: {
            frame: number;
            x?: number | undefined;
            y?: number | undefined;
            rotation?: number | undefined;
            scaleX?: number | undefined;
            scaleY?: number | undefined;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }[];
        nodeId: string;
    }[];
    schema: "toon-boom-mcp/performance-pir-v1";
    performanceId: string;
    fps?: number | undefined;
    timing?: {
        totalFrames: number;
        anticipationFrames?: number | undefined;
        followThroughFrames?: number | undefined;
        minBeatFrames?: number | undefined;
        maxBeatFrames?: number | undefined;
    } | undefined;
    staging?: {
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        backgroundRef?: string | undefined;
    } | undefined;
    holds?: {
        startFrame: number;
        endFrame: number;
    }[] | undefined;
    shotManifestRef?: string | undefined;
    beatFrameMap?: {
        startFrame: number;
        endFrame: number;
        beatId: string;
    }[] | undefined;
}>;
export type PerformancePIR = z.infer<typeof performancePirSchema>;
export type TransformTrack = z.infer<typeof transformTrackSchema>;
