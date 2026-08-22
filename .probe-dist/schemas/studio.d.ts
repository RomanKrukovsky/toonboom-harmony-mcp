import { z } from 'zod';
/**
 * studio.ts — Схемы для AI Production System
 *
 * Эти схемы описывают структуры данных, которые генерирует агент
 * при разборе промпта сцены и которые потребляет Autopilot.
 *
 * Поток данных:
 *   Промпт → ParsedScene → [characterSpecs, cameraPlan, lipsyncPlan, assetRequirements]
 *              → scene_plan.json → Autopilot → Harmony project
 */
export declare const bodyPartSchema: z.ZodObject<{
    name: z.ZodString;
    drawingLayers: z.ZodArray<z.ZodString, "many">;
    hasSubs: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    drawingLayers: string[];
    hasSubs?: boolean | undefined;
}, {
    name: string;
    drawingLayers: string[];
    hasSubs?: boolean | undefined;
}>;
export declare const characterViewSchema: z.ZodObject<{
    angle: z.ZodEnum<["front", "front_3q_left", "side_left", "back_3q_left", "back", "back_3q_right", "side_right", "front_3q_right"]>;
    label: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<["required", "optional"]>>;
}, "strip", z.ZodTypeAny, {
    angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
    label: string;
    priority: "required" | "optional";
}, {
    angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
    label: string;
    priority?: "required" | "optional" | undefined;
}>;
export declare const characterSpecSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    style: z.ZodDefault<z.ZodEnum<["cutout", "traditional", "hybrid"]>>;
    bodyParts: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        drawingLayers: z.ZodArray<z.ZodString, "many">;
        hasSubs: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        drawingLayers: string[];
        hasSubs?: boolean | undefined;
    }, {
        name: string;
        drawingLayers: string[];
        hasSubs?: boolean | undefined;
    }>, "many">;
    views360: z.ZodOptional<z.ZodArray<z.ZodObject<{
        angle: z.ZodEnum<["front", "front_3q_left", "side_left", "back_3q_left", "back", "back_3q_right", "side_right", "front_3q_right"]>;
        label: z.ZodString;
        priority: z.ZodDefault<z.ZodEnum<["required", "optional"]>>;
    }, "strip", z.ZodTypeAny, {
        angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
        label: string;
        priority: "required" | "optional";
    }, {
        angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
        label: string;
        priority?: "required" | "optional" | undefined;
    }>, "many">>;
    dialogues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    actions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        startFrame: z.ZodOptional<z.ZodNumber>;
        endFrame: z.ZodOptional<z.ZodNumber>;
        positionPreset: z.ZodOptional<z.ZodEnum<["center", "left", "right", "bg_left", "bg_right", "close_up"]>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        description?: string | undefined;
        positionPreset?: "center" | "left" | "right" | "close_up" | "bg_left" | "bg_right" | undefined;
    }, {
        name: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        description?: string | undefined;
        positionPreset?: "center" | "left" | "right" | "close_up" | "bg_left" | "bg_right" | undefined;
    }>, "many">>;
    rigPlaceholderPath: z.ZodOptional<z.ZodString>;
    needsNewRig: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    style: "hybrid" | "cutout" | "traditional";
    bodyParts: {
        name: string;
        drawingLayers: string[];
        hasSubs?: boolean | undefined;
    }[];
    needsNewRig: boolean;
    description?: string | undefined;
    dialogues?: string[] | undefined;
    actions?: {
        name: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        description?: string | undefined;
        positionPreset?: "center" | "left" | "right" | "close_up" | "bg_left" | "bg_right" | undefined;
    }[] | undefined;
    views360?: {
        angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
        label: string;
        priority: "required" | "optional";
    }[] | undefined;
    rigPlaceholderPath?: string | undefined;
}, {
    name: string;
    bodyParts: {
        name: string;
        drawingLayers: string[];
        hasSubs?: boolean | undefined;
    }[];
    description?: string | undefined;
    dialogues?: string[] | undefined;
    actions?: {
        name: string;
        startFrame?: number | undefined;
        endFrame?: number | undefined;
        description?: string | undefined;
        positionPreset?: "center" | "left" | "right" | "close_up" | "bg_left" | "bg_right" | undefined;
    }[] | undefined;
    style?: "hybrid" | "cutout" | "traditional" | undefined;
    views360?: {
        angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
        label: string;
        priority?: "required" | "optional" | undefined;
    }[] | undefined;
    rigPlaceholderPath?: string | undefined;
    needsNewRig?: boolean | undefined;
}>;
export type CharacterSpec = z.infer<typeof characterSpecSchema>;
export declare const cameraShotSchema: z.ZodObject<{
    shotId: z.ZodString;
    type: z.ZodEnum<["static", "pan", "tilt", "zoom_in", "zoom_out", "truck", "dolly", "shake"]>;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
    easing: z.ZodDefault<z.ZodEnum<["linear", "ease_in", "ease_out", "ease_in_out"]>>;
}, "strip", z.ZodTypeAny, {
    type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
    startFrame: number;
    endFrame: number;
    shotId: string;
    easing: "linear" | "ease_in" | "ease_out" | "ease_in_out";
    description?: string | undefined;
}, {
    type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
    startFrame: number;
    endFrame: number;
    shotId: string;
    description?: string | undefined;
    easing?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | undefined;
}>;
export declare const cameraPlanSchema: z.ZodObject<{
    totalFrames: z.ZodNumber;
    fps: z.ZodDefault<z.ZodNumber>;
    shots: z.ZodArray<z.ZodObject<{
        shotId: z.ZodString;
        type: z.ZodEnum<["static", "pan", "tilt", "zoom_in", "zoom_out", "truck", "dolly", "shake"]>;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
        easing: z.ZodDefault<z.ZodEnum<["linear", "ease_in", "ease_out", "ease_in_out"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
        startFrame: number;
        endFrame: number;
        shotId: string;
        easing: "linear" | "ease_in" | "ease_out" | "ease_in_out";
        description?: string | undefined;
    }, {
        type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
        startFrame: number;
        endFrame: number;
        shotId: string;
        description?: string | undefined;
        easing?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | undefined;
    }>, "many">;
    preset: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    shots: {
        type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
        startFrame: number;
        endFrame: number;
        shotId: string;
        easing: "linear" | "ease_in" | "ease_out" | "ease_in_out";
        description?: string | undefined;
    }[];
    totalFrames: number;
    preset?: string | undefined;
    notes?: string | undefined;
}, {
    shots: {
        type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
        startFrame: number;
        endFrame: number;
        shotId: string;
        description?: string | undefined;
        easing?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | undefined;
    }[];
    totalFrames: number;
    fps?: number | undefined;
    preset?: string | undefined;
    notes?: string | undefined;
}>;
export type CameraPlan = z.infer<typeof cameraPlanSchema>;
export declare const phonemeKeyframeSchema: z.ZodObject<{
    frame: z.ZodNumber;
    shape: z.ZodEnum<["A", "B", "C", "D", "E", "F", "G", "X"]>;
    character: z.ZodString;
}, "strip", z.ZodTypeAny, {
    frame: number;
    shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
    character: string;
}, {
    frame: number;
    shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
    character: string;
}>;
export declare const dialogueLineSchema: z.ZodObject<{
    character: z.ZodString;
    text: z.ZodString;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    audioFile: z.ZodOptional<z.ZodString>;
    phonemes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        shape: z.ZodEnum<["A", "B", "C", "D", "E", "F", "G", "X"]>;
        character: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
        character: string;
    }, {
        frame: number;
        shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
        character: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    character: string;
    text: string;
    audioFile?: string | undefined;
    phonemes?: {
        frame: number;
        shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
        character: string;
    }[] | undefined;
}, {
    startFrame: number;
    endFrame: number;
    character: string;
    text: string;
    audioFile?: string | undefined;
    phonemes?: {
        frame: number;
        shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
        character: string;
    }[] | undefined;
}>;
export declare const lipsyncPlanSchema: z.ZodObject<{
    totalFrames: z.ZodNumber;
    fps: z.ZodDefault<z.ZodNumber>;
    engine: z.ZodDefault<z.ZodEnum<["rhubarb", "gentle", "papagayo", "manual", "placeholder"]>>;
    dialogues: z.ZodArray<z.ZodObject<{
        character: z.ZodString;
        text: z.ZodString;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        audioFile: z.ZodOptional<z.ZodString>;
        phonemes: z.ZodOptional<z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            shape: z.ZodEnum<["A", "B", "C", "D", "E", "F", "G", "X"]>;
            character: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
            character: string;
        }, {
            frame: number;
            shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
            character: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        startFrame: number;
        endFrame: number;
        character: string;
        text: string;
        audioFile?: string | undefined;
        phonemes?: {
            frame: number;
            shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
            character: string;
        }[] | undefined;
    }, {
        startFrame: number;
        endFrame: number;
        character: string;
        text: string;
        audioFile?: string | undefined;
        phonemes?: {
            frame: number;
            shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
            character: string;
        }[] | undefined;
    }>, "many">;
    mouthLayerPattern: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    dialogues: {
        startFrame: number;
        endFrame: number;
        character: string;
        text: string;
        audioFile?: string | undefined;
        phonemes?: {
            frame: number;
            shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
            character: string;
        }[] | undefined;
    }[];
    engine: "manual" | "placeholder" | "rhubarb" | "papagayo" | "gentle";
    mouthLayerPattern: string;
    totalFrames: number;
}, {
    dialogues: {
        startFrame: number;
        endFrame: number;
        character: string;
        text: string;
        audioFile?: string | undefined;
        phonemes?: {
            frame: number;
            shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
            character: string;
        }[] | undefined;
    }[];
    totalFrames: number;
    fps?: number | undefined;
    engine?: "manual" | "placeholder" | "rhubarb" | "papagayo" | "gentle" | undefined;
    mouthLayerPattern?: string | undefined;
}>;
export type LipsyncPlan = z.infer<typeof lipsyncPlanSchema>;
export declare const assetItemSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["character_rig", "background", "audio", "sfx", "overlay", "effect", "palette", "template"]>;
    name: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["exists", "placeholder", "needs_creation", "needs_import"]>>;
    filePath: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["critical", "important", "optional"]>>;
}, "strip", z.ZodTypeAny, {
    status: "exists" | "placeholder" | "needs_creation" | "needs_import";
    type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
    id: string;
    name: string;
    priority: "critical" | "optional" | "important";
    description?: string | undefined;
    filePath?: string | undefined;
}, {
    type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
    id: string;
    name: string;
    status?: "exists" | "placeholder" | "needs_creation" | "needs_import" | undefined;
    description?: string | undefined;
    filePath?: string | undefined;
    priority?: "critical" | "optional" | "important" | undefined;
}>;
export declare const assetRequirementsSchema: z.ZodObject<{
    sceneName: z.ZodString;
    assets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["character_rig", "background", "audio", "sfx", "overlay", "effect", "palette", "template"]>;
        name: z.ZodString;
        status: z.ZodDefault<z.ZodEnum<["exists", "placeholder", "needs_creation", "needs_import"]>>;
        filePath: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        priority: z.ZodDefault<z.ZodEnum<["critical", "important", "optional"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "exists" | "placeholder" | "needs_creation" | "needs_import";
        type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
        id: string;
        name: string;
        priority: "critical" | "optional" | "important";
        description?: string | undefined;
        filePath?: string | undefined;
    }, {
        type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
        id: string;
        name: string;
        status?: "exists" | "placeholder" | "needs_creation" | "needs_import" | undefined;
        description?: string | undefined;
        filePath?: string | undefined;
        priority?: "critical" | "optional" | "important" | undefined;
    }>, "many">;
    totalCount: z.ZodNumber;
    readyCount: z.ZodDefault<z.ZodNumber>;
    generatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sceneName: string;
    assets: {
        status: "exists" | "placeholder" | "needs_creation" | "needs_import";
        type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
        id: string;
        name: string;
        priority: "critical" | "optional" | "important";
        description?: string | undefined;
        filePath?: string | undefined;
    }[];
    totalCount: number;
    readyCount: number;
    generatedAt?: string | undefined;
}, {
    sceneName: string;
    assets: {
        type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
        id: string;
        name: string;
        status?: "exists" | "placeholder" | "needs_creation" | "needs_import" | undefined;
        description?: string | undefined;
        filePath?: string | undefined;
        priority?: "critical" | "optional" | "important" | undefined;
    }[];
    totalCount: number;
    readyCount?: number | undefined;
    generatedAt?: string | undefined;
}>;
export type AssetRequirements = z.infer<typeof assetRequirementsSchema>;
export declare const keyframeSchema: z.ZodObject<{
    frame: z.ZodNumber;
    character: z.ZodString;
    bodyPart: z.ZodOptional<z.ZodString>;
    pose: z.ZodString;
    interpolation: z.ZodDefault<z.ZodEnum<["linear", "ease", "hold", "spline"]>>;
}, "strip", z.ZodTypeAny, {
    frame: number;
    interpolation: "linear" | "ease" | "hold" | "spline";
    character: string;
    pose: string;
    bodyPart?: string | undefined;
}, {
    frame: number;
    character: string;
    pose: string;
    interpolation?: "linear" | "ease" | "hold" | "spline" | undefined;
    bodyPart?: string | undefined;
}>;
export declare const blockingPlanSchema: z.ZodObject<{
    totalFrames: z.ZodNumber;
    fps: z.ZodDefault<z.ZodNumber>;
    keyframes: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        character: z.ZodString;
        bodyPart: z.ZodOptional<z.ZodString>;
        pose: z.ZodString;
        interpolation: z.ZodDefault<z.ZodEnum<["linear", "ease", "hold", "spline"]>>;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        interpolation: "linear" | "ease" | "hold" | "spline";
        character: string;
        pose: string;
        bodyPart?: string | undefined;
    }, {
        frame: number;
        character: string;
        pose: string;
        interpolation?: "linear" | "ease" | "hold" | "spline" | undefined;
        bodyPart?: string | undefined;
    }>, "many">;
    thumbnailPoses: z.ZodOptional<z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        description: string;
    }, {
        frame: number;
        description: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    keyframes: {
        frame: number;
        interpolation: "linear" | "ease" | "hold" | "spline";
        character: string;
        pose: string;
        bodyPart?: string | undefined;
    }[];
    fps: number;
    totalFrames: number;
    thumbnailPoses?: {
        frame: number;
        description: string;
    }[] | undefined;
}, {
    keyframes: {
        frame: number;
        character: string;
        pose: string;
        interpolation?: "linear" | "ease" | "hold" | "spline" | undefined;
        bodyPart?: string | undefined;
    }[];
    totalFrames: number;
    fps?: number | undefined;
    thumbnailPoses?: {
        frame: number;
        description: string;
    }[] | undefined;
}>;
export type BlockingPlan = z.infer<typeof blockingPlanSchema>;
export declare const parsedSceneSchema: z.ZodObject<{
    sourcePrompt: z.ZodString;
    language: z.ZodDefault<z.ZodEnum<["ru", "en", "auto"]>>;
    production: z.ZodDefault<z.ZodString>;
    episode: z.ZodDefault<z.ZodString>;
    sceneName: z.ZodString;
    durationSeconds: z.ZodDefault<z.ZodNumber>;
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
    setting: z.ZodString;
    mood: z.ZodOptional<z.ZodString>;
    timeOfDay: z.ZodDefault<z.ZodEnum<["day", "night", "sunset", "dawn", "indoor", "unspecified"]>>;
    characters: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        style: z.ZodDefault<z.ZodEnum<["cutout", "traditional", "hybrid"]>>;
        bodyParts: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            drawingLayers: z.ZodArray<z.ZodString, "many">;
            hasSubs: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            drawingLayers: string[];
            hasSubs?: boolean | undefined;
        }, {
            name: string;
            drawingLayers: string[];
            hasSubs?: boolean | undefined;
        }>, "many">;
        views360: z.ZodOptional<z.ZodArray<z.ZodObject<{
            angle: z.ZodEnum<["front", "front_3q_left", "side_left", "back_3q_left", "back", "back_3q_right", "side_right", "front_3q_right"]>;
            label: z.ZodString;
            priority: z.ZodDefault<z.ZodEnum<["required", "optional"]>>;
        }, "strip", z.ZodTypeAny, {
            angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
            label: string;
            priority: "required" | "optional";
        }, {
            angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
            label: string;
            priority?: "required" | "optional" | undefined;
        }>, "many">>;
        dialogues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        actions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            startFrame: z.ZodOptional<z.ZodNumber>;
            endFrame: z.ZodOptional<z.ZodNumber>;
            positionPreset: z.ZodOptional<z.ZodEnum<["center", "left", "right", "bg_left", "bg_right", "close_up"]>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            description?: string | undefined;
            positionPreset?: "center" | "left" | "right" | "close_up" | "bg_left" | "bg_right" | undefined;
        }, {
            name: string;
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            description?: string | undefined;
            positionPreset?: "center" | "left" | "right" | "close_up" | "bg_left" | "bg_right" | undefined;
        }>, "many">>;
        rigPlaceholderPath: z.ZodOptional<z.ZodString>;
        needsNewRig: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        style: "hybrid" | "cutout" | "traditional";
        bodyParts: {
            name: string;
            drawingLayers: string[];
            hasSubs?: boolean | undefined;
        }[];
        needsNewRig: boolean;
        description?: string | undefined;
        dialogues?: string[] | undefined;
        actions?: {
            name: string;
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            description?: string | undefined;
            positionPreset?: "center" | "left" | "right" | "close_up" | "bg_left" | "bg_right" | undefined;
        }[] | undefined;
        views360?: {
            angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
            label: string;
            priority: "required" | "optional";
        }[] | undefined;
        rigPlaceholderPath?: string | undefined;
    }, {
        name: string;
        bodyParts: {
            name: string;
            drawingLayers: string[];
            hasSubs?: boolean | undefined;
        }[];
        description?: string | undefined;
        dialogues?: string[] | undefined;
        actions?: {
            name: string;
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            description?: string | undefined;
            positionPreset?: "center" | "left" | "right" | "close_up" | "bg_left" | "bg_right" | undefined;
        }[] | undefined;
        style?: "hybrid" | "cutout" | "traditional" | undefined;
        views360?: {
            angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
            label: string;
            priority?: "required" | "optional" | undefined;
        }[] | undefined;
        rigPlaceholderPath?: string | undefined;
        needsNewRig?: boolean | undefined;
    }>, "many">;
    cameraPlan: z.ZodObject<{
        totalFrames: z.ZodNumber;
        fps: z.ZodDefault<z.ZodNumber>;
        shots: z.ZodArray<z.ZodObject<{
            shotId: z.ZodString;
            type: z.ZodEnum<["static", "pan", "tilt", "zoom_in", "zoom_out", "truck", "dolly", "shake"]>;
            startFrame: z.ZodNumber;
            endFrame: z.ZodNumber;
            description: z.ZodOptional<z.ZodString>;
            easing: z.ZodDefault<z.ZodEnum<["linear", "ease_in", "ease_out", "ease_in_out"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
            startFrame: number;
            endFrame: number;
            shotId: string;
            easing: "linear" | "ease_in" | "ease_out" | "ease_in_out";
            description?: string | undefined;
        }, {
            type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
            startFrame: number;
            endFrame: number;
            shotId: string;
            description?: string | undefined;
            easing?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | undefined;
        }>, "many">;
        preset: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        fps: number;
        shots: {
            type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
            startFrame: number;
            endFrame: number;
            shotId: string;
            easing: "linear" | "ease_in" | "ease_out" | "ease_in_out";
            description?: string | undefined;
        }[];
        totalFrames: number;
        preset?: string | undefined;
        notes?: string | undefined;
    }, {
        shots: {
            type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
            startFrame: number;
            endFrame: number;
            shotId: string;
            description?: string | undefined;
            easing?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | undefined;
        }[];
        totalFrames: number;
        fps?: number | undefined;
        preset?: string | undefined;
        notes?: string | undefined;
    }>;
    lipsyncPlan: z.ZodOptional<z.ZodObject<{
        totalFrames: z.ZodNumber;
        fps: z.ZodDefault<z.ZodNumber>;
        engine: z.ZodDefault<z.ZodEnum<["rhubarb", "gentle", "papagayo", "manual", "placeholder"]>>;
        dialogues: z.ZodArray<z.ZodObject<{
            character: z.ZodString;
            text: z.ZodString;
            startFrame: z.ZodNumber;
            endFrame: z.ZodNumber;
            audioFile: z.ZodOptional<z.ZodString>;
            phonemes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                shape: z.ZodEnum<["A", "B", "C", "D", "E", "F", "G", "X"]>;
                character: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                frame: number;
                shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
                character: string;
            }, {
                frame: number;
                shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
                character: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            startFrame: number;
            endFrame: number;
            character: string;
            text: string;
            audioFile?: string | undefined;
            phonemes?: {
                frame: number;
                shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
                character: string;
            }[] | undefined;
        }, {
            startFrame: number;
            endFrame: number;
            character: string;
            text: string;
            audioFile?: string | undefined;
            phonemes?: {
                frame: number;
                shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
                character: string;
            }[] | undefined;
        }>, "many">;
        mouthLayerPattern: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        fps: number;
        dialogues: {
            startFrame: number;
            endFrame: number;
            character: string;
            text: string;
            audioFile?: string | undefined;
            phonemes?: {
                frame: number;
                shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
                character: string;
            }[] | undefined;
        }[];
        engine: "manual" | "placeholder" | "rhubarb" | "papagayo" | "gentle";
        mouthLayerPattern: string;
        totalFrames: number;
    }, {
        dialogues: {
            startFrame: number;
            endFrame: number;
            character: string;
            text: string;
            audioFile?: string | undefined;
            phonemes?: {
                frame: number;
                shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
                character: string;
            }[] | undefined;
        }[];
        totalFrames: number;
        fps?: number | undefined;
        engine?: "manual" | "placeholder" | "rhubarb" | "papagayo" | "gentle" | undefined;
        mouthLayerPattern?: string | undefined;
    }>>;
    blockingPlan: z.ZodOptional<z.ZodObject<{
        totalFrames: z.ZodNumber;
        fps: z.ZodDefault<z.ZodNumber>;
        keyframes: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            character: z.ZodString;
            bodyPart: z.ZodOptional<z.ZodString>;
            pose: z.ZodString;
            interpolation: z.ZodDefault<z.ZodEnum<["linear", "ease", "hold", "spline"]>>;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            interpolation: "linear" | "ease" | "hold" | "spline";
            character: string;
            pose: string;
            bodyPart?: string | undefined;
        }, {
            frame: number;
            character: string;
            pose: string;
            interpolation?: "linear" | "ease" | "hold" | "spline" | undefined;
            bodyPart?: string | undefined;
        }>, "many">;
        thumbnailPoses: z.ZodOptional<z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            description: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            description: string;
        }, {
            frame: number;
            description: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        keyframes: {
            frame: number;
            interpolation: "linear" | "ease" | "hold" | "spline";
            character: string;
            pose: string;
            bodyPart?: string | undefined;
        }[];
        fps: number;
        totalFrames: number;
        thumbnailPoses?: {
            frame: number;
            description: string;
        }[] | undefined;
    }, {
        keyframes: {
            frame: number;
            character: string;
            pose: string;
            interpolation?: "linear" | "ease" | "hold" | "spline" | undefined;
            bodyPart?: string | undefined;
        }[];
        totalFrames: number;
        fps?: number | undefined;
        thumbnailPoses?: {
            frame: number;
            description: string;
        }[] | undefined;
    }>>;
    assetRequirements: z.ZodObject<{
        sceneName: z.ZodString;
        assets: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["character_rig", "background", "audio", "sfx", "overlay", "effect", "palette", "template"]>;
            name: z.ZodString;
            status: z.ZodDefault<z.ZodEnum<["exists", "placeholder", "needs_creation", "needs_import"]>>;
            filePath: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            priority: z.ZodDefault<z.ZodEnum<["critical", "important", "optional"]>>;
        }, "strip", z.ZodTypeAny, {
            status: "exists" | "placeholder" | "needs_creation" | "needs_import";
            type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
            id: string;
            name: string;
            priority: "critical" | "optional" | "important";
            description?: string | undefined;
            filePath?: string | undefined;
        }, {
            type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
            id: string;
            name: string;
            status?: "exists" | "placeholder" | "needs_creation" | "needs_import" | undefined;
            description?: string | undefined;
            filePath?: string | undefined;
            priority?: "critical" | "optional" | "important" | undefined;
        }>, "many">;
        totalCount: z.ZodNumber;
        readyCount: z.ZodDefault<z.ZodNumber>;
        generatedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sceneName: string;
        assets: {
            status: "exists" | "placeholder" | "needs_creation" | "needs_import";
            type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
            id: string;
            name: string;
            priority: "critical" | "optional" | "important";
            description?: string | undefined;
            filePath?: string | undefined;
        }[];
        totalCount: number;
        readyCount: number;
        generatedAt?: string | undefined;
    }, {
        sceneName: string;
        assets: {
            type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
            id: string;
            name: string;
            status?: "exists" | "placeholder" | "needs_creation" | "needs_import" | undefined;
            description?: string | undefined;
            filePath?: string | undefined;
            priority?: "critical" | "optional" | "important" | undefined;
        }[];
        totalCount: number;
        readyCount?: number | undefined;
        generatedAt?: string | undefined;
    }>;
    scenePlan: z.ZodAny;
    confidence: z.ZodOptional<z.ZodNumber>;
    warnings: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    generatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    durationSeconds: number;
    sceneName: string;
    production: string;
    episode: string;
    resolution: {
        width: number;
        height: number;
    };
    characters: {
        name: string;
        style: "hybrid" | "cutout" | "traditional";
        bodyParts: {
            name: string;
            drawingLayers: string[];
            hasSubs?: boolean | undefined;
        }[];
        needsNewRig: boolean;
        description?: string | undefined;
        dialogues?: string[] | undefined;
        actions?: {
            name: string;
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            description?: string | undefined;
            positionPreset?: "center" | "left" | "right" | "close_up" | "bg_left" | "bg_right" | undefined;
        }[] | undefined;
        views360?: {
            angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
            label: string;
            priority: "required" | "optional";
        }[] | undefined;
        rigPlaceholderPath?: string | undefined;
    }[];
    language: "ru" | "en" | "auto";
    sourcePrompt: string;
    setting: string;
    timeOfDay: "day" | "night" | "sunset" | "dawn" | "indoor" | "unspecified";
    cameraPlan: {
        fps: number;
        shots: {
            type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
            startFrame: number;
            endFrame: number;
            shotId: string;
            easing: "linear" | "ease_in" | "ease_out" | "ease_in_out";
            description?: string | undefined;
        }[];
        totalFrames: number;
        preset?: string | undefined;
        notes?: string | undefined;
    };
    assetRequirements: {
        sceneName: string;
        assets: {
            status: "exists" | "placeholder" | "needs_creation" | "needs_import";
            type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
            id: string;
            name: string;
            priority: "critical" | "optional" | "important";
            description?: string | undefined;
            filePath?: string | undefined;
        }[];
        totalCount: number;
        readyCount: number;
        generatedAt?: string | undefined;
    };
    confidence?: number | undefined;
    warnings?: string[] | undefined;
    scenePlan?: any;
    lipsyncPlan?: {
        fps: number;
        dialogues: {
            startFrame: number;
            endFrame: number;
            character: string;
            text: string;
            audioFile?: string | undefined;
            phonemes?: {
                frame: number;
                shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
                character: string;
            }[] | undefined;
        }[];
        engine: "manual" | "placeholder" | "rhubarb" | "papagayo" | "gentle";
        mouthLayerPattern: string;
        totalFrames: number;
    } | undefined;
    generatedAt?: string | undefined;
    mood?: string | undefined;
    blockingPlan?: {
        keyframes: {
            frame: number;
            interpolation: "linear" | "ease" | "hold" | "spline";
            character: string;
            pose: string;
            bodyPart?: string | undefined;
        }[];
        fps: number;
        totalFrames: number;
        thumbnailPoses?: {
            frame: number;
            description: string;
        }[] | undefined;
    } | undefined;
}, {
    sceneName: string;
    characters: {
        name: string;
        bodyParts: {
            name: string;
            drawingLayers: string[];
            hasSubs?: boolean | undefined;
        }[];
        description?: string | undefined;
        dialogues?: string[] | undefined;
        actions?: {
            name: string;
            startFrame?: number | undefined;
            endFrame?: number | undefined;
            description?: string | undefined;
            positionPreset?: "center" | "left" | "right" | "close_up" | "bg_left" | "bg_right" | undefined;
        }[] | undefined;
        style?: "hybrid" | "cutout" | "traditional" | undefined;
        views360?: {
            angle: "front" | "front_3q_left" | "side_left" | "back_3q_left" | "back" | "back_3q_right" | "side_right" | "front_3q_right";
            label: string;
            priority?: "required" | "optional" | undefined;
        }[] | undefined;
        rigPlaceholderPath?: string | undefined;
        needsNewRig?: boolean | undefined;
    }[];
    sourcePrompt: string;
    setting: string;
    cameraPlan: {
        shots: {
            type: "static" | "pan" | "tilt" | "zoom_in" | "zoom_out" | "truck" | "dolly" | "shake";
            startFrame: number;
            endFrame: number;
            shotId: string;
            description?: string | undefined;
            easing?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | undefined;
        }[];
        totalFrames: number;
        fps?: number | undefined;
        preset?: string | undefined;
        notes?: string | undefined;
    };
    assetRequirements: {
        sceneName: string;
        assets: {
            type: "audio" | "overlay" | "palette" | "background" | "template" | "character_rig" | "sfx" | "effect";
            id: string;
            name: string;
            status?: "exists" | "placeholder" | "needs_creation" | "needs_import" | undefined;
            description?: string | undefined;
            filePath?: string | undefined;
            priority?: "critical" | "optional" | "important" | undefined;
        }[];
        totalCount: number;
        readyCount?: number | undefined;
        generatedAt?: string | undefined;
    };
    confidence?: number | undefined;
    fps?: number | undefined;
    durationSeconds?: number | undefined;
    warnings?: string[] | undefined;
    scenePlan?: any;
    production?: string | undefined;
    episode?: string | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    language?: "ru" | "en" | "auto" | undefined;
    lipsyncPlan?: {
        dialogues: {
            startFrame: number;
            endFrame: number;
            character: string;
            text: string;
            audioFile?: string | undefined;
            phonemes?: {
                frame: number;
                shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
                character: string;
            }[] | undefined;
        }[];
        totalFrames: number;
        fps?: number | undefined;
        engine?: "manual" | "placeholder" | "rhubarb" | "papagayo" | "gentle" | undefined;
        mouthLayerPattern?: string | undefined;
    } | undefined;
    generatedAt?: string | undefined;
    mood?: string | undefined;
    timeOfDay?: "day" | "night" | "sunset" | "dawn" | "indoor" | "unspecified" | undefined;
    blockingPlan?: {
        keyframes: {
            frame: number;
            character: string;
            pose: string;
            interpolation?: "linear" | "ease" | "hold" | "spline" | undefined;
            bodyPart?: string | undefined;
        }[];
        totalFrames: number;
        fps?: number | undefined;
        thumbnailPoses?: {
            frame: number;
            description: string;
        }[] | undefined;
    } | undefined;
}>;
export type ParsedScene = z.infer<typeof parsedSceneSchema>;
export declare const auditIssueSchema: z.ZodObject<{
    id: z.ZodString;
    severity: z.ZodEnum<["error", "warning", "info"]>;
    category: z.ZodEnum<["missing_asset", "broken_connection", "empty_layer", "missing_keyframe", "lipsync", "render", "structure"]>;
    message: z.ZodString;
    autoFixable: z.ZodDefault<z.ZodBoolean>;
    fixDescription: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    id: string;
    severity: "error" | "warning" | "info";
    category: "lipsync" | "render" | "missing_asset" | "structure" | "broken_connection" | "empty_layer" | "missing_keyframe";
    autoFixable: boolean;
    nodePath?: string | undefined;
    fixDescription?: string | undefined;
}, {
    message: string;
    id: string;
    severity: "error" | "warning" | "info";
    category: "lipsync" | "render" | "missing_asset" | "structure" | "broken_connection" | "empty_layer" | "missing_keyframe";
    nodePath?: string | undefined;
    autoFixable?: boolean | undefined;
    fixDescription?: string | undefined;
}>;
export declare const fixPlanSchema: z.ZodObject<{
    autoFixed: z.ZodArray<z.ZodObject<{
        issueId: z.ZodString;
        action: z.ZodString;
        result: z.ZodEnum<["success", "partial", "failed"]>;
    }, "strip", z.ZodTypeAny, {
        issueId: string;
        action: string;
        result: "failed" | "partial" | "success";
    }, {
        issueId: string;
        action: string;
        result: "failed" | "partial" | "success";
    }>, "many">;
    humanFixRequired: z.ZodArray<z.ZodObject<{
        issueId: z.ZodString;
        instructions: z.ZodString;
        estimatedMinutes: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        issueId: string;
        instructions: string;
        estimatedMinutes?: number | undefined;
    }, {
        issueId: string;
        instructions: string;
        estimatedMinutes?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    autoFixed: {
        issueId: string;
        action: string;
        result: "failed" | "partial" | "success";
    }[];
    humanFixRequired: {
        issueId: string;
        instructions: string;
        estimatedMinutes?: number | undefined;
    }[];
}, {
    autoFixed: {
        issueId: string;
        action: string;
        result: "failed" | "partial" | "success";
    }[];
    humanFixRequired: {
        issueId: string;
        instructions: string;
        estimatedMinutes?: number | undefined;
    }[];
}>;
export declare const productionPackageSchema: z.ZodObject<{
    sceneName: z.ZodString;
    production: z.ZodString;
    episode: z.ZodString;
    exportedAt: z.ZodString;
    files: z.ZodObject<{
        harmonyProject: z.ZodOptional<z.ZodString>;
        scenePlanJson: z.ZodOptional<z.ZodString>;
        previewVideo: z.ZodOptional<z.ZodString>;
        characterSpecs: z.ZodOptional<z.ZodString>;
        cameraPlan: z.ZodOptional<z.ZodString>;
        lipsyncPlan: z.ZodOptional<z.ZodString>;
        blockingPlan: z.ZodOptional<z.ZodString>;
        auditReport: z.ZodOptional<z.ZodString>;
        fixPlan: z.ZodOptional<z.ZodString>;
        readme: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lipsyncPlan?: string | undefined;
        cameraPlan?: string | undefined;
        blockingPlan?: string | undefined;
        harmonyProject?: string | undefined;
        scenePlanJson?: string | undefined;
        previewVideo?: string | undefined;
        characterSpecs?: string | undefined;
        auditReport?: string | undefined;
        fixPlan?: string | undefined;
        readme?: string | undefined;
    }, {
        lipsyncPlan?: string | undefined;
        cameraPlan?: string | undefined;
        blockingPlan?: string | undefined;
        harmonyProject?: string | undefined;
        scenePlanJson?: string | undefined;
        previewVideo?: string | undefined;
        characterSpecs?: string | undefined;
        auditReport?: string | undefined;
        fixPlan?: string | undefined;
        readme?: string | undefined;
    }>;
    summary: z.ZodObject<{
        totalIssues: z.ZodNumber;
        autoFixed: z.ZodNumber;
        humanFixRequired: z.ZodNumber;
        previewRendered: z.ZodBoolean;
        productionReady: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        autoFixed: number;
        humanFixRequired: number;
        totalIssues: number;
        previewRendered: boolean;
        productionReady: boolean;
    }, {
        autoFixed: number;
        humanFixRequired: number;
        totalIssues: number;
        previewRendered: boolean;
        productionReady: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    sceneName: string;
    production: string;
    episode: string;
    summary: {
        autoFixed: number;
        humanFixRequired: number;
        totalIssues: number;
        previewRendered: boolean;
        productionReady: boolean;
    };
    exportedAt: string;
    files: {
        lipsyncPlan?: string | undefined;
        cameraPlan?: string | undefined;
        blockingPlan?: string | undefined;
        harmonyProject?: string | undefined;
        scenePlanJson?: string | undefined;
        previewVideo?: string | undefined;
        characterSpecs?: string | undefined;
        auditReport?: string | undefined;
        fixPlan?: string | undefined;
        readme?: string | undefined;
    };
}, {
    sceneName: string;
    production: string;
    episode: string;
    summary: {
        autoFixed: number;
        humanFixRequired: number;
        totalIssues: number;
        previewRendered: boolean;
        productionReady: boolean;
    };
    exportedAt: string;
    files: {
        lipsyncPlan?: string | undefined;
        cameraPlan?: string | undefined;
        blockingPlan?: string | undefined;
        harmonyProject?: string | undefined;
        scenePlanJson?: string | undefined;
        previewVideo?: string | undefined;
        characterSpecs?: string | undefined;
        auditReport?: string | undefined;
        fixPlan?: string | undefined;
        readme?: string | undefined;
    };
}>;
export type ProductionPackage = z.infer<typeof productionPackageSchema>;
export type AuditIssue = z.infer<typeof auditIssueSchema>;
export type FixPlan = z.infer<typeof fixPlanSchema>;
