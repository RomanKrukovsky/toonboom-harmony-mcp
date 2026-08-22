import { z } from 'zod';
export declare const KEY_POSE_MOTION_SCHEMA_VERSION = "1.0";
export declare const keyPoseTypeSchema: z.ZodEnum<["KeyPose", "BreakdownPose", "ExtremePose", "AnticipationPose", "OvershootPose", "SettlePose", "SmearPose", "HoldPose"]>;
export declare const keyPoseSchema: z.ZodObject<{
    poseId: z.ZodString;
    characterId: z.ZodString;
    frame: z.ZodNumber;
    type: z.ZodEnum<["KeyPose", "BreakdownPose", "ExtremePose", "AnticipationPose", "OvershootPose", "SettlePose", "SmearPose", "HoldPose"]>;
    description: z.ZodString;
    mode: z.ZodEnum<["library_adaptation", "generated_pose"]>;
    confidence: z.ZodNumber;
    features: z.ZodObject<{
        storytellingPose: z.ZodString;
        silhouetteQuality: z.ZodNumber;
        lineOfAction: z.ZodString;
        balance: z.ZodString;
        weightDistribution: z.ZodString;
        facialExpression: z.ZodString;
        handShape: z.ZodString;
        gazeDirection: z.ZodString;
        relationToCamera: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        storytellingPose: string;
        silhouetteQuality: number;
        lineOfAction: string;
        balance: string;
        weightDistribution: string;
        facialExpression: string;
        handShape: string;
        gazeDirection: string;
        relationToCamera: string;
    }, {
        storytellingPose: string;
        silhouetteQuality: number;
        lineOfAction: string;
        balance: string;
        weightDistribution: string;
        facialExpression: string;
        handShape: string;
        gazeDirection: string;
        relationToCamera: string;
    }>;
    skeletonControlGraph: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        angle?: number | undefined;
    }, {
        x: number;
        y: number;
        angle?: number | undefined;
    }>>>;
    fittedDrawings: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    transforms: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        positionX: z.ZodNumber;
        positionY: z.ZodNumber;
        rotation: z.ZodNumber;
        scaleX: z.ZodNumber;
        scaleY: z.ZodNumber;
        skew: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        positionX: number;
        positionY: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        skew: number;
    }, {
        positionX: number;
        positionY: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        skew: number;
    }>>>;
    inferred: z.ZodDefault<z.ZodBoolean>;
    provenance: z.ZodString;
}, "strict", z.ZodTypeAny, {
    type: "KeyPose" | "BreakdownPose" | "ExtremePose" | "AnticipationPose" | "OvershootPose" | "SettlePose" | "SmearPose" | "HoldPose";
    frame: number;
    confidence: number;
    provenance: string;
    mode: "library_adaptation" | "generated_pose";
    description: string;
    characterId: string;
    inferred: boolean;
    poseId: string;
    features: {
        storytellingPose: string;
        silhouetteQuality: number;
        lineOfAction: string;
        balance: string;
        weightDistribution: string;
        facialExpression: string;
        handShape: string;
        gazeDirection: string;
        relationToCamera: string;
    };
    fittedDrawings: Record<string, string>;
    transforms: Record<string, {
        positionX: number;
        positionY: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        skew: number;
    }>;
    skeletonControlGraph?: Record<string, {
        x: number;
        y: number;
        angle?: number | undefined;
    }> | undefined;
}, {
    type: "KeyPose" | "BreakdownPose" | "ExtremePose" | "AnticipationPose" | "OvershootPose" | "SettlePose" | "SmearPose" | "HoldPose";
    frame: number;
    confidence: number;
    provenance: string;
    mode: "library_adaptation" | "generated_pose";
    description: string;
    characterId: string;
    poseId: string;
    features: {
        storytellingPose: string;
        silhouetteQuality: number;
        lineOfAction: string;
        balance: string;
        weightDistribution: string;
        facialExpression: string;
        handShape: string;
        gazeDirection: string;
        relationToCamera: string;
    };
    inferred?: boolean | undefined;
    skeletonControlGraph?: Record<string, {
        x: number;
        y: number;
        angle?: number | undefined;
    }> | undefined;
    fittedDrawings?: Record<string, string> | undefined;
    transforms?: Record<string, {
        positionX: number;
        positionY: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        skew: number;
    }> | undefined;
}>;
export declare const keyPoseSetSchema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodString>;
    sceneId: z.ZodString;
    poses: z.ZodArray<z.ZodObject<{
        poseId: z.ZodString;
        characterId: z.ZodString;
        frame: z.ZodNumber;
        type: z.ZodEnum<["KeyPose", "BreakdownPose", "ExtremePose", "AnticipationPose", "OvershootPose", "SettlePose", "SmearPose", "HoldPose"]>;
        description: z.ZodString;
        mode: z.ZodEnum<["library_adaptation", "generated_pose"]>;
        confidence: z.ZodNumber;
        features: z.ZodObject<{
            storytellingPose: z.ZodString;
            silhouetteQuality: z.ZodNumber;
            lineOfAction: z.ZodString;
            balance: z.ZodString;
            weightDistribution: z.ZodString;
            facialExpression: z.ZodString;
            handShape: z.ZodString;
            gazeDirection: z.ZodString;
            relationToCamera: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            storytellingPose: string;
            silhouetteQuality: number;
            lineOfAction: string;
            balance: string;
            weightDistribution: string;
            facialExpression: string;
            handShape: string;
            gazeDirection: string;
            relationToCamera: string;
        }, {
            storytellingPose: string;
            silhouetteQuality: number;
            lineOfAction: string;
            balance: string;
            weightDistribution: string;
            facialExpression: string;
            handShape: string;
            gazeDirection: string;
            relationToCamera: string;
        }>;
        skeletonControlGraph: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            angle: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            angle?: number | undefined;
        }, {
            x: number;
            y: number;
            angle?: number | undefined;
        }>>>;
        fittedDrawings: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        transforms: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
            positionX: z.ZodNumber;
            positionY: z.ZodNumber;
            rotation: z.ZodNumber;
            scaleX: z.ZodNumber;
            scaleY: z.ZodNumber;
            skew: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            positionX: number;
            positionY: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            skew: number;
        }, {
            positionX: number;
            positionY: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            skew: number;
        }>>>;
        inferred: z.ZodDefault<z.ZodBoolean>;
        provenance: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        type: "KeyPose" | "BreakdownPose" | "ExtremePose" | "AnticipationPose" | "OvershootPose" | "SettlePose" | "SmearPose" | "HoldPose";
        frame: number;
        confidence: number;
        provenance: string;
        mode: "library_adaptation" | "generated_pose";
        description: string;
        characterId: string;
        inferred: boolean;
        poseId: string;
        features: {
            storytellingPose: string;
            silhouetteQuality: number;
            lineOfAction: string;
            balance: string;
            weightDistribution: string;
            facialExpression: string;
            handShape: string;
            gazeDirection: string;
            relationToCamera: string;
        };
        fittedDrawings: Record<string, string>;
        transforms: Record<string, {
            positionX: number;
            positionY: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            skew: number;
        }>;
        skeletonControlGraph?: Record<string, {
            x: number;
            y: number;
            angle?: number | undefined;
        }> | undefined;
    }, {
        type: "KeyPose" | "BreakdownPose" | "ExtremePose" | "AnticipationPose" | "OvershootPose" | "SettlePose" | "SmearPose" | "HoldPose";
        frame: number;
        confidence: number;
        provenance: string;
        mode: "library_adaptation" | "generated_pose";
        description: string;
        characterId: string;
        poseId: string;
        features: {
            storytellingPose: string;
            silhouetteQuality: number;
            lineOfAction: string;
            balance: string;
            weightDistribution: string;
            facialExpression: string;
            handShape: string;
            gazeDirection: string;
            relationToCamera: string;
        };
        inferred?: boolean | undefined;
        skeletonControlGraph?: Record<string, {
            x: number;
            y: number;
            angle?: number | undefined;
        }> | undefined;
        fittedDrawings?: Record<string, string> | undefined;
        transforms?: Record<string, {
            positionX: number;
            positionY: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            skew: number;
        }> | undefined;
    }>, "many">;
    poseCount: z.ZodNumber;
    createdAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    schemaVersion: string;
    createdAt: string;
    sceneId: string;
    poses: {
        type: "KeyPose" | "BreakdownPose" | "ExtremePose" | "AnticipationPose" | "OvershootPose" | "SettlePose" | "SmearPose" | "HoldPose";
        frame: number;
        confidence: number;
        provenance: string;
        mode: "library_adaptation" | "generated_pose";
        description: string;
        characterId: string;
        inferred: boolean;
        poseId: string;
        features: {
            storytellingPose: string;
            silhouetteQuality: number;
            lineOfAction: string;
            balance: string;
            weightDistribution: string;
            facialExpression: string;
            handShape: string;
            gazeDirection: string;
            relationToCamera: string;
        };
        fittedDrawings: Record<string, string>;
        transforms: Record<string, {
            positionX: number;
            positionY: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            skew: number;
        }>;
        skeletonControlGraph?: Record<string, {
            x: number;
            y: number;
            angle?: number | undefined;
        }> | undefined;
    }[];
    poseCount: number;
}, {
    createdAt: string;
    sceneId: string;
    poses: {
        type: "KeyPose" | "BreakdownPose" | "ExtremePose" | "AnticipationPose" | "OvershootPose" | "SettlePose" | "SmearPose" | "HoldPose";
        frame: number;
        confidence: number;
        provenance: string;
        mode: "library_adaptation" | "generated_pose";
        description: string;
        characterId: string;
        poseId: string;
        features: {
            storytellingPose: string;
            silhouetteQuality: number;
            lineOfAction: string;
            balance: string;
            weightDistribution: string;
            facialExpression: string;
            handShape: string;
            gazeDirection: string;
            relationToCamera: string;
        };
        inferred?: boolean | undefined;
        skeletonControlGraph?: Record<string, {
            x: number;
            y: number;
            angle?: number | undefined;
        }> | undefined;
        fittedDrawings?: Record<string, string> | undefined;
        transforms?: Record<string, {
            positionX: number;
            positionY: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            skew: number;
        }> | undefined;
    }[];
    poseCount: number;
    schemaVersion?: string | undefined;
}>;
export declare const motionKeyframeSchema: z.ZodObject<{
    frame: z.ZodNumber;
    value: z.ZodNumber;
    interpolation: z.ZodEnum<["step", "linear", "ease-in", "ease-out", "ease-in-out", "hold", "overshoot", "bounce", "settle", "custom_bezier"]>;
    bezierParams: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strict", z.ZodTypeAny, {
    value: number;
    frame: number;
    interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
    bezierParams?: number[] | undefined;
}, {
    value: number;
    frame: number;
    interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
    bezierParams?: number[] | undefined;
}>;
export declare const motionTrackSchema: z.ZodObject<{
    trackId: z.ZodString;
    characterId: z.ZodString;
    partId: z.ZodString;
    property: z.ZodEnum<["positionX", "positionY", "rotation", "scaleX", "scaleY", "skew"]>;
    keyframes: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        value: z.ZodNumber;
        interpolation: z.ZodEnum<["step", "linear", "ease-in", "ease-out", "ease-in-out", "hold", "overshoot", "bounce", "settle", "custom_bezier"]>;
        bezierParams: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strict", z.ZodTypeAny, {
        value: number;
        frame: number;
        interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
        bezierParams?: number[] | undefined;
    }, {
        value: number;
        frame: number;
        interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
        bezierParams?: number[] | undefined;
    }>, "many">;
    residualError: z.ZodDefault<z.ZodNumber>;
    keyReductionMetrics: z.ZodOptional<z.ZodObject<{
        originalKeyCount: z.ZodNumber;
        reducedKeyCount: z.ZodNumber;
        compressionRatio: z.ZodNumber;
        maxError: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        originalKeyCount: number;
        reducedKeyCount: number;
        compressionRatio: number;
        maxError: number;
    }, {
        originalKeyCount: number;
        reducedKeyCount: number;
        compressionRatio: number;
        maxError: number;
    }>>;
}, "strict", z.ZodTypeAny, {
    keyframes: {
        value: number;
        frame: number;
        interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
        bezierParams?: number[] | undefined;
    }[];
    residualError: number;
    trackId: string;
    characterId: string;
    partId: string;
    property: "positionX" | "positionY" | "rotation" | "scaleX" | "scaleY" | "skew";
    keyReductionMetrics?: {
        originalKeyCount: number;
        reducedKeyCount: number;
        compressionRatio: number;
        maxError: number;
    } | undefined;
}, {
    keyframes: {
        value: number;
        frame: number;
        interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
        bezierParams?: number[] | undefined;
    }[];
    trackId: string;
    characterId: string;
    partId: string;
    property: "positionX" | "positionY" | "rotation" | "scaleX" | "scaleY" | "skew";
    residualError?: number | undefined;
    keyReductionMetrics?: {
        originalKeyCount: number;
        reducedKeyCount: number;
        compressionRatio: number;
        maxError: number;
    } | undefined;
}>;
export declare const motionSynthesisPlanSchema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodString>;
    sceneId: z.ZodString;
    tracks: z.ZodArray<z.ZodObject<{
        trackId: z.ZodString;
        characterId: z.ZodString;
        partId: z.ZodString;
        property: z.ZodEnum<["positionX", "positionY", "rotation", "scaleX", "scaleY", "skew"]>;
        keyframes: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            value: z.ZodNumber;
            interpolation: z.ZodEnum<["step", "linear", "ease-in", "ease-out", "ease-in-out", "hold", "overshoot", "bounce", "settle", "custom_bezier"]>;
            bezierParams: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        }, "strict", z.ZodTypeAny, {
            value: number;
            frame: number;
            interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
            bezierParams?: number[] | undefined;
        }, {
            value: number;
            frame: number;
            interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
            bezierParams?: number[] | undefined;
        }>, "many">;
        residualError: z.ZodDefault<z.ZodNumber>;
        keyReductionMetrics: z.ZodOptional<z.ZodObject<{
            originalKeyCount: z.ZodNumber;
            reducedKeyCount: z.ZodNumber;
            compressionRatio: z.ZodNumber;
            maxError: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            originalKeyCount: number;
            reducedKeyCount: number;
            compressionRatio: number;
            maxError: number;
        }, {
            originalKeyCount: number;
            reducedKeyCount: number;
            compressionRatio: number;
            maxError: number;
        }>>;
    }, "strict", z.ZodTypeAny, {
        keyframes: {
            value: number;
            frame: number;
            interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
            bezierParams?: number[] | undefined;
        }[];
        residualError: number;
        trackId: string;
        characterId: string;
        partId: string;
        property: "positionX" | "positionY" | "rotation" | "scaleX" | "scaleY" | "skew";
        keyReductionMetrics?: {
            originalKeyCount: number;
            reducedKeyCount: number;
            compressionRatio: number;
            maxError: number;
        } | undefined;
    }, {
        keyframes: {
            value: number;
            frame: number;
            interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
            bezierParams?: number[] | undefined;
        }[];
        trackId: string;
        characterId: string;
        partId: string;
        property: "positionX" | "positionY" | "rotation" | "scaleX" | "scaleY" | "skew";
        residualError?: number | undefined;
        keyReductionMetrics?: {
            originalKeyCount: number;
            reducedKeyCount: number;
            compressionRatio: number;
            maxError: number;
        } | undefined;
    }>, "many">;
    drawingSubstitutions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        partId: z.ZodString;
        drawingId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        drawingId: string;
        partId: string;
    }, {
        frame: number;
        drawingId: string;
        partId: string;
    }>, "many">>;
    exposureBlocks: z.ZodDefault<z.ZodArray<z.ZodObject<{
        partId: z.ZodString;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        drawingId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        drawingId: string;
        startFrame: number;
        endFrame: number;
        partId: string;
    }, {
        drawingId: string;
        startFrame: number;
        endFrame: number;
        partId: string;
    }>, "many">>;
    frameByFrameExceptions: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    origin: z.ZodDefault<z.ZodEnum<["generated", "assembled", "simulated", "planned", "placeholder", "requires_human", "requires_external_model", "requires_real_harmony"]>>;
}, "strict", z.ZodTypeAny, {
    schemaVersion: string;
    origin: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model";
    sceneId: string;
    tracks: {
        keyframes: {
            value: number;
            frame: number;
            interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
            bezierParams?: number[] | undefined;
        }[];
        residualError: number;
        trackId: string;
        characterId: string;
        partId: string;
        property: "positionX" | "positionY" | "rotation" | "scaleX" | "scaleY" | "skew";
        keyReductionMetrics?: {
            originalKeyCount: number;
            reducedKeyCount: number;
            compressionRatio: number;
            maxError: number;
        } | undefined;
    }[];
    drawingSubstitutions: {
        frame: number;
        drawingId: string;
        partId: string;
    }[];
    exposureBlocks: {
        drawingId: string;
        startFrame: number;
        endFrame: number;
        partId: string;
    }[];
    frameByFrameExceptions: number[];
}, {
    sceneId: string;
    tracks: {
        keyframes: {
            value: number;
            frame: number;
            interpolation: "linear" | "hold" | "step" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot" | "bounce" | "settle" | "custom_bezier";
            bezierParams?: number[] | undefined;
        }[];
        trackId: string;
        characterId: string;
        partId: string;
        property: "positionX" | "positionY" | "rotation" | "scaleX" | "scaleY" | "skew";
        residualError?: number | undefined;
        keyReductionMetrics?: {
            originalKeyCount: number;
            reducedKeyCount: number;
            compressionRatio: number;
            maxError: number;
        } | undefined;
    }[];
    schemaVersion?: string | undefined;
    origin?: "requires_real_harmony" | "placeholder" | "generated" | "assembled" | "simulated" | "planned" | "requires_human" | "requires_external_model" | undefined;
    drawingSubstitutions?: {
        frame: number;
        drawingId: string;
        partId: string;
    }[] | undefined;
    exposureBlocks?: {
        drawingId: string;
        startFrame: number;
        endFrame: number;
        partId: string;
    }[] | undefined;
    frameByFrameExceptions?: number[] | undefined;
}>;
export type KeyPose = z.infer<typeof keyPoseSchema>;
export type KeyPoseSet = z.infer<typeof keyPoseSetSchema>;
export type MotionKeyframe = z.infer<typeof motionKeyframeSchema>;
export type MotionTrack = z.infer<typeof motionTrackSchema>;
export type MotionSynthesisPlan = z.infer<typeof motionSynthesisPlanSchema>;
