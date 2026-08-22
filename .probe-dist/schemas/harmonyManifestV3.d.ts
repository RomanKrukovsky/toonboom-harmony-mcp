import { z } from 'zod';
import { sceneUnderstandingSchema } from './sceneIntelligence.js';
import { keyPoseSetSchema } from './keyPoseMotion.js';
import { voiceAnalysisSchema, performancePlanSchema } from './voicePerformance.js';
import { cameraLayoutPlanSchema } from './cameraLayout.js';
import { partDecompositionSchema } from './partDecomposition.js';
import { routingPlanSchema } from './representationRouter.js';
import { criticReportSchema } from './animationCritic.js';
export declare const HARMONY_MANIFEST_V3_SCHEMA_VERSION = "3.0";
export { sceneUnderstandingSchema, keyPoseSetSchema, voiceAnalysisSchema, performancePlanSchema, cameraLayoutPlanSchema, partDecompositionSchema, routingPlanSchema, criticReportSchema };
export declare const motionTrackSchema: z.ZodObject<{
    trackId: z.ZodString;
    characterId: z.ZodString;
    partId: z.ZodString;
    representation: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector"]>;
    keyframes: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        position: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>>;
        rotation: z.ZodOptional<z.ZodNumber>;
        scale: z.ZodOptional<z.ZodNumber>;
        interpolation: z.ZodDefault<z.ZodEnum<["linear", "ease_in", "ease_out", "ease_in_out", "hold"]>>;
    }, "strict", z.ZodTypeAny, {
        frame: number;
        interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
        rotation?: number | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        scale?: number | undefined;
    }, {
        frame: number;
        rotation?: number | undefined;
        interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        scale?: number | undefined;
    }>, "many">;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    keyframes: {
        frame: number;
        interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
        rotation?: number | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        scale?: number | undefined;
    }[];
    trackId: string;
    characterId: string;
    partId: string;
    representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
}, {
    startFrame: number;
    endFrame: number;
    keyframes: {
        frame: number;
        rotation?: number | undefined;
        interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
        position?: {
            x: number;
            y: number;
        } | undefined;
        scale?: number | undefined;
    }[];
    trackId: string;
    characterId: string;
    partId: string;
    representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
}>;
export declare const exposureBlockSchema: z.ZodObject<{
    exposureId: z.ZodString;
    partId: z.ZodString;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    drawingId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    drawingId: string;
    startFrame: number;
    endFrame: number;
    partId: string;
    exposureId: string;
}, {
    drawingId: string;
    startFrame: number;
    endFrame: number;
    partId: string;
    exposureId: string;
}>;
export declare const paletteEntrySchema: z.ZodObject<{
    colorId: z.ZodString;
    name: z.ZodString;
    r: z.ZodNumber;
    g: z.ZodNumber;
    b: z.ZodNumber;
    a: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    colorId: string;
    name: string;
    r: number;
    g: number;
    b: number;
    a: number;
}, {
    colorId: string;
    name: string;
    r: number;
    g: number;
    b: number;
    a?: number | undefined;
}>;
export declare const paletteSchema: z.ZodObject<{
    paletteId: z.ZodString;
    name: z.ZodString;
    colors: z.ZodArray<z.ZodObject<{
        colorId: z.ZodString;
        name: z.ZodString;
        r: z.ZodNumber;
        g: z.ZodNumber;
        b: z.ZodNumber;
        a: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        colorId: string;
        name: string;
        r: number;
        g: number;
        b: number;
        a: number;
    }, {
        colorId: string;
        name: string;
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    name: string;
    colors: {
        colorId: string;
        name: string;
        r: number;
        g: number;
        b: number;
        a: number;
    }[];
    paletteId: string;
}, {
    name: string;
    colors: {
        colorId: string;
        name: string;
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    }[];
    paletteId: string;
}>;
export declare const drawingAssetSchema: z.ZodObject<{
    drawingId: z.ZodString;
    partId: z.ZodString;
    name: z.ZodString;
    path: z.ZodString;
    variantType: z.ZodDefault<z.ZodEnum<["front", "side", "three_quarter", "back", "extreme"]>>;
    inferred: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    path: string;
    name: string;
    drawingId: string;
    partId: string;
    inferred: boolean;
    variantType: "front" | "back" | "three_quarter" | "side" | "extreme";
}, {
    path: string;
    name: string;
    drawingId: string;
    partId: string;
    inferred?: boolean | undefined;
    variantType?: "front" | "back" | "three_quarter" | "side" | "extreme" | undefined;
}>;
export declare const tasteScoreSchema: z.ZodObject<{
    variantId: z.ZodString;
    variantA: z.ZodString;
    variantB: z.ZodString;
    preferredVariant: z.ZodString;
    score: z.ZodNumber;
    reasons: z.ZodArray<z.ZodString, "many">;
    conflictWithTechnicalMetrics: z.ZodDefault<z.ZodBoolean>;
    confidence: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    variantId: string;
    score: number;
    variantA: string;
    variantB: string;
    preferredVariant: string;
    reasons: string[];
    conflictWithTechnicalMetrics: boolean;
}, {
    confidence: number;
    variantId: string;
    score: number;
    variantA: string;
    variantB: string;
    preferredVariant: string;
    reasons: string[];
    conflictWithTechnicalMetrics?: boolean | undefined;
}>;
export declare const selectionHistoryEntrySchema: z.ZodObject<{
    timestamp: z.ZodString;
    variantId: z.ZodString;
    selectedBy: z.ZodString;
    reason: z.ZodString;
    automated: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    timestamp: string;
    selectedBy: string;
    reason: string;
    variantId: string;
    automated: boolean;
}, {
    timestamp: string;
    selectedBy: string;
    reason: string;
    variantId: string;
    automated?: boolean | undefined;
}>;
export declare const artistCorrectionSchema: z.ZodObject<{
    correctionId: z.ZodString;
    versionBefore: z.ZodString;
    versionAfter: z.ZodString;
    delta: z.ZodRecord<z.ZodString, z.ZodAny>;
    comment: z.ZodOptional<z.ZodString>;
    accepted: z.ZodDefault<z.ZodBoolean>;
    affectedFrames: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    affectedParts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    timestamp: z.ZodString;
}, "strict", z.ZodTypeAny, {
    timestamp: string;
    delta: Record<string, any>;
    affectedFrames: number[];
    affectedParts: string[];
    correctionId: string;
    versionBefore: string;
    versionAfter: string;
    accepted: boolean;
    comment?: string | undefined;
}, {
    timestamp: string;
    delta: Record<string, any>;
    correctionId: string;
    versionBefore: string;
    versionAfter: string;
    comment?: string | undefined;
    affectedFrames?: number[] | undefined;
    affectedParts?: string[] | undefined;
    accepted?: boolean | undefined;
}>;
export declare const trainingSignalSchema: z.ZodObject<{
    signalId: z.ZodString;
    type: z.ZodEnum<["pairwise_preference", "absolute_score", "correction_delta"]>;
    data: z.ZodRecord<z.ZodString, z.ZodAny>;
    privacyLevel: z.ZodDefault<z.ZodEnum<["public", "studio_only", "private"]>>;
    timestamp: z.ZodString;
}, "strict", z.ZodTypeAny, {
    data: Record<string, any>;
    type: "pairwise_preference" | "absolute_score" | "correction_delta";
    timestamp: string;
    signalId: string;
    privacyLevel: "public" | "studio_only" | "private";
}, {
    data: Record<string, any>;
    type: "pairwise_preference" | "absolute_score" | "correction_delta";
    timestamp: string;
    signalId: string;
    privacyLevel?: "public" | "studio_only" | "private" | undefined;
}>;
export declare const representationSegmentSchema: z.ZodObject<{
    partId: z.ZodString;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    representation: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector"]>;
    explanation: z.ZodString;
    confidence: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    startFrame: number;
    endFrame: number;
    explanation: string;
    partId: string;
    representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
}, {
    confidence: number;
    startFrame: number;
    endFrame: number;
    explanation: string;
    partId: string;
    representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
}>;
export declare const harmonyManifestV3Schema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodLiteral<"3.0">>;
    manifestId: z.ZodString;
    sceneId: z.ZodString;
    createdAt: z.ZodString;
    sceneUnderstanding: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0">;
        sceneId: z.ZodString;
        sceneName: z.ZodString;
        sourceScript: z.ZodString;
        totalDurationSeconds: z.ZodNumber;
        fps: z.ZodDefault<z.ZodNumber>;
        startFrame: z.ZodDefault<z.ZodNumber>;
        endFrame: z.ZodNumber;
        sceneIntent: z.ZodString;
        sceneIntentConfidence: z.ZodDefault<z.ZodNumber>;
        characters: z.ZodArray<z.ZodObject<{
            characterId: z.ZodString;
            name: z.ZodString;
            role: z.ZodDefault<z.ZodEnum<["protagonist", "antagonist", "supporting", "background", "unknown"]>>;
            goalInScene: z.ZodString;
            emotionalArc: z.ZodString;
            stance: z.ZodDefault<z.ZodEnum<["standing", "sitting", "lying", "moving", "unknown"]>>;
            hasDialogue: z.ZodBoolean;
            speaksFirst: z.ZodDefault<z.ZodBoolean>;
            receivesReaction: z.ZodDefault<z.ZodBoolean>;
            visibleOnScreen: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            name: string;
            role: "unknown" | "background" | "protagonist" | "antagonist" | "supporting";
            characterId: string;
            emotionalArc: string;
            goalInScene: string;
            stance: "unknown" | "standing" | "sitting" | "lying" | "moving";
            hasDialogue: boolean;
            speaksFirst: boolean;
            receivesReaction: boolean;
            visibleOnScreen: boolean;
        }, {
            name: string;
            characterId: string;
            emotionalArc: string;
            goalInScene: string;
            hasDialogue: boolean;
            role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
            stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
            speaksFirst?: boolean | undefined;
            receivesReaction?: boolean | undefined;
            visibleOnScreen?: boolean | undefined;
        }>, "many">;
        beats: z.ZodArray<z.ZodObject<{
            beatId: z.ZodString;
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            primaryCharacter: z.ZodString;
            intent: z.ZodString;
            emotion: z.ZodString;
            action: z.ZodString;
            reactionTarget: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            importance: z.ZodNumber;
            suggestedPauseBefore: z.ZodDefault<z.ZodNumber>;
            beatKind: z.ZodDefault<z.ZodEnum<["setup", "rising_action", "turn", "revelation", "confrontation", "pause", "reaction", "resolution", "tag", "unknown"]>>;
            supportsStoryArc: z.ZodDefault<z.ZodBoolean>;
            confidence: z.ZodDefault<z.ZodNumber>;
            assumptionIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            action: string;
            emotion: string;
            beatId: string;
            startTime: number;
            endTime: number;
            primaryCharacter: string;
            intent: string;
            importance: number;
            suggestedPauseBefore: number;
            beatKind: "pause" | "unknown" | "resolution" | "setup" | "turn" | "reaction" | "rising_action" | "revelation" | "confrontation" | "tag";
            supportsStoryArc: boolean;
            assumptionIds: string[];
            reactionTarget?: string | null | undefined;
        }, {
            action: string;
            emotion: string;
            beatId: string;
            startTime: number;
            endTime: number;
            primaryCharacter: string;
            intent: string;
            importance: number;
            confidence?: number | undefined;
            reactionTarget?: string | null | undefined;
            suggestedPauseBefore?: number | undefined;
            beatKind?: "pause" | "unknown" | "resolution" | "setup" | "turn" | "reaction" | "rising_action" | "revelation" | "confrontation" | "tag" | undefined;
            supportsStoryArc?: boolean | undefined;
            assumptionIds?: string[] | undefined;
        }>, "many">;
        actionBeats: z.ZodDefault<z.ZodArray<z.ZodObject<{
            beatId: z.ZodString;
            speaker: z.ZodString;
            actionVerb: z.ZodString;
            durationSec: z.ZodNumber;
            energy: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "spike"]>>;
            confidence: z.ZodDefault<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            beatId: string;
            speaker: string;
            actionVerb: string;
            durationSec: number;
            energy: "low" | "medium" | "high" | "spike";
        }, {
            beatId: string;
            speaker: string;
            actionVerb: string;
            durationSec: number;
            confidence?: number | undefined;
            energy?: "low" | "medium" | "high" | "spike" | undefined;
        }>, "many">>;
        reactionBeats: z.ZodDefault<z.ZodArray<z.ZodObject<{
            beatId: z.ZodString;
            reactor: z.ZodString;
            triggerBeatId: z.ZodString;
            reactionType: z.ZodDefault<z.ZodEnum<["silent_listen", "micro", "vocal", "physical", "turn_away", "double_take"]>>;
            confidence: z.ZodDefault<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            beatId: string;
            reactor: string;
            triggerBeatId: string;
            reactionType: "silent_listen" | "micro" | "vocal" | "physical" | "turn_away" | "double_take";
        }, {
            beatId: string;
            reactor: string;
            triggerBeatId: string;
            confidence?: number | undefined;
            reactionType?: "silent_listen" | "micro" | "vocal" | "physical" | "turn_away" | "double_take" | undefined;
        }>, "many">>;
        emotionCurve: z.ZodDefault<z.ZodArray<z.ZodObject<{
            time: z.ZodNumber;
            characterId: z.ZodString;
            valence: z.ZodNumber;
            arousal: z.ZodNumber;
            label: z.ZodString;
            confidence: z.ZodDefault<z.ZodNumber>;
            sourceBeatId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            characterId: string;
            label: string;
            time: number;
            valence: number;
            arousal: number;
            sourceBeatId?: string | null | undefined;
        }, {
            characterId: string;
            label: string;
            time: number;
            valence: number;
            arousal: number;
            confidence?: number | undefined;
            sourceBeatId?: string | null | undefined;
        }>, "many">>;
        attentionTargets: z.ZodDefault<z.ZodArray<z.ZodObject<{
            startFrame: z.ZodNumber;
            endFrame: z.ZodNumber;
            focusCharacterId: z.ZodString;
            focusType: z.ZodDefault<z.ZodEnum<["speaker", "reactor", "object", "environment", "shared"]>>;
            reason: z.ZodString;
            confidence: z.ZodDefault<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            startFrame: number;
            endFrame: number;
            reason: string;
            focusCharacterId: string;
            focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
        }, {
            startFrame: number;
            endFrame: number;
            reason: string;
            focusCharacterId: string;
            confidence?: number | undefined;
            focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
        }>, "many">>;
        continuity: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<["screen_direction", "eyeline", "screen_position", "costume", "prop", "lighting"]>;
            description: z.ZodString;
            locked: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            locked: boolean;
            description: string;
            kind: "prop" | "screen_direction" | "eyeline" | "screen_position" | "costume" | "lighting";
        }, {
            id: string;
            description: string;
            kind: "prop" | "screen_direction" | "eyeline" | "screen_position" | "costume" | "lighting";
            locked?: boolean | undefined;
        }>, "many">>;
        assumptions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            description: z.ZodString;
            confidence: z.ZodNumber;
            evidence: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            falsifiable: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            confidence: number;
            description: string;
            evidence: string[];
            falsifiable: boolean;
        }, {
            id: string;
            confidence: number;
            description: string;
            evidence?: string[] | undefined;
            falsifiable?: boolean | undefined;
        }>, "many">>;
        uncertainties: z.ZodDefault<z.ZodArray<z.ZodObject<{
            level: z.ZodEnum<["low", "medium", "high", "critical"]>;
            reason: z.ZodString;
            needsHumanReview: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            reason: string;
            level: "low" | "medium" | "high" | "critical";
            needsHumanReview: boolean;
        }, {
            reason: string;
            level: "low" | "medium" | "high" | "critical";
            needsHumanReview?: boolean | undefined;
        }>, "many">>;
        provenance: z.ZodObject<{
            engine: z.ZodLiteral<"rule_based SceneUnderstandingEngine v1">;
            createdAt: z.ZodString;
            notes: z.ZodDefault<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            createdAt: string;
            engine: "rule_based SceneUnderstandingEngine v1";
            notes: string;
        }, {
            createdAt: string;
            engine: "rule_based SceneUnderstandingEngine v1";
            notes?: string | undefined;
        }>;
    }, "strict", z.ZodTypeAny, {
        provenance: {
            createdAt: string;
            engine: "rule_based SceneUnderstandingEngine v1";
            notes: string;
        };
        startFrame: number;
        endFrame: number;
        schemaVersion: "1.0";
        fps: number;
        sceneName: string;
        assumptions: {
            id: string;
            confidence: number;
            description: string;
            evidence: string[];
            falsifiable: boolean;
        }[];
        continuity: {
            id: string;
            locked: boolean;
            description: string;
            kind: "prop" | "screen_direction" | "eyeline" | "screen_position" | "costume" | "lighting";
        }[];
        characters: {
            name: string;
            role: "unknown" | "background" | "protagonist" | "antagonist" | "supporting";
            characterId: string;
            emotionalArc: string;
            goalInScene: string;
            stance: "unknown" | "standing" | "sitting" | "lying" | "moving";
            hasDialogue: boolean;
            speaksFirst: boolean;
            receivesReaction: boolean;
            visibleOnScreen: boolean;
        }[];
        sceneId: string;
        sourceScript: string;
        totalDurationSeconds: number;
        sceneIntent: string;
        sceneIntentConfidence: number;
        beats: {
            confidence: number;
            action: string;
            emotion: string;
            beatId: string;
            startTime: number;
            endTime: number;
            primaryCharacter: string;
            intent: string;
            importance: number;
            suggestedPauseBefore: number;
            beatKind: "pause" | "unknown" | "resolution" | "setup" | "turn" | "reaction" | "rising_action" | "revelation" | "confrontation" | "tag";
            supportsStoryArc: boolean;
            assumptionIds: string[];
            reactionTarget?: string | null | undefined;
        }[];
        actionBeats: {
            confidence: number;
            beatId: string;
            speaker: string;
            actionVerb: string;
            durationSec: number;
            energy: "low" | "medium" | "high" | "spike";
        }[];
        reactionBeats: {
            confidence: number;
            beatId: string;
            reactor: string;
            triggerBeatId: string;
            reactionType: "silent_listen" | "micro" | "vocal" | "physical" | "turn_away" | "double_take";
        }[];
        emotionCurve: {
            confidence: number;
            characterId: string;
            label: string;
            time: number;
            valence: number;
            arousal: number;
            sourceBeatId?: string | null | undefined;
        }[];
        attentionTargets: {
            confidence: number;
            startFrame: number;
            endFrame: number;
            reason: string;
            focusCharacterId: string;
            focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
        }[];
        uncertainties: {
            reason: string;
            level: "low" | "medium" | "high" | "critical";
            needsHumanReview: boolean;
        }[];
    }, {
        provenance: {
            createdAt: string;
            engine: "rule_based SceneUnderstandingEngine v1";
            notes?: string | undefined;
        };
        endFrame: number;
        schemaVersion: "1.0";
        sceneName: string;
        characters: {
            name: string;
            characterId: string;
            emotionalArc: string;
            goalInScene: string;
            hasDialogue: boolean;
            role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
            stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
            speaksFirst?: boolean | undefined;
            receivesReaction?: boolean | undefined;
            visibleOnScreen?: boolean | undefined;
        }[];
        sceneId: string;
        sourceScript: string;
        totalDurationSeconds: number;
        sceneIntent: string;
        beats: {
            action: string;
            emotion: string;
            beatId: string;
            startTime: number;
            endTime: number;
            primaryCharacter: string;
            intent: string;
            importance: number;
            confidence?: number | undefined;
            reactionTarget?: string | null | undefined;
            suggestedPauseBefore?: number | undefined;
            beatKind?: "pause" | "unknown" | "resolution" | "setup" | "turn" | "reaction" | "rising_action" | "revelation" | "confrontation" | "tag" | undefined;
            supportsStoryArc?: boolean | undefined;
            assumptionIds?: string[] | undefined;
        }[];
        startFrame?: number | undefined;
        fps?: number | undefined;
        assumptions?: {
            id: string;
            confidence: number;
            description: string;
            evidence?: string[] | undefined;
            falsifiable?: boolean | undefined;
        }[] | undefined;
        continuity?: {
            id: string;
            description: string;
            kind: "prop" | "screen_direction" | "eyeline" | "screen_position" | "costume" | "lighting";
            locked?: boolean | undefined;
        }[] | undefined;
        sceneIntentConfidence?: number | undefined;
        actionBeats?: {
            beatId: string;
            speaker: string;
            actionVerb: string;
            durationSec: number;
            confidence?: number | undefined;
            energy?: "low" | "medium" | "high" | "spike" | undefined;
        }[] | undefined;
        reactionBeats?: {
            beatId: string;
            reactor: string;
            triggerBeatId: string;
            confidence?: number | undefined;
            reactionType?: "silent_listen" | "micro" | "vocal" | "physical" | "turn_away" | "double_take" | undefined;
        }[] | undefined;
        emotionCurve?: {
            characterId: string;
            label: string;
            time: number;
            valence: number;
            arousal: number;
            confidence?: number | undefined;
            sourceBeatId?: string | null | undefined;
        }[] | undefined;
        attentionTargets?: {
            startFrame: number;
            endFrame: number;
            reason: string;
            focusCharacterId: string;
            confidence?: number | undefined;
            focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
        }[] | undefined;
        uncertainties?: {
            reason: string;
            level: "low" | "medium" | "high" | "critical";
            needsHumanReview?: boolean | undefined;
        }[] | undefined;
    }>, {
        provenance: {
            createdAt: string;
            engine: "rule_based SceneUnderstandingEngine v1";
            notes: string;
        };
        startFrame: number;
        endFrame: number;
        schemaVersion: "1.0";
        fps: number;
        sceneName: string;
        assumptions: {
            id: string;
            confidence: number;
            description: string;
            evidence: string[];
            falsifiable: boolean;
        }[];
        continuity: {
            id: string;
            locked: boolean;
            description: string;
            kind: "prop" | "screen_direction" | "eyeline" | "screen_position" | "costume" | "lighting";
        }[];
        characters: {
            name: string;
            role: "unknown" | "background" | "protagonist" | "antagonist" | "supporting";
            characterId: string;
            emotionalArc: string;
            goalInScene: string;
            stance: "unknown" | "standing" | "sitting" | "lying" | "moving";
            hasDialogue: boolean;
            speaksFirst: boolean;
            receivesReaction: boolean;
            visibleOnScreen: boolean;
        }[];
        sceneId: string;
        sourceScript: string;
        totalDurationSeconds: number;
        sceneIntent: string;
        sceneIntentConfidence: number;
        beats: {
            confidence: number;
            action: string;
            emotion: string;
            beatId: string;
            startTime: number;
            endTime: number;
            primaryCharacter: string;
            intent: string;
            importance: number;
            suggestedPauseBefore: number;
            beatKind: "pause" | "unknown" | "resolution" | "setup" | "turn" | "reaction" | "rising_action" | "revelation" | "confrontation" | "tag";
            supportsStoryArc: boolean;
            assumptionIds: string[];
            reactionTarget?: string | null | undefined;
        }[];
        actionBeats: {
            confidence: number;
            beatId: string;
            speaker: string;
            actionVerb: string;
            durationSec: number;
            energy: "low" | "medium" | "high" | "spike";
        }[];
        reactionBeats: {
            confidence: number;
            beatId: string;
            reactor: string;
            triggerBeatId: string;
            reactionType: "silent_listen" | "micro" | "vocal" | "physical" | "turn_away" | "double_take";
        }[];
        emotionCurve: {
            confidence: number;
            characterId: string;
            label: string;
            time: number;
            valence: number;
            arousal: number;
            sourceBeatId?: string | null | undefined;
        }[];
        attentionTargets: {
            confidence: number;
            startFrame: number;
            endFrame: number;
            reason: string;
            focusCharacterId: string;
            focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
        }[];
        uncertainties: {
            reason: string;
            level: "low" | "medium" | "high" | "critical";
            needsHumanReview: boolean;
        }[];
    }, {
        provenance: {
            createdAt: string;
            engine: "rule_based SceneUnderstandingEngine v1";
            notes?: string | undefined;
        };
        endFrame: number;
        schemaVersion: "1.0";
        sceneName: string;
        characters: {
            name: string;
            characterId: string;
            emotionalArc: string;
            goalInScene: string;
            hasDialogue: boolean;
            role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
            stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
            speaksFirst?: boolean | undefined;
            receivesReaction?: boolean | undefined;
            visibleOnScreen?: boolean | undefined;
        }[];
        sceneId: string;
        sourceScript: string;
        totalDurationSeconds: number;
        sceneIntent: string;
        beats: {
            action: string;
            emotion: string;
            beatId: string;
            startTime: number;
            endTime: number;
            primaryCharacter: string;
            intent: string;
            importance: number;
            confidence?: number | undefined;
            reactionTarget?: string | null | undefined;
            suggestedPauseBefore?: number | undefined;
            beatKind?: "pause" | "unknown" | "resolution" | "setup" | "turn" | "reaction" | "rising_action" | "revelation" | "confrontation" | "tag" | undefined;
            supportsStoryArc?: boolean | undefined;
            assumptionIds?: string[] | undefined;
        }[];
        startFrame?: number | undefined;
        fps?: number | undefined;
        assumptions?: {
            id: string;
            confidence: number;
            description: string;
            evidence?: string[] | undefined;
            falsifiable?: boolean | undefined;
        }[] | undefined;
        continuity?: {
            id: string;
            description: string;
            kind: "prop" | "screen_direction" | "eyeline" | "screen_position" | "costume" | "lighting";
            locked?: boolean | undefined;
        }[] | undefined;
        sceneIntentConfidence?: number | undefined;
        actionBeats?: {
            beatId: string;
            speaker: string;
            actionVerb: string;
            durationSec: number;
            confidence?: number | undefined;
            energy?: "low" | "medium" | "high" | "spike" | undefined;
        }[] | undefined;
        reactionBeats?: {
            beatId: string;
            reactor: string;
            triggerBeatId: string;
            confidence?: number | undefined;
            reactionType?: "silent_listen" | "micro" | "vocal" | "physical" | "turn_away" | "double_take" | undefined;
        }[] | undefined;
        emotionCurve?: {
            characterId: string;
            label: string;
            time: number;
            valence: number;
            arousal: number;
            confidence?: number | undefined;
            sourceBeatId?: string | null | undefined;
        }[] | undefined;
        attentionTargets?: {
            startFrame: number;
            endFrame: number;
            reason: string;
            focusCharacterId: string;
            confidence?: number | undefined;
            focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
        }[] | undefined;
        uncertainties?: {
            reason: string;
            level: "low" | "medium" | "high" | "critical";
            needsHumanReview?: boolean | undefined;
        }[] | undefined;
    }>>;
    directorPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    performancePlans: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0">;
        planId: z.ZodString;
        sceneId: z.ZodString;
        characterId: z.ZodString;
        style: z.ZodEnum<["restrained", "energetic", "sarcastic", "anxious", "aggressive", "comedic", "custom"]>;
        styleDescription: z.ZodString;
        events: z.ZodArray<z.ZodObject<{
            eventId: z.ZodString;
            kind: z.ZodEnum<["pose", "gesture", "gaze", "blink", "breath", "weight_shift", "facial_expression", "reaction", "head_accent", "body_accent", "hold"]>;
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            intensity: z.ZodNumber;
            target: z.ZodNullable<z.ZodString>;
            bodyPart: z.ZodString;
            relatedBeatId: z.ZodNullable<z.ZodString>;
            description: z.ZodString;
            confidence: z.ZodNumber;
            provenance: z.ZodEnum<["voice_energy", "voice_pitch", "text_rule", "scene_beat", "style_rule", "human_hint"]>;
            alternatives: z.ZodArray<z.ZodString, "many">;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            provenance: "voice_energy" | "voice_pitch" | "text_rule" | "scene_beat" | "style_rule" | "human_hint";
            description: string;
            target: string | null;
            bodyPart: string;
            intensity: number;
            startTime: number;
            endTime: number;
            kind: "blink" | "pose" | "hold" | "reaction" | "gesture" | "breath" | "gaze" | "weight_shift" | "facial_expression" | "head_accent" | "body_accent";
            alternatives: string[];
            eventId: string;
            relatedBeatId: string | null;
        }, {
            confidence: number;
            provenance: "voice_energy" | "voice_pitch" | "text_rule" | "scene_beat" | "style_rule" | "human_hint";
            description: string;
            target: string | null;
            bodyPart: string;
            intensity: number;
            startTime: number;
            endTime: number;
            kind: "blink" | "pose" | "hold" | "reaction" | "gesture" | "breath" | "gaze" | "weight_shift" | "facial_expression" | "head_accent" | "body_accent";
            alternatives: string[];
            eventId: string;
            relatedBeatId: string | null;
        }>, "many">;
        eventCount: z.ZodNumber;
        confidence: z.ZodNumber;
        assumptions: z.ZodArray<z.ZodString, "many">;
        provenance: z.ZodObject<{
            engine: z.ZodLiteral<"rule_based PerformanceGenerator v1">;
            createdAt: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            createdAt: string;
            engine: "rule_based PerformanceGenerator v1";
        }, {
            createdAt: string;
            engine: "rule_based PerformanceGenerator v1";
        }>;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        provenance: {
            createdAt: string;
            engine: "rule_based PerformanceGenerator v1";
        };
        schemaVersion: "1.0";
        planId: string;
        assumptions: string[];
        characterId: string;
        style: "custom" | "comedic" | "restrained" | "energetic" | "sarcastic" | "anxious" | "aggressive";
        sceneId: string;
        styleDescription: string;
        events: {
            confidence: number;
            provenance: "voice_energy" | "voice_pitch" | "text_rule" | "scene_beat" | "style_rule" | "human_hint";
            description: string;
            target: string | null;
            bodyPart: string;
            intensity: number;
            startTime: number;
            endTime: number;
            kind: "blink" | "pose" | "hold" | "reaction" | "gesture" | "breath" | "gaze" | "weight_shift" | "facial_expression" | "head_accent" | "body_accent";
            alternatives: string[];
            eventId: string;
            relatedBeatId: string | null;
        }[];
        eventCount: number;
    }, {
        confidence: number;
        provenance: {
            createdAt: string;
            engine: "rule_based PerformanceGenerator v1";
        };
        schemaVersion: "1.0";
        planId: string;
        assumptions: string[];
        characterId: string;
        style: "custom" | "comedic" | "restrained" | "energetic" | "sarcastic" | "anxious" | "aggressive";
        sceneId: string;
        styleDescription: string;
        events: {
            confidence: number;
            provenance: "voice_energy" | "voice_pitch" | "text_rule" | "scene_beat" | "style_rule" | "human_hint";
            description: string;
            target: string | null;
            bodyPart: string;
            intensity: number;
            startTime: number;
            endTime: number;
            kind: "blink" | "pose" | "hold" | "reaction" | "gesture" | "breath" | "gaze" | "weight_shift" | "facial_expression" | "head_accent" | "body_accent";
            alternatives: string[];
            eventId: string;
            relatedBeatId: string | null;
        }[];
        eventCount: number;
    }>, {
        confidence: number;
        provenance: {
            createdAt: string;
            engine: "rule_based PerformanceGenerator v1";
        };
        schemaVersion: "1.0";
        planId: string;
        assumptions: string[];
        characterId: string;
        style: "custom" | "comedic" | "restrained" | "energetic" | "sarcastic" | "anxious" | "aggressive";
        sceneId: string;
        styleDescription: string;
        events: {
            confidence: number;
            provenance: "voice_energy" | "voice_pitch" | "text_rule" | "scene_beat" | "style_rule" | "human_hint";
            description: string;
            target: string | null;
            bodyPart: string;
            intensity: number;
            startTime: number;
            endTime: number;
            kind: "blink" | "pose" | "hold" | "reaction" | "gesture" | "breath" | "gaze" | "weight_shift" | "facial_expression" | "head_accent" | "body_accent";
            alternatives: string[];
            eventId: string;
            relatedBeatId: string | null;
        }[];
        eventCount: number;
    }, {
        confidence: number;
        provenance: {
            createdAt: string;
            engine: "rule_based PerformanceGenerator v1";
        };
        schemaVersion: "1.0";
        planId: string;
        assumptions: string[];
        characterId: string;
        style: "custom" | "comedic" | "restrained" | "energetic" | "sarcastic" | "anxious" | "aggressive";
        sceneId: string;
        styleDescription: string;
        events: {
            confidence: number;
            provenance: "voice_energy" | "voice_pitch" | "text_rule" | "scene_beat" | "style_rule" | "human_hint";
            description: string;
            target: string | null;
            bodyPart: string;
            intensity: number;
            startTime: number;
            endTime: number;
            kind: "blink" | "pose" | "hold" | "reaction" | "gesture" | "breath" | "gaze" | "weight_shift" | "facial_expression" | "head_accent" | "body_accent";
            alternatives: string[];
            eventId: string;
            relatedBeatId: string | null;
        }[];
        eventCount: number;
    }>, "many">>;
    voiceAnalysis: z.ZodOptional<z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0">;
        audioPath: z.ZodNullable<z.ZodString>;
        audioAvailable: z.ZodBoolean;
        durationSeconds: z.ZodNumber;
        sampleRate: z.ZodNullable<z.ZodNumber>;
        transcript: z.ZodString;
        words: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
        }, {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
        }>, "many">;
        phonemes: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            confidence: z.ZodNumber;
        } & {
            word: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
            word: string;
        }, {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
            word: string;
        }>, "many">;
        stresses: z.ZodArray<z.ZodObject<{
            wordIndex: z.ZodNumber;
            time: z.ZodNumber;
            strength: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            time: number;
            wordIndex: number;
            strength: number;
        }, {
            time: number;
            wordIndex: number;
            strength: number;
        }>, "many">;
        pauses: z.ZodArray<z.ZodObject<{
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            duration: z.ZodNumber;
            kind: z.ZodEnum<["breath", "hesitation", "turn_gap", "silence"]>;
        }, "strict", z.ZodTypeAny, {
            duration: number;
            startTime: number;
            endTime: number;
            kind: "breath" | "hesitation" | "turn_gap" | "silence";
        }, {
            duration: number;
            startTime: number;
            endTime: number;
            kind: "breath" | "hesitation" | "turn_gap" | "silence";
        }>, "many">;
        loudness: z.ZodArray<z.ZodObject<{
            time: z.ZodNumber;
            rms: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            time: number;
            rms: number;
        }, {
            time: number;
            rms: number;
        }>, "many">;
        pitchContour: z.ZodArray<z.ZodObject<{
            time: z.ZodNumber;
            hz: z.ZodNumber;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            time: number;
            hz: number;
        }, {
            confidence: number;
            time: number;
            hz: number;
        }>, "many">;
        speechRateWpm: z.ZodNumber;
        breathPoints: z.ZodArray<z.ZodNumber, "many">;
        emotionalPeaks: z.ZodArray<z.ZodObject<{
            time: z.ZodNumber;
            strength: z.ZodNumber;
            label: z.ZodEnum<["energy_peak", "pitch_peak", "text_emphasis"]>;
            confidence: z.ZodNumber;
            alternatives: z.ZodArray<z.ZodString, "many">;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            label: "energy_peak" | "pitch_peak" | "text_emphasis";
            time: number;
            strength: number;
            alternatives: string[];
        }, {
            confidence: number;
            label: "energy_peak" | "pitch_peak" | "text_emphasis";
            time: number;
            strength: number;
            alternatives: string[];
        }>, "many">;
        turnTaking: z.ZodArray<z.ZodObject<{
            speaker: z.ZodString;
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            startTime: number;
            endTime: number;
            speaker: string;
        }, {
            startTime: number;
            endTime: number;
            speaker: string;
        }>, "many">;
        interruptions: z.ZodArray<z.ZodObject<{
            atTime: z.ZodNumber;
            speaker: z.ZodString;
            interruptedSpeaker: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            speaker: string;
            atTime: number;
            interruptedSpeaker: string;
        }, {
            speaker: string;
            atTime: number;
            interruptedSpeaker: string;
        }>, "many">;
        reactionWindows: z.ZodArray<z.ZodObject<{
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            trigger: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            startTime: number;
            endTime: number;
            trigger: string;
        }, {
            startTime: number;
            endTime: number;
            trigger: string;
        }>, "many">;
        assumptions: z.ZodArray<z.ZodString, "many">;
        provenance: z.ZodObject<{
            engine: z.ZodLiteral<"cpu VoicePerformanceAnalyzer v1">;
            alignment: z.ZodEnum<["energy_guided", "duration_proportional", "transcript_only"]>;
            emotionIsProxy: z.ZodLiteral<true>;
            createdAt: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            createdAt: string;
            engine: "cpu VoicePerformanceAnalyzer v1";
            alignment: "energy_guided" | "duration_proportional" | "transcript_only";
            emotionIsProxy: true;
        }, {
            createdAt: string;
            engine: "cpu VoicePerformanceAnalyzer v1";
            alignment: "energy_guided" | "duration_proportional" | "transcript_only";
            emotionIsProxy: true;
        }>;
    }, "strict", z.ZodTypeAny, {
        provenance: {
            createdAt: string;
            engine: "cpu VoicePerformanceAnalyzer v1";
            alignment: "energy_guided" | "duration_proportional" | "transcript_only";
            emotionIsProxy: true;
        };
        schemaVersion: "1.0";
        durationSeconds: number;
        assumptions: string[];
        phonemes: {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
            word: string;
        }[];
        audioPath: string | null;
        pauses: {
            duration: number;
            startTime: number;
            endTime: number;
            kind: "breath" | "hesitation" | "turn_gap" | "silence";
        }[];
        audioAvailable: boolean;
        sampleRate: number | null;
        transcript: string;
        words: {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
        }[];
        stresses: {
            time: number;
            wordIndex: number;
            strength: number;
        }[];
        loudness: {
            time: number;
            rms: number;
        }[];
        pitchContour: {
            confidence: number;
            time: number;
            hz: number;
        }[];
        speechRateWpm: number;
        breathPoints: number[];
        emotionalPeaks: {
            confidence: number;
            label: "energy_peak" | "pitch_peak" | "text_emphasis";
            time: number;
            strength: number;
            alternatives: string[];
        }[];
        turnTaking: {
            startTime: number;
            endTime: number;
            speaker: string;
        }[];
        interruptions: {
            speaker: string;
            atTime: number;
            interruptedSpeaker: string;
        }[];
        reactionWindows: {
            startTime: number;
            endTime: number;
            trigger: string;
        }[];
    }, {
        provenance: {
            createdAt: string;
            engine: "cpu VoicePerformanceAnalyzer v1";
            alignment: "energy_guided" | "duration_proportional" | "transcript_only";
            emotionIsProxy: true;
        };
        schemaVersion: "1.0";
        durationSeconds: number;
        assumptions: string[];
        phonemes: {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
            word: string;
        }[];
        audioPath: string | null;
        pauses: {
            duration: number;
            startTime: number;
            endTime: number;
            kind: "breath" | "hesitation" | "turn_gap" | "silence";
        }[];
        audioAvailable: boolean;
        sampleRate: number | null;
        transcript: string;
        words: {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
        }[];
        stresses: {
            time: number;
            wordIndex: number;
            strength: number;
        }[];
        loudness: {
            time: number;
            rms: number;
        }[];
        pitchContour: {
            confidence: number;
            time: number;
            hz: number;
        }[];
        speechRateWpm: number;
        breathPoints: number[];
        emotionalPeaks: {
            confidence: number;
            label: "energy_peak" | "pitch_peak" | "text_emphasis";
            time: number;
            strength: number;
            alternatives: string[];
        }[];
        turnTaking: {
            startTime: number;
            endTime: number;
            speaker: string;
        }[];
        interruptions: {
            speaker: string;
            atTime: number;
            interruptedSpeaker: string;
        }[];
        reactionWindows: {
            startTime: number;
            endTime: number;
            trigger: string;
        }[];
    }>>;
    digitalActors: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    partDecomposition: z.ZodOptional<z.ZodObject<{
        schemaVersion: z.ZodDefault<z.ZodString>;
        characterId: z.ZodString;
        bodyType: z.ZodDefault<z.ZodEnum<["humanoid", "quadruped", "creature", "object", "unknown"]>>;
        parts: z.ZodArray<z.ZodObject<{
            partId: z.ZodString;
            identity: z.ZodObject<{
                partId: z.ZodString;
                label: z.ZodString;
                isHumanoidPart: z.ZodBoolean;
                parentPartId: z.ZodNullable<z.ZodString>;
                depthOrder: z.ZodNumber;
                inferred: z.ZodDefault<z.ZodBoolean>;
            }, "strict", z.ZodTypeAny, {
                partId: string;
                parentPartId: string | null;
                label: string;
                inferred: boolean;
                isHumanoidPart: boolean;
                depthOrder: number;
            }, {
                partId: string;
                parentPartId: string | null;
                label: string;
                isHumanoidPart: boolean;
                depthOrder: number;
                inferred?: boolean | undefined;
            }>;
            frameStates: z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                visibleMask: z.ZodOptional<z.ZodObject<{
                    contourPoints: z.ZodArray<z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strict", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>, "many">;
                    boundingBox: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                        width: z.ZodNumber;
                        height: z.ZodNumber;
                    }, "strict", z.ZodTypeAny, {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    }, {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    }>;
                    area: z.ZodNumber;
                    confidence: z.ZodNumber;
                }, "strict", z.ZodTypeAny, {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                }, {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                }>>;
                amodalMask: z.ZodOptional<z.ZodObject<{
                    contourPoints: z.ZodArray<z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strict", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>, "many">;
                    boundingBox: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                        width: z.ZodNumber;
                        height: z.ZodNumber;
                    }, "strict", z.ZodTypeAny, {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    }, {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    }>;
                    area: z.ZodNumber;
                    confidence: z.ZodNumber;
                }, "strict", z.ZodTypeAny, {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                }, {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                }>>;
                center: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strict", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                motionDelta: z.ZodDefault<z.ZodObject<{
                    dx: z.ZodNumber;
                    dy: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    dx: number;
                    dy: number;
                }, {
                    dx: number;
                    dy: number;
                }>>;
                occluded: z.ZodDefault<z.ZodBoolean>;
                confidence: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                frame: number;
                confidence: number;
                center: {
                    x: number;
                    y: number;
                };
                motionDelta: {
                    dx: number;
                    dy: number;
                };
                occluded: boolean;
                visibleMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                amodalMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
            }, {
                frame: number;
                confidence: number;
                center: {
                    x: number;
                    y: number;
                };
                visibleMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                amodalMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                motionDelta?: {
                    dx: number;
                    dy: number;
                } | undefined;
                occluded?: boolean | undefined;
            }>, "many">;
            motionCluster: z.ZodDefault<z.ZodEnum<["rigid", "articulated", "deformable", "static", "unknown"]>>;
            articulationHints: z.ZodDefault<z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                hint: z.ZodString;
                confidence: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                frame: number;
                confidence: number;
                hint: string;
            }, {
                frame: number;
                confidence: number;
                hint: string;
            }>, "many">>;
            problemRanges: z.ZodDefault<z.ZodArray<z.ZodObject<{
                startFrame: z.ZodNumber;
                endFrame: z.ZodNumber;
                reason: z.ZodString;
                severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
            }, "strict", z.ZodTypeAny, {
                severity: "low" | "medium" | "high" | "critical";
                startFrame: number;
                endFrame: number;
                reason: string;
            }, {
                severity: "low" | "medium" | "high" | "critical";
                startFrame: number;
                endFrame: number;
                reason: string;
            }>, "many">>;
        }, "strict", z.ZodTypeAny, {
            partId: string;
            identity: {
                partId: string;
                parentPartId: string | null;
                label: string;
                inferred: boolean;
                isHumanoidPart: boolean;
                depthOrder: number;
            };
            frameStates: {
                frame: number;
                confidence: number;
                center: {
                    x: number;
                    y: number;
                };
                motionDelta: {
                    dx: number;
                    dy: number;
                };
                occluded: boolean;
                visibleMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                amodalMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
            }[];
            motionCluster: "unknown" | "static" | "rigid" | "articulated" | "deformable";
            articulationHints: {
                frame: number;
                confidence: number;
                hint: string;
            }[];
            problemRanges: {
                severity: "low" | "medium" | "high" | "critical";
                startFrame: number;
                endFrame: number;
                reason: string;
            }[];
        }, {
            partId: string;
            identity: {
                partId: string;
                parentPartId: string | null;
                label: string;
                isHumanoidPart: boolean;
                depthOrder: number;
                inferred?: boolean | undefined;
            };
            frameStates: {
                frame: number;
                confidence: number;
                center: {
                    x: number;
                    y: number;
                };
                visibleMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                amodalMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                motionDelta?: {
                    dx: number;
                    dy: number;
                } | undefined;
                occluded?: boolean | undefined;
            }[];
            motionCluster?: "unknown" | "static" | "rigid" | "articulated" | "deformable" | undefined;
            articulationHints?: {
                frame: number;
                confidence: number;
                hint: string;
            }[] | undefined;
            problemRanges?: {
                severity: "low" | "medium" | "high" | "critical";
                startFrame: number;
                endFrame: number;
                reason: string;
            }[] | undefined;
        }>, "many">;
        occlusionGraph: z.ZodArray<z.ZodObject<{
            occluderPartId: z.ZodString;
            occludedPartId: z.ZodString;
            overlapRatio: z.ZodNumber;
            frameRange: z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                end: number;
                start: number;
            }, {
                end: number;
                start: number;
            }>;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            occluderPartId: string;
            occludedPartId: string;
            overlapRatio: number;
            frameRange: {
                end: number;
                start: number;
            };
        }, {
            confidence: number;
            occluderPartId: string;
            occludedPartId: string;
            overlapRatio: number;
            frameRange: {
                end: number;
                start: number;
            };
        }>, "many">;
        identityContinuityScore: z.ZodNumber;
        totalProblemRanges: z.ZodNumber;
        provenance: z.ZodObject<{
            engine: z.ZodString;
            createdAt: z.ZodString;
            method: z.ZodEnum<["cpu_heuristic", "ml_segmenter", "hybrid"]>;
        }, "strict", z.ZodTypeAny, {
            method: "hybrid" | "cpu_heuristic" | "ml_segmenter";
            createdAt: string;
            engine: string;
        }, {
            method: "hybrid" | "cpu_heuristic" | "ml_segmenter";
            createdAt: string;
            engine: string;
        }>;
    }, "strict", z.ZodTypeAny, {
        provenance: {
            method: "hybrid" | "cpu_heuristic" | "ml_segmenter";
            createdAt: string;
            engine: string;
        };
        schemaVersion: string;
        characterId: string;
        parts: {
            partId: string;
            identity: {
                partId: string;
                parentPartId: string | null;
                label: string;
                inferred: boolean;
                isHumanoidPart: boolean;
                depthOrder: number;
            };
            frameStates: {
                frame: number;
                confidence: number;
                center: {
                    x: number;
                    y: number;
                };
                motionDelta: {
                    dx: number;
                    dy: number;
                };
                occluded: boolean;
                visibleMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                amodalMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
            }[];
            motionCluster: "unknown" | "static" | "rigid" | "articulated" | "deformable";
            articulationHints: {
                frame: number;
                confidence: number;
                hint: string;
            }[];
            problemRanges: {
                severity: "low" | "medium" | "high" | "critical";
                startFrame: number;
                endFrame: number;
                reason: string;
            }[];
        }[];
        bodyType: "object" | "unknown" | "humanoid" | "quadruped" | "creature";
        occlusionGraph: {
            confidence: number;
            occluderPartId: string;
            occludedPartId: string;
            overlapRatio: number;
            frameRange: {
                end: number;
                start: number;
            };
        }[];
        identityContinuityScore: number;
        totalProblemRanges: number;
    }, {
        provenance: {
            method: "hybrid" | "cpu_heuristic" | "ml_segmenter";
            createdAt: string;
            engine: string;
        };
        characterId: string;
        parts: {
            partId: string;
            identity: {
                partId: string;
                parentPartId: string | null;
                label: string;
                isHumanoidPart: boolean;
                depthOrder: number;
                inferred?: boolean | undefined;
            };
            frameStates: {
                frame: number;
                confidence: number;
                center: {
                    x: number;
                    y: number;
                };
                visibleMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                amodalMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                motionDelta?: {
                    dx: number;
                    dy: number;
                } | undefined;
                occluded?: boolean | undefined;
            }[];
            motionCluster?: "unknown" | "static" | "rigid" | "articulated" | "deformable" | undefined;
            articulationHints?: {
                frame: number;
                confidence: number;
                hint: string;
            }[] | undefined;
            problemRanges?: {
                severity: "low" | "medium" | "high" | "critical";
                startFrame: number;
                endFrame: number;
                reason: string;
            }[] | undefined;
        }[];
        occlusionGraph: {
            confidence: number;
            occluderPartId: string;
            occludedPartId: string;
            overlapRatio: number;
            frameRange: {
                end: number;
                start: number;
            };
        }[];
        identityContinuityScore: number;
        totalProblemRanges: number;
        schemaVersion?: string | undefined;
        bodyType?: "object" | "unknown" | "humanoid" | "quadruped" | "creature" | undefined;
    }>>;
    occlusionGraph: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    keyPoses: z.ZodOptional<z.ZodObject<{
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
    }>>;
    motionTracks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        trackId: z.ZodString;
        characterId: z.ZodString;
        partId: z.ZodString;
        representation: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector"]>;
        keyframes: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            position: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>>;
            rotation: z.ZodOptional<z.ZodNumber>;
            scale: z.ZodOptional<z.ZodNumber>;
            interpolation: z.ZodDefault<z.ZodEnum<["linear", "ease_in", "ease_out", "ease_in_out", "hold"]>>;
        }, "strict", z.ZodTypeAny, {
            frame: number;
            interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
            rotation?: number | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            scale?: number | undefined;
        }, {
            frame: number;
            rotation?: number | undefined;
            interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            scale?: number | undefined;
        }>, "many">;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        startFrame: number;
        endFrame: number;
        keyframes: {
            frame: number;
            interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
            rotation?: number | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            scale?: number | undefined;
        }[];
        trackId: string;
        characterId: string;
        partId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
    }, {
        startFrame: number;
        endFrame: number;
        keyframes: {
            frame: number;
            rotation?: number | undefined;
            interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            scale?: number | undefined;
        }[];
        trackId: string;
        characterId: string;
        partId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
    }>, "many">>;
    cameraTrack: z.ZodOptional<z.ZodAny>;
    cameraLayout: z.ZodOptional<z.ZodObject<{
        schemaVersion: z.ZodDefault<z.ZodString>;
        sceneId: z.ZodString;
        shots: z.ZodArray<z.ZodObject<{
            shotId: z.ZodString;
            sceneId: z.ZodString;
            beatIds: z.ZodArray<z.ZodString, "many">;
            characterIds: z.ZodArray<z.ZodString, "many">;
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            duration: z.ZodNumber;
            shotSize: z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>;
            cameraPosition: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                z: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
                z: number;
            }, {
                x: number;
                y: number;
                z: number;
            }>;
            cameraScale: z.ZodNumber;
            cameraMovement: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>;
            framingRules: z.ZodArray<z.ZodEnum<["rule_of_thirds", "center_framing", "leading_space", "headroom", "look_room", "short_space", "long_space"]>, "many">;
            focusOfAttention: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>;
            safeMargins: z.ZodObject<{
                top: z.ZodNumber;
                bottom: z.ZodNumber;
                left: z.ZodNumber;
                right: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                left: number;
                right: number;
                top: number;
                bottom: number;
            }, {
                left: number;
                right: number;
                top: number;
                bottom: number;
            }>;
            eyelines: z.ZodArray<z.ZodObject<{
                fromCharacterId: z.ZodString;
                toCharacterId: z.ZodNullable<z.ZodString>;
                direction: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                direction: number;
                fromCharacterId: string;
                toCharacterId: string | null;
            }, {
                direction: number;
                fromCharacterId: string;
                toCharacterId: string | null;
            }>, "many">;
            continuityNotes: z.ZodArray<z.ZodString, "many">;
            transitionIn: z.ZodDefault<z.ZodEnum<["cut", "dissolve", "fade_in", "wipe"]>>;
            transitionOut: z.ZodDefault<z.ZodEnum<["cut", "dissolve", "fade_out", "wipe"]>>;
            confidence: z.ZodNumber;
            explanation: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            duration: number;
            explanation: string;
            shotId: string;
            sceneId: string;
            startTime: number;
            endTime: number;
            beatIds: string[];
            characterIds: string[];
            shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
            cameraPosition: {
                x: number;
                y: number;
                z: number;
            };
            cameraScale: number;
            cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
            framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
            focusOfAttention: {
                x: number;
                y: number;
            };
            safeMargins: {
                left: number;
                right: number;
                top: number;
                bottom: number;
            };
            eyelines: {
                direction: number;
                fromCharacterId: string;
                toCharacterId: string | null;
            }[];
            continuityNotes: string[];
            transitionIn: "cut" | "dissolve" | "fade_in" | "wipe";
            transitionOut: "cut" | "dissolve" | "wipe" | "fade_out";
        }, {
            confidence: number;
            duration: number;
            explanation: string;
            shotId: string;
            sceneId: string;
            startTime: number;
            endTime: number;
            beatIds: string[];
            characterIds: string[];
            shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
            cameraPosition: {
                x: number;
                y: number;
                z: number;
            };
            cameraScale: number;
            cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
            framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
            focusOfAttention: {
                x: number;
                y: number;
            };
            safeMargins: {
                left: number;
                right: number;
                top: number;
                bottom: number;
            };
            eyelines: {
                direction: number;
                fromCharacterId: string;
                toCharacterId: string | null;
            }[];
            continuityNotes: string[];
            transitionIn?: "cut" | "dissolve" | "fade_in" | "wipe" | undefined;
            transitionOut?: "cut" | "dissolve" | "wipe" | "fade_out" | undefined;
        }>, "many">;
        cameraTrack: z.ZodObject<{
            trackId: z.ZodString;
            sceneId: z.ZodString;
            keyframes: z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                position: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                    z: z.ZodNumber;
                }, "strict", z.ZodTypeAny, {
                    x: number;
                    y: number;
                    z: number;
                }, {
                    x: number;
                    y: number;
                    z: number;
                }>;
                scale: z.ZodNumber;
                rotation: z.ZodOptional<z.ZodNumber>;
                interpolation: z.ZodDefault<z.ZodEnum<["linear", "ease_in", "ease_out", "ease_in_out", "hold"]>>;
            }, "strict", z.ZodTypeAny, {
                frame: number;
                interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: number;
                rotation?: number | undefined;
            }, {
                frame: number;
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: number;
                rotation?: number | undefined;
                interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
            }>, "many">;
            totalDuration: z.ZodNumber;
            movementType: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>;
        }, "strict", z.ZodTypeAny, {
            keyframes: {
                frame: number;
                interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: number;
                rotation?: number | undefined;
            }[];
            trackId: string;
            sceneId: string;
            totalDuration: number;
            movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        }, {
            keyframes: {
                frame: number;
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: number;
                rotation?: number | undefined;
                interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
            }[];
            trackId: string;
            sceneId: string;
            totalDuration: number;
            movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        }>;
        blockingPlans: z.ZodArray<z.ZodObject<{
            planId: z.ZodString;
            sceneId: z.ZodString;
            shotId: z.ZodString;
            positions: z.ZodArray<z.ZodObject<{
                characterId: z.ZodString;
                position: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strict", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                scale: z.ZodDefault<z.ZodNumber>;
                facing: z.ZodDefault<z.ZodNumber>;
                preset: z.ZodOptional<z.ZodEnum<["left", "center", "right", "close_up", "background"]>>;
            }, "strict", z.ZodTypeAny, {
                position: {
                    x: number;
                    y: number;
                };
                scale: number;
                characterId: string;
                facing: number;
                preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            }, {
                position: {
                    x: number;
                    y: number;
                };
                characterId: string;
                preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
                scale?: number | undefined;
                facing?: number | undefined;
            }>, "many">;
            continuityConstraints: z.ZodArray<z.ZodString, "many">;
        }, "strict", z.ZodTypeAny, {
            planId: string;
            shotId: string;
            sceneId: string;
            positions: {
                position: {
                    x: number;
                    y: number;
                };
                scale: number;
                characterId: string;
                facing: number;
                preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            }[];
            continuityConstraints: string[];
        }, {
            planId: string;
            shotId: string;
            sceneId: string;
            positions: {
                position: {
                    x: number;
                    y: number;
                };
                characterId: string;
                preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
                scale?: number | undefined;
                facing?: number | undefined;
            }[];
            continuityConstraints: string[];
        }>, "many">;
        summary: z.ZodObject<{
            totalShots: z.ZodNumber;
            averageShotDuration: z.ZodNumber;
            cameraMovements: z.ZodRecord<z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "zoom_in", "zoom_out", "arc_left", "arc_right", "crane_up", "crane_down"]>, z.ZodNumber>;
            shotSizes: z.ZodRecord<z.ZodEnum<["extreme_close_up", "close_up", "medium_close_up", "medium_shot", "medium_full_shot", "full_shot", "long_shot", "extreme_long_shot"]>, z.ZodNumber>;
            totalKeyframes: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            totalShots: number;
            averageShotDuration: number;
            cameraMovements: Partial<Record<"static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down", number>>;
            shotSizes: Partial<Record<"close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot", number>>;
            totalKeyframes: number;
        }, {
            totalShots: number;
            averageShotDuration: number;
            cameraMovements: Partial<Record<"static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down", number>>;
            shotSizes: Partial<Record<"close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot", number>>;
            totalKeyframes: number;
        }>;
        provenance: z.ZodObject<{
            engine: z.ZodString;
            createdAt: z.ZodString;
            method: z.ZodEnum<["rule_based", "ml_director", "hybrid"]>;
        }, "strict", z.ZodTypeAny, {
            method: "hybrid" | "rule_based" | "ml_director";
            createdAt: string;
            engine: string;
        }, {
            method: "hybrid" | "rule_based" | "ml_director";
            createdAt: string;
            engine: string;
        }>;
    }, "strict", z.ZodTypeAny, {
        provenance: {
            method: "hybrid" | "rule_based" | "ml_director";
            createdAt: string;
            engine: string;
        };
        schemaVersion: string;
        summary: {
            totalShots: number;
            averageShotDuration: number;
            cameraMovements: Partial<Record<"static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down", number>>;
            shotSizes: Partial<Record<"close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot", number>>;
            totalKeyframes: number;
        };
        shots: {
            confidence: number;
            duration: number;
            explanation: string;
            shotId: string;
            sceneId: string;
            startTime: number;
            endTime: number;
            beatIds: string[];
            characterIds: string[];
            shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
            cameraPosition: {
                x: number;
                y: number;
                z: number;
            };
            cameraScale: number;
            cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
            framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
            focusOfAttention: {
                x: number;
                y: number;
            };
            safeMargins: {
                left: number;
                right: number;
                top: number;
                bottom: number;
            };
            eyelines: {
                direction: number;
                fromCharacterId: string;
                toCharacterId: string | null;
            }[];
            continuityNotes: string[];
            transitionIn: "cut" | "dissolve" | "fade_in" | "wipe";
            transitionOut: "cut" | "dissolve" | "wipe" | "fade_out";
        }[];
        sceneId: string;
        cameraTrack: {
            keyframes: {
                frame: number;
                interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: number;
                rotation?: number | undefined;
            }[];
            trackId: string;
            sceneId: string;
            totalDuration: number;
            movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        };
        blockingPlans: {
            planId: string;
            shotId: string;
            sceneId: string;
            positions: {
                position: {
                    x: number;
                    y: number;
                };
                scale: number;
                characterId: string;
                facing: number;
                preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            }[];
            continuityConstraints: string[];
        }[];
    }, {
        provenance: {
            method: "hybrid" | "rule_based" | "ml_director";
            createdAt: string;
            engine: string;
        };
        summary: {
            totalShots: number;
            averageShotDuration: number;
            cameraMovements: Partial<Record<"static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down", number>>;
            shotSizes: Partial<Record<"close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot", number>>;
            totalKeyframes: number;
        };
        shots: {
            confidence: number;
            duration: number;
            explanation: string;
            shotId: string;
            sceneId: string;
            startTime: number;
            endTime: number;
            beatIds: string[];
            characterIds: string[];
            shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
            cameraPosition: {
                x: number;
                y: number;
                z: number;
            };
            cameraScale: number;
            cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
            framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
            focusOfAttention: {
                x: number;
                y: number;
            };
            safeMargins: {
                left: number;
                right: number;
                top: number;
                bottom: number;
            };
            eyelines: {
                direction: number;
                fromCharacterId: string;
                toCharacterId: string | null;
            }[];
            continuityNotes: string[];
            transitionIn?: "cut" | "dissolve" | "fade_in" | "wipe" | undefined;
            transitionOut?: "cut" | "dissolve" | "wipe" | "fade_out" | undefined;
        }[];
        sceneId: string;
        cameraTrack: {
            keyframes: {
                frame: number;
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: number;
                rotation?: number | undefined;
                interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
            }[];
            trackId: string;
            sceneId: string;
            totalDuration: number;
            movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        };
        blockingPlans: {
            planId: string;
            shotId: string;
            sceneId: string;
            positions: {
                position: {
                    x: number;
                    y: number;
                };
                characterId: string;
                preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
                scale?: number | undefined;
                facing?: number | undefined;
            }[];
            continuityConstraints: string[];
        }[];
        schemaVersion?: string | undefined;
    }>>;
    routingPlan: z.ZodOptional<z.ZodObject<{
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
    }>>;
    representationSegments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        partId: z.ZodString;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        representation: z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector"]>;
        explanation: z.ZodString;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        partId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
    }, {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        partId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
    }>, "many">>;
    gestureEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    gazeEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    facialEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    drawings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        drawingId: z.ZodString;
        partId: z.ZodString;
        name: z.ZodString;
        path: z.ZodString;
        variantType: z.ZodDefault<z.ZodEnum<["front", "side", "three_quarter", "back", "extreme"]>>;
        inferred: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        path: string;
        name: string;
        drawingId: string;
        partId: string;
        inferred: boolean;
        variantType: "front" | "back" | "three_quarter" | "side" | "extreme";
    }, {
        path: string;
        name: string;
        drawingId: string;
        partId: string;
        inferred?: boolean | undefined;
        variantType?: "front" | "back" | "three_quarter" | "side" | "extreme" | undefined;
    }>, "many">>;
    palettes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        paletteId: z.ZodString;
        name: z.ZodString;
        colors: z.ZodArray<z.ZodObject<{
            colorId: z.ZodString;
            name: z.ZodString;
            r: z.ZodNumber;
            g: z.ZodNumber;
            b: z.ZodNumber;
            a: z.ZodDefault<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a: number;
        }, {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        name: string;
        colors: {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a: number;
        }[];
        paletteId: string;
    }, {
        name: string;
        colors: {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }[];
        paletteId: string;
    }>, "many">>;
    exposureBlocks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        exposureId: z.ZodString;
        partId: z.ZodString;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        drawingId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        drawingId: string;
        startFrame: number;
        endFrame: number;
        partId: string;
        exposureId: string;
    }, {
        drawingId: string;
        startFrame: number;
        endFrame: number;
        partId: string;
        exposureId: string;
    }>, "many">>;
    criticReports: z.ZodOptional<z.ZodArray<z.ZodObject<{
        reportId: z.ZodString;
        variantId: z.ZodString;
        sceneId: z.ZodString;
        timestamp: z.ZodString;
        technicalChecks: z.ZodArray<z.ZodObject<{
            checkType: z.ZodEnum<["missing_drawings", "broken_exposures", "holes", "layer_order", "palette_inconsistency", "collisions", "detached_parts", "broken_pivots", "invalid_deformers", "excessive_keys", "unstable_contours", "frozen_motion", "lost_motion_events", "timing_mismatch", "pose_readability", "silhouette_clarity", "staging", "emotional_clarity", "gesture_motivation", "timing_quality", "spacing", "anticipation", "follow_through", "overacting", "underacting", "dead_motion", "mechanical_motion", "repetitive_gestures", "gaze_direction", "reaction_timing", "camera_motivation"]>;
            passed: z.ZodBoolean;
            score: z.ZodNumber;
            severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
            affectedFrames: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            affectedParts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            evidence: z.ZodString;
            recommendation: z.ZodOptional<z.ZodString>;
            alternative: z.ZodOptional<z.ZodString>;
            confidence: z.ZodNumber;
            humanReviewRequired: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            affectedFrames: number[];
            affectedParts: string[];
            humanReviewRequired: boolean;
            recommendation?: string | undefined;
            alternative?: string | undefined;
        }, {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            recommendation?: string | undefined;
            affectedFrames?: number[] | undefined;
            affectedParts?: string[] | undefined;
            alternative?: string | undefined;
            humanReviewRequired?: boolean | undefined;
        }>, "many">;
        artisticChecks: z.ZodArray<z.ZodObject<{
            checkType: z.ZodEnum<["missing_drawings", "broken_exposures", "holes", "layer_order", "palette_inconsistency", "collisions", "detached_parts", "broken_pivots", "invalid_deformers", "excessive_keys", "unstable_contours", "frozen_motion", "lost_motion_events", "timing_mismatch", "pose_readability", "silhouette_clarity", "staging", "emotional_clarity", "gesture_motivation", "timing_quality", "spacing", "anticipation", "follow_through", "overacting", "underacting", "dead_motion", "mechanical_motion", "repetitive_gestures", "gaze_direction", "reaction_timing", "camera_motivation"]>;
            passed: z.ZodBoolean;
            score: z.ZodNumber;
            severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
            affectedFrames: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            affectedParts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            evidence: z.ZodString;
            recommendation: z.ZodOptional<z.ZodString>;
            alternative: z.ZodOptional<z.ZodString>;
            confidence: z.ZodNumber;
            humanReviewRequired: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            affectedFrames: number[];
            affectedParts: string[];
            humanReviewRequired: boolean;
            recommendation?: string | undefined;
            alternative?: string | undefined;
        }, {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            recommendation?: string | undefined;
            affectedFrames?: number[] | undefined;
            affectedParts?: string[] | undefined;
            alternative?: string | undefined;
            humanReviewRequired?: boolean | undefined;
        }>, "many">;
        overallScore: z.ZodNumber;
        technicalScore: z.ZodNumber;
        artisticScore: z.ZodNumber;
        passed: z.ZodBoolean;
        criticalIssues: z.ZodNumber;
        highIssues: z.ZodNumber;
        recommendations: z.ZodArray<z.ZodString, "many">;
        humanReviewRequired: z.ZodBoolean;
        provenance: z.ZodObject<{
            engine: z.ZodString;
            version: z.ZodString;
            method: z.ZodEnum<["rule_based", "ml_critic", "hybrid"]>;
        }, "strict", z.ZodTypeAny, {
            method: "hybrid" | "rule_based" | "ml_critic";
            version: string;
            engine: string;
        }, {
            method: "hybrid" | "rule_based" | "ml_critic";
            version: string;
            engine: string;
        }>;
    }, "strict", z.ZodTypeAny, {
        provenance: {
            method: "hybrid" | "rule_based" | "ml_critic";
            version: string;
            engine: string;
        };
        timestamp: string;
        reportId: string;
        passed: boolean;
        sceneId: string;
        variantId: string;
        humanReviewRequired: boolean;
        technicalChecks: {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            affectedFrames: number[];
            affectedParts: string[];
            humanReviewRequired: boolean;
            recommendation?: string | undefined;
            alternative?: string | undefined;
        }[];
        artisticChecks: {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            affectedFrames: number[];
            affectedParts: string[];
            humanReviewRequired: boolean;
            recommendation?: string | undefined;
            alternative?: string | undefined;
        }[];
        overallScore: number;
        technicalScore: number;
        artisticScore: number;
        criticalIssues: number;
        highIssues: number;
        recommendations: string[];
    }, {
        provenance: {
            method: "hybrid" | "rule_based" | "ml_critic";
            version: string;
            engine: string;
        };
        timestamp: string;
        reportId: string;
        passed: boolean;
        sceneId: string;
        variantId: string;
        humanReviewRequired: boolean;
        technicalChecks: {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            recommendation?: string | undefined;
            affectedFrames?: number[] | undefined;
            affectedParts?: string[] | undefined;
            alternative?: string | undefined;
            humanReviewRequired?: boolean | undefined;
        }[];
        artisticChecks: {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            recommendation?: string | undefined;
            affectedFrames?: number[] | undefined;
            affectedParts?: string[] | undefined;
            alternative?: string | undefined;
            humanReviewRequired?: boolean | undefined;
        }[];
        overallScore: number;
        technicalScore: number;
        artisticScore: number;
        criticalIssues: number;
        highIssues: number;
        recommendations: string[];
    }>, "many">>;
    variantTournament: z.ZodOptional<z.ZodAny>;
    tasteScores: z.ZodOptional<z.ZodArray<z.ZodObject<{
        variantId: z.ZodString;
        variantA: z.ZodString;
        variantB: z.ZodString;
        preferredVariant: z.ZodString;
        score: z.ZodNumber;
        reasons: z.ZodArray<z.ZodString, "many">;
        conflictWithTechnicalMetrics: z.ZodDefault<z.ZodBoolean>;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        variantId: string;
        score: number;
        variantA: string;
        variantB: string;
        preferredVariant: string;
        reasons: string[];
        conflictWithTechnicalMetrics: boolean;
    }, {
        confidence: number;
        variantId: string;
        score: number;
        variantA: string;
        variantB: string;
        preferredVariant: string;
        reasons: string[];
        conflictWithTechnicalMetrics?: boolean | undefined;
    }>, "many">>;
    selectionHistory: z.ZodOptional<z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        variantId: z.ZodString;
        selectedBy: z.ZodString;
        reason: z.ZodString;
        automated: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        timestamp: string;
        selectedBy: string;
        reason: string;
        variantId: string;
        automated: boolean;
    }, {
        timestamp: string;
        selectedBy: string;
        reason: string;
        variantId: string;
        automated?: boolean | undefined;
    }>, "many">>;
    artistCorrections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        correctionId: z.ZodString;
        versionBefore: z.ZodString;
        versionAfter: z.ZodString;
        delta: z.ZodRecord<z.ZodString, z.ZodAny>;
        comment: z.ZodOptional<z.ZodString>;
        accepted: z.ZodDefault<z.ZodBoolean>;
        affectedFrames: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        affectedParts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        timestamp: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        timestamp: string;
        delta: Record<string, any>;
        affectedFrames: number[];
        affectedParts: string[];
        correctionId: string;
        versionBefore: string;
        versionAfter: string;
        accepted: boolean;
        comment?: string | undefined;
    }, {
        timestamp: string;
        delta: Record<string, any>;
        correctionId: string;
        versionBefore: string;
        versionAfter: string;
        comment?: string | undefined;
        affectedFrames?: number[] | undefined;
        affectedParts?: string[] | undefined;
        accepted?: boolean | undefined;
    }>, "many">>;
    trainingSignals: z.ZodOptional<z.ZodArray<z.ZodObject<{
        signalId: z.ZodString;
        type: z.ZodEnum<["pairwise_preference", "absolute_score", "correction_delta"]>;
        data: z.ZodRecord<z.ZodString, z.ZodAny>;
        privacyLevel: z.ZodDefault<z.ZodEnum<["public", "studio_only", "private"]>>;
        timestamp: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        data: Record<string, any>;
        type: "pairwise_preference" | "absolute_score" | "correction_delta";
        timestamp: string;
        signalId: string;
        privacyLevel: "public" | "studio_only" | "private";
    }, {
        data: Record<string, any>;
        type: "pairwise_preference" | "absolute_score" | "correction_delta";
        timestamp: string;
        signalId: string;
        privacyLevel?: "public" | "studio_only" | "private" | undefined;
    }>, "many">>;
    provenance: z.ZodObject<{
        pipeline: z.ZodString;
        iterations: z.ZodArray<z.ZodNumber, "many">;
        engine: z.ZodString;
        timestamp: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        timestamp: string;
        engine: string;
        pipeline: string;
        iterations: number[];
    }, {
        timestamp: string;
        engine: string;
        pipeline: string;
        iterations: number[];
    }>;
    limitations: z.ZodObject<{
        ruleBasedBaseline: z.ZodDefault<z.ZodBoolean>;
        noMlAdapters: z.ZodDefault<z.ZodBoolean>;
        noHarmonyApplied: z.ZodDefault<z.ZodBoolean>;
        artistIntentInferred: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        ruleBasedBaseline: boolean;
        noMlAdapters: boolean;
        noHarmonyApplied: boolean;
        artistIntentInferred: boolean;
    }, {
        ruleBasedBaseline?: boolean | undefined;
        noMlAdapters?: boolean | undefined;
        noHarmonyApplied?: boolean | undefined;
        artistIntentInferred?: boolean | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        timestamp: string;
        engine: string;
        pipeline: string;
        iterations: number[];
    };
    schemaVersion: "3.0";
    manifestId: string;
    createdAt: string;
    sceneId: string;
    limitations: {
        ruleBasedBaseline: boolean;
        noMlAdapters: boolean;
        noHarmonyApplied: boolean;
        artistIntentInferred: boolean;
    };
    palettes?: {
        name: string;
        colors: {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a: number;
        }[];
        paletteId: string;
    }[] | undefined;
    drawings?: {
        path: string;
        name: string;
        drawingId: string;
        partId: string;
        inferred: boolean;
        variantType: "front" | "back" | "three_quarter" | "side" | "extreme";
    }[] | undefined;
    representationSegments?: {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        partId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
    }[] | undefined;
    selectionHistory?: {
        timestamp: string;
        selectedBy: string;
        reason: string;
        variantId: string;
        automated: boolean;
    }[] | undefined;
    voiceAnalysis?: {
        provenance: {
            createdAt: string;
            engine: "cpu VoicePerformanceAnalyzer v1";
            alignment: "energy_guided" | "duration_proportional" | "transcript_only";
            emotionIsProxy: true;
        };
        schemaVersion: "1.0";
        durationSeconds: number;
        assumptions: string[];
        phonemes: {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
            word: string;
        }[];
        audioPath: string | null;
        pauses: {
            duration: number;
            startTime: number;
            endTime: number;
            kind: "breath" | "hesitation" | "turn_gap" | "silence";
        }[];
        audioAvailable: boolean;
        sampleRate: number | null;
        transcript: string;
        words: {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
        }[];
        stresses: {
            time: number;
            wordIndex: number;
            strength: number;
        }[];
        loudness: {
            time: number;
            rms: number;
        }[];
        pitchContour: {
            confidence: number;
            time: number;
            hz: number;
        }[];
        speechRateWpm: number;
        breathPoints: number[];
        emotionalPeaks: {
            confidence: number;
            label: "energy_peak" | "pitch_peak" | "text_emphasis";
            time: number;
            strength: number;
            alternatives: string[];
        }[];
        turnTaking: {
            startTime: number;
            endTime: number;
            speaker: string;
        }[];
        interruptions: {
            speaker: string;
            atTime: number;
            interruptedSpeaker: string;
        }[];
        reactionWindows: {
            startTime: number;
            endTime: number;
            trigger: string;
        }[];
    } | undefined;
    exposureBlocks?: {
        drawingId: string;
        startFrame: number;
        endFrame: number;
        partId: string;
        exposureId: string;
    }[] | undefined;
    occlusionGraph?: any[] | undefined;
    cameraTrack?: any;
    sceneUnderstanding?: {
        provenance: {
            createdAt: string;
            engine: "rule_based SceneUnderstandingEngine v1";
            notes: string;
        };
        startFrame: number;
        endFrame: number;
        schemaVersion: "1.0";
        fps: number;
        sceneName: string;
        assumptions: {
            id: string;
            confidence: number;
            description: string;
            evidence: string[];
            falsifiable: boolean;
        }[];
        continuity: {
            id: string;
            locked: boolean;
            description: string;
            kind: "prop" | "screen_direction" | "eyeline" | "screen_position" | "costume" | "lighting";
        }[];
        characters: {
            name: string;
            role: "unknown" | "background" | "protagonist" | "antagonist" | "supporting";
            characterId: string;
            emotionalArc: string;
            goalInScene: string;
            stance: "unknown" | "standing" | "sitting" | "lying" | "moving";
            hasDialogue: boolean;
            speaksFirst: boolean;
            receivesReaction: boolean;
            visibleOnScreen: boolean;
        }[];
        sceneId: string;
        sourceScript: string;
        totalDurationSeconds: number;
        sceneIntent: string;
        sceneIntentConfidence: number;
        beats: {
            confidence: number;
            action: string;
            emotion: string;
            beatId: string;
            startTime: number;
            endTime: number;
            primaryCharacter: string;
            intent: string;
            importance: number;
            suggestedPauseBefore: number;
            beatKind: "pause" | "unknown" | "resolution" | "setup" | "turn" | "reaction" | "rising_action" | "revelation" | "confrontation" | "tag";
            supportsStoryArc: boolean;
            assumptionIds: string[];
            reactionTarget?: string | null | undefined;
        }[];
        actionBeats: {
            confidence: number;
            beatId: string;
            speaker: string;
            actionVerb: string;
            durationSec: number;
            energy: "low" | "medium" | "high" | "spike";
        }[];
        reactionBeats: {
            confidence: number;
            beatId: string;
            reactor: string;
            triggerBeatId: string;
            reactionType: "silent_listen" | "micro" | "vocal" | "physical" | "turn_away" | "double_take";
        }[];
        emotionCurve: {
            confidence: number;
            characterId: string;
            label: string;
            time: number;
            valence: number;
            arousal: number;
            sourceBeatId?: string | null | undefined;
        }[];
        attentionTargets: {
            confidence: number;
            startFrame: number;
            endFrame: number;
            reason: string;
            focusCharacterId: string;
            focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
        }[];
        uncertainties: {
            reason: string;
            level: "low" | "medium" | "high" | "critical";
            needsHumanReview: boolean;
        }[];
    } | undefined;
    criticReports?: {
        provenance: {
            method: "hybrid" | "rule_based" | "ml_critic";
            version: string;
            engine: string;
        };
        timestamp: string;
        reportId: string;
        passed: boolean;
        sceneId: string;
        variantId: string;
        humanReviewRequired: boolean;
        technicalChecks: {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            affectedFrames: number[];
            affectedParts: string[];
            humanReviewRequired: boolean;
            recommendation?: string | undefined;
            alternative?: string | undefined;
        }[];
        artisticChecks: {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            affectedFrames: number[];
            affectedParts: string[];
            humanReviewRequired: boolean;
            recommendation?: string | undefined;
            alternative?: string | undefined;
        }[];
        overallScore: number;
        technicalScore: number;
        artisticScore: number;
        criticalIssues: number;
        highIssues: number;
        recommendations: string[];
    }[] | undefined;
    directorPlans?: any[] | undefined;
    performancePlans?: {
        confidence: number;
        provenance: {
            createdAt: string;
            engine: "rule_based PerformanceGenerator v1";
        };
        schemaVersion: "1.0";
        planId: string;
        assumptions: string[];
        characterId: string;
        style: "custom" | "comedic" | "restrained" | "energetic" | "sarcastic" | "anxious" | "aggressive";
        sceneId: string;
        styleDescription: string;
        events: {
            confidence: number;
            provenance: "voice_energy" | "voice_pitch" | "text_rule" | "scene_beat" | "style_rule" | "human_hint";
            description: string;
            target: string | null;
            bodyPart: string;
            intensity: number;
            startTime: number;
            endTime: number;
            kind: "blink" | "pose" | "hold" | "reaction" | "gesture" | "breath" | "gaze" | "weight_shift" | "facial_expression" | "head_accent" | "body_accent";
            alternatives: string[];
            eventId: string;
            relatedBeatId: string | null;
        }[];
        eventCount: number;
    }[] | undefined;
    digitalActors?: any[] | undefined;
    partDecomposition?: {
        provenance: {
            method: "hybrid" | "cpu_heuristic" | "ml_segmenter";
            createdAt: string;
            engine: string;
        };
        schemaVersion: string;
        characterId: string;
        parts: {
            partId: string;
            identity: {
                partId: string;
                parentPartId: string | null;
                label: string;
                inferred: boolean;
                isHumanoidPart: boolean;
                depthOrder: number;
            };
            frameStates: {
                frame: number;
                confidence: number;
                center: {
                    x: number;
                    y: number;
                };
                motionDelta: {
                    dx: number;
                    dy: number;
                };
                occluded: boolean;
                visibleMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                amodalMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
            }[];
            motionCluster: "unknown" | "static" | "rigid" | "articulated" | "deformable";
            articulationHints: {
                frame: number;
                confidence: number;
                hint: string;
            }[];
            problemRanges: {
                severity: "low" | "medium" | "high" | "critical";
                startFrame: number;
                endFrame: number;
                reason: string;
            }[];
        }[];
        bodyType: "object" | "unknown" | "humanoid" | "quadruped" | "creature";
        occlusionGraph: {
            confidence: number;
            occluderPartId: string;
            occludedPartId: string;
            overlapRatio: number;
            frameRange: {
                end: number;
                start: number;
            };
        }[];
        identityContinuityScore: number;
        totalProblemRanges: number;
    } | undefined;
    keyPoses?: {
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
    } | undefined;
    motionTracks?: {
        startFrame: number;
        endFrame: number;
        keyframes: {
            frame: number;
            interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
            rotation?: number | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            scale?: number | undefined;
        }[];
        trackId: string;
        characterId: string;
        partId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
    }[] | undefined;
    cameraLayout?: {
        provenance: {
            method: "hybrid" | "rule_based" | "ml_director";
            createdAt: string;
            engine: string;
        };
        schemaVersion: string;
        summary: {
            totalShots: number;
            averageShotDuration: number;
            cameraMovements: Partial<Record<"static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down", number>>;
            shotSizes: Partial<Record<"close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot", number>>;
            totalKeyframes: number;
        };
        shots: {
            confidence: number;
            duration: number;
            explanation: string;
            shotId: string;
            sceneId: string;
            startTime: number;
            endTime: number;
            beatIds: string[];
            characterIds: string[];
            shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
            cameraPosition: {
                x: number;
                y: number;
                z: number;
            };
            cameraScale: number;
            cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
            framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
            focusOfAttention: {
                x: number;
                y: number;
            };
            safeMargins: {
                left: number;
                right: number;
                top: number;
                bottom: number;
            };
            eyelines: {
                direction: number;
                fromCharacterId: string;
                toCharacterId: string | null;
            }[];
            continuityNotes: string[];
            transitionIn: "cut" | "dissolve" | "fade_in" | "wipe";
            transitionOut: "cut" | "dissolve" | "wipe" | "fade_out";
        }[];
        sceneId: string;
        cameraTrack: {
            keyframes: {
                frame: number;
                interpolation: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold";
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: number;
                rotation?: number | undefined;
            }[];
            trackId: string;
            sceneId: string;
            totalDuration: number;
            movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        };
        blockingPlans: {
            planId: string;
            shotId: string;
            sceneId: string;
            positions: {
                position: {
                    x: number;
                    y: number;
                };
                scale: number;
                characterId: string;
                facing: number;
                preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
            }[];
            continuityConstraints: string[];
        }[];
    } | undefined;
    routingPlan?: {
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
    } | undefined;
    gestureEvents?: any[] | undefined;
    gazeEvents?: any[] | undefined;
    facialEvents?: any[] | undefined;
    variantTournament?: any;
    tasteScores?: {
        confidence: number;
        variantId: string;
        score: number;
        variantA: string;
        variantB: string;
        preferredVariant: string;
        reasons: string[];
        conflictWithTechnicalMetrics: boolean;
    }[] | undefined;
    artistCorrections?: {
        timestamp: string;
        delta: Record<string, any>;
        affectedFrames: number[];
        affectedParts: string[];
        correctionId: string;
        versionBefore: string;
        versionAfter: string;
        accepted: boolean;
        comment?: string | undefined;
    }[] | undefined;
    trainingSignals?: {
        data: Record<string, any>;
        type: "pairwise_preference" | "absolute_score" | "correction_delta";
        timestamp: string;
        signalId: string;
        privacyLevel: "public" | "studio_only" | "private";
    }[] | undefined;
}, {
    provenance: {
        timestamp: string;
        engine: string;
        pipeline: string;
        iterations: number[];
    };
    manifestId: string;
    createdAt: string;
    sceneId: string;
    limitations: {
        ruleBasedBaseline?: boolean | undefined;
        noMlAdapters?: boolean | undefined;
        noHarmonyApplied?: boolean | undefined;
        artistIntentInferred?: boolean | undefined;
    };
    schemaVersion?: "3.0" | undefined;
    palettes?: {
        name: string;
        colors: {
            colorId: string;
            name: string;
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }[];
        paletteId: string;
    }[] | undefined;
    drawings?: {
        path: string;
        name: string;
        drawingId: string;
        partId: string;
        inferred?: boolean | undefined;
        variantType?: "front" | "back" | "three_quarter" | "side" | "extreme" | undefined;
    }[] | undefined;
    representationSegments?: {
        confidence: number;
        startFrame: number;
        endFrame: number;
        explanation: string;
        partId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
    }[] | undefined;
    selectionHistory?: {
        timestamp: string;
        selectedBy: string;
        reason: string;
        variantId: string;
        automated?: boolean | undefined;
    }[] | undefined;
    voiceAnalysis?: {
        provenance: {
            createdAt: string;
            engine: "cpu VoicePerformanceAnalyzer v1";
            alignment: "energy_guided" | "duration_proportional" | "transcript_only";
            emotionIsProxy: true;
        };
        schemaVersion: "1.0";
        durationSeconds: number;
        assumptions: string[];
        phonemes: {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
            word: string;
        }[];
        audioPath: string | null;
        pauses: {
            duration: number;
            startTime: number;
            endTime: number;
            kind: "breath" | "hesitation" | "turn_gap" | "silence";
        }[];
        audioAvailable: boolean;
        sampleRate: number | null;
        transcript: string;
        words: {
            confidence: number;
            text: string;
            startTime: number;
            endTime: number;
        }[];
        stresses: {
            time: number;
            wordIndex: number;
            strength: number;
        }[];
        loudness: {
            time: number;
            rms: number;
        }[];
        pitchContour: {
            confidence: number;
            time: number;
            hz: number;
        }[];
        speechRateWpm: number;
        breathPoints: number[];
        emotionalPeaks: {
            confidence: number;
            label: "energy_peak" | "pitch_peak" | "text_emphasis";
            time: number;
            strength: number;
            alternatives: string[];
        }[];
        turnTaking: {
            startTime: number;
            endTime: number;
            speaker: string;
        }[];
        interruptions: {
            speaker: string;
            atTime: number;
            interruptedSpeaker: string;
        }[];
        reactionWindows: {
            startTime: number;
            endTime: number;
            trigger: string;
        }[];
    } | undefined;
    exposureBlocks?: {
        drawingId: string;
        startFrame: number;
        endFrame: number;
        partId: string;
        exposureId: string;
    }[] | undefined;
    occlusionGraph?: any[] | undefined;
    cameraTrack?: any;
    sceneUnderstanding?: {
        provenance: {
            createdAt: string;
            engine: "rule_based SceneUnderstandingEngine v1";
            notes?: string | undefined;
        };
        endFrame: number;
        schemaVersion: "1.0";
        sceneName: string;
        characters: {
            name: string;
            characterId: string;
            emotionalArc: string;
            goalInScene: string;
            hasDialogue: boolean;
            role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
            stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
            speaksFirst?: boolean | undefined;
            receivesReaction?: boolean | undefined;
            visibleOnScreen?: boolean | undefined;
        }[];
        sceneId: string;
        sourceScript: string;
        totalDurationSeconds: number;
        sceneIntent: string;
        beats: {
            action: string;
            emotion: string;
            beatId: string;
            startTime: number;
            endTime: number;
            primaryCharacter: string;
            intent: string;
            importance: number;
            confidence?: number | undefined;
            reactionTarget?: string | null | undefined;
            suggestedPauseBefore?: number | undefined;
            beatKind?: "pause" | "unknown" | "resolution" | "setup" | "turn" | "reaction" | "rising_action" | "revelation" | "confrontation" | "tag" | undefined;
            supportsStoryArc?: boolean | undefined;
            assumptionIds?: string[] | undefined;
        }[];
        startFrame?: number | undefined;
        fps?: number | undefined;
        assumptions?: {
            id: string;
            confidence: number;
            description: string;
            evidence?: string[] | undefined;
            falsifiable?: boolean | undefined;
        }[] | undefined;
        continuity?: {
            id: string;
            description: string;
            kind: "prop" | "screen_direction" | "eyeline" | "screen_position" | "costume" | "lighting";
            locked?: boolean | undefined;
        }[] | undefined;
        sceneIntentConfidence?: number | undefined;
        actionBeats?: {
            beatId: string;
            speaker: string;
            actionVerb: string;
            durationSec: number;
            confidence?: number | undefined;
            energy?: "low" | "medium" | "high" | "spike" | undefined;
        }[] | undefined;
        reactionBeats?: {
            beatId: string;
            reactor: string;
            triggerBeatId: string;
            confidence?: number | undefined;
            reactionType?: "silent_listen" | "micro" | "vocal" | "physical" | "turn_away" | "double_take" | undefined;
        }[] | undefined;
        emotionCurve?: {
            characterId: string;
            label: string;
            time: number;
            valence: number;
            arousal: number;
            confidence?: number | undefined;
            sourceBeatId?: string | null | undefined;
        }[] | undefined;
        attentionTargets?: {
            startFrame: number;
            endFrame: number;
            reason: string;
            focusCharacterId: string;
            confidence?: number | undefined;
            focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
        }[] | undefined;
        uncertainties?: {
            reason: string;
            level: "low" | "medium" | "high" | "critical";
            needsHumanReview?: boolean | undefined;
        }[] | undefined;
    } | undefined;
    criticReports?: {
        provenance: {
            method: "hybrid" | "rule_based" | "ml_critic";
            version: string;
            engine: string;
        };
        timestamp: string;
        reportId: string;
        passed: boolean;
        sceneId: string;
        variantId: string;
        humanReviewRequired: boolean;
        technicalChecks: {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            recommendation?: string | undefined;
            affectedFrames?: number[] | undefined;
            affectedParts?: string[] | undefined;
            alternative?: string | undefined;
            humanReviewRequired?: boolean | undefined;
        }[];
        artisticChecks: {
            confidence: number;
            severity: "low" | "medium" | "high" | "critical" | "info";
            passed: boolean;
            evidence: string;
            score: number;
            checkType: "staging" | "missing_drawings" | "broken_exposures" | "holes" | "layer_order" | "palette_inconsistency" | "collisions" | "detached_parts" | "broken_pivots" | "invalid_deformers" | "excessive_keys" | "unstable_contours" | "frozen_motion" | "lost_motion_events" | "timing_mismatch" | "pose_readability" | "silhouette_clarity" | "emotional_clarity" | "gesture_motivation" | "timing_quality" | "spacing" | "anticipation" | "follow_through" | "overacting" | "underacting" | "dead_motion" | "mechanical_motion" | "repetitive_gestures" | "gaze_direction" | "reaction_timing" | "camera_motivation";
            recommendation?: string | undefined;
            affectedFrames?: number[] | undefined;
            affectedParts?: string[] | undefined;
            alternative?: string | undefined;
            humanReviewRequired?: boolean | undefined;
        }[];
        overallScore: number;
        technicalScore: number;
        artisticScore: number;
        criticalIssues: number;
        highIssues: number;
        recommendations: string[];
    }[] | undefined;
    directorPlans?: any[] | undefined;
    performancePlans?: {
        confidence: number;
        provenance: {
            createdAt: string;
            engine: "rule_based PerformanceGenerator v1";
        };
        schemaVersion: "1.0";
        planId: string;
        assumptions: string[];
        characterId: string;
        style: "custom" | "comedic" | "restrained" | "energetic" | "sarcastic" | "anxious" | "aggressive";
        sceneId: string;
        styleDescription: string;
        events: {
            confidence: number;
            provenance: "voice_energy" | "voice_pitch" | "text_rule" | "scene_beat" | "style_rule" | "human_hint";
            description: string;
            target: string | null;
            bodyPart: string;
            intensity: number;
            startTime: number;
            endTime: number;
            kind: "blink" | "pose" | "hold" | "reaction" | "gesture" | "breath" | "gaze" | "weight_shift" | "facial_expression" | "head_accent" | "body_accent";
            alternatives: string[];
            eventId: string;
            relatedBeatId: string | null;
        }[];
        eventCount: number;
    }[] | undefined;
    digitalActors?: any[] | undefined;
    partDecomposition?: {
        provenance: {
            method: "hybrid" | "cpu_heuristic" | "ml_segmenter";
            createdAt: string;
            engine: string;
        };
        characterId: string;
        parts: {
            partId: string;
            identity: {
                partId: string;
                parentPartId: string | null;
                label: string;
                isHumanoidPart: boolean;
                depthOrder: number;
                inferred?: boolean | undefined;
            };
            frameStates: {
                frame: number;
                confidence: number;
                center: {
                    x: number;
                    y: number;
                };
                visibleMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                amodalMask?: {
                    area: number;
                    confidence: number;
                    contourPoints: {
                        x: number;
                        y: number;
                    }[];
                    boundingBox: {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                    };
                } | undefined;
                motionDelta?: {
                    dx: number;
                    dy: number;
                } | undefined;
                occluded?: boolean | undefined;
            }[];
            motionCluster?: "unknown" | "static" | "rigid" | "articulated" | "deformable" | undefined;
            articulationHints?: {
                frame: number;
                confidence: number;
                hint: string;
            }[] | undefined;
            problemRanges?: {
                severity: "low" | "medium" | "high" | "critical";
                startFrame: number;
                endFrame: number;
                reason: string;
            }[] | undefined;
        }[];
        occlusionGraph: {
            confidence: number;
            occluderPartId: string;
            occludedPartId: string;
            overlapRatio: number;
            frameRange: {
                end: number;
                start: number;
            };
        }[];
        identityContinuityScore: number;
        totalProblemRanges: number;
        schemaVersion?: string | undefined;
        bodyType?: "object" | "unknown" | "humanoid" | "quadruped" | "creature" | undefined;
    } | undefined;
    keyPoses?: {
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
    } | undefined;
    motionTracks?: {
        startFrame: number;
        endFrame: number;
        keyframes: {
            frame: number;
            rotation?: number | undefined;
            interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            scale?: number | undefined;
        }[];
        trackId: string;
        characterId: string;
        partId: string;
        representation: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution";
    }[] | undefined;
    cameraLayout?: {
        provenance: {
            method: "hybrid" | "rule_based" | "ml_director";
            createdAt: string;
            engine: string;
        };
        summary: {
            totalShots: number;
            averageShotDuration: number;
            cameraMovements: Partial<Record<"static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down", number>>;
            shotSizes: Partial<Record<"close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot", number>>;
            totalKeyframes: number;
        };
        shots: {
            confidence: number;
            duration: number;
            explanation: string;
            shotId: string;
            sceneId: string;
            startTime: number;
            endTime: number;
            beatIds: string[];
            characterIds: string[];
            shotSize: "close_up" | "extreme_close_up" | "medium_close_up" | "medium_shot" | "medium_full_shot" | "full_shot" | "long_shot" | "extreme_long_shot";
            cameraPosition: {
                x: number;
                y: number;
                z: number;
            };
            cameraScale: number;
            cameraMovement: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
            framingRules: ("rule_of_thirds" | "center_framing" | "leading_space" | "headroom" | "look_room" | "short_space" | "long_space")[];
            focusOfAttention: {
                x: number;
                y: number;
            };
            safeMargins: {
                left: number;
                right: number;
                top: number;
                bottom: number;
            };
            eyelines: {
                direction: number;
                fromCharacterId: string;
                toCharacterId: string | null;
            }[];
            continuityNotes: string[];
            transitionIn?: "cut" | "dissolve" | "fade_in" | "wipe" | undefined;
            transitionOut?: "cut" | "dissolve" | "wipe" | "fade_out" | undefined;
        }[];
        sceneId: string;
        cameraTrack: {
            keyframes: {
                frame: number;
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: number;
                rotation?: number | undefined;
                interpolation?: "linear" | "ease_in" | "ease_out" | "ease_in_out" | "hold" | undefined;
            }[];
            trackId: string;
            sceneId: string;
            totalDuration: number;
            movementType: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc_left" | "arc_right" | "crane_up" | "crane_down";
        };
        blockingPlans: {
            planId: string;
            shotId: string;
            sceneId: string;
            positions: {
                position: {
                    x: number;
                    y: number;
                };
                characterId: string;
                preset?: "center" | "left" | "right" | "background" | "close_up" | undefined;
                scale?: number | undefined;
                facing?: number | undefined;
            }[];
            continuityConstraints: string[];
        }[];
        schemaVersion?: string | undefined;
    } | undefined;
    routingPlan?: {
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
    } | undefined;
    gestureEvents?: any[] | undefined;
    gazeEvents?: any[] | undefined;
    facialEvents?: any[] | undefined;
    variantTournament?: any;
    tasteScores?: {
        confidence: number;
        variantId: string;
        score: number;
        variantA: string;
        variantB: string;
        preferredVariant: string;
        reasons: string[];
        conflictWithTechnicalMetrics?: boolean | undefined;
    }[] | undefined;
    artistCorrections?: {
        timestamp: string;
        delta: Record<string, any>;
        correctionId: string;
        versionBefore: string;
        versionAfter: string;
        comment?: string | undefined;
        affectedFrames?: number[] | undefined;
        affectedParts?: string[] | undefined;
        accepted?: boolean | undefined;
    }[] | undefined;
    trainingSignals?: {
        data: Record<string, any>;
        type: "pairwise_preference" | "absolute_score" | "correction_delta";
        timestamp: string;
        signalId: string;
        privacyLevel?: "public" | "studio_only" | "private" | undefined;
    }[] | undefined;
}>;
export type HarmonyManifestV3 = z.infer<typeof harmonyManifestV3Schema>;
export type MotionTrack = z.infer<typeof motionTrackSchema>;
export type ExposureBlock = z.infer<typeof exposureBlockSchema>;
export type DrawingAsset = z.infer<typeof drawingAssetSchema>;
export type Palette = z.infer<typeof paletteSchema>;
export type TasteScore = z.infer<typeof tasteScoreSchema>;
export type SelectionHistoryEntry = z.infer<typeof selectionHistoryEntrySchema>;
export type ArtistCorrection = z.infer<typeof artistCorrectionSchema>;
export type TrainingSignal = z.infer<typeof trainingSignalSchema>;
export type RepresentationSegment = z.infer<typeof representationSegmentSchema>;
