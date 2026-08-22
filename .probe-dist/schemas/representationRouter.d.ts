import { z } from 'zod';
export declare const REPRESENTATION_ROUTER_SCHEMA_VERSION = "1.0";
export declare const representationTypeSchema: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>;
export declare const routingDecisionSchema: z.ZodObject<{
    decisionId: z.ZodString;
    partId: z.ZodString;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    representation: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>;
    explanation: z.ZodString;
    confidence: z.ZodNumber;
    factors: z.ZodObject<{
        rigidMotion: z.ZodNumber;
        silhouetteChange: z.ZodNumber;
        articulation: z.ZodNumber;
        occlusion: z.ZodNumber;
        topologyChange: z.ZodNumber;
        lineStability: z.ZodNumber;
        residualError: z.ZodNumber;
        estimatedKeyCount: z.ZodNumber;
        nodeViewComplexity: z.ZodEnum<["low", "medium", "high"]>;
        editability: z.ZodNumber;
        artistLocked: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        artistLocked: boolean;
        residualError: number;
        rigidMotion: number;
        silhouetteChange: number;
        articulation: number;
        occlusion: number;
        topologyChange: number;
        lineStability: number;
        estimatedKeyCount: number;
        nodeViewComplexity: "low" | "medium" | "high";
        editability: number;
    }, {
        residualError: number;
        rigidMotion: number;
        silhouetteChange: number;
        articulation: number;
        occlusion: number;
        topologyChange: number;
        lineStability: number;
        estimatedKeyCount: number;
        nodeViewComplexity: "low" | "medium" | "high";
        editability: number;
        artistLocked?: boolean | undefined;
    }>;
    alternatives: z.ZodDefault<z.ZodArray<z.ZodObject<{
        representation: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>;
        score: z.ZodNumber;
        reason: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        reason: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        score: number;
    }, {
        reason: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        score: number;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    startFrame: number;
    endFrame: number;
    explanation: string;
    partId: string;
    alternatives: {
        reason: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        score: number;
    }[];
    decisionId: string;
    representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
    factors: {
        artistLocked: boolean;
        residualError: number;
        rigidMotion: number;
        silhouetteChange: number;
        articulation: number;
        occlusion: number;
        topologyChange: number;
        lineStability: number;
        estimatedKeyCount: number;
        nodeViewComplexity: "low" | "medium" | "high";
        editability: number;
    };
}, {
    confidence: number;
    startFrame: number;
    endFrame: number;
    explanation: string;
    partId: string;
    decisionId: string;
    representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
    factors: {
        residualError: number;
        rigidMotion: number;
        silhouetteChange: number;
        articulation: number;
        occlusion: number;
        topologyChange: number;
        lineStability: number;
        estimatedKeyCount: number;
        nodeViewComplexity: "low" | "medium" | "high";
        editability: number;
        artistLocked?: boolean | undefined;
    };
    alternatives?: {
        reason: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        score: number;
    }[] | undefined;
}>;
export declare const representationSegmentSchema: z.ZodObject<{
    partId: z.ZodString;
    segments: z.ZodArray<z.ZodObject<{
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        representation: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>;
        decisionId: z.ZodString;
        explanation: z.ZodString;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        decisionId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
    }, {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        decisionId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    segments: {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        decisionId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
    }[];
    partId: string;
}, {
    segments: {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        decisionId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
    }[];
    partId: string;
}>;
export declare const routingPlanSchema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodString>;
    characterId: z.ZodString;
    sceneId: z.ZodString;
    decisions: z.ZodArray<z.ZodObject<{
        decisionId: z.ZodString;
        partId: z.ZodString;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        representation: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>;
        explanation: z.ZodString;
        confidence: z.ZodNumber;
        factors: z.ZodObject<{
            rigidMotion: z.ZodNumber;
            silhouetteChange: z.ZodNumber;
            articulation: z.ZodNumber;
            occlusion: z.ZodNumber;
            topologyChange: z.ZodNumber;
            lineStability: z.ZodNumber;
            residualError: z.ZodNumber;
            estimatedKeyCount: z.ZodNumber;
            nodeViewComplexity: z.ZodEnum<["low", "medium", "high"]>;
            editability: z.ZodNumber;
            artistLocked: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            artistLocked: boolean;
            residualError: number;
            rigidMotion: number;
            silhouetteChange: number;
            articulation: number;
            occlusion: number;
            topologyChange: number;
            lineStability: number;
            estimatedKeyCount: number;
            nodeViewComplexity: "low" | "medium" | "high";
            editability: number;
        }, {
            residualError: number;
            rigidMotion: number;
            silhouetteChange: number;
            articulation: number;
            occlusion: number;
            topologyChange: number;
            lineStability: number;
            estimatedKeyCount: number;
            nodeViewComplexity: "low" | "medium" | "high";
            editability: number;
            artistLocked?: boolean | undefined;
        }>;
        alternatives: z.ZodDefault<z.ZodArray<z.ZodObject<{
            representation: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>;
            score: z.ZodNumber;
            reason: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            reason: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
            score: number;
        }, {
            reason: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
            score: number;
        }>, "many">>;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        partId: string;
        alternatives: {
            reason: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
            score: number;
        }[];
        decisionId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        factors: {
            artistLocked: boolean;
            residualError: number;
            rigidMotion: number;
            silhouetteChange: number;
            articulation: number;
            occlusion: number;
            topologyChange: number;
            lineStability: number;
            estimatedKeyCount: number;
            nodeViewComplexity: "low" | "medium" | "high";
            editability: number;
        };
    }, {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        partId: string;
        decisionId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        factors: {
            residualError: number;
            rigidMotion: number;
            silhouetteChange: number;
            articulation: number;
            occlusion: number;
            topologyChange: number;
            lineStability: number;
            estimatedKeyCount: number;
            nodeViewComplexity: "low" | "medium" | "high";
            editability: number;
            artistLocked?: boolean | undefined;
        };
        alternatives?: {
            reason: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
            score: number;
        }[] | undefined;
    }>, "many">;
    segments: z.ZodArray<z.ZodObject<{
        partId: z.ZodString;
        segments: z.ZodArray<z.ZodObject<{
            startFrame: z.ZodNumber;
            endFrame: z.ZodNumber;
            representation: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>;
            decisionId: z.ZodString;
            explanation: z.ZodString;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            startFrame: number;
            endFrame: number;
            explanation: string;
            decisionId: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        }, {
            confidence: number;
            startFrame: number;
            endFrame: number;
            explanation: string;
            decisionId: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        segments: {
            confidence: number;
            startFrame: number;
            endFrame: number;
            explanation: string;
            decisionId: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        }[];
        partId: string;
    }, {
        segments: {
            confidence: number;
            startFrame: number;
            endFrame: number;
            explanation: string;
            decisionId: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        }[];
        partId: string;
    }>, "many">;
    studioProfile: z.ZodDefault<z.ZodObject<{
        preferredRepresentation: z.ZodOptional<z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>>;
        maxDeformersPerPart: z.ZodOptional<z.ZodNumber>;
        editabilityPriority: z.ZodDefault<z.ZodNumber>;
        frameByFrameAllowed: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        editabilityPriority: number;
        frameByFrameAllowed: boolean;
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
    }, {
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
        editabilityPriority?: number | undefined;
        frameByFrameAllowed?: boolean | undefined;
    }>>;
    summary: z.ZodObject<{
        totalDecisions: z.ZodNumber;
        representationCounts: z.ZodRecord<z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>, z.ZodNumber>;
        averageConfidence: z.ZodNumber;
        lockedPartCount: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        averageConfidence: number;
        totalDecisions: number;
        representationCounts: Partial<Record<"frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only", number>>;
        lockedPartCount: number;
    }, {
        averageConfidence: number;
        totalDecisions: number;
        representationCounts: Partial<Record<"frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only", number>>;
        lockedPartCount: number;
    }>;
    provenance: z.ZodObject<{
        engine: z.ZodString;
        createdAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        createdAt: string;
        engine: string;
    }, {
        createdAt: string;
        engine: string;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        createdAt: string;
        engine: string;
    };
    segments: {
        segments: {
            confidence: number;
            startFrame: number;
            endFrame: number;
            explanation: string;
            decisionId: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        }[];
        partId: string;
    }[];
    schemaVersion: string;
    characterId: string;
    summary: {
        averageConfidence: number;
        totalDecisions: number;
        representationCounts: Partial<Record<"frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only", number>>;
        lockedPartCount: number;
    };
    sceneId: string;
    decisions: {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        partId: string;
        alternatives: {
            reason: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
            score: number;
        }[];
        decisionId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        factors: {
            artistLocked: boolean;
            residualError: number;
            rigidMotion: number;
            silhouetteChange: number;
            articulation: number;
            occlusion: number;
            topologyChange: number;
            lineStability: number;
            estimatedKeyCount: number;
            nodeViewComplexity: "low" | "medium" | "high";
            editability: number;
        };
    }[];
    studioProfile: {
        editabilityPriority: number;
        frameByFrameAllowed: boolean;
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
    };
}, {
    provenance: {
        createdAt: string;
        engine: string;
    };
    segments: {
        segments: {
            confidence: number;
            startFrame: number;
            endFrame: number;
            explanation: string;
            decisionId: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        }[];
        partId: string;
    }[];
    characterId: string;
    summary: {
        averageConfidence: number;
        totalDecisions: number;
        representationCounts: Partial<Record<"frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only", number>>;
        lockedPartCount: number;
    };
    sceneId: string;
    decisions: {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        partId: string;
        decisionId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
        factors: {
            residualError: number;
            rigidMotion: number;
            silhouetteChange: number;
            articulation: number;
            occlusion: number;
            topologyChange: number;
            lineStability: number;
            estimatedKeyCount: number;
            nodeViewComplexity: "low" | "medium" | "high";
            editability: number;
            artistLocked?: boolean | undefined;
        };
        alternatives?: {
            reason: string;
            representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only";
            score: number;
        }[] | undefined;
    }[];
    schemaVersion?: string | undefined;
    studioProfile?: {
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
        editabilityPriority?: number | undefined;
        frameByFrameAllowed?: boolean | undefined;
    } | undefined;
}>;
export type RoutingPlan = z.infer<typeof routingPlanSchema>;
export type RoutingDecision = z.infer<typeof routingDecisionSchema>;
export type RepresentationType = z.infer<typeof representationTypeSchema>;
