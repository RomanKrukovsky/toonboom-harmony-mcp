import { z } from 'zod';
export declare const characterSpecSchema: z.ZodObject<{
    name: z.ZodString;
    role: z.ZodString;
    personality: z.ZodString;
    visualStyle: z.ZodString;
    bodyType: z.ZodString;
    colorPalette: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    requiredViews: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiredExpressions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiredMouthShapes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiredHandPoses: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    layerPlan: z.ZodDefault<z.ZodObject<{
        head: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        body: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        head: string[];
        body: string[];
    }, {
        head?: string[] | undefined;
        body?: string[] | undefined;
    }>>;
    designPrompts: z.ZodOptional<z.ZodObject<{
        turnaround: z.ZodString;
        expressionSheet: z.ZodString;
        mouthChart: z.ZodString;
        handPoses: z.ZodString;
        fullBodyPose: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        mouthChart: string;
        turnaround: string;
        expressionSheet: string;
        handPoses: string;
        fullBodyPose: string;
    }, {
        mouthChart: string;
        turnaround: string;
        expressionSheet: string;
        handPoses: string;
        fullBodyPose: string;
    }>>;
    origin: z.ZodDefault<z.ZodEnum<["generated", "assembled", "simulated", "planned", "placeholder", "requires_human", "requires_external_model", "requires_real_harmony"]>>;
    assetBackend: z.ZodDefault<z.ZodEnum<["available", "missing"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    origin: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model";
    role: string;
    personality: string;
    visualStyle: string;
    bodyType: string;
    requiredViews: string[];
    requiredExpressions: string[];
    requiredMouthShapes: string[];
    requiredHandPoses: string[];
    layerPlan: {
        head: string[];
        body: string[];
    };
    assetBackend: "missing" | "available";
    colorPalette?: string[] | undefined;
    designPrompts?: {
        mouthChart: string;
        turnaround: string;
        expressionSheet: string;
        handPoses: string;
        fullBodyPose: string;
    } | undefined;
}, {
    name: string;
    role: string;
    personality: string;
    visualStyle: string;
    bodyType: string;
    origin?: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model" | undefined;
    colorPalette?: string[] | undefined;
    requiredViews?: string[] | undefined;
    requiredExpressions?: string[] | undefined;
    requiredMouthShapes?: string[] | undefined;
    requiredHandPoses?: string[] | undefined;
    layerPlan?: {
        head?: string[] | undefined;
        body?: string[] | undefined;
    } | undefined;
    designPrompts?: {
        mouthChart: string;
        turnaround: string;
        expressionSheet: string;
        handPoses: string;
        fullBodyPose: string;
    } | undefined;
    assetBackend?: "missing" | "available" | undefined;
}>;
export type CharacterSpec = z.infer<typeof characterSpecSchema>;
export declare const DEFAULT_MOUTH_SHAPES: string[];
export declare const DEFAULT_360_VIEWS: string[];
