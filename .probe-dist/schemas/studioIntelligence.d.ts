import { z } from 'zod';
export declare const STUDIO_PROFILE_SCHEMA_VERSION = "1.0";
export declare const editabilityPrioritySchema: z.ZodObject<{
    priority: z.ZodNumber;
    maxDeformersPerPart: z.ZodOptional<z.ZodNumber>;
    preferredRepresentation: z.ZodOptional<z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>>;
    frameByFrameAllowed: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    priority: number;
    frameByFrameAllowed: boolean;
    preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
    maxDeformersPerPart?: number | undefined;
}, {
    priority: number;
    preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
    maxDeformersPerPart?: number | undefined;
    frameByFrameAllowed?: boolean | undefined;
}>;
export declare const studioProfileSchema: z.ZodObject<{
    profileId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    editability: z.ZodObject<{
        priority: z.ZodNumber;
        maxDeformersPerPart: z.ZodOptional<z.ZodNumber>;
        preferredRepresentation: z.ZodOptional<z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>>;
        frameByFrameAllowed: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        priority: number;
        frameByFrameAllowed: boolean;
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
    }, {
        priority: number;
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
        frameByFrameAllowed?: boolean | undefined;
    }>;
    namingConventions: z.ZodOptional<z.ZodObject<{
        drawingPrefix: z.ZodDefault<z.ZodString>;
        pegPrefix: z.ZodDefault<z.ZodString>;
        groupPrefix: z.ZodDefault<z.ZodString>;
        compositePrefix: z.ZodDefault<z.ZodString>;
        cameraPrefix: z.ZodDefault<z.ZodString>;
        deformerPrefix: z.ZodDefault<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        drawingPrefix: string;
        pegPrefix: string;
        groupPrefix: string;
        compositePrefix: string;
        cameraPrefix: string;
        deformerPrefix: string;
    }, {
        drawingPrefix?: string | undefined;
        pegPrefix?: string | undefined;
        groupPrefix?: string | undefined;
        compositePrefix?: string | undefined;
        cameraPrefix?: string | undefined;
        deformerPrefix?: string | undefined;
    }>>;
    colorManagement: z.ZodOptional<z.ZodObject<{
        defaultColorSpace: z.ZodDefault<z.ZodEnum<["sRGB", "linear", "ACES"]>>;
        paletteNamingStandard: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        defaultColorSpace: "linear" | "sRGB" | "ACES";
        paletteNamingStandard?: string | undefined;
    }, {
        defaultColorSpace?: "linear" | "sRGB" | "ACES" | undefined;
        paletteNamingStandard?: string | undefined;
    }>>;
    qualityThresholds: z.ZodOptional<z.ZodObject<{
        minSilhouetteQuality: z.ZodDefault<z.ZodNumber>;
        maxKeyframeReductionError: z.ZodDefault<z.ZodNumber>;
        requireVectorTypeTVG: z.ZodDefault<z.ZodBoolean>;
        requireEditableGeometry: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        minSilhouetteQuality: number;
        maxKeyframeReductionError: number;
        requireVectorTypeTVG: boolean;
        requireEditableGeometry: boolean;
    }, {
        minSilhouetteQuality?: number | undefined;
        maxKeyframeReductionError?: number | undefined;
        requireVectorTypeTVG?: boolean | undefined;
        requireEditableGeometry?: boolean | undefined;
    }>>;
    pipelineDefaults: z.ZodOptional<z.ZodObject<{
        defaultFps: z.ZodDefault<z.ZodNumber>;
        defaultResolution: z.ZodDefault<z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
        }, {
            width: number;
            height: number;
        }>>;
        defaultDurationSeconds: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        defaultResolution: {
            width: number;
            height: number;
        };
        defaultFps: number;
        defaultDurationSeconds: number;
    }, {
        defaultResolution?: {
            width: number;
            height: number;
        } | undefined;
        defaultFps?: number | undefined;
        defaultDurationSeconds?: number | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    name: string;
    editability: {
        priority: number;
        frameByFrameAllowed: boolean;
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
    };
    profileId: string;
    description?: string | undefined;
    namingConventions?: {
        drawingPrefix: string;
        pegPrefix: string;
        groupPrefix: string;
        compositePrefix: string;
        cameraPrefix: string;
        deformerPrefix: string;
    } | undefined;
    colorManagement?: {
        defaultColorSpace: "linear" | "sRGB" | "ACES";
        paletteNamingStandard?: string | undefined;
    } | undefined;
    qualityThresholds?: {
        minSilhouetteQuality: number;
        maxKeyframeReductionError: number;
        requireVectorTypeTVG: boolean;
        requireEditableGeometry: boolean;
    } | undefined;
    pipelineDefaults?: {
        defaultResolution: {
            width: number;
            height: number;
        };
        defaultFps: number;
        defaultDurationSeconds: number;
    } | undefined;
}, {
    name: string;
    editability: {
        priority: number;
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
        frameByFrameAllowed?: boolean | undefined;
    };
    profileId: string;
    description?: string | undefined;
    namingConventions?: {
        drawingPrefix?: string | undefined;
        pegPrefix?: string | undefined;
        groupPrefix?: string | undefined;
        compositePrefix?: string | undefined;
        cameraPrefix?: string | undefined;
        deformerPrefix?: string | undefined;
    } | undefined;
    colorManagement?: {
        defaultColorSpace?: "linear" | "sRGB" | "ACES" | undefined;
        paletteNamingStandard?: string | undefined;
    } | undefined;
    qualityThresholds?: {
        minSilhouetteQuality?: number | undefined;
        maxKeyframeReductionError?: number | undefined;
        requireVectorTypeTVG?: boolean | undefined;
        requireEditableGeometry?: boolean | undefined;
    } | undefined;
    pipelineDefaults?: {
        defaultResolution?: {
            width: number;
            height: number;
        } | undefined;
        defaultFps?: number | undefined;
        defaultDurationSeconds?: number | undefined;
    } | undefined;
}>;
export declare const actingProfileSchema: z.ZodObject<{
    profileId: z.ZodString;
    characterId: z.ZodString;
    name: z.ZodString;
    style: z.ZodEnum<["restrained", "energetic", "sarcastic", "anxious", "aggressive", "comedic", "custom"]>;
    styleDescription: z.ZodString;
    parameters: z.ZodObject<{
        anticipationStrength: z.ZodDefault<z.ZodNumber>;
        overshootAmount: z.ZodDefault<z.ZodNumber>;
        settleFrames: z.ZodDefault<z.ZodNumber>;
        gestureFrequency: z.ZodDefault<z.ZodNumber>;
        blinkRate: z.ZodDefault<z.ZodNumber>;
        gazeLeadFrames: z.ZodDefault<z.ZodNumber>;
        weightShiftIntensity: z.ZodDefault<z.ZodNumber>;
        facialExpressiveness: z.ZodDefault<z.ZodNumber>;
        reactionSpeed: z.ZodDefault<z.ZodNumber>;
        holdDurationMultiplier: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        anticipationStrength: number;
        overshootAmount: number;
        settleFrames: number;
        gestureFrequency: number;
        blinkRate: number;
        gazeLeadFrames: number;
        weightShiftIntensity: number;
        facialExpressiveness: number;
        reactionSpeed: number;
        holdDurationMultiplier: number;
    }, {
        anticipationStrength?: number | undefined;
        overshootAmount?: number | undefined;
        settleFrames?: number | undefined;
        gestureFrequency?: number | undefined;
        blinkRate?: number | undefined;
        gazeLeadFrames?: number | undefined;
        weightShiftIntensity?: number | undefined;
        facialExpressiveness?: number | undefined;
        reactionSpeed?: number | undefined;
        holdDurationMultiplier?: number | undefined;
    }>;
    poseLibraryRefs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    gestureLibraryRefs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    name: string;
    characterId: string;
    style: "custom" | "comedic" | "restrained" | "energetic" | "sarcastic" | "anxious" | "aggressive";
    styleDescription: string;
    parameters: {
        anticipationStrength: number;
        overshootAmount: number;
        settleFrames: number;
        gestureFrequency: number;
        blinkRate: number;
        gazeLeadFrames: number;
        weightShiftIntensity: number;
        facialExpressiveness: number;
        reactionSpeed: number;
        holdDurationMultiplier: number;
    };
    poseLibraryRefs: string[];
    profileId: string;
    gestureLibraryRefs: string[];
}, {
    name: string;
    characterId: string;
    style: "custom" | "comedic" | "restrained" | "energetic" | "sarcastic" | "anxious" | "aggressive";
    styleDescription: string;
    parameters: {
        anticipationStrength?: number | undefined;
        overshootAmount?: number | undefined;
        settleFrames?: number | undefined;
        gestureFrequency?: number | undefined;
        blinkRate?: number | undefined;
        gazeLeadFrames?: number | undefined;
        weightShiftIntensity?: number | undefined;
        facialExpressiveness?: number | undefined;
        reactionSpeed?: number | undefined;
        holdDurationMultiplier?: number | undefined;
    };
    profileId: string;
    poseLibraryRefs?: string[] | undefined;
    gestureLibraryRefs?: string[] | undefined;
}>;
export declare const tasteModelConfigSchema: z.ZodObject<{
    modelId: z.ZodString;
    version: z.ZodString;
    type: z.ZodEnum<["pairwise_ranker", "absolute_scorer", "critic_aligned", "custom"]>;
    trainingData: z.ZodObject<{
        sampleCount: z.ZodNumber;
        preferenceCount: z.ZodNumber;
        correctionCount: z.ZodNumber;
        privacyLevel: z.ZodDefault<z.ZodEnum<["public", "studio_only", "private"]>>;
    }, "strict", z.ZodTypeAny, {
        privacyLevel: "public" | "studio_only" | "private";
        sampleCount: number;
        preferenceCount: number;
        correctionCount: number;
    }, {
        sampleCount: number;
        preferenceCount: number;
        correctionCount: number;
        privacyLevel?: "public" | "studio_only" | "private" | undefined;
    }>;
    features: z.ZodObject<{
        useTechnicalScores: z.ZodDefault<z.ZodBoolean>;
        useArtisticScores: z.ZodDefault<z.ZodBoolean>;
        useCriticReports: z.ZodDefault<z.ZodBoolean>;
        useCorrectionHistory: z.ZodDefault<z.ZodBoolean>;
        useRepresentationChoices: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        useTechnicalScores: boolean;
        useArtisticScores: boolean;
        useCriticReports: boolean;
        useCorrectionHistory: boolean;
        useRepresentationChoices: boolean;
    }, {
        useTechnicalScores?: boolean | undefined;
        useArtisticScores?: boolean | undefined;
        useCriticReports?: boolean | undefined;
        useCorrectionHistory?: boolean | undefined;
        useRepresentationChoices?: boolean | undefined;
    }>;
    weights: z.ZodObject<{
        technicalWeight: z.ZodDefault<z.ZodNumber>;
        artisticWeight: z.ZodDefault<z.ZodNumber>;
        criticAlignmentWeight: z.ZodDefault<z.ZodNumber>;
        correctionAlignmentWeight: z.ZodDefault<z.ZodNumber>;
        representationQualityWeight: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        technicalWeight: number;
        artisticWeight: number;
        criticAlignmentWeight: number;
        correctionAlignmentWeight: number;
        representationQualityWeight: number;
    }, {
        technicalWeight?: number | undefined;
        artisticWeight?: number | undefined;
        criticAlignmentWeight?: number | undefined;
        correctionAlignmentWeight?: number | undefined;
        representationQualityWeight?: number | undefined;
    }>;
    status: z.ZodDefault<z.ZodEnum<["untrained", "training", "ready", "deprecated"]>>;
}, "strict", z.ZodTypeAny, {
    status: "ready" | "untrained" | "training" | "deprecated";
    type: "custom" | "pairwise_ranker" | "absolute_scorer" | "critic_aligned";
    version: string;
    features: {
        useTechnicalScores: boolean;
        useArtisticScores: boolean;
        useCriticReports: boolean;
        useCorrectionHistory: boolean;
        useRepresentationChoices: boolean;
    };
    modelId: string;
    trainingData: {
        privacyLevel: "public" | "studio_only" | "private";
        sampleCount: number;
        preferenceCount: number;
        correctionCount: number;
    };
    weights: {
        technicalWeight: number;
        artisticWeight: number;
        criticAlignmentWeight: number;
        correctionAlignmentWeight: number;
        representationQualityWeight: number;
    };
}, {
    type: "custom" | "pairwise_ranker" | "absolute_scorer" | "critic_aligned";
    version: string;
    features: {
        useTechnicalScores?: boolean | undefined;
        useArtisticScores?: boolean | undefined;
        useCriticReports?: boolean | undefined;
        useCorrectionHistory?: boolean | undefined;
        useRepresentationChoices?: boolean | undefined;
    };
    modelId: string;
    trainingData: {
        sampleCount: number;
        preferenceCount: number;
        correctionCount: number;
        privacyLevel?: "public" | "studio_only" | "private" | undefined;
    };
    weights: {
        technicalWeight?: number | undefined;
        artisticWeight?: number | undefined;
        criticAlignmentWeight?: number | undefined;
        correctionAlignmentWeight?: number | undefined;
        representationQualityWeight?: number | undefined;
    };
    status?: "ready" | "untrained" | "training" | "deprecated" | undefined;
}>;
export declare const tasteModelPredictionSchema: z.ZodObject<{
    variantId: z.ZodString;
    sceneId: z.ZodString;
    predictedScore: z.ZodNumber;
    confidence: z.ZodNumber;
    reasoning: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    conflictWithTechnical: z.ZodDefault<z.ZodBoolean>;
    modelId: z.ZodString;
    timestamp: z.ZodString;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    timestamp: string;
    sceneId: string;
    variantId: string;
    modelId: string;
    predictedScore: number;
    reasoning: string[];
    conflictWithTechnical: boolean;
}, {
    confidence: number;
    timestamp: string;
    sceneId: string;
    variantId: string;
    modelId: string;
    predictedScore: number;
    reasoning?: string[] | undefined;
    conflictWithTechnical?: boolean | undefined;
}>;
export declare const episodeCompilerConfigSchema: z.ZodObject<{
    compilerId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    seriesBibleRef: z.ZodOptional<z.ZodString>;
    episodeTemplate: z.ZodObject<{
        structure: z.ZodDefault<z.ZodArray<z.ZodObject<{
            sceneType: z.ZodEnum<["opening", "dialogue", "action", "climax", "resolution", "closing"]>;
            typicalDurationSeconds: z.ZodNumber;
            typicalShotCount: z.ZodNumber;
            requiredCharacters: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
            typicalDurationSeconds: number;
            typicalShotCount: number;
            requiredCharacters: string[];
        }, {
            sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
            typicalDurationSeconds: number;
            typicalShotCount: number;
            requiredCharacters?: string[] | undefined;
        }>, "many">>;
        hooks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        cliffhangers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        structure: {
            sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
            typicalDurationSeconds: number;
            typicalShotCount: number;
            requiredCharacters: string[];
        }[];
        hooks: string[];
        cliffhangers: string[];
    }, {
        structure?: {
            sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
            typicalDurationSeconds: number;
            typicalShotCount: number;
            requiredCharacters?: string[] | undefined;
        }[] | undefined;
        hooks?: string[] | undefined;
        cliffhangers?: string[] | undefined;
    }>;
    reusePolicy: z.ZodObject<{
        allowBackgroundReuse: z.ZodDefault<z.ZodBoolean>;
        allowPropReuse: z.ZodDefault<z.ZodBoolean>;
        allowCharacterPoseReuse: z.ZodDefault<z.ZodBoolean>;
        maxReuseDistanceEpisodes: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        allowBackgroundReuse: boolean;
        allowPropReuse: boolean;
        allowCharacterPoseReuse: boolean;
        maxReuseDistanceEpisodes: number;
    }, {
        allowBackgroundReuse?: boolean | undefined;
        allowPropReuse?: boolean | undefined;
        allowCharacterPoseReuse?: boolean | undefined;
        maxReuseDistanceEpisodes?: number | undefined;
    }>;
    qualityGates: z.ZodObject<{
        minCriticScore: z.ZodDefault<z.ZodNumber>;
        requireTasteModelApproval: z.ZodDefault<z.ZodBoolean>;
        maxHumanReviewTimeMinutes: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        minCriticScore: number;
        requireTasteModelApproval: boolean;
        maxHumanReviewTimeMinutes: number;
    }, {
        minCriticScore?: number | undefined;
        requireTasteModelApproval?: boolean | undefined;
        maxHumanReviewTimeMinutes?: number | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    name: string;
    compilerId: string;
    episodeTemplate: {
        structure: {
            sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
            typicalDurationSeconds: number;
            typicalShotCount: number;
            requiredCharacters: string[];
        }[];
        hooks: string[];
        cliffhangers: string[];
    };
    reusePolicy: {
        allowBackgroundReuse: boolean;
        allowPropReuse: boolean;
        allowCharacterPoseReuse: boolean;
        maxReuseDistanceEpisodes: number;
    };
    qualityGates: {
        minCriticScore: number;
        requireTasteModelApproval: boolean;
        maxHumanReviewTimeMinutes: number;
    };
    description?: string | undefined;
    seriesBibleRef?: string | undefined;
}, {
    name: string;
    compilerId: string;
    episodeTemplate: {
        structure?: {
            sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
            typicalDurationSeconds: number;
            typicalShotCount: number;
            requiredCharacters?: string[] | undefined;
        }[] | undefined;
        hooks?: string[] | undefined;
        cliffhangers?: string[] | undefined;
    };
    reusePolicy: {
        allowBackgroundReuse?: boolean | undefined;
        allowPropReuse?: boolean | undefined;
        allowCharacterPoseReuse?: boolean | undefined;
        maxReuseDistanceEpisodes?: number | undefined;
    };
    qualityGates: {
        minCriticScore?: number | undefined;
        requireTasteModelApproval?: boolean | undefined;
        maxHumanReviewTimeMinutes?: number | undefined;
    };
    description?: string | undefined;
    seriesBibleRef?: string | undefined;
}>;
export declare const compiledEpisodeSchema: z.ZodObject<{
    episodeId: z.ZodString;
    seriesId: z.ZodString;
    episodeNumber: z.ZodNumber;
    scenes: z.ZodArray<z.ZodObject<{
        sceneId: z.ZodString;
        sceneType: z.ZodString;
        durationSeconds: z.ZodNumber;
        shotCount: z.ZodNumber;
        characters: z.ZodArray<z.ZodString, "many">;
        status: z.ZodEnum<["planned", "in_progress", "review", "approved", "rejected"]>;
        manifestRef: z.ZodOptional<z.ZodString>;
        criticReportRef: z.ZodOptional<z.ZodString>;
        tasteScoreRef: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "in_progress" | "planned" | "rejected" | "approved" | "review";
        durationSeconds: number;
        characters: string[];
        sceneId: string;
        shotCount: number;
        sceneType: string;
        manifestRef?: string | undefined;
        criticReportRef?: string | undefined;
        tasteScoreRef?: string | undefined;
    }, {
        status: "in_progress" | "planned" | "rejected" | "approved" | "review";
        durationSeconds: number;
        characters: string[];
        sceneId: string;
        shotCount: number;
        sceneType: string;
        manifestRef?: string | undefined;
        criticReportRef?: string | undefined;
        tasteScoreRef?: string | undefined;
    }>, "many">;
    totalDurationSeconds: z.ZodNumber;
    totalScenes: z.ZodNumber;
    compilationTimestamp: z.ZodString;
    compilerConfig: z.ZodObject<{
        compilerId: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        seriesBibleRef: z.ZodOptional<z.ZodString>;
        episodeTemplate: z.ZodObject<{
            structure: z.ZodDefault<z.ZodArray<z.ZodObject<{
                sceneType: z.ZodEnum<["opening", "dialogue", "action", "climax", "resolution", "closing"]>;
                typicalDurationSeconds: z.ZodNumber;
                typicalShotCount: z.ZodNumber;
                requiredCharacters: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
                typicalDurationSeconds: number;
                typicalShotCount: number;
                requiredCharacters: string[];
            }, {
                sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
                typicalDurationSeconds: number;
                typicalShotCount: number;
                requiredCharacters?: string[] | undefined;
            }>, "many">>;
            hooks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            cliffhangers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strict", z.ZodTypeAny, {
            structure: {
                sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
                typicalDurationSeconds: number;
                typicalShotCount: number;
                requiredCharacters: string[];
            }[];
            hooks: string[];
            cliffhangers: string[];
        }, {
            structure?: {
                sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
                typicalDurationSeconds: number;
                typicalShotCount: number;
                requiredCharacters?: string[] | undefined;
            }[] | undefined;
            hooks?: string[] | undefined;
            cliffhangers?: string[] | undefined;
        }>;
        reusePolicy: z.ZodObject<{
            allowBackgroundReuse: z.ZodDefault<z.ZodBoolean>;
            allowPropReuse: z.ZodDefault<z.ZodBoolean>;
            allowCharacterPoseReuse: z.ZodDefault<z.ZodBoolean>;
            maxReuseDistanceEpisodes: z.ZodDefault<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            allowBackgroundReuse: boolean;
            allowPropReuse: boolean;
            allowCharacterPoseReuse: boolean;
            maxReuseDistanceEpisodes: number;
        }, {
            allowBackgroundReuse?: boolean | undefined;
            allowPropReuse?: boolean | undefined;
            allowCharacterPoseReuse?: boolean | undefined;
            maxReuseDistanceEpisodes?: number | undefined;
        }>;
        qualityGates: z.ZodObject<{
            minCriticScore: z.ZodDefault<z.ZodNumber>;
            requireTasteModelApproval: z.ZodDefault<z.ZodBoolean>;
            maxHumanReviewTimeMinutes: z.ZodDefault<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            minCriticScore: number;
            requireTasteModelApproval: boolean;
            maxHumanReviewTimeMinutes: number;
        }, {
            minCriticScore?: number | undefined;
            requireTasteModelApproval?: boolean | undefined;
            maxHumanReviewTimeMinutes?: number | undefined;
        }>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        compilerId: string;
        episodeTemplate: {
            structure: {
                sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
                typicalDurationSeconds: number;
                typicalShotCount: number;
                requiredCharacters: string[];
            }[];
            hooks: string[];
            cliffhangers: string[];
        };
        reusePolicy: {
            allowBackgroundReuse: boolean;
            allowPropReuse: boolean;
            allowCharacterPoseReuse: boolean;
            maxReuseDistanceEpisodes: number;
        };
        qualityGates: {
            minCriticScore: number;
            requireTasteModelApproval: boolean;
            maxHumanReviewTimeMinutes: number;
        };
        description?: string | undefined;
        seriesBibleRef?: string | undefined;
    }, {
        name: string;
        compilerId: string;
        episodeTemplate: {
            structure?: {
                sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
                typicalDurationSeconds: number;
                typicalShotCount: number;
                requiredCharacters?: string[] | undefined;
            }[] | undefined;
            hooks?: string[] | undefined;
            cliffhangers?: string[] | undefined;
        };
        reusePolicy: {
            allowBackgroundReuse?: boolean | undefined;
            allowPropReuse?: boolean | undefined;
            allowCharacterPoseReuse?: boolean | undefined;
            maxReuseDistanceEpisodes?: number | undefined;
        };
        qualityGates: {
            minCriticScore?: number | undefined;
            requireTasteModelApproval?: boolean | undefined;
            maxHumanReviewTimeMinutes?: number | undefined;
        };
        description?: string | undefined;
        seriesBibleRef?: string | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    episodeId: string;
    episodeNumber: number;
    scenes: {
        status: "in_progress" | "planned" | "rejected" | "approved" | "review";
        durationSeconds: number;
        characters: string[];
        sceneId: string;
        shotCount: number;
        sceneType: string;
        manifestRef?: string | undefined;
        criticReportRef?: string | undefined;
        tasteScoreRef?: string | undefined;
    }[];
    totalDurationSeconds: number;
    seriesId: string;
    totalScenes: number;
    compilationTimestamp: string;
    compilerConfig: {
        name: string;
        compilerId: string;
        episodeTemplate: {
            structure: {
                sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
                typicalDurationSeconds: number;
                typicalShotCount: number;
                requiredCharacters: string[];
            }[];
            hooks: string[];
            cliffhangers: string[];
        };
        reusePolicy: {
            allowBackgroundReuse: boolean;
            allowPropReuse: boolean;
            allowCharacterPoseReuse: boolean;
            maxReuseDistanceEpisodes: number;
        };
        qualityGates: {
            minCriticScore: number;
            requireTasteModelApproval: boolean;
            maxHumanReviewTimeMinutes: number;
        };
        description?: string | undefined;
        seriesBibleRef?: string | undefined;
    };
}, {
    episodeId: string;
    episodeNumber: number;
    scenes: {
        status: "in_progress" | "planned" | "rejected" | "approved" | "review";
        durationSeconds: number;
        characters: string[];
        sceneId: string;
        shotCount: number;
        sceneType: string;
        manifestRef?: string | undefined;
        criticReportRef?: string | undefined;
        tasteScoreRef?: string | undefined;
    }[];
    totalDurationSeconds: number;
    seriesId: string;
    totalScenes: number;
    compilationTimestamp: string;
    compilerConfig: {
        name: string;
        compilerId: string;
        episodeTemplate: {
            structure?: {
                sceneType: "action" | "resolution" | "dialogue" | "climax" | "opening" | "closing";
                typicalDurationSeconds: number;
                typicalShotCount: number;
                requiredCharacters?: string[] | undefined;
            }[] | undefined;
            hooks?: string[] | undefined;
            cliffhangers?: string[] | undefined;
        };
        reusePolicy: {
            allowBackgroundReuse?: boolean | undefined;
            allowPropReuse?: boolean | undefined;
            allowCharacterPoseReuse?: boolean | undefined;
            maxReuseDistanceEpisodes?: number | undefined;
        };
        qualityGates: {
            minCriticScore?: number | undefined;
            requireTasteModelApproval?: boolean | undefined;
            maxHumanReviewTimeMinutes?: number | undefined;
        };
        description?: string | undefined;
        seriesBibleRef?: string | undefined;
    };
}>;
export type StudioProfile = z.infer<typeof studioProfileSchema>;
export type ActingProfile = z.infer<typeof actingProfileSchema>;
export type TasteModelConfig = z.infer<typeof tasteModelConfigSchema>;
export type TasteModelPrediction = z.infer<typeof tasteModelPredictionSchema>;
export type EpisodeCompilerConfig = z.infer<typeof episodeCompilerConfigSchema>;
export type CompiledEpisode = z.infer<typeof compiledEpisodeSchema>;
