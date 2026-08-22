import { z } from 'zod';
/**
 * episodePlan.ts — the per-episode plan produced by EpisodePlanner.
 *
 * One EpisodePlan contains: scenes → shot list → asset requirements.
 * It is the bridge between SeriesPlanner and the per-scene Autopilot
 * pipeline (ACTOR §9).
 */
export declare const scenePlanRefSchema: z.ZodObject<{
    sceneId: z.ZodString;
    sceneName: z.ZodString;
    durationFrames: z.ZodNumber;
    startFrame: z.ZodOptional<z.ZodNumber>;
    endFrame: z.ZodOptional<z.ZodNumber>;
    shotCount: z.ZodDefault<z.ZodNumber>;
    characters: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    location: z.ZodOptional<z.ZodString>;
    mood: z.ZodOptional<z.ZodString>;
    cameraNotes: z.ZodOptional<z.ZodString>;
    fxNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sceneName: string;
    durationFrames: number;
    characters: string[];
    sceneId: string;
    shotCount: number;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    location?: string | undefined;
    mood?: string | undefined;
    cameraNotes?: string | undefined;
    fxNotes?: string | undefined;
}, {
    sceneName: string;
    durationFrames: number;
    sceneId: string;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    location?: string | undefined;
    characters?: string[] | undefined;
    mood?: string | undefined;
    shotCount?: number | undefined;
    cameraNotes?: string | undefined;
    fxNotes?: string | undefined;
}>;
export declare const shotSchema: z.ZodObject<{
    shotId: z.ZodString;
    sceneId: z.ZodString;
    shotType: z.ZodString;
    framing: z.ZodOptional<z.ZodString>;
    durationFrames: z.ZodOptional<z.ZodNumber>;
    startFrame: z.ZodOptional<z.ZodNumber>;
    endFrame: z.ZodOptional<z.ZodNumber>;
    cameraMove: z.ZodOptional<z.ZodString>;
    charactersInFrame: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    dialogue: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    shotId: string;
    sceneId: string;
    shotType: string;
    charactersInFrame: string[];
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    description?: string | undefined;
    durationFrames?: number | undefined;
    framing?: string | undefined;
    cameraMove?: string | undefined;
    dialogue?: string | undefined;
}, {
    shotId: string;
    sceneId: string;
    shotType: string;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    description?: string | undefined;
    durationFrames?: number | undefined;
    framing?: string | undefined;
    cameraMove?: string | undefined;
    charactersInFrame?: string[] | undefined;
    dialogue?: string | undefined;
}>;
export declare const assetRequirementSchema: z.ZodObject<{
    type: z.ZodEnum<["character", "background", "prop", "fx", "audio", "rig", "palette"]>;
    name: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["missing", "placeholder", "provided", "generated"]>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "placeholder" | "generated" | "missing" | "provided";
    type: "audio" | "palette" | "character" | "background" | "rig" | "fx" | "prop";
    name: string;
    description?: string | undefined;
}, {
    type: "audio" | "palette" | "character" | "background" | "rig" | "fx" | "prop";
    name: string;
    status?: "placeholder" | "generated" | "missing" | "provided" | undefined;
    description?: string | undefined;
}>;
export declare const episodePlanSchema: z.ZodObject<{
    episodeTitle: z.ZodString;
    episodeNumber: z.ZodOptional<z.ZodNumber>;
    durationMinutes: z.ZodNumber;
    fps: z.ZodDefault<z.ZodNumber>;
    resolution: z.ZodDefault<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
    scriptLogLine: z.ZodOptional<z.ZodString>;
    scenes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sceneId: z.ZodString;
        sceneName: z.ZodString;
        durationFrames: z.ZodNumber;
        startFrame: z.ZodOptional<z.ZodNumber>;
        endFrame: z.ZodOptional<z.ZodNumber>;
        shotCount: z.ZodDefault<z.ZodNumber>;
        characters: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        location: z.ZodOptional<z.ZodString>;
        mood: z.ZodOptional<z.ZodString>;
        cameraNotes: z.ZodOptional<z.ZodString>;
        fxNotes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sceneName: string;
        durationFrames: number;
        characters: string[];
        sceneId: string;
        shotCount: number;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        location?: string | undefined;
        mood?: string | undefined;
        cameraNotes?: string | undefined;
        fxNotes?: string | undefined;
    }, {
        sceneName: string;
        durationFrames: number;
        sceneId: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        location?: string | undefined;
        characters?: string[] | undefined;
        mood?: string | undefined;
        shotCount?: number | undefined;
        cameraNotes?: string | undefined;
        fxNotes?: string | undefined;
    }>, "many">>;
    shots: z.ZodDefault<z.ZodArray<z.ZodObject<{
        shotId: z.ZodString;
        sceneId: z.ZodString;
        shotType: z.ZodString;
        framing: z.ZodOptional<z.ZodString>;
        durationFrames: z.ZodOptional<z.ZodNumber>;
        startFrame: z.ZodOptional<z.ZodNumber>;
        endFrame: z.ZodOptional<z.ZodNumber>;
        cameraMove: z.ZodOptional<z.ZodString>;
        charactersInFrame: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        dialogue: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        shotId: string;
        sceneId: string;
        shotType: string;
        charactersInFrame: string[];
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        description?: string | undefined;
        durationFrames?: number | undefined;
        framing?: string | undefined;
        cameraMove?: string | undefined;
        dialogue?: string | undefined;
    }, {
        shotId: string;
        sceneId: string;
        shotType: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        description?: string | undefined;
        durationFrames?: number | undefined;
        framing?: string | undefined;
        cameraMove?: string | undefined;
        charactersInFrame?: string[] | undefined;
        dialogue?: string | undefined;
    }>, "many">>;
    assetRequirements: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["character", "background", "prop", "fx", "audio", "rig", "palette"]>;
        name: z.ZodString;
        status: z.ZodDefault<z.ZodEnum<["missing", "placeholder", "provided", "generated"]>>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "placeholder" | "generated" | "missing" | "provided";
        type: "audio" | "palette" | "character" | "background" | "rig" | "fx" | "prop";
        name: string;
        description?: string | undefined;
    }, {
        type: "audio" | "palette" | "character" | "background" | "rig" | "fx" | "prop";
        name: string;
        status?: "placeholder" | "generated" | "missing" | "provided" | undefined;
        description?: string | undefined;
    }>, "many">>;
    recurringAssetsNeeded: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    origin: z.ZodDefault<z.ZodEnum<["generated", "assembled", "simulated", "planned", "placeholder", "requires_human", "requires_external_model", "requires_real_harmony"]>>;
    readiness: z.ZodDefault<z.ZodEnum<["planned", "assets_ready", "scenes_assembled", "preview_rendered", "reviewed", "final_package"]>>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    origin: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model";
    resolution: {
        width: number;
        height: number;
    };
    shots: {
        shotId: string;
        sceneId: string;
        shotType: string;
        charactersInFrame: string[];
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        description?: string | undefined;
        durationFrames?: number | undefined;
        framing?: string | undefined;
        cameraMove?: string | undefined;
        dialogue?: string | undefined;
    }[];
    assetRequirements: {
        status: "placeholder" | "generated" | "missing" | "provided";
        type: "audio" | "palette" | "character" | "background" | "rig" | "fx" | "prop";
        name: string;
        description?: string | undefined;
    }[];
    durationMinutes: number;
    episodeTitle: string;
    scenes: {
        sceneName: string;
        durationFrames: number;
        characters: string[];
        sceneId: string;
        shotCount: number;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        location?: string | undefined;
        mood?: string | undefined;
        cameraNotes?: string | undefined;
        fxNotes?: string | undefined;
    }[];
    recurringAssetsNeeded: string[];
    readiness: "planned" | "assets_ready" | "scenes_assembled" | "preview_rendered" | "reviewed" | "final_package";
    episodeNumber?: number | undefined;
    scriptLogLine?: string | undefined;
}, {
    durationMinutes: number;
    episodeTitle: string;
    fps?: number | undefined;
    origin?: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model" | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    shots?: {
        shotId: string;
        sceneId: string;
        shotType: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        description?: string | undefined;
        durationFrames?: number | undefined;
        framing?: string | undefined;
        cameraMove?: string | undefined;
        charactersInFrame?: string[] | undefined;
        dialogue?: string | undefined;
    }[] | undefined;
    assetRequirements?: {
        type: "audio" | "palette" | "character" | "background" | "rig" | "fx" | "prop";
        name: string;
        status?: "placeholder" | "generated" | "missing" | "provided" | undefined;
        description?: string | undefined;
    }[] | undefined;
    episodeNumber?: number | undefined;
    scriptLogLine?: string | undefined;
    scenes?: {
        sceneName: string;
        durationFrames: number;
        sceneId: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        location?: string | undefined;
        characters?: string[] | undefined;
        mood?: string | undefined;
        shotCount?: number | undefined;
        cameraNotes?: string | undefined;
        fxNotes?: string | undefined;
    }[] | undefined;
    recurringAssetsNeeded?: string[] | undefined;
    readiness?: "planned" | "assets_ready" | "scenes_assembled" | "preview_rendered" | "reviewed" | "final_package" | undefined;
}>;
export type EpisodePlan = z.infer<typeof episodePlanSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type AssetRequirement = z.infer<typeof assetRequirementSchema>;
export type ScenePlanRef = z.infer<typeof scenePlanRefSchema>;
