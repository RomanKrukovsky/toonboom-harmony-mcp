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
export declare const SCENE_PLAN_VERSION_MAJOR = 1;
export declare const SCENE_PLAN_VERSION_MINOR = 0;
export declare const SCENE_PLAN_VERSION = "1.0";
export declare const scenePlanSchema: z.ZodObject<{
    schemaVersion: z.ZodString;
    production: z.ZodString;
    episode: z.ZodString;
    sceneName: z.ZodString;
    resolution: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
    fps: z.ZodOptional<z.ZodNumber>;
    durationFrames: z.ZodOptional<z.ZodNumber>;
    workspaceTemplate: z.ZodOptional<z.ZodString>;
    background: z.ZodOptional<z.ZodObject<{
        file: z.ZodString;
        layerName: z.ZodString;
        position: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
        }, {
            x: number;
            y: number;
            z: number;
        }>>;
        scale: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        layerName: string;
        file: string;
        position?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
        scale?: number | undefined;
    }, {
        layerName: string;
        file: string;
        position?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
        scale?: number | undefined;
    }>>;
    characters: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        rig: z.ZodString;
        positionPreset: z.ZodOptional<z.ZodString>;
        startFrame: z.ZodOptional<z.ZodNumber>;
        endFrame: z.ZodOptional<z.ZodNumber>;
        actions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            frames: z.ZodArray<z.ZodNumber, "many">;
            audio: z.ZodOptional<z.ZodString>;
            mouthChart: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            frames: number[];
            audio?: string | undefined;
            name?: string | undefined;
            mouthChart?: string | undefined;
        }, {
            type: string;
            frames: number[];
            audio?: string | undefined;
            name?: string | undefined;
            mouthChart?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        rig: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        positionPreset?: string | undefined;
        actions?: {
            type: string;
            frames: number[];
            audio?: string | undefined;
            name?: string | undefined;
            mouthChart?: string | undefined;
        }[] | undefined;
    }, {
        name: string;
        rig: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        positionPreset?: string | undefined;
        actions?: {
            type: string;
            frames: number[];
            audio?: string | undefined;
            name?: string | undefined;
            mouthChart?: string | undefined;
        }[] | undefined;
    }>, "many">>;
    camera: z.ZodOptional<z.ZodObject<{
        preset: z.ZodString;
        startFrame: z.ZodOptional<z.ZodNumber>;
        endFrame: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        preset: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
    }, {
        preset: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
    }>>;
    effects: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        target: z.ZodString;
        frames: z.ZodArray<z.ZodNumber, "many">;
    }, "strip", z.ZodTypeAny, {
        type: string;
        frames: number[];
        target: string;
    }, {
        type: string;
        frames: number[];
        target: string;
    }>, "many">>;
    render: z.ZodOptional<z.ZodObject<{
        preview: z.ZodOptional<z.ZodBoolean>;
        format: z.ZodOptional<z.ZodString>;
        quality: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        preview?: boolean | undefined;
        format?: string | undefined;
        quality?: string | undefined;
    }, {
        preview?: boolean | undefined;
        format?: string | undefined;
        quality?: string | undefined;
    }>>;
    actingNotes: z.ZodOptional<z.ZodObject<{
        emotionalArc: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        gestures: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        blinkPlan: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        emotionalArc?: any[] | undefined;
        gestures?: any[] | undefined;
        blinkPlan?: any[] | undefined;
    }, {
        emotionalArc?: any[] | undefined;
        gestures?: any[] | undefined;
        blinkPlan?: any[] | undefined;
    }>>;
    lipsyncPlan: z.ZodOptional<z.ZodObject<{
        language: z.ZodOptional<z.ZodString>;
        dialogues: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        missingAssets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        generatedAudio: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        dialogues?: any[] | undefined;
        language?: string | undefined;
        missingAssets?: string[] | undefined;
        generatedAudio?: any[] | undefined;
    }, {
        dialogues?: any[] | undefined;
        language?: string | undefined;
        missingAssets?: string[] | undefined;
        generatedAudio?: any[] | undefined;
    }>>;
    backgroundPlan: z.ZodOptional<z.ZodObject<{
        location: z.ZodString;
        style: z.ZodOptional<z.ZodString>;
        layers: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        imagePath: z.ZodOptional<z.ZodString>;
        imageOrigin: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        location: string;
        imagePath?: string | undefined;
        layers?: any[] | undefined;
        style?: string | undefined;
        imageOrigin?: string | undefined;
    }, {
        location: string;
        imagePath?: string | undefined;
        layers?: any[] | undefined;
        style?: string | undefined;
        imageOrigin?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    schemaVersion: string;
    sceneName: string;
    production: string;
    episode: string;
    fps?: number | undefined;
    effects?: {
        type: string;
        frames: number[];
        target: string;
    }[] | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    render?: {
        preview?: boolean | undefined;
        format?: string | undefined;
        quality?: string | undefined;
    } | undefined;
    durationFrames?: number | undefined;
    workspaceTemplate?: string | undefined;
    background?: {
        layerName: string;
        file: string;
        position?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
        scale?: number | undefined;
    } | undefined;
    characters?: {
        name: string;
        rig: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        positionPreset?: string | undefined;
        actions?: {
            type: string;
            frames: number[];
            audio?: string | undefined;
            name?: string | undefined;
            mouthChart?: string | undefined;
        }[] | undefined;
    }[] | undefined;
    camera?: {
        preset: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
    } | undefined;
    actingNotes?: {
        emotionalArc?: any[] | undefined;
        gestures?: any[] | undefined;
        blinkPlan?: any[] | undefined;
    } | undefined;
    lipsyncPlan?: {
        dialogues?: any[] | undefined;
        language?: string | undefined;
        missingAssets?: string[] | undefined;
        generatedAudio?: any[] | undefined;
    } | undefined;
    backgroundPlan?: {
        location: string;
        imagePath?: string | undefined;
        layers?: any[] | undefined;
        style?: string | undefined;
        imageOrigin?: string | undefined;
    } | undefined;
}, {
    schemaVersion: string;
    sceneName: string;
    production: string;
    episode: string;
    fps?: number | undefined;
    effects?: {
        type: string;
        frames: number[];
        target: string;
    }[] | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    render?: {
        preview?: boolean | undefined;
        format?: string | undefined;
        quality?: string | undefined;
    } | undefined;
    durationFrames?: number | undefined;
    workspaceTemplate?: string | undefined;
    background?: {
        layerName: string;
        file: string;
        position?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
        scale?: number | undefined;
    } | undefined;
    characters?: {
        name: string;
        rig: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        positionPreset?: string | undefined;
        actions?: {
            type: string;
            frames: number[];
            audio?: string | undefined;
            name?: string | undefined;
            mouthChart?: string | undefined;
        }[] | undefined;
    }[] | undefined;
    camera?: {
        preset: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
    } | undefined;
    actingNotes?: {
        emotionalArc?: any[] | undefined;
        gestures?: any[] | undefined;
        blinkPlan?: any[] | undefined;
    } | undefined;
    lipsyncPlan?: {
        dialogues?: any[] | undefined;
        language?: string | undefined;
        missingAssets?: string[] | undefined;
        generatedAudio?: any[] | undefined;
    } | undefined;
    backgroundPlan?: {
        location: string;
        imagePath?: string | undefined;
        layers?: any[] | undefined;
        style?: string | undefined;
        imageOrigin?: string | undefined;
    } | undefined;
}>;
export type ScenePlan = z.infer<typeof scenePlanSchema>;
/**
 * Validate a parsed scene_plan object and enforce the version lock.
 * Throws HarmonyError('INVALID_HARMONY_OBJECT') on any violation.
 */
export declare function assertScenePlanVersion(plan: any): {
    major: number;
    minor: number;
};
