/**
 * Sprint 1 — Face performance sequence TS schema (zod).
 *
 * Parity with services/ml-runtime/pipelines/face_performance_schema.py so a TS consumer
 * (capability registry, MCP tool surface, contract tests) validates the same shape that
 * the Python provider produces.
 *
 * Honest-blocking rule: `provenance.realInferenceExecuted` is the single source of truth.
 * When false, the sequence is a blocked placeholder, and consumers MUST NOT cite it as
 * real evidence. The capability promotion gate enforces this.
 */
import { z } from 'zod';
export declare const FACE_PERFORMANCE_SCHEMA_VERSION = "1.0.0";
export declare const FACE_BLENDSHAPE_NAMES: readonly ["_neutral", "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight", "cheekPuff", "cheekSquintLeft", "cheekSquintRight", "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight", "eyeWideLeft", "eyeWideRight", "jawForward", "jawLeft", "jawOpen", "jawRight", "mouthClose", "mouthDimpleLeft", "mouthDimpleRight", "mouthFrownLeft", "mouthFrownRight", "mouthFunnel", "mouthLeft", "mouthLowerDownLeft", "mouthLowerDownRight", "mouthPressLeft", "mouthPressRight", "mouthPucker", "mouthRight", "mouthRollLower", "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper", "mouthSmileLeft", "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight", "mouthUpperLeft", "mouthUpperRight", "noseSneerLeft", "noseSneerRight"];
export declare const faceLandmarkPointSchema: z.ZodObject<{
    index: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
    z: z.ZodNumber;
    presence: z.ZodNumber;
    observed: z.ZodBoolean;
}, "strict", z.ZodTypeAny, {
    x: number;
    y: number;
    z: number;
    index: number;
    presence: number;
    observed: boolean;
}, {
    x: number;
    y: number;
    z: number;
    index: number;
    presence: number;
    observed: boolean;
}>;
export declare const faceBlendshapeSampleSchema: z.ZodObject<{
    name: z.ZodString;
    value: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    value: number;
    name: string;
}, {
    value: number;
    name: string;
}>;
export declare const facePerformanceFrameSchema: z.ZodObject<{
    frameIndex: z.ZodNumber;
    timestampMs: z.ZodNumber;
    landmarks: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
        presence: z.ZodNumber;
        observed: z.ZodBoolean;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
        index: number;
        presence: number;
        observed: boolean;
    }, {
        x: number;
        y: number;
        z: number;
        index: number;
        presence: number;
        observed: boolean;
    }>, "many">;
    blendshapes: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        value: number;
        name: string;
    }, {
        value: number;
        name: string;
    }>, "many">;
    transformationMatrix: z.ZodArray<z.ZodNumber, "many">;
    inferenceDurationMs: z.ZodNumber;
    warnings: z.ZodArray<z.ZodString, "many">;
}, "strict", z.ZodTypeAny, {
    warnings: string[];
    landmarks: {
        x: number;
        y: number;
        z: number;
        index: number;
        presence: number;
        observed: boolean;
    }[];
    frameIndex: number;
    timestampMs: number;
    blendshapes: {
        value: number;
        name: string;
    }[];
    transformationMatrix: number[];
    inferenceDurationMs: number;
}, {
    warnings: string[];
    landmarks: {
        x: number;
        y: number;
        z: number;
        index: number;
        presence: number;
        observed: boolean;
    }[];
    frameIndex: number;
    timestampMs: number;
    blendshapes: {
        value: number;
        name: string;
    }[];
    transformationMatrix: number[];
    inferenceDurationMs: number;
}>;
export declare const facePerformanceProvenanceSchema: z.ZodObject<{
    engine: z.ZodLiteral<"mediapipe_face_landmarker">;
    modelTask: z.ZodString;
    modelSha256: z.ZodNullable<z.ZodString>;
    realInferenceExecuted: z.ZodBoolean;
    runnerVersion: z.ZodString;
    createdAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    createdAt: string;
    engine: "mediapipe_face_landmarker";
    realInferenceExecuted: boolean;
    modelTask: string;
    modelSha256: string | null;
    runnerVersion: string;
}, {
    createdAt: string;
    engine: "mediapipe_face_landmarker";
    realInferenceExecuted: boolean;
    modelTask: string;
    modelSha256: string | null;
    runnerVersion: string;
}>;
export declare const facePerformanceSequenceSchema: z.ZodEffects<z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sourceKind: z.ZodEnum<["video", "blocked"]>;
    sourcePath: z.ZodNullable<z.ZodString>;
    sourceWidth: z.ZodNumber;
    sourceHeight: z.ZodNumber;
    analyzedFrames: z.ZodNumber;
    framesWithFace: z.ZodNumber;
    frames: z.ZodArray<z.ZodObject<{
        frameIndex: z.ZodNumber;
        timestampMs: z.ZodNumber;
        landmarks: z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
            presence: z.ZodNumber;
            observed: z.ZodBoolean;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
            index: number;
            presence: number;
            observed: boolean;
        }, {
            x: number;
            y: number;
            z: number;
            index: number;
            presence: number;
            observed: boolean;
        }>, "many">;
        blendshapes: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            value: number;
            name: string;
        }, {
            value: number;
            name: string;
        }>, "many">;
        transformationMatrix: z.ZodArray<z.ZodNumber, "many">;
        inferenceDurationMs: z.ZodNumber;
        warnings: z.ZodArray<z.ZodString, "many">;
    }, "strict", z.ZodTypeAny, {
        warnings: string[];
        landmarks: {
            x: number;
            y: number;
            z: number;
            index: number;
            presence: number;
            observed: boolean;
        }[];
        frameIndex: number;
        timestampMs: number;
        blendshapes: {
            value: number;
            name: string;
        }[];
        transformationMatrix: number[];
        inferenceDurationMs: number;
    }, {
        warnings: string[];
        landmarks: {
            x: number;
            y: number;
            z: number;
            index: number;
            presence: number;
            observed: boolean;
        }[];
        frameIndex: number;
        timestampMs: number;
        blendshapes: {
            value: number;
            name: string;
        }[];
        transformationMatrix: number[];
        inferenceDurationMs: number;
    }>, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
    provenance: z.ZodObject<{
        engine: z.ZodLiteral<"mediapipe_face_landmarker">;
        modelTask: z.ZodString;
        modelSha256: z.ZodNullable<z.ZodString>;
        realInferenceExecuted: z.ZodBoolean;
        runnerVersion: z.ZodString;
        createdAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        createdAt: string;
        engine: "mediapipe_face_landmarker";
        realInferenceExecuted: boolean;
        modelTask: string;
        modelSha256: string | null;
        runnerVersion: string;
    }, {
        createdAt: string;
        engine: "mediapipe_face_landmarker";
        realInferenceExecuted: boolean;
        modelTask: string;
        modelSha256: string | null;
        runnerVersion: string;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        createdAt: string;
        engine: "mediapipe_face_landmarker";
        realInferenceExecuted: boolean;
        modelTask: string;
        modelSha256: string | null;
        runnerVersion: string;
    };
    schemaVersion: "1.0.0";
    warnings: string[];
    frames: {
        warnings: string[];
        landmarks: {
            x: number;
            y: number;
            z: number;
            index: number;
            presence: number;
            observed: boolean;
        }[];
        frameIndex: number;
        timestampMs: number;
        blendshapes: {
            value: number;
            name: string;
        }[];
        transformationMatrix: number[];
        inferenceDurationMs: number;
    }[];
    sourcePath: string | null;
    sourceWidth: number;
    sourceHeight: number;
    sourceKind: "blocked" | "video";
    analyzedFrames: number;
    framesWithFace: number;
}, {
    provenance: {
        createdAt: string;
        engine: "mediapipe_face_landmarker";
        realInferenceExecuted: boolean;
        modelTask: string;
        modelSha256: string | null;
        runnerVersion: string;
    };
    schemaVersion: "1.0.0";
    warnings: string[];
    frames: {
        warnings: string[];
        landmarks: {
            x: number;
            y: number;
            z: number;
            index: number;
            presence: number;
            observed: boolean;
        }[];
        frameIndex: number;
        timestampMs: number;
        blendshapes: {
            value: number;
            name: string;
        }[];
        transformationMatrix: number[];
        inferenceDurationMs: number;
    }[];
    sourcePath: string | null;
    sourceWidth: number;
    sourceHeight: number;
    sourceKind: "blocked" | "video";
    analyzedFrames: number;
    framesWithFace: number;
}>, {
    provenance: {
        createdAt: string;
        engine: "mediapipe_face_landmarker";
        realInferenceExecuted: boolean;
        modelTask: string;
        modelSha256: string | null;
        runnerVersion: string;
    };
    schemaVersion: "1.0.0";
    warnings: string[];
    frames: {
        warnings: string[];
        landmarks: {
            x: number;
            y: number;
            z: number;
            index: number;
            presence: number;
            observed: boolean;
        }[];
        frameIndex: number;
        timestampMs: number;
        blendshapes: {
            value: number;
            name: string;
        }[];
        transformationMatrix: number[];
        inferenceDurationMs: number;
    }[];
    sourcePath: string | null;
    sourceWidth: number;
    sourceHeight: number;
    sourceKind: "blocked" | "video";
    analyzedFrames: number;
    framesWithFace: number;
}, {
    provenance: {
        createdAt: string;
        engine: "mediapipe_face_landmarker";
        realInferenceExecuted: boolean;
        modelTask: string;
        modelSha256: string | null;
        runnerVersion: string;
    };
    schemaVersion: "1.0.0";
    warnings: string[];
    frames: {
        warnings: string[];
        landmarks: {
            x: number;
            y: number;
            z: number;
            index: number;
            presence: number;
            observed: boolean;
        }[];
        frameIndex: number;
        timestampMs: number;
        blendshapes: {
            value: number;
            name: string;
        }[];
        transformationMatrix: number[];
        inferenceDurationMs: number;
    }[];
    sourcePath: string | null;
    sourceWidth: number;
    sourceHeight: number;
    sourceKind: "blocked" | "video";
    analyzedFrames: number;
    framesWithFace: number;
}>;
export type FaceLandmarkPoint = z.infer<typeof faceLandmarkPointSchema>;
export type FaceBlendshapeSample = z.infer<typeof faceBlendshapeSampleSchema>;
export type FacePerformanceFrame = z.infer<typeof facePerformanceFrameSchema>;
export type FacePerformanceProvenance = z.infer<typeof facePerformanceProvenanceSchema>;
export type FacePerformanceSequence = z.infer<typeof facePerformanceSequenceSchema>;
/**
 * Build a blocked face performance sequence. This is the only sanctioned way to produce a
 * "no inference ran" object for TS consumers; it forces realInferenceExecuted=false,
 * sourceKind='blocked', and carries the blocking reason in warnings.
 */
export declare function buildBlockedFacePerformance(args: {
    reason: string;
    modelTask: string;
    createdAt: string;
}): FacePerformanceSequence;
