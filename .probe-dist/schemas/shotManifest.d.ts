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
export declare const SHOT_MANIFEST_SCHEMA_VERSION = "1.0";
export declare const shotBeatSchema: z.ZodEffects<z.ZodObject<{
    beatId: z.ZodString;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    characterId: z.ZodString;
    intent: z.ZodString;
    emotion: z.ZodString;
    gestureId: z.ZodOptional<z.ZodString>;
    poseLibraryRef: z.ZodOptional<z.ZodString>;
    audioCue: z.ZodOptional<z.ZodObject<{
        audioPath: z.ZodOptional<z.ZodString>;
        transcript: z.ZodOptional<z.ZodString>;
        language: z.ZodOptional<z.ZodString>;
        startFrame: z.ZodOptional<z.ZodNumber>;
        endFrame: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        language?: string | undefined;
        audioPath?: string | undefined;
        transcript?: string | undefined;
    }, {
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        language?: string | undefined;
        audioPath?: string | undefined;
        transcript?: string | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    characterId: string;
    emotion: string;
    beatId: string;
    intent: string;
    gestureId?: string | undefined;
    poseLibraryRef?: string | undefined;
    audioCue?: {
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        language?: string | undefined;
        audioPath?: string | undefined;
        transcript?: string | undefined;
    } | undefined;
}, {
    startFrame: number;
    endFrame: number;
    characterId: string;
    emotion: string;
    beatId: string;
    intent: string;
    gestureId?: string | undefined;
    poseLibraryRef?: string | undefined;
    audioCue?: {
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        language?: string | undefined;
        audioPath?: string | undefined;
        transcript?: string | undefined;
    } | undefined;
}>, {
    startFrame: number;
    endFrame: number;
    characterId: string;
    emotion: string;
    beatId: string;
    intent: string;
    gestureId?: string | undefined;
    poseLibraryRef?: string | undefined;
    audioCue?: {
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        language?: string | undefined;
        audioPath?: string | undefined;
        transcript?: string | undefined;
    } | undefined;
}, {
    startFrame: number;
    endFrame: number;
    characterId: string;
    emotion: string;
    beatId: string;
    intent: string;
    gestureId?: string | undefined;
    poseLibraryRef?: string | undefined;
    audioCue?: {
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        language?: string | undefined;
        audioPath?: string | undefined;
        transcript?: string | undefined;
    } | undefined;
}>;
export declare const stagingPositionSchema: z.ZodObject<{
    characterId: z.ZodString;
    preset: z.ZodOptional<z.ZodEnum<["left", "center", "right", "close_up", "background"]>>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    facing: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    characterId: string;
    x?: number | undefined;
    y?: number | undefined;
    preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
    facing?: number | undefined;
}, {
    characterId: string;
    x?: number | undefined;
    y?: number | undefined;
    preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
    facing?: number | undefined;
}>;
export declare const stagingSchema: z.ZodObject<{
    positions: z.ZodArray<z.ZodObject<{
        characterId: z.ZodString;
        preset: z.ZodOptional<z.ZodEnum<["left", "center", "right", "close_up", "background"]>>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
        facing: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        characterId: string;
        x?: number | undefined;
        y?: number | undefined;
        preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
        facing?: number | undefined;
    }, {
        characterId: string;
        x?: number | undefined;
        y?: number | undefined;
        preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
        facing?: number | undefined;
    }>, "many">;
    shotSize: z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>;
    cameraMove: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>;
    cameraStartFrame: z.ZodOptional<z.ZodNumber>;
    cameraEndFrame: z.ZodOptional<z.ZodNumber>;
    backgroundRef: z.ZodString;
}, "strict", z.ZodTypeAny, {
    cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
    shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
    positions: {
        characterId: string;
        x?: number | undefined;
        y?: number | undefined;
        preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
        facing?: number | undefined;
    }[];
    backgroundRef: string;
    cameraStartFrame?: number | undefined;
    cameraEndFrame?: number | undefined;
}, {
    cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
    shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
    positions: {
        characterId: string;
        x?: number | undefined;
        y?: number | undefined;
        preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
        facing?: number | undefined;
    }[];
    backgroundRef: string;
    cameraStartFrame?: number | undefined;
    cameraEndFrame?: number | undefined;
}>;
export declare const shotTimingSchema: z.ZodObject<{
    totalFrames: z.ZodNumber;
    fps: z.ZodDefault<z.ZodNumber>;
    minBeatFrames: z.ZodDefault<z.ZodNumber>;
    maxBeatFrames: z.ZodDefault<z.ZodNumber>;
    anticipationFrames: z.ZodDefault<z.ZodNumber>;
    followThroughFrames: z.ZodDefault<z.ZodNumber>;
    pauseBeforeBeats: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strict", z.ZodTypeAny, {
    fps: number;
    totalFrames: number;
    anticipationFrames: number;
    followThroughFrames: number;
    minBeatFrames: number;
    maxBeatFrames: number;
    pauseBeforeBeats: Record<string, number>;
}, {
    totalFrames: number;
    fps?: number | undefined;
    anticipationFrames?: number | undefined;
    followThroughFrames?: number | undefined;
    minBeatFrames?: number | undefined;
    maxBeatFrames?: number | undefined;
    pauseBeforeBeats?: Record<string, number> | undefined;
}>;
export declare const shotManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    shotId: z.ZodString;
    showBibleRef: z.ZodString;
    production: z.ZodString;
    episode: z.ZodString;
    sceneName: z.ZodString;
    description: z.ZodString;
    staging: z.ZodObject<{
        positions: z.ZodArray<z.ZodObject<{
            characterId: z.ZodString;
            preset: z.ZodOptional<z.ZodEnum<["left", "center", "right", "close_up", "background"]>>;
            x: z.ZodOptional<z.ZodNumber>;
            y: z.ZodOptional<z.ZodNumber>;
            facing: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            characterId: string;
            x?: number | undefined;
            y?: number | undefined;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            facing?: number | undefined;
        }, {
            characterId: string;
            x?: number | undefined;
            y?: number | undefined;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            facing?: number | undefined;
        }>, "many">;
        shotSize: z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>;
        cameraMove: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>;
        cameraStartFrame: z.ZodOptional<z.ZodNumber>;
        cameraEndFrame: z.ZodOptional<z.ZodNumber>;
        backgroundRef: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        positions: {
            characterId: string;
            x?: number | undefined;
            y?: number | undefined;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            facing?: number | undefined;
        }[];
        backgroundRef: string;
        cameraStartFrame?: number | undefined;
        cameraEndFrame?: number | undefined;
    }, {
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        positions: {
            characterId: string;
            x?: number | undefined;
            y?: number | undefined;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            facing?: number | undefined;
        }[];
        backgroundRef: string;
        cameraStartFrame?: number | undefined;
        cameraEndFrame?: number | undefined;
    }>;
    timing: z.ZodObject<{
        totalFrames: z.ZodNumber;
        fps: z.ZodDefault<z.ZodNumber>;
        minBeatFrames: z.ZodDefault<z.ZodNumber>;
        maxBeatFrames: z.ZodDefault<z.ZodNumber>;
        anticipationFrames: z.ZodDefault<z.ZodNumber>;
        followThroughFrames: z.ZodDefault<z.ZodNumber>;
        pauseBeforeBeats: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strict", z.ZodTypeAny, {
        fps: number;
        totalFrames: number;
        anticipationFrames: number;
        followThroughFrames: number;
        minBeatFrames: number;
        maxBeatFrames: number;
        pauseBeforeBeats: Record<string, number>;
    }, {
        totalFrames: number;
        fps?: number | undefined;
        anticipationFrames?: number | undefined;
        followThroughFrames?: number | undefined;
        minBeatFrames?: number | undefined;
        maxBeatFrames?: number | undefined;
        pauseBeforeBeats?: Record<string, number> | undefined;
    }>;
    beats: z.ZodArray<z.ZodEffects<z.ZodObject<{
        beatId: z.ZodString;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        characterId: z.ZodString;
        intent: z.ZodString;
        emotion: z.ZodString;
        gestureId: z.ZodOptional<z.ZodString>;
        poseLibraryRef: z.ZodOptional<z.ZodString>;
        audioCue: z.ZodOptional<z.ZodObject<{
            audioPath: z.ZodOptional<z.ZodString>;
            transcript: z.ZodOptional<z.ZodString>;
            language: z.ZodOptional<z.ZodString>;
            startFrame: z.ZodOptional<z.ZodNumber>;
            endFrame: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            language?: string | undefined;
            audioPath?: string | undefined;
            transcript?: string | undefined;
        }, {
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            language?: string | undefined;
            audioPath?: string | undefined;
            transcript?: string | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        startFrame: number;
        endFrame: number;
        characterId: string;
        emotion: string;
        beatId: string;
        intent: string;
        gestureId?: string | undefined;
        poseLibraryRef?: string | undefined;
        audioCue?: {
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            language?: string | undefined;
            audioPath?: string | undefined;
            transcript?: string | undefined;
        } | undefined;
    }, {
        startFrame: number;
        endFrame: number;
        characterId: string;
        emotion: string;
        beatId: string;
        intent: string;
        gestureId?: string | undefined;
        poseLibraryRef?: string | undefined;
        audioCue?: {
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            language?: string | undefined;
            audioPath?: string | undefined;
            transcript?: string | undefined;
        } | undefined;
    }>, {
        startFrame: number;
        endFrame: number;
        characterId: string;
        emotion: string;
        beatId: string;
        intent: string;
        gestureId?: string | undefined;
        poseLibraryRef?: string | undefined;
        audioCue?: {
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            language?: string | undefined;
            audioPath?: string | undefined;
            transcript?: string | undefined;
        } | undefined;
    }, {
        startFrame: number;
        endFrame: number;
        characterId: string;
        emotion: string;
        beatId: string;
        intent: string;
        gestureId?: string | undefined;
        poseLibraryRef?: string | undefined;
        audioCue?: {
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            language?: string | undefined;
            audioPath?: string | undefined;
            transcript?: string | undefined;
        } | undefined;
    }>, "many">;
    fx: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        target: z.ZodString;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: string;
        startFrame: number;
        endFrame: number;
        target: string;
    }, {
        type: string;
        startFrame: number;
        endFrame: number;
        target: string;
    }>, "many">>;
    render: z.ZodDefault<z.ZodObject<{
        preview: z.ZodDefault<z.ZodBoolean>;
        format: z.ZodDefault<z.ZodEnum<["png", "tiff", "mp4", "exr"]>>;
        quality: z.ZodDefault<z.ZodEnum<["draft", "standard", "broadcast", "cinematic"]>>;
    }, "strip", z.ZodTypeAny, {
        preview: boolean;
        format: "mp4" | "png" | "tiff" | "exr";
        quality: "draft" | "standard" | "cinematic" | "broadcast";
    }, {
        preview?: boolean | undefined;
        format?: "mp4" | "png" | "tiff" | "exr" | undefined;
        quality?: "draft" | "standard" | "cinematic" | "broadcast" | undefined;
    }>>;
    provenance: z.ZodObject<{
        director: z.ZodString;
        createdAt: z.ZodString;
        sourceScriptRef: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        director: string;
        sourceScriptRef: string;
    }, {
        createdAt: string;
        director: string;
        sourceScriptRef: string;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        createdAt: string;
        director: string;
        sourceScriptRef: string;
    };
    schemaVersion: "1.0";
    sceneName: string;
    description: string;
    production: string;
    episode: string;
    render: {
        preview: boolean;
        format: "mp4" | "png" | "tiff" | "exr";
        quality: "draft" | "standard" | "cinematic" | "broadcast";
    };
    timing: {
        fps: number;
        totalFrames: number;
        anticipationFrames: number;
        followThroughFrames: number;
        minBeatFrames: number;
        maxBeatFrames: number;
        pauseBeforeBeats: Record<string, number>;
    };
    shotId: string;
    fx: {
        type: string;
        startFrame: number;
        endFrame: number;
        target: string;
    }[];
    beats: {
        startFrame: number;
        endFrame: number;
        characterId: string;
        emotion: string;
        beatId: string;
        intent: string;
        gestureId?: string | undefined;
        poseLibraryRef?: string | undefined;
        audioCue?: {
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            language?: string | undefined;
            audioPath?: string | undefined;
            transcript?: string | undefined;
        } | undefined;
    }[];
    staging: {
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        positions: {
            characterId: string;
            x?: number | undefined;
            y?: number | undefined;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            facing?: number | undefined;
        }[];
        backgroundRef: string;
        cameraStartFrame?: number | undefined;
        cameraEndFrame?: number | undefined;
    };
    showBibleRef: string;
}, {
    provenance: {
        createdAt: string;
        director: string;
        sourceScriptRef: string;
    };
    schemaVersion: "1.0";
    sceneName: string;
    description: string;
    production: string;
    episode: string;
    timing: {
        totalFrames: number;
        fps?: number | undefined;
        anticipationFrames?: number | undefined;
        followThroughFrames?: number | undefined;
        minBeatFrames?: number | undefined;
        maxBeatFrames?: number | undefined;
        pauseBeforeBeats?: Record<string, number> | undefined;
    };
    shotId: string;
    beats: {
        startFrame: number;
        endFrame: number;
        characterId: string;
        emotion: string;
        beatId: string;
        intent: string;
        gestureId?: string | undefined;
        poseLibraryRef?: string | undefined;
        audioCue?: {
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            language?: string | undefined;
            audioPath?: string | undefined;
            transcript?: string | undefined;
        } | undefined;
    }[];
    staging: {
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
        positions: {
            characterId: string;
            x?: number | undefined;
            y?: number | undefined;
            preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            facing?: number | undefined;
        }[];
        backgroundRef: string;
        cameraStartFrame?: number | undefined;
        cameraEndFrame?: number | undefined;
    };
    showBibleRef: string;
    render?: {
        preview?: boolean | undefined;
        format?: "mp4" | "png" | "tiff" | "exr" | undefined;
        quality?: "draft" | "standard" | "cinematic" | "broadcast" | undefined;
    } | undefined;
    fx?: {
        type: string;
        startFrame: number;
        endFrame: number;
        target: string;
    }[] | undefined;
}>;
export type ShotManifest = z.infer<typeof shotManifestSchema>;
export type ShotBeat = z.infer<typeof shotBeatSchema>;
export type Staging = z.infer<typeof stagingSchema>;
export type ShotTiming = z.infer<typeof shotTimingSchema>;
export declare function assertShotManifestVersion(doc: unknown): {
    major: number;
    minor: number;
};
/**
 * Cross-reference a ShotManifest against a ShowBible family and reject any
 * move/emotion/gesture that is not declared. This is the deterministic gate
 * that keeps the LLM inside the frozen show.
 */
export interface ShowBibleCrossRefs {
    cameraRules?: {
        allowedShotSizes?: string[];
        allowedCameraMoves?: string[];
    };
    motionGrammar?: {
        allowedEmotions?: string[];
        allowedGestures?: string[];
    };
    characterIds?: string[];
}
export interface CrossReferenceViolation {
    kind: 'unknown_shot_size' | 'unknown_camera_move' | 'unknown_emotion' | 'unknown_character';
    ref: string;
    beatId?: string;
}
export declare function crossReferenceShotManifest(manifest: ShotManifest, refs: ShowBibleCrossRefs): CrossReferenceViolation[];
