import { z } from 'zod';
export declare const pirInputContractSchema: z.ZodObject<{
    characterId: z.ZodString;
    characterName: z.ZodString;
    topology: z.ZodEnum<["humanoid_standard", "humanoid_short", "quadruped_simple", "blob_custom"]>;
    turnaroundApproved: z.ZodBoolean;
    mouthChartVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    characterName: string;
    topology: "humanoid_standard" | "humanoid_short" | "quadruped_simple" | "blob_custom";
    turnaroundApproved: boolean;
    mouthChartVersion: string;
}, {
    characterId: string;
    characterName: string;
    topology: "humanoid_standard" | "humanoid_short" | "quadruped_simple" | "blob_custom";
    turnaroundApproved: boolean;
    mouthChartVersion: string;
}>;
export declare const pirActingPrimitiveSchema: z.ZodObject<{
    type: z.ZodEnum<["anticipation", "recoil", "comedic_hold"]>;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    intensity: z.ZodNumber;
    targetJoints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "recoil" | "anticipation" | "comedic_hold";
    startFrame: number;
    endFrame: number;
    intensity: number;
    targetJoints?: string[] | undefined;
}, {
    type: "recoil" | "anticipation" | "comedic_hold";
    startFrame: number;
    endFrame: number;
    intensity: number;
    targetJoints?: string[] | undefined;
}>;
export declare const pirValidationRulesSchema: z.ZodObject<{
    maxOvershootClippingDegrees: z.ZodDefault<z.ZodNumber>;
    maxFootSlidePixels: z.ZodDefault<z.ZodNumber>;
    allowDeformerClipping: z.ZodDefault<z.ZodBoolean>;
    requireAutopatchIntegrity: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    maxOvershootClippingDegrees: number;
    maxFootSlidePixels: number;
    allowDeformerClipping: boolean;
    requireAutopatchIntegrity: boolean;
}, {
    maxOvershootClippingDegrees?: number | undefined;
    maxFootSlidePixels?: number | undefined;
    allowDeformerClipping?: boolean | undefined;
    requireAutopatchIntegrity?: boolean | undefined;
}>;
export declare const pirV1Schema: z.ZodObject<{
    version: z.ZodLiteral<"1.0">;
    shotId: z.ZodString;
    durationFrames: z.ZodNumber;
    fps: z.ZodDefault<z.ZodNumber>;
    productionProfile: z.ZodDefault<z.ZodString>;
    inputContract: z.ZodObject<{
        characterId: z.ZodString;
        characterName: z.ZodString;
        topology: z.ZodEnum<["humanoid_standard", "humanoid_short", "quadruped_simple", "blob_custom"]>;
        turnaroundApproved: z.ZodBoolean;
        mouthChartVersion: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        characterId: string;
        characterName: string;
        topology: "humanoid_standard" | "humanoid_short" | "quadruped_simple" | "blob_custom";
        turnaroundApproved: boolean;
        mouthChartVersion: string;
    }, {
        characterId: string;
        characterName: string;
        topology: "humanoid_standard" | "humanoid_short" | "quadruped_simple" | "blob_custom";
        turnaroundApproved: boolean;
        mouthChartVersion: string;
    }>;
    actingPrimitives: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["anticipation", "recoil", "comedic_hold"]>;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        intensity: z.ZodNumber;
        targetJoints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "recoil" | "anticipation" | "comedic_hold";
        startFrame: number;
        endFrame: number;
        intensity: number;
        targetJoints?: string[] | undefined;
    }, {
        type: "recoil" | "anticipation" | "comedic_hold";
        startFrame: number;
        endFrame: number;
        intensity: number;
        targetJoints?: string[] | undefined;
    }>, "many">;
    validationRules: z.ZodObject<{
        maxOvershootClippingDegrees: z.ZodDefault<z.ZodNumber>;
        maxFootSlidePixels: z.ZodDefault<z.ZodNumber>;
        allowDeformerClipping: z.ZodDefault<z.ZodBoolean>;
        requireAutopatchIntegrity: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        maxOvershootClippingDegrees: number;
        maxFootSlidePixels: number;
        allowDeformerClipping: boolean;
        requireAutopatchIntegrity: boolean;
    }, {
        maxOvershootClippingDegrees?: number | undefined;
        maxFootSlidePixels?: number | undefined;
        allowDeformerClipping?: boolean | undefined;
        requireAutopatchIntegrity?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    version: "1.0";
    fps: number;
    shotId: string;
    durationFrames: number;
    productionProfile: string;
    inputContract: {
        characterId: string;
        characterName: string;
        topology: "humanoid_standard" | "humanoid_short" | "quadruped_simple" | "blob_custom";
        turnaroundApproved: boolean;
        mouthChartVersion: string;
    };
    actingPrimitives: {
        type: "recoil" | "anticipation" | "comedic_hold";
        startFrame: number;
        endFrame: number;
        intensity: number;
        targetJoints?: string[] | undefined;
    }[];
    validationRules: {
        maxOvershootClippingDegrees: number;
        maxFootSlidePixels: number;
        allowDeformerClipping: boolean;
        requireAutopatchIntegrity: boolean;
    };
}, {
    version: "1.0";
    shotId: string;
    durationFrames: number;
    inputContract: {
        characterId: string;
        characterName: string;
        topology: "humanoid_standard" | "humanoid_short" | "quadruped_simple" | "blob_custom";
        turnaroundApproved: boolean;
        mouthChartVersion: string;
    };
    actingPrimitives: {
        type: "recoil" | "anticipation" | "comedic_hold";
        startFrame: number;
        endFrame: number;
        intensity: number;
        targetJoints?: string[] | undefined;
    }[];
    validationRules: {
        maxOvershootClippingDegrees?: number | undefined;
        maxFootSlidePixels?: number | undefined;
        allowDeformerClipping?: boolean | undefined;
        requireAutopatchIntegrity?: boolean | undefined;
    };
    fps?: number | undefined;
    productionProfile?: string | undefined;
}>;
export type PIRv1 = z.infer<typeof pirV1Schema>;
export type PIRActingPrimitive = z.infer<typeof pirActingPrimitiveSchema>;
export declare const pirPatchSchema: z.ZodObject<{
    patchId: z.ZodString;
    targetShotId: z.ZodString;
    defectReason: z.ZodString;
    primitiveModifications: z.ZodArray<z.ZodObject<{
        primitiveIndex: z.ZodNumber;
        updatedIntensity: z.ZodOptional<z.ZodNumber>;
        updatedStartFrame: z.ZodOptional<z.ZodNumber>;
        updatedEndFrame: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        primitiveIndex: number;
        updatedIntensity?: number | undefined;
        updatedStartFrame?: number | undefined;
        updatedEndFrame?: number | undefined;
    }, {
        primitiveIndex: number;
        updatedIntensity?: number | undefined;
        updatedStartFrame?: number | undefined;
        updatedEndFrame?: number | undefined;
    }>, "many">;
    updatedValidationRules: z.ZodOptional<z.ZodObject<{
        maxOvershootClippingDegrees: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        maxFootSlidePixels: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        allowDeformerClipping: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        requireAutopatchIntegrity: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        maxOvershootClippingDegrees?: number | undefined;
        maxFootSlidePixels?: number | undefined;
        allowDeformerClipping?: boolean | undefined;
        requireAutopatchIntegrity?: boolean | undefined;
    }, {
        maxOvershootClippingDegrees?: number | undefined;
        maxFootSlidePixels?: number | undefined;
        allowDeformerClipping?: boolean | undefined;
        requireAutopatchIntegrity?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    patchId: string;
    targetShotId: string;
    defectReason: string;
    primitiveModifications: {
        primitiveIndex: number;
        updatedIntensity?: number | undefined;
        updatedStartFrame?: number | undefined;
        updatedEndFrame?: number | undefined;
    }[];
    updatedValidationRules?: {
        maxOvershootClippingDegrees?: number | undefined;
        maxFootSlidePixels?: number | undefined;
        allowDeformerClipping?: boolean | undefined;
        requireAutopatchIntegrity?: boolean | undefined;
    } | undefined;
}, {
    patchId: string;
    targetShotId: string;
    defectReason: string;
    primitiveModifications: {
        primitiveIndex: number;
        updatedIntensity?: number | undefined;
        updatedStartFrame?: number | undefined;
        updatedEndFrame?: number | undefined;
    }[];
    updatedValidationRules?: {
        maxOvershootClippingDegrees?: number | undefined;
        maxFootSlidePixels?: number | undefined;
        allowDeformerClipping?: boolean | undefined;
        requireAutopatchIntegrity?: boolean | undefined;
    } | undefined;
}>;
export type PIRPatch = z.infer<typeof pirPatchSchema>;
