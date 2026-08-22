import { z } from 'zod';
/**
 * actingPlan.ts — the acting director's blocking plan per character per scene.
 *
 * This is NOT final animation. It is the acting planning layer that
 * downstream humans or Harmony apply_rough_acting consume (ACTOR §8).
 */
export declare const emotionalBeatSchema: z.ZodObject<{
    frames: z.ZodArray<z.ZodNumber, "many">;
    emotion: z.ZodString;
    pose: z.ZodString;
    microActions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    dialogue: z.ZodOptional<z.ZodString>;
    voiceLevel: z.ZodOptional<z.ZodEnum<["whisper", "normal", "loud", "shout", "silent"]>>;
}, "strip", z.ZodTypeAny, {
    frames: number[];
    pose: string;
    emotion: string;
    microActions: string[];
    dialogue?: string | undefined;
    voiceLevel?: "whisper" | "normal" | "loud" | "shout" | "silent" | undefined;
}, {
    frames: number[];
    pose: string;
    emotion: string;
    dialogue?: string | undefined;
    microActions?: string[] | undefined;
    voiceLevel?: "whisper" | "normal" | "loud" | "shout" | "silent" | undefined;
}>;
export declare const actingPlanSchema: z.ZodObject<{
    character: z.ZodString;
    scene: z.ZodString;
    emotionalArc: z.ZodArray<z.ZodObject<{
        frames: z.ZodArray<z.ZodNumber, "many">;
        emotion: z.ZodString;
        pose: z.ZodString;
        microActions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        dialogue: z.ZodOptional<z.ZodString>;
        voiceLevel: z.ZodOptional<z.ZodEnum<["whisper", "normal", "loud", "shout", "silent"]>>;
    }, "strip", z.ZodTypeAny, {
        frames: number[];
        pose: string;
        emotion: string;
        microActions: string[];
        dialogue?: string | undefined;
        voiceLevel?: "whisper" | "normal" | "loud" | "shout" | "silent" | undefined;
    }, {
        frames: number[];
        pose: string;
        emotion: string;
        dialogue?: string | undefined;
        microActions?: string[] | undefined;
        voiceLevel?: "whisper" | "normal" | "loud" | "shout" | "silent" | undefined;
    }>, "many">;
    gesturePlan: z.ZodDefault<z.ZodArray<z.ZodObject<{
        frames: z.ZodArray<z.ZodNumber, "many">;
        gesture: z.ZodString;
        intensity: z.ZodDefault<z.ZodEnum<["subtle", "moderate", "strong"]>>;
    }, "strip", z.ZodTypeAny, {
        frames: number[];
        gesture: string;
        intensity: "subtle" | "moderate" | "strong";
    }, {
        frames: number[];
        gesture: string;
        intensity?: "subtle" | "moderate" | "strong" | undefined;
    }>, "many">>;
    blinkPlan: z.ZodDefault<z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        type: z.ZodDefault<z.ZodEnum<["single", "double", "triple", "dart"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "single" | "double" | "triple" | "dart";
        frame: number;
    }, {
        frame: number;
        type?: "single" | "double" | "triple" | "dart" | undefined;
    }>, "many">>;
    headMotionPlan: z.ZodDefault<z.ZodArray<z.ZodObject<{
        frames: z.ZodArray<z.ZodNumber, "many">;
        motion: z.ZodString;
        direction: z.ZodDefault<z.ZodEnum<["left", "right", "up", "down", "tilt", "none"]>>;
    }, "strip", z.ZodTypeAny, {
        frames: number[];
        motion: string;
        direction: "none" | "left" | "right" | "up" | "down" | "tilt";
    }, {
        frames: number[];
        motion: string;
        direction?: "none" | "left" | "right" | "up" | "down" | "tilt" | undefined;
    }>, "many">>;
    bodyLanguagePlan: z.ZodDefault<z.ZodArray<z.ZodObject<{
        frames: z.ZodArray<z.ZodNumber, "many">;
        description: z.ZodString;
        weight: z.ZodDefault<z.ZodEnum<["left", "right", "center"]>>;
    }, "strip", z.ZodTypeAny, {
        frames: number[];
        description: string;
        weight: "center" | "left" | "right";
    }, {
        frames: number[];
        description: string;
        weight?: "center" | "left" | "right" | undefined;
    }>, "many">>;
    readabilityScore: z.ZodOptional<z.ZodNumber>;
    appliedToHarmony: z.ZodDefault<z.ZodBoolean>;
    origin: z.ZodDefault<z.ZodEnum<["generated", "assembled", "simulated", "planned", "placeholder", "requires_human", "requires_external_model", "requires_real_harmony"]>>;
}, "strip", z.ZodTypeAny, {
    scene: string;
    origin: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model";
    character: string;
    emotionalArc: {
        frames: number[];
        pose: string;
        emotion: string;
        microActions: string[];
        dialogue?: string | undefined;
        voiceLevel?: "whisper" | "normal" | "loud" | "shout" | "silent" | undefined;
    }[];
    blinkPlan: {
        type: "single" | "double" | "triple" | "dart";
        frame: number;
    }[];
    gesturePlan: {
        frames: number[];
        gesture: string;
        intensity: "subtle" | "moderate" | "strong";
    }[];
    headMotionPlan: {
        frames: number[];
        motion: string;
        direction: "none" | "left" | "right" | "up" | "down" | "tilt";
    }[];
    bodyLanguagePlan: {
        frames: number[];
        description: string;
        weight: "center" | "left" | "right";
    }[];
    appliedToHarmony: boolean;
    readabilityScore?: number | undefined;
}, {
    scene: string;
    character: string;
    emotionalArc: {
        frames: number[];
        pose: string;
        emotion: string;
        dialogue?: string | undefined;
        microActions?: string[] | undefined;
        voiceLevel?: "whisper" | "normal" | "loud" | "shout" | "silent" | undefined;
    }[];
    origin?: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model" | undefined;
    blinkPlan?: {
        frame: number;
        type?: "single" | "double" | "triple" | "dart" | undefined;
    }[] | undefined;
    gesturePlan?: {
        frames: number[];
        gesture: string;
        intensity?: "subtle" | "moderate" | "strong" | undefined;
    }[] | undefined;
    headMotionPlan?: {
        frames: number[];
        motion: string;
        direction?: "none" | "left" | "right" | "up" | "down" | "tilt" | undefined;
    }[] | undefined;
    bodyLanguagePlan?: {
        frames: number[];
        description: string;
        weight?: "center" | "left" | "right" | undefined;
    }[] | undefined;
    readabilityScore?: number | undefined;
    appliedToHarmony?: boolean | undefined;
}>;
