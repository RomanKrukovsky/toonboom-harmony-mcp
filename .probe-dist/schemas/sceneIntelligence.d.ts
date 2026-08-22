import { z } from 'zod';
/**
 * sceneIntelligence.ts — Scene Understanding Engine + AI Director schemas.
 *
 * Iteration 1 of AI Animation Studio (Master Prompt §1 and §2).
 * Provides a strict, Zod-validated contract between:
 *   - SceneUnderstandingEngine (rule-based scene understanding)
 *   - ScriptDirector (shot decomposition + camera + blocking + variants)
 *   - downstream tools (key poses, performance, motion, critic)
 *
 * Rule-based baseline is the only required path. An optional LLM adapter
 * may refine beats/intents later but must NOT be a hard dependency.
 */
export declare const SCENE_INTELLIGENCE_SCHEMA_VERSION = "1.0";
export declare const uncertaintySchema: z.ZodObject<{
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
}>;
export declare const assumptionSchema: z.ZodObject<{
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
}>;
export declare const characterIntentSchema: z.ZodObject<{
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
}>;
export declare const beatKindSchema: z.ZodEnum<["setup", "rising_action", "turn", "revelation", "confrontation", "pause", "reaction", "resolution", "tag", "unknown"]>;
export declare const dramaticBeatSchema: z.ZodObject<{
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
}>;
export declare const actionBeatSchema: z.ZodObject<{
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
}>;
export declare const reactionBeatSchema: z.ZodObject<{
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
}>;
export declare const emotionCurveSampleSchema: z.ZodObject<{
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
}>;
export declare const emotionCurveSchema: z.ZodArray<z.ZodObject<{
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
}>, "many">;
export declare const attentionTargetSchema: z.ZodObject<{
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
}>;
export declare const continuityConstraintSchema: z.ZodObject<{
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
}>;
export declare const sceneUnderstandingSchema: z.ZodEffects<z.ZodObject<{
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
}>;
export type SceneUnderstanding = z.infer<typeof sceneUnderstandingSchema>;
export type DramaticBeat = z.infer<typeof dramaticBeatSchema>;
export type CharacterIntent = z.infer<typeof characterIntentSchema>;
export type AttentionTarget = z.infer<typeof attentionTargetSchema>;
export type Uncertainty = z.infer<typeof uncertaintySchema>;
export type Assumption = z.infer<typeof assumptionSchema>;
export type EmotionCurveSample = z.infer<typeof emotionCurveSampleSchema>;
export type ActionBeat = z.infer<typeof actionBeatSchema>;
export type ReactionBeat = z.infer<typeof reactionBeatSchema>;
export type ContinuityConstraint = z.infer<typeof continuityConstraintSchema>;
export type EmotionCurve = z.infer<typeof emotionCurveSchema>;
export declare const shotFramingSchema: z.ZodEnum<["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "OTS", "POV", "two_shot", "insert"]>;
export declare const cameraMoveSchema: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "zoom_in", "zoom_out", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "arc", "handheld", "crane", "rack_focus"]>;
export declare const shotPlanSchema: z.ZodObject<{
    shotId: z.ZodString;
    shotIndex: z.ZodNumber;
    beatId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    framing: z.ZodEnum<["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "OTS", "POV", "two_shot", "insert"]>;
    cameraMove: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "zoom_in", "zoom_out", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "arc", "handheld", "crane", "rack_focus"]>;
    durationFrames: z.ZodNumber;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    charactersInFrame: z.ZodArray<z.ZodString, "many">;
    primaryFocusCharacterId: z.ZodString;
    staging: z.ZodDefault<z.ZodEnum<["left", "center", "right", "left_right", "center_foreground", "right_background", "symmetric"]>>;
    dialogue: z.ZodDefault<z.ZodBoolean>;
    eyeline: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodString;
    rationale: z.ZodString;
    confidence: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    startFrame: number;
    endFrame: number;
    description: string;
    shotId: string;
    durationFrames: number;
    framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
    cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
    charactersInFrame: string[];
    dialogue: boolean;
    shotIndex: number;
    primaryFocusCharacterId: string;
    staging: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric";
    rationale: string;
    beatId?: string | null | undefined;
    eyeline?: string | null | undefined;
}, {
    startFrame: number;
    endFrame: number;
    description: string;
    shotId: string;
    durationFrames: number;
    framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
    cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
    charactersInFrame: string[];
    shotIndex: number;
    primaryFocusCharacterId: string;
    rationale: string;
    confidence?: number | undefined;
    dialogue?: boolean | undefined;
    beatId?: string | null | undefined;
    eyeline?: string | null | undefined;
    staging?: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric" | undefined;
}>;
export declare const blockingPlanSchema: z.ZodObject<{
    characterId: z.ZodString;
    startPosition: z.ZodDefault<z.ZodEnum<["left", "center_left", "center", "center_right", "right", "offscreen_left", "offscreen_right"]>>;
    endPosition: z.ZodDefault<z.ZodEnum<["left", "center_left", "center", "center_right", "right", "offscreen_left", "offscreen_right"]>>;
    movement: z.ZodDefault<z.ZodEnum<["none", "enter", "exit", "cross", "turn", "sit", "stand", "approach", "retreat"]>>;
    notes: z.ZodDefault<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    characterId: string;
    notes: string;
    startPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
    endPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
    movement: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat";
}, {
    characterId: string;
    notes?: string | undefined;
    startPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
    endPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
    movement?: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat" | undefined;
}>;
export declare const cameraPlanSchema: z.ZodObject<{
    shotCount: z.ZodNumber;
    dominantFraming: z.ZodEnum<["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "OTS", "POV", "two_shot", "insert"]>;
    dominantCameraMove: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "zoom_in", "zoom_out", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "arc", "handheld", "crane", "rack_focus"]>;
    hasCameraMotion: z.ZodDefault<z.ZodBoolean>;
    pushInBeatIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    reactionShotIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    shotCount: number;
    dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
    dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
    hasCameraMotion: boolean;
    pushInBeatIds: string[];
    reactionShotIds: string[];
}, {
    shotCount: number;
    dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
    dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
    hasCameraMotion?: boolean | undefined;
    pushInBeatIds?: string[] | undefined;
    reactionShotIds?: string[] | undefined;
}>;
export declare const attentionPlanSchema: z.ZodObject<{
    shotId: z.ZodString;
    focusCharacterId: z.ZodString;
    focusType: z.ZodDefault<z.ZodEnum<["speaker", "reactor", "object", "environment", "shared"]>>;
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    reason: string;
    shotId: string;
    focusCharacterId: string;
    focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
}, {
    reason: string;
    shotId: string;
    focusCharacterId: string;
    focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
}>;
export declare const editDecisionSchema: z.ZodObject<{
    cutFrame: z.ZodNumber;
    fromShotId: z.ZodString;
    toShotId: z.ZodString;
    cutType: z.ZodDefault<z.ZodEnum<["hard", "soft", "match_action", "match_on_look", "L_cut", "J_cut", "smash"]>>;
    rationale: z.ZodString;
}, "strict", z.ZodTypeAny, {
    rationale: string;
    cutFrame: number;
    fromShotId: string;
    toShotId: string;
    cutType: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash";
}, {
    rationale: string;
    cutFrame: number;
    fromShotId: string;
    toShotId: string;
    cutType?: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash" | undefined;
}>;
export declare const directorStrategySchema: z.ZodEnum<["restrained_dialogue", "commercial_dynamic", "dramatic_closeup", "comedic_timing", "anime_limited", "theatrical_staging", "single_take", "custom"]>;
export declare const directorPlanSchema: z.ZodEffects<z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    planId: z.ZodString;
    sceneId: z.ZodString;
    strategy: z.ZodEnum<["restrained_dialogue", "commercial_dynamic", "dramatic_closeup", "comedic_timing", "anime_limited", "theatrical_staging", "single_take", "custom"]>;
    strategyDescription: z.ZodString;
    shots: z.ZodArray<z.ZodObject<{
        shotId: z.ZodString;
        shotIndex: z.ZodNumber;
        beatId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        framing: z.ZodEnum<["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "OTS", "POV", "two_shot", "insert"]>;
        cameraMove: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "zoom_in", "zoom_out", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "arc", "handheld", "crane", "rack_focus"]>;
        durationFrames: z.ZodNumber;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        charactersInFrame: z.ZodArray<z.ZodString, "many">;
        primaryFocusCharacterId: z.ZodString;
        staging: z.ZodDefault<z.ZodEnum<["left", "center", "right", "left_right", "center_foreground", "right_background", "symmetric"]>>;
        dialogue: z.ZodDefault<z.ZodBoolean>;
        eyeline: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodString;
        rationale: z.ZodString;
        confidence: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        startFrame: number;
        endFrame: number;
        description: string;
        shotId: string;
        durationFrames: number;
        framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        charactersInFrame: string[];
        dialogue: boolean;
        shotIndex: number;
        primaryFocusCharacterId: string;
        staging: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric";
        rationale: string;
        beatId?: string | null | undefined;
        eyeline?: string | null | undefined;
    }, {
        startFrame: number;
        endFrame: number;
        description: string;
        shotId: string;
        durationFrames: number;
        framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        charactersInFrame: string[];
        shotIndex: number;
        primaryFocusCharacterId: string;
        rationale: string;
        confidence?: number | undefined;
        dialogue?: boolean | undefined;
        beatId?: string | null | undefined;
        eyeline?: string | null | undefined;
        staging?: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric" | undefined;
    }>, "many">;
    camera: z.ZodObject<{
        shotCount: z.ZodNumber;
        dominantFraming: z.ZodEnum<["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "OTS", "POV", "two_shot", "insert"]>;
        dominantCameraMove: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "zoom_in", "zoom_out", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "arc", "handheld", "crane", "rack_focus"]>;
        hasCameraMotion: z.ZodDefault<z.ZodBoolean>;
        pushInBeatIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        reactionShotIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        shotCount: number;
        dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        hasCameraMotion: boolean;
        pushInBeatIds: string[];
        reactionShotIds: string[];
    }, {
        shotCount: number;
        dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        hasCameraMotion?: boolean | undefined;
        pushInBeatIds?: string[] | undefined;
        reactionShotIds?: string[] | undefined;
    }>;
    blocking: z.ZodDefault<z.ZodArray<z.ZodObject<{
        characterId: z.ZodString;
        startPosition: z.ZodDefault<z.ZodEnum<["left", "center_left", "center", "center_right", "right", "offscreen_left", "offscreen_right"]>>;
        endPosition: z.ZodDefault<z.ZodEnum<["left", "center_left", "center", "center_right", "right", "offscreen_left", "offscreen_right"]>>;
        movement: z.ZodDefault<z.ZodEnum<["none", "enter", "exit", "cross", "turn", "sit", "stand", "approach", "retreat"]>>;
        notes: z.ZodDefault<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        characterId: string;
        notes: string;
        startPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
        endPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
        movement: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat";
    }, {
        characterId: string;
        notes?: string | undefined;
        startPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
        endPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
        movement?: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat" | undefined;
    }>, "many">>;
    attention: z.ZodDefault<z.ZodArray<z.ZodObject<{
        shotId: z.ZodString;
        focusCharacterId: z.ZodString;
        focusType: z.ZodDefault<z.ZodEnum<["speaker", "reactor", "object", "environment", "shared"]>>;
        reason: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        reason: string;
        shotId: string;
        focusCharacterId: string;
        focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
    }, {
        reason: string;
        shotId: string;
        focusCharacterId: string;
        focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
    }>, "many">>;
    editDecisions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        cutFrame: z.ZodNumber;
        fromShotId: z.ZodString;
        toShotId: z.ZodString;
        cutType: z.ZodDefault<z.ZodEnum<["hard", "soft", "match_action", "match_on_look", "L_cut", "J_cut", "smash"]>>;
        rationale: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        rationale: string;
        cutFrame: number;
        fromShotId: string;
        toShotId: string;
        cutType: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash";
    }, {
        rationale: string;
        cutFrame: number;
        fromShotId: string;
        toShotId: string;
        cutType?: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash" | undefined;
    }>, "many">>;
    pauses: z.ZodDefault<z.ZodArray<z.ZodObject<{
        beatId: z.ZodString;
        durationFrames: z.ZodNumber;
        rationale: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        durationFrames: number;
        beatId: string;
        rationale: string;
    }, {
        durationFrames: number;
        beatId: string;
        rationale: string;
    }>, "many">>;
    dramaticEmphasisBeatIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    reactionShotCount: z.ZodDefault<z.ZodNumber>;
    shotCount: z.ZodNumber;
    totalDurationFrames: z.ZodNumber;
    confidence: z.ZodDefault<z.ZodNumber>;
    rationale: z.ZodString;
    provenance: z.ZodObject<{
        engine: z.ZodLiteral<"rule_based ScriptDirector v1">;
        createdAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        createdAt: string;
        engine: "rule_based ScriptDirector v1";
    }, {
        createdAt: string;
        engine: "rule_based ScriptDirector v1";
    }>;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    provenance: {
        createdAt: string;
        engine: "rule_based ScriptDirector v1";
    };
    schemaVersion: "1.0";
    planId: string;
    camera: {
        shotCount: number;
        dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        hasCameraMotion: boolean;
        pushInBeatIds: string[];
        reactionShotIds: string[];
    };
    shots: {
        confidence: number;
        startFrame: number;
        endFrame: number;
        description: string;
        shotId: string;
        durationFrames: number;
        framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        charactersInFrame: string[];
        dialogue: boolean;
        shotIndex: number;
        primaryFocusCharacterId: string;
        staging: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric";
        rationale: string;
        beatId?: string | null | undefined;
        eyeline?: string | null | undefined;
    }[];
    blocking: {
        characterId: string;
        notes: string;
        startPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
        endPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
        movement: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat";
    }[];
    sceneId: string;
    shotCount: number;
    rationale: string;
    strategy: "custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take";
    strategyDescription: string;
    attention: {
        reason: string;
        shotId: string;
        focusCharacterId: string;
        focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
    }[];
    editDecisions: {
        rationale: string;
        cutFrame: number;
        fromShotId: string;
        toShotId: string;
        cutType: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash";
    }[];
    pauses: {
        durationFrames: number;
        beatId: string;
        rationale: string;
    }[];
    dramaticEmphasisBeatIds: string[];
    reactionShotCount: number;
    totalDurationFrames: number;
}, {
    provenance: {
        createdAt: string;
        engine: "rule_based ScriptDirector v1";
    };
    schemaVersion: "1.0";
    planId: string;
    camera: {
        shotCount: number;
        dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        hasCameraMotion?: boolean | undefined;
        pushInBeatIds?: string[] | undefined;
        reactionShotIds?: string[] | undefined;
    };
    shots: {
        startFrame: number;
        endFrame: number;
        description: string;
        shotId: string;
        durationFrames: number;
        framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        charactersInFrame: string[];
        shotIndex: number;
        primaryFocusCharacterId: string;
        rationale: string;
        confidence?: number | undefined;
        dialogue?: boolean | undefined;
        beatId?: string | null | undefined;
        eyeline?: string | null | undefined;
        staging?: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric" | undefined;
    }[];
    sceneId: string;
    shotCount: number;
    rationale: string;
    strategy: "custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take";
    strategyDescription: string;
    totalDurationFrames: number;
    confidence?: number | undefined;
    blocking?: {
        characterId: string;
        notes?: string | undefined;
        startPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
        endPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
        movement?: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat" | undefined;
    }[] | undefined;
    attention?: {
        reason: string;
        shotId: string;
        focusCharacterId: string;
        focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
    }[] | undefined;
    editDecisions?: {
        rationale: string;
        cutFrame: number;
        fromShotId: string;
        toShotId: string;
        cutType?: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash" | undefined;
    }[] | undefined;
    pauses?: {
        durationFrames: number;
        beatId: string;
        rationale: string;
    }[] | undefined;
    dramaticEmphasisBeatIds?: string[] | undefined;
    reactionShotCount?: number | undefined;
}>, {
    confidence: number;
    provenance: {
        createdAt: string;
        engine: "rule_based ScriptDirector v1";
    };
    schemaVersion: "1.0";
    planId: string;
    camera: {
        shotCount: number;
        dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        hasCameraMotion: boolean;
        pushInBeatIds: string[];
        reactionShotIds: string[];
    };
    shots: {
        confidence: number;
        startFrame: number;
        endFrame: number;
        description: string;
        shotId: string;
        durationFrames: number;
        framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        charactersInFrame: string[];
        dialogue: boolean;
        shotIndex: number;
        primaryFocusCharacterId: string;
        staging: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric";
        rationale: string;
        beatId?: string | null | undefined;
        eyeline?: string | null | undefined;
    }[];
    blocking: {
        characterId: string;
        notes: string;
        startPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
        endPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
        movement: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat";
    }[];
    sceneId: string;
    shotCount: number;
    rationale: string;
    strategy: "custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take";
    strategyDescription: string;
    attention: {
        reason: string;
        shotId: string;
        focusCharacterId: string;
        focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
    }[];
    editDecisions: {
        rationale: string;
        cutFrame: number;
        fromShotId: string;
        toShotId: string;
        cutType: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash";
    }[];
    pauses: {
        durationFrames: number;
        beatId: string;
        rationale: string;
    }[];
    dramaticEmphasisBeatIds: string[];
    reactionShotCount: number;
    totalDurationFrames: number;
}, {
    provenance: {
        createdAt: string;
        engine: "rule_based ScriptDirector v1";
    };
    schemaVersion: "1.0";
    planId: string;
    camera: {
        shotCount: number;
        dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        hasCameraMotion?: boolean | undefined;
        pushInBeatIds?: string[] | undefined;
        reactionShotIds?: string[] | undefined;
    };
    shots: {
        startFrame: number;
        endFrame: number;
        description: string;
        shotId: string;
        durationFrames: number;
        framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
        cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
        charactersInFrame: string[];
        shotIndex: number;
        primaryFocusCharacterId: string;
        rationale: string;
        confidence?: number | undefined;
        dialogue?: boolean | undefined;
        beatId?: string | null | undefined;
        eyeline?: string | null | undefined;
        staging?: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric" | undefined;
    }[];
    sceneId: string;
    shotCount: number;
    rationale: string;
    strategy: "custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take";
    strategyDescription: string;
    totalDurationFrames: number;
    confidence?: number | undefined;
    blocking?: {
        characterId: string;
        notes?: string | undefined;
        startPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
        endPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
        movement?: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat" | undefined;
    }[] | undefined;
    attention?: {
        reason: string;
        shotId: string;
        focusCharacterId: string;
        focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
    }[] | undefined;
    editDecisions?: {
        rationale: string;
        cutFrame: number;
        fromShotId: string;
        toShotId: string;
        cutType?: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash" | undefined;
    }[] | undefined;
    pauses?: {
        durationFrames: number;
        beatId: string;
        rationale: string;
    }[] | undefined;
    dramaticEmphasisBeatIds?: string[] | undefined;
    reactionShotCount?: number | undefined;
}>;
export type DirectorPlan = z.infer<typeof directorPlanSchema>;
export type ShotPlan = z.infer<typeof shotPlanSchema>;
export type CameraPlan = z.infer<typeof cameraPlanSchema>;
export type BlockingPlan = z.infer<typeof blockingPlanSchema>;
export type AttentionPlan = z.infer<typeof attentionPlanSchema>;
export type EditDecision = z.infer<typeof editDecisionSchema>;
export type DirectorStrategy = z.infer<typeof directorStrategySchema>;
export declare const directorVariantSetSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    sceneId: z.ZodString;
    strategyCount: z.ZodNumber;
    variants: z.ZodArray<z.ZodEffects<z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0">;
        planId: z.ZodString;
        sceneId: z.ZodString;
        strategy: z.ZodEnum<["restrained_dialogue", "commercial_dynamic", "dramatic_closeup", "comedic_timing", "anime_limited", "theatrical_staging", "single_take", "custom"]>;
        strategyDescription: z.ZodString;
        shots: z.ZodArray<z.ZodObject<{
            shotId: z.ZodString;
            shotIndex: z.ZodNumber;
            beatId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            framing: z.ZodEnum<["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "OTS", "POV", "two_shot", "insert"]>;
            cameraMove: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "zoom_in", "zoom_out", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "arc", "handheld", "crane", "rack_focus"]>;
            durationFrames: z.ZodNumber;
            startFrame: z.ZodNumber;
            endFrame: z.ZodNumber;
            charactersInFrame: z.ZodArray<z.ZodString, "many">;
            primaryFocusCharacterId: z.ZodString;
            staging: z.ZodDefault<z.ZodEnum<["left", "center", "right", "left_right", "center_foreground", "right_background", "symmetric"]>>;
            dialogue: z.ZodDefault<z.ZodBoolean>;
            eyeline: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            description: z.ZodString;
            rationale: z.ZodString;
            confidence: z.ZodDefault<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            startFrame: number;
            endFrame: number;
            description: string;
            shotId: string;
            durationFrames: number;
            framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            charactersInFrame: string[];
            dialogue: boolean;
            shotIndex: number;
            primaryFocusCharacterId: string;
            staging: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric";
            rationale: string;
            beatId?: string | null | undefined;
            eyeline?: string | null | undefined;
        }, {
            startFrame: number;
            endFrame: number;
            description: string;
            shotId: string;
            durationFrames: number;
            framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            charactersInFrame: string[];
            shotIndex: number;
            primaryFocusCharacterId: string;
            rationale: string;
            confidence?: number | undefined;
            dialogue?: boolean | undefined;
            beatId?: string | null | undefined;
            eyeline?: string | null | undefined;
            staging?: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric" | undefined;
        }>, "many">;
        camera: z.ZodObject<{
            shotCount: z.ZodNumber;
            dominantFraming: z.ZodEnum<["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "OTS", "POV", "two_shot", "insert"]>;
            dominantCameraMove: z.ZodEnum<["static", "pan_left", "pan_right", "tilt_up", "tilt_down", "zoom_in", "zoom_out", "dolly_in", "dolly_out", "truck_left", "truck_right", "pedestal_up", "pedestal_down", "arc", "handheld", "crane", "rack_focus"]>;
            hasCameraMotion: z.ZodDefault<z.ZodBoolean>;
            pushInBeatIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            reactionShotIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strict", z.ZodTypeAny, {
            shotCount: number;
            dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            hasCameraMotion: boolean;
            pushInBeatIds: string[];
            reactionShotIds: string[];
        }, {
            shotCount: number;
            dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            hasCameraMotion?: boolean | undefined;
            pushInBeatIds?: string[] | undefined;
            reactionShotIds?: string[] | undefined;
        }>;
        blocking: z.ZodDefault<z.ZodArray<z.ZodObject<{
            characterId: z.ZodString;
            startPosition: z.ZodDefault<z.ZodEnum<["left", "center_left", "center", "center_right", "right", "offscreen_left", "offscreen_right"]>>;
            endPosition: z.ZodDefault<z.ZodEnum<["left", "center_left", "center", "center_right", "right", "offscreen_left", "offscreen_right"]>>;
            movement: z.ZodDefault<z.ZodEnum<["none", "enter", "exit", "cross", "turn", "sit", "stand", "approach", "retreat"]>>;
            notes: z.ZodDefault<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            characterId: string;
            notes: string;
            startPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
            endPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
            movement: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat";
        }, {
            characterId: string;
            notes?: string | undefined;
            startPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
            endPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
            movement?: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat" | undefined;
        }>, "many">>;
        attention: z.ZodDefault<z.ZodArray<z.ZodObject<{
            shotId: z.ZodString;
            focusCharacterId: z.ZodString;
            focusType: z.ZodDefault<z.ZodEnum<["speaker", "reactor", "object", "environment", "shared"]>>;
            reason: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            reason: string;
            shotId: string;
            focusCharacterId: string;
            focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
        }, {
            reason: string;
            shotId: string;
            focusCharacterId: string;
            focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
        }>, "many">>;
        editDecisions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            cutFrame: z.ZodNumber;
            fromShotId: z.ZodString;
            toShotId: z.ZodString;
            cutType: z.ZodDefault<z.ZodEnum<["hard", "soft", "match_action", "match_on_look", "L_cut", "J_cut", "smash"]>>;
            rationale: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            rationale: string;
            cutFrame: number;
            fromShotId: string;
            toShotId: string;
            cutType: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash";
        }, {
            rationale: string;
            cutFrame: number;
            fromShotId: string;
            toShotId: string;
            cutType?: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash" | undefined;
        }>, "many">>;
        pauses: z.ZodDefault<z.ZodArray<z.ZodObject<{
            beatId: z.ZodString;
            durationFrames: z.ZodNumber;
            rationale: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            durationFrames: number;
            beatId: string;
            rationale: string;
        }, {
            durationFrames: number;
            beatId: string;
            rationale: string;
        }>, "many">>;
        dramaticEmphasisBeatIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        reactionShotCount: z.ZodDefault<z.ZodNumber>;
        shotCount: z.ZodNumber;
        totalDurationFrames: z.ZodNumber;
        confidence: z.ZodDefault<z.ZodNumber>;
        rationale: z.ZodString;
        provenance: z.ZodObject<{
            engine: z.ZodLiteral<"rule_based ScriptDirector v1">;
            createdAt: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            createdAt: string;
            engine: "rule_based ScriptDirector v1";
        }, {
            createdAt: string;
            engine: "rule_based ScriptDirector v1";
        }>;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        provenance: {
            createdAt: string;
            engine: "rule_based ScriptDirector v1";
        };
        schemaVersion: "1.0";
        planId: string;
        camera: {
            shotCount: number;
            dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            hasCameraMotion: boolean;
            pushInBeatIds: string[];
            reactionShotIds: string[];
        };
        shots: {
            confidence: number;
            startFrame: number;
            endFrame: number;
            description: string;
            shotId: string;
            durationFrames: number;
            framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            charactersInFrame: string[];
            dialogue: boolean;
            shotIndex: number;
            primaryFocusCharacterId: string;
            staging: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric";
            rationale: string;
            beatId?: string | null | undefined;
            eyeline?: string | null | undefined;
        }[];
        blocking: {
            characterId: string;
            notes: string;
            startPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
            endPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
            movement: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat";
        }[];
        sceneId: string;
        shotCount: number;
        rationale: string;
        strategy: "custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take";
        strategyDescription: string;
        attention: {
            reason: string;
            shotId: string;
            focusCharacterId: string;
            focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
        }[];
        editDecisions: {
            rationale: string;
            cutFrame: number;
            fromShotId: string;
            toShotId: string;
            cutType: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash";
        }[];
        pauses: {
            durationFrames: number;
            beatId: string;
            rationale: string;
        }[];
        dramaticEmphasisBeatIds: string[];
        reactionShotCount: number;
        totalDurationFrames: number;
    }, {
        provenance: {
            createdAt: string;
            engine: "rule_based ScriptDirector v1";
        };
        schemaVersion: "1.0";
        planId: string;
        camera: {
            shotCount: number;
            dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            hasCameraMotion?: boolean | undefined;
            pushInBeatIds?: string[] | undefined;
            reactionShotIds?: string[] | undefined;
        };
        shots: {
            startFrame: number;
            endFrame: number;
            description: string;
            shotId: string;
            durationFrames: number;
            framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            charactersInFrame: string[];
            shotIndex: number;
            primaryFocusCharacterId: string;
            rationale: string;
            confidence?: number | undefined;
            dialogue?: boolean | undefined;
            beatId?: string | null | undefined;
            eyeline?: string | null | undefined;
            staging?: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric" | undefined;
        }[];
        sceneId: string;
        shotCount: number;
        rationale: string;
        strategy: "custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take";
        strategyDescription: string;
        totalDurationFrames: number;
        confidence?: number | undefined;
        blocking?: {
            characterId: string;
            notes?: string | undefined;
            startPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
            endPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
            movement?: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat" | undefined;
        }[] | undefined;
        attention?: {
            reason: string;
            shotId: string;
            focusCharacterId: string;
            focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
        }[] | undefined;
        editDecisions?: {
            rationale: string;
            cutFrame: number;
            fromShotId: string;
            toShotId: string;
            cutType?: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash" | undefined;
        }[] | undefined;
        pauses?: {
            durationFrames: number;
            beatId: string;
            rationale: string;
        }[] | undefined;
        dramaticEmphasisBeatIds?: string[] | undefined;
        reactionShotCount?: number | undefined;
    }>, {
        confidence: number;
        provenance: {
            createdAt: string;
            engine: "rule_based ScriptDirector v1";
        };
        schemaVersion: "1.0";
        planId: string;
        camera: {
            shotCount: number;
            dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            hasCameraMotion: boolean;
            pushInBeatIds: string[];
            reactionShotIds: string[];
        };
        shots: {
            confidence: number;
            startFrame: number;
            endFrame: number;
            description: string;
            shotId: string;
            durationFrames: number;
            framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            charactersInFrame: string[];
            dialogue: boolean;
            shotIndex: number;
            primaryFocusCharacterId: string;
            staging: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric";
            rationale: string;
            beatId?: string | null | undefined;
            eyeline?: string | null | undefined;
        }[];
        blocking: {
            characterId: string;
            notes: string;
            startPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
            endPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
            movement: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat";
        }[];
        sceneId: string;
        shotCount: number;
        rationale: string;
        strategy: "custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take";
        strategyDescription: string;
        attention: {
            reason: string;
            shotId: string;
            focusCharacterId: string;
            focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
        }[];
        editDecisions: {
            rationale: string;
            cutFrame: number;
            fromShotId: string;
            toShotId: string;
            cutType: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash";
        }[];
        pauses: {
            durationFrames: number;
            beatId: string;
            rationale: string;
        }[];
        dramaticEmphasisBeatIds: string[];
        reactionShotCount: number;
        totalDurationFrames: number;
    }, {
        provenance: {
            createdAt: string;
            engine: "rule_based ScriptDirector v1";
        };
        schemaVersion: "1.0";
        planId: string;
        camera: {
            shotCount: number;
            dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            hasCameraMotion?: boolean | undefined;
            pushInBeatIds?: string[] | undefined;
            reactionShotIds?: string[] | undefined;
        };
        shots: {
            startFrame: number;
            endFrame: number;
            description: string;
            shotId: string;
            durationFrames: number;
            framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            charactersInFrame: string[];
            shotIndex: number;
            primaryFocusCharacterId: string;
            rationale: string;
            confidence?: number | undefined;
            dialogue?: boolean | undefined;
            beatId?: string | null | undefined;
            eyeline?: string | null | undefined;
            staging?: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric" | undefined;
        }[];
        sceneId: string;
        shotCount: number;
        rationale: string;
        strategy: "custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take";
        strategyDescription: string;
        totalDurationFrames: number;
        confidence?: number | undefined;
        blocking?: {
            characterId: string;
            notes?: string | undefined;
            startPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
            endPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
            movement?: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat" | undefined;
        }[] | undefined;
        attention?: {
            reason: string;
            shotId: string;
            focusCharacterId: string;
            focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
        }[] | undefined;
        editDecisions?: {
            rationale: string;
            cutFrame: number;
            fromShotId: string;
            toShotId: string;
            cutType?: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash" | undefined;
        }[] | undefined;
        pauses?: {
            durationFrames: number;
            beatId: string;
            rationale: string;
        }[] | undefined;
        dramaticEmphasisBeatIds?: string[] | undefined;
        reactionShotCount?: number | undefined;
    }>, "many">;
    notes: z.ZodDefault<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    schemaVersion: "1.0";
    notes: string;
    sceneId: string;
    strategyCount: number;
    variants: {
        confidence: number;
        provenance: {
            createdAt: string;
            engine: "rule_based ScriptDirector v1";
        };
        schemaVersion: "1.0";
        planId: string;
        camera: {
            shotCount: number;
            dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            hasCameraMotion: boolean;
            pushInBeatIds: string[];
            reactionShotIds: string[];
        };
        shots: {
            confidence: number;
            startFrame: number;
            endFrame: number;
            description: string;
            shotId: string;
            durationFrames: number;
            framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            charactersInFrame: string[];
            dialogue: boolean;
            shotIndex: number;
            primaryFocusCharacterId: string;
            staging: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric";
            rationale: string;
            beatId?: string | null | undefined;
            eyeline?: string | null | undefined;
        }[];
        blocking: {
            characterId: string;
            notes: string;
            startPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
            endPosition: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right";
            movement: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat";
        }[];
        sceneId: string;
        shotCount: number;
        rationale: string;
        strategy: "custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take";
        strategyDescription: string;
        attention: {
            reason: string;
            shotId: string;
            focusCharacterId: string;
            focusType: "object" | "environment" | "speaker" | "reactor" | "shared";
        }[];
        editDecisions: {
            rationale: string;
            cutFrame: number;
            fromShotId: string;
            toShotId: string;
            cutType: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash";
        }[];
        pauses: {
            durationFrames: number;
            beatId: string;
            rationale: string;
        }[];
        dramaticEmphasisBeatIds: string[];
        reactionShotCount: number;
        totalDurationFrames: number;
    }[];
}, {
    schemaVersion: "1.0";
    sceneId: string;
    strategyCount: number;
    variants: {
        provenance: {
            createdAt: string;
            engine: "rule_based ScriptDirector v1";
        };
        schemaVersion: "1.0";
        planId: string;
        camera: {
            shotCount: number;
            dominantFraming: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            dominantCameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            hasCameraMotion?: boolean | undefined;
            pushInBeatIds?: string[] | undefined;
            reactionShotIds?: string[] | undefined;
        };
        shots: {
            startFrame: number;
            endFrame: number;
            description: string;
            shotId: string;
            durationFrames: number;
            framing: "medium" | "wide" | "close_up" | "OTS" | "POV" | "extreme_wide" | "medium_wide" | "medium_close" | "extreme_close_up" | "two_shot" | "insert";
            cameraMove: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly_in" | "dolly_out" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down" | "arc" | "handheld" | "crane" | "rack_focus";
            charactersInFrame: string[];
            shotIndex: number;
            primaryFocusCharacterId: string;
            rationale: string;
            confidence?: number | undefined;
            dialogue?: boolean | undefined;
            beatId?: string | null | undefined;
            eyeline?: string | null | undefined;
            staging?: "center" | "left" | "right" | "left_right" | "center_foreground" | "right_background" | "symmetric" | undefined;
        }[];
        sceneId: string;
        shotCount: number;
        rationale: string;
        strategy: "custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take";
        strategyDescription: string;
        totalDurationFrames: number;
        confidence?: number | undefined;
        blocking?: {
            characterId: string;
            notes?: string | undefined;
            startPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
            endPosition?: "center" | "left" | "right" | "center_left" | "center_right" | "offscreen_left" | "offscreen_right" | undefined;
            movement?: "none" | "exit" | "enter" | "turn" | "cross" | "sit" | "stand" | "approach" | "retreat" | undefined;
        }[] | undefined;
        attention?: {
            reason: string;
            shotId: string;
            focusCharacterId: string;
            focusType?: "object" | "environment" | "speaker" | "reactor" | "shared" | undefined;
        }[] | undefined;
        editDecisions?: {
            rationale: string;
            cutFrame: number;
            fromShotId: string;
            toShotId: string;
            cutType?: "hard" | "soft" | "match_action" | "match_on_look" | "L_cut" | "J_cut" | "smash" | undefined;
        }[] | undefined;
        pauses?: {
            durationFrames: number;
            beatId: string;
            rationale: string;
        }[] | undefined;
        dramaticEmphasisBeatIds?: string[] | undefined;
        reactionShotCount?: number | undefined;
    }[];
    notes?: string | undefined;
}>;
export type DirectorVariantSet = z.infer<typeof directorVariantSetSchema>;
