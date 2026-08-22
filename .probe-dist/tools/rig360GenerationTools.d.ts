import { z } from 'zod';
/**
 * rig360GenerationTools — 360 rig synthesizer tools.
 */
export declare const rig360GenerationTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    characterSpec: z.ZodObject<{
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
}, "strip", z.ZodTypeAny, {
    characterSpec: {
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
    };
}, {
    characterSpec: {
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
    };
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    rig360Spec: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    projectPath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    rig360Spec: Record<string, unknown>;
    projectPath?: string | undefined;
}, {
    rig360Spec: Record<string, unknown>;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    rig360Spec: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    rig360Spec?: any;
}, {
    rig360Spec?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterSpec: z.ZodObject<{
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
    assetPaths: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    characterSpec: {
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
    };
    assetPaths: Record<string, string>;
}, {
    characterSpec: {
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
    };
    assetPaths?: Record<string, string> | undefined;
}>>)[];
