import { z } from 'zod';
export declare const aiStudioTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    script: z.ZodString;
    sceneName: z.ZodOptional<z.ZodString>;
    sceneId: z.ZodOptional<z.ZodString>;
    fps: z.ZodDefault<z.ZodNumber>;
    durationSeconds: z.ZodDefault<z.ZodNumber>;
    characters: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        characterId: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodEnum<["protagonist", "antagonist", "supporting", "background", "unknown"]>>;
        stance: z.ZodOptional<z.ZodEnum<["standing", "sitting", "lying", "moving", "unknown"]>>;
        visibleOnScreen: z.ZodOptional<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
        characterId?: string | undefined;
        stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
        visibleOnScreen?: boolean | undefined;
    }, {
        name: string;
        role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
        characterId?: string | undefined;
        stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
        visibleOnScreen?: boolean | undefined;
    }>, "many">;
    dialogue: z.ZodOptional<z.ZodArray<z.ZodObject<{
        speaker: z.ZodString;
        text: z.ZodString;
        startSec: z.ZodOptional<z.ZodNumber>;
        endSec: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        text: string;
        speaker: string;
        startSec?: number | undefined;
        endSec?: number | undefined;
    }, {
        text: string;
        speaker: string;
        startSec?: number | undefined;
        endSec?: number | undefined;
    }>, "many">>;
    location: z.ZodOptional<z.ZodString>;
    directorConstraints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    reportDir: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    fps: number;
    durationSeconds: number;
    script: string;
    characters: {
        name: string;
        role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
        characterId?: string | undefined;
        stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
        visibleOnScreen?: boolean | undefined;
    }[];
    sceneName?: string | undefined;
    location?: string | undefined;
    sceneId?: string | undefined;
    dialogue?: {
        text: string;
        speaker: string;
        startSec?: number | undefined;
        endSec?: number | undefined;
    }[] | undefined;
    directorConstraints?: string[] | undefined;
    reportDir?: string | undefined;
}, {
    script: string;
    characters: {
        name: string;
        role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
        characterId?: string | undefined;
        stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
        visibleOnScreen?: boolean | undefined;
    }[];
    fps?: number | undefined;
    durationSeconds?: number | undefined;
    sceneName?: string | undefined;
    location?: string | undefined;
    sceneId?: string | undefined;
    dialogue?: {
        text: string;
        speaker: string;
        startSec?: number | undefined;
        endSec?: number | undefined;
    }[] | undefined;
    directorConstraints?: string[] | undefined;
    reportDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
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
    script: z.ZodOptional<z.ZodString>;
    sceneName: z.ZodOptional<z.ZodString>;
    sceneId: z.ZodOptional<z.ZodString>;
    fps: z.ZodDefault<z.ZodNumber>;
    durationSeconds: z.ZodDefault<z.ZodNumber>;
    characters: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        characterId: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodEnum<["protagonist", "antagonist", "supporting", "background", "unknown"]>>;
        stance: z.ZodOptional<z.ZodEnum<["standing", "sitting", "lying", "moving", "unknown"]>>;
        visibleOnScreen: z.ZodOptional<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
        characterId?: string | undefined;
        stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
        visibleOnScreen?: boolean | undefined;
    }, {
        name: string;
        role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
        characterId?: string | undefined;
        stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
        visibleOnScreen?: boolean | undefined;
    }>, "many">>;
    dialogue: z.ZodOptional<z.ZodArray<z.ZodObject<{
        speaker: z.ZodString;
        text: z.ZodString;
        startSec: z.ZodOptional<z.ZodNumber>;
        endSec: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        text: string;
        speaker: string;
        startSec?: number | undefined;
        endSec?: number | undefined;
    }, {
        text: string;
        speaker: string;
        startSec?: number | undefined;
        endSec?: number | undefined;
    }>, "many">>;
    location: z.ZodOptional<z.ZodString>;
    directorConstraints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    count: z.ZodDefault<z.ZodNumber>;
    strategies: z.ZodOptional<z.ZodArray<z.ZodEnum<["restrained_dialogue", "commercial_dynamic", "dramatic_closeup", "comedic_timing", "anime_limited", "theatrical_staging", "single_take", "custom"]>, "many">>;
    reportDir: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    fps: number;
    durationSeconds: number;
    count: number;
    script?: string | undefined;
    sceneName?: string | undefined;
    location?: string | undefined;
    characters?: {
        name: string;
        role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
        characterId?: string | undefined;
        stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
        visibleOnScreen?: boolean | undefined;
    }[] | undefined;
    sceneId?: string | undefined;
    dialogue?: {
        text: string;
        speaker: string;
        startSec?: number | undefined;
        endSec?: number | undefined;
    }[] | undefined;
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
    directorConstraints?: string[] | undefined;
    reportDir?: string | undefined;
    strategies?: ("custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take")[] | undefined;
}, {
    fps?: number | undefined;
    durationSeconds?: number | undefined;
    script?: string | undefined;
    sceneName?: string | undefined;
    location?: string | undefined;
    characters?: {
        name: string;
        role?: "unknown" | "background" | "protagonist" | "antagonist" | "supporting" | undefined;
        characterId?: string | undefined;
        stance?: "unknown" | "standing" | "sitting" | "lying" | "moving" | undefined;
        visibleOnScreen?: boolean | undefined;
    }[] | undefined;
    sceneId?: string | undefined;
    dialogue?: {
        text: string;
        speaker: string;
        startSec?: number | undefined;
        endSec?: number | undefined;
    }[] | undefined;
    count?: number | undefined;
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
    directorConstraints?: string[] | undefined;
    reportDir?: string | undefined;
    strategies?: ("custom" | "restrained_dialogue" | "commercial_dynamic" | "dramatic_closeup" | "comedic_timing" | "anime_limited" | "theatrical_staging" | "single_take")[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    audioPath: z.ZodOptional<z.ZodString>;
    transcript: z.ZodString;
    durationSeconds: z.ZodOptional<z.ZodNumber>;
    language: z.ZodDefault<z.ZodString>;
    speaker: z.ZodDefault<z.ZodString>;
    emotionHints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    language: string;
    speaker: string;
    transcript: string;
    durationSeconds?: number | undefined;
    audioPath?: string | undefined;
    emotionHints?: string[] | undefined;
}, {
    transcript: string;
    durationSeconds?: number | undefined;
    language?: string | undefined;
    audioPath?: string | undefined;
    speaker?: string | undefined;
    emotionHints?: string[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneUnderstanding: z.ZodEffects<z.ZodObject<{
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
    voiceAnalysis: z.ZodObject<{
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
    }>;
    characterId: z.ZodString;
    count: z.ZodDefault<z.ZodNumber>;
    styles: z.ZodOptional<z.ZodArray<z.ZodEnum<["restrained", "energetic", "sarcastic", "anxious", "aggressive", "comedic", "custom"]>, "many">>;
    reportDir: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    characterId: string;
    count: number;
    voiceAnalysis: {
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
    };
    sceneUnderstanding: {
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
    };
    reportDir?: string | undefined;
    styles?: ("custom" | "comedic" | "restrained" | "energetic" | "sarcastic" | "anxious" | "aggressive")[] | undefined;
}, {
    characterId: string;
    voiceAnalysis: {
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
    };
    sceneUnderstanding: {
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
    };
    count?: number | undefined;
    reportDir?: string | undefined;
    styles?: ("custom" | "comedic" | "restrained" | "energetic" | "sarcastic" | "anxious" | "aggressive")[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    acting: z.ZodEffects<z.ZodObject<{
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
    }>;
    gestureTiming: z.ZodEffects<z.ZodObject<{
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
    }>;
    finalPose: z.ZodEffects<z.ZodObject<{
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
    }>;
}, "strict", z.ZodTypeAny, {
    acting: {
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
    };
    gestureTiming: {
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
    };
    finalPose: {
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
    };
}, {
    acting: {
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
    };
    gestureTiming: {
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
    };
    finalPose: {
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
    };
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    name: z.ZodString;
    sourceType: z.ZodEnum<["manifest", "psd", "svg", "png_dir", "harmony_template", "harmony_scene"]>;
    sourcePath: z.ZodString;
    outputDir: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name: string;
    sourcePath: string;
    sourceType: "psd" | "svg" | "png_dir" | "harmony_template" | "harmony_scene" | "manifest";
    outputDir?: string | undefined;
}, {
    name: string;
    sourcePath: string;
    sourceType: "psd" | "svg" | "png_dir" | "harmony_template" | "harmony_scene" | "manifest";
    outputDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneUnderstanding: z.ZodEffects<z.ZodObject<{
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
    performancePlan: z.ZodEffects<z.ZodObject<{
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
    }>;
    actorId: z.ZodString;
    outputDir: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    actorId: string;
    sceneUnderstanding: {
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
    };
    performancePlan: {
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
    };
    outputDir?: string | undefined;
}, {
    actorId: string;
    sceneUnderstanding: {
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
    };
    performancePlan: {
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
    };
    outputDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneUnderstanding: z.ZodEffects<z.ZodObject<{
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
    keyPoseSet: z.ZodObject<{
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
    actorId: z.ZodString;
    tolerance: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    outputDir: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    tolerance: number;
    actorId: string;
    sceneUnderstanding: {
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
    };
    keyPoseSet: {
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
    };
    outputDir?: string | undefined;
}, {
    actorId: string;
    sceneUnderstanding: {
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
    };
    keyPoseSet: {
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
    };
    outputDir?: string | undefined;
    tolerance?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    frameCount: z.ZodNumber;
    fps: z.ZodOptional<z.ZodNumber>;
    bodyType: z.ZodOptional<z.ZodEnum<["humanoid", "quadruped", "creature", "object", "unknown"]>>;
    frameRegions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        regions: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            width: number;
            height: number;
            label: string;
            confidence?: number | undefined;
        }, {
            x: number;
            y: number;
            width: number;
            height: number;
            label: string;
            confidence?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        regions: {
            x: number;
            y: number;
            width: number;
            height: number;
            label: string;
            confidence?: number | undefined;
        }[];
    }, {
        frame: number;
        regions: {
            x: number;
            y: number;
            width: number;
            height: number;
            label: string;
            confidence?: number | undefined;
        }[];
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    frameCount: number;
    characterId: string;
    fps?: number | undefined;
    bodyType?: "object" | "unknown" | "humanoid" | "quadruped" | "creature" | undefined;
    frameRegions?: {
        frame: number;
        regions: {
            x: number;
            y: number;
            width: number;
            height: number;
            label: string;
            confidence?: number | undefined;
        }[];
    }[] | undefined;
}, {
    frameCount: number;
    characterId: string;
    fps?: number | undefined;
    bodyType?: "object" | "unknown" | "humanoid" | "quadruped" | "creature" | undefined;
    frameRegions?: {
        frame: number;
        regions: {
            x: number;
            y: number;
            width: number;
            height: number;
            label: string;
            confidence?: number | undefined;
        }[];
    }[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    sceneId: z.ZodString;
    decomposition: z.ZodObject<{
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
    }>;
    studioProfile: z.ZodOptional<z.ZodObject<{
        preferredRepresentation: z.ZodOptional<z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>>;
        maxDeformersPerPart: z.ZodOptional<z.ZodNumber>;
        editabilityPriority: z.ZodOptional<z.ZodNumber>;
        frameByFrameAllowed: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
        editabilityPriority?: number | undefined;
        frameByFrameAllowed?: boolean | undefined;
    }, {
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
        editabilityPriority?: number | undefined;
        frameByFrameAllowed?: boolean | undefined;
    }>>;
    artistLocks: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEnum<["peg_transform", "curve_deformer", "envelope_deformer", "bone_deformer", "drawing_substitution", "frame_by_frame_vector", "raster_texture_layer", "reference_only"]>>>;
}, "strict", z.ZodTypeAny, {
    characterId: string;
    sceneId: string;
    decomposition: {
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
    };
    studioProfile?: {
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
        editabilityPriority?: number | undefined;
        frameByFrameAllowed?: boolean | undefined;
    } | undefined;
    artistLocks?: Record<string, "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only"> | undefined;
}, {
    characterId: string;
    sceneId: string;
    decomposition: {
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
    };
    studioProfile?: {
        preferredRepresentation?: "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only" | undefined;
        maxDeformersPerPart?: number | undefined;
        editabilityPriority?: number | undefined;
        frameByFrameAllowed?: boolean | undefined;
    } | undefined;
    artistLocks?: Record<string, "frame_by_frame_vector" | "peg_transform" | "curve_deformer" | "envelope_deformer" | "bone_deformer" | "drawing_substitution" | "raster_texture_layer" | "reference_only"> | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneUnderstanding: z.ZodEffects<z.ZodObject<{
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
    fps: z.ZodOptional<z.ZodNumber>;
    style: z.ZodOptional<z.ZodEnum<["restrained", "dynamic", "dramatic", "comedic"]>>;
}, "strict", z.ZodTypeAny, {
    sceneUnderstanding: {
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
    };
    fps?: number | undefined;
    style?: "comedic" | "dynamic" | "dramatic" | "restrained" | undefined;
}, {
    sceneUnderstanding: {
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
    };
    fps?: number | undefined;
    style?: "comedic" | "dynamic" | "dramatic" | "restrained" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    variantId: z.ZodString;
    sceneId: z.ZodString;
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
    motionTracks: z.ZodOptional<z.ZodAny>;
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
    performancePlan: z.ZodOptional<z.ZodEffects<z.ZodObject<{
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
    }>>;
}, "strict", z.ZodTypeAny, {
    sceneId: string;
    variantId: string;
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
    motionTracks?: any;
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
    performancePlan?: {
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
    } | undefined;
}, {
    sceneId: string;
    variantId: string;
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
    motionTracks?: any;
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
    performancePlan?: {
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
    } | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    variants: z.ZodArray<z.ZodObject<{
        variantId: z.ZodString;
        variantName: z.ZodString;
        variantType: z.ZodEnum<["director", "performance", "combined"]>;
        criticInput: z.ZodObject<{
            variantId: z.ZodString;
            sceneId: z.ZodString;
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
            motionTracks: z.ZodOptional<z.ZodAny>;
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
            performancePlan: z.ZodOptional<z.ZodEffects<z.ZodObject<{
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
            }>>;
        }, "strict", z.ZodTypeAny, {
            sceneId: string;
            variantId: string;
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
            motionTracks?: any;
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
            performancePlan?: {
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
            } | undefined;
        }, {
            sceneId: string;
            variantId: string;
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
            motionTracks?: any;
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
            performancePlan?: {
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
            } | undefined;
        }>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strict", z.ZodTypeAny, {
        variantId: string;
        variantName: string;
        variantType: "director" | "performance" | "combined";
        criticInput: {
            sceneId: string;
            variantId: string;
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
            motionTracks?: any;
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
            performancePlan?: {
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
            } | undefined;
        };
        metadata?: Record<string, any> | undefined;
    }, {
        variantId: string;
        variantName: string;
        variantType: "director" | "performance" | "combined";
        criticInput: {
            sceneId: string;
            variantId: string;
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
            motionTracks?: any;
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
            performancePlan?: {
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
            } | undefined;
        };
        metadata?: Record<string, any> | undefined;
    }>, "many">;
    budget: z.ZodObject<{
        maxVariants: z.ZodNumber;
        maxComputeTimeMs: z.ZodNumber;
        maxGpuMemoryMb: z.ZodOptional<z.ZodNumber>;
        maxRefinementRounds: z.ZodNumber;
        maxPreviewResolution: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        maxVariants: number;
        maxComputeTimeMs: number;
        maxRefinementRounds: number;
        maxGpuMemoryMb?: number | undefined;
        maxPreviewResolution?: string | undefined;
    }, {
        maxVariants: number;
        maxComputeTimeMs: number;
        maxRefinementRounds: number;
        maxGpuMemoryMb?: number | undefined;
        maxPreviewResolution?: string | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    sceneId: string;
    variants: {
        variantId: string;
        variantName: string;
        variantType: "director" | "performance" | "combined";
        criticInput: {
            sceneId: string;
            variantId: string;
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
            motionTracks?: any;
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
            performancePlan?: {
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
            } | undefined;
        };
        metadata?: Record<string, any> | undefined;
    }[];
    budget: {
        maxVariants: number;
        maxComputeTimeMs: number;
        maxRefinementRounds: number;
        maxGpuMemoryMb?: number | undefined;
        maxPreviewResolution?: string | undefined;
    };
}, {
    sceneId: string;
    variants: {
        variantId: string;
        variantName: string;
        variantType: "director" | "performance" | "combined";
        criticInput: {
            sceneId: string;
            variantId: string;
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
            motionTracks?: any;
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
            performancePlan?: {
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
            } | undefined;
        };
        metadata?: Record<string, any> | undefined;
    }[];
    budget: {
        maxVariants: number;
        maxComputeTimeMs: number;
        maxRefinementRounds: number;
        maxGpuMemoryMb?: number | undefined;
        maxPreviewResolution?: string | undefined;
    };
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
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
    performancePlan: z.ZodOptional<z.ZodEffects<z.ZodObject<{
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
    }>>;
    criticReport: z.ZodOptional<z.ZodAny>;
    outputDir: z.ZodOptional<z.ZodString>;
    packageName: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    sceneId: string;
    outputDir?: string | undefined;
    packageName?: string | undefined;
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
    performancePlan?: {
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
    } | undefined;
    criticReport?: any;
}, {
    sceneId: string;
    outputDir?: string | undefined;
    packageName?: string | undefined;
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
    performancePlan?: {
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
    } | undefined;
    criticReport?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    manifest: z.ZodObject<{
        schemaVersion: z.ZodString;
        manifestId: z.ZodString;
        sceneId: z.ZodString;
        createdAt: z.ZodString;
        sceneUnderstanding: z.ZodOptional<z.ZodAny>;
        directorPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        performancePlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        voiceAnalysis: z.ZodOptional<z.ZodAny>;
        digitalActors: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        partDecomposition: z.ZodOptional<z.ZodAny>;
        occlusionGraph: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        keyPoses: z.ZodOptional<z.ZodAny>;
        motionTracks: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        cameraTrack: z.ZodOptional<z.ZodAny>;
        cameraLayout: z.ZodOptional<z.ZodAny>;
        routingPlan: z.ZodOptional<z.ZodAny>;
        representationSegments: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        gestureEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        gazeEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        facialEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        drawings: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        palettes: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        exposureBlocks: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        criticReports: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        variantTournament: z.ZodOptional<z.ZodAny>;
        tasteScores: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        selectionHistory: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        artistCorrections: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        trainingSignals: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        provenance: z.ZodOptional<z.ZodAny>;
        limitations: z.ZodOptional<z.ZodAny>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        schemaVersion: z.ZodString;
        manifestId: z.ZodString;
        sceneId: z.ZodString;
        createdAt: z.ZodString;
        sceneUnderstanding: z.ZodOptional<z.ZodAny>;
        directorPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        performancePlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        voiceAnalysis: z.ZodOptional<z.ZodAny>;
        digitalActors: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        partDecomposition: z.ZodOptional<z.ZodAny>;
        occlusionGraph: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        keyPoses: z.ZodOptional<z.ZodAny>;
        motionTracks: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        cameraTrack: z.ZodOptional<z.ZodAny>;
        cameraLayout: z.ZodOptional<z.ZodAny>;
        routingPlan: z.ZodOptional<z.ZodAny>;
        representationSegments: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        gestureEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        gazeEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        facialEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        drawings: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        palettes: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        exposureBlocks: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        criticReports: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        variantTournament: z.ZodOptional<z.ZodAny>;
        tasteScores: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        selectionHistory: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        artistCorrections: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        trainingSignals: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        provenance: z.ZodOptional<z.ZodAny>;
        limitations: z.ZodOptional<z.ZodAny>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        schemaVersion: z.ZodString;
        manifestId: z.ZodString;
        sceneId: z.ZodString;
        createdAt: z.ZodString;
        sceneUnderstanding: z.ZodOptional<z.ZodAny>;
        directorPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        performancePlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        voiceAnalysis: z.ZodOptional<z.ZodAny>;
        digitalActors: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        partDecomposition: z.ZodOptional<z.ZodAny>;
        occlusionGraph: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        keyPoses: z.ZodOptional<z.ZodAny>;
        motionTracks: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        cameraTrack: z.ZodOptional<z.ZodAny>;
        cameraLayout: z.ZodOptional<z.ZodAny>;
        routingPlan: z.ZodOptional<z.ZodAny>;
        representationSegments: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        gestureEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        gazeEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        facialEvents: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        drawings: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        palettes: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        exposureBlocks: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        criticReports: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        variantTournament: z.ZodOptional<z.ZodAny>;
        tasteScores: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        selectionHistory: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        artistCorrections: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        trainingSignals: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        provenance: z.ZodOptional<z.ZodAny>;
        limitations: z.ZodOptional<z.ZodAny>;
    }, z.ZodTypeAny, "passthrough">>;
    commandPlan: z.ZodObject<{
        schemaVersion: z.ZodString;
        planId: z.ZodString;
        manifestId: z.ZodString;
        createdAt: z.ZodString;
        operations: z.ZodArray<z.ZodAny, "many">;
        totalOperations: z.ZodNumber;
        estimatedExecutionTimeMs: z.ZodOptional<z.ZodNumber>;
        requiresHarmony: z.ZodBoolean;
        whitelistOnly: z.ZodBoolean;
        provenance: z.ZodOptional<z.ZodAny>;
        rollbackPlan: z.ZodOptional<z.ZodAny>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        schemaVersion: z.ZodString;
        planId: z.ZodString;
        manifestId: z.ZodString;
        createdAt: z.ZodString;
        operations: z.ZodArray<z.ZodAny, "many">;
        totalOperations: z.ZodNumber;
        estimatedExecutionTimeMs: z.ZodOptional<z.ZodNumber>;
        requiresHarmony: z.ZodBoolean;
        whitelistOnly: z.ZodBoolean;
        provenance: z.ZodOptional<z.ZodAny>;
        rollbackPlan: z.ZodOptional<z.ZodAny>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        schemaVersion: z.ZodString;
        planId: z.ZodString;
        manifestId: z.ZodString;
        createdAt: z.ZodString;
        operations: z.ZodArray<z.ZodAny, "many">;
        totalOperations: z.ZodNumber;
        estimatedExecutionTimeMs: z.ZodOptional<z.ZodNumber>;
        requiresHarmony: z.ZodBoolean;
        whitelistOnly: z.ZodBoolean;
        provenance: z.ZodOptional<z.ZodAny>;
        rollbackPlan: z.ZodOptional<z.ZodAny>;
    }, z.ZodTypeAny, "passthrough">>;
    outputDir: z.ZodOptional<z.ZodString>;
    projectPath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    dryRun: boolean;
    manifest: {
        schemaVersion: string;
        manifestId: string;
        createdAt: string;
        sceneId: string;
        provenance?: any;
        palettes?: any[] | undefined;
        drawings?: any[] | undefined;
        representationSegments?: any[] | undefined;
        selectionHistory?: any[] | undefined;
        voiceAnalysis?: any;
        exposureBlocks?: any[] | undefined;
        occlusionGraph?: any[] | undefined;
        cameraTrack?: any;
        sceneUnderstanding?: any;
        criticReports?: any[] | undefined;
        directorPlans?: any[] | undefined;
        performancePlans?: any[] | undefined;
        digitalActors?: any[] | undefined;
        partDecomposition?: any;
        keyPoses?: any;
        motionTracks?: any[] | undefined;
        cameraLayout?: any;
        routingPlan?: any;
        gestureEvents?: any[] | undefined;
        gazeEvents?: any[] | undefined;
        facialEvents?: any[] | undefined;
        variantTournament?: any;
        tasteScores?: any[] | undefined;
        artistCorrections?: any[] | undefined;
        trainingSignals?: any[] | undefined;
        limitations?: any;
    } & {
        [k: string]: unknown;
    };
    commandPlan: {
        schemaVersion: string;
        manifestId: string;
        createdAt: string;
        planId: string;
        operations: any[];
        totalOperations: number;
        requiresHarmony: boolean;
        whitelistOnly: boolean;
        provenance?: any;
        estimatedExecutionTimeMs?: number | undefined;
        rollbackPlan?: any;
    } & {
        [k: string]: unknown;
    };
    projectPath?: string | undefined;
    outputDir?: string | undefined;
}, {
    manifest: {
        schemaVersion: string;
        manifestId: string;
        createdAt: string;
        sceneId: string;
        provenance?: any;
        palettes?: any[] | undefined;
        drawings?: any[] | undefined;
        representationSegments?: any[] | undefined;
        selectionHistory?: any[] | undefined;
        voiceAnalysis?: any;
        exposureBlocks?: any[] | undefined;
        occlusionGraph?: any[] | undefined;
        cameraTrack?: any;
        sceneUnderstanding?: any;
        criticReports?: any[] | undefined;
        directorPlans?: any[] | undefined;
        performancePlans?: any[] | undefined;
        digitalActors?: any[] | undefined;
        partDecomposition?: any;
        keyPoses?: any;
        motionTracks?: any[] | undefined;
        cameraLayout?: any;
        routingPlan?: any;
        gestureEvents?: any[] | undefined;
        gazeEvents?: any[] | undefined;
        facialEvents?: any[] | undefined;
        variantTournament?: any;
        tasteScores?: any[] | undefined;
        artistCorrections?: any[] | undefined;
        trainingSignals?: any[] | undefined;
        limitations?: any;
    } & {
        [k: string]: unknown;
    };
    commandPlan: {
        schemaVersion: string;
        manifestId: string;
        createdAt: string;
        planId: string;
        operations: any[];
        totalOperations: number;
        requiresHarmony: boolean;
        whitelistOnly: boolean;
        provenance?: any;
        estimatedExecutionTimeMs?: number | undefined;
        rollbackPlan?: any;
    } & {
        [k: string]: unknown;
    };
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    outputDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    versionBefore: z.ZodString;
    versionAfter: z.ZodString;
    delta: z.ZodRecord<z.ZodString, z.ZodAny>;
    comment: z.ZodOptional<z.ZodString>;
    scope: z.ZodDefault<z.ZodEnum<["key_poses", "timing", "camera", "layer_structure", "palette", "representation", "full_scene"]>>;
    type: z.ZodDefault<z.ZodEnum<["position", "rotation", "scale", "keyframe_timing", "keyframe_value", "exposure_change", "drawing_substitution", "deformer_adjustment", "palette_color", "camera_move", "representation_change", "structural"]>>;
    accepted: z.ZodDefault<z.ZodBoolean>;
    affectedParts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    affectedFrames: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    chosenRepresentation: z.ZodOptional<z.ZodString>;
    timeSpentMinutes: z.ZodOptional<z.ZodNumber>;
    criticReportBefore: z.ZodOptional<z.ZodAny>;
    criticReportAfter: z.ZodOptional<z.ZodAny>;
}, "strict", z.ZodTypeAny, {
    type: "rotation" | "position" | "scale" | "camera_move" | "drawing_substitution" | "keyframe_timing" | "keyframe_value" | "exposure_change" | "deformer_adjustment" | "palette_color" | "representation_change" | "structural";
    delta: Record<string, any>;
    sceneId: string;
    affectedFrames: number[];
    affectedParts: string[];
    versionBefore: string;
    versionAfter: string;
    accepted: boolean;
    scope: "palette" | "timing" | "camera" | "representation" | "key_poses" | "layer_structure" | "full_scene";
    comment?: string | undefined;
    timeSpentMinutes?: number | undefined;
    chosenRepresentation?: string | undefined;
    criticReportBefore?: any;
    criticReportAfter?: any;
}, {
    delta: Record<string, any>;
    sceneId: string;
    versionBefore: string;
    versionAfter: string;
    type?: "rotation" | "position" | "scale" | "camera_move" | "drawing_substitution" | "keyframe_timing" | "keyframe_value" | "exposure_change" | "deformer_adjustment" | "palette_color" | "representation_change" | "structural" | undefined;
    comment?: string | undefined;
    affectedFrames?: number[] | undefined;
    affectedParts?: string[] | undefined;
    accepted?: boolean | undefined;
    scope?: "palette" | "timing" | "camera" | "representation" | "key_poses" | "layer_structure" | "full_scene" | undefined;
    timeSpentMinutes?: number | undefined;
    chosenRepresentation?: string | undefined;
    criticReportBefore?: any;
    criticReportAfter?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    variantA: z.ZodString;
    variantB: z.ZodString;
    preferredVariant: z.ZodString;
    score: z.ZodNumber;
    reasons: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    conflictWithTechnicalMetrics: z.ZodDefault<z.ZodBoolean>;
    confidence: z.ZodDefault<z.ZodNumber>;
    userId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    sceneId: string;
    score: number;
    variantA: string;
    variantB: string;
    preferredVariant: string;
    reasons: string[];
    conflictWithTechnicalMetrics: boolean;
    userId?: string | undefined;
}, {
    sceneId: string;
    score: number;
    variantA: string;
    variantB: string;
    preferredVariant: string;
    confidence?: number | undefined;
    reasons?: string[] | undefined;
    conflictWithTechnicalMetrics?: boolean | undefined;
    userId?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    versionBefore: z.ZodObject<{
        format: z.ZodLiteral<"SceneSnapshotPIR">;
        version: z.ZodLiteral<"1.0.0">;
        sceneId: z.ZodString;
        timestamp: z.ZodString;
        nodes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: string;
            id: string;
            name: string;
        }, {
            type: string;
            id: string;
            name: string;
        }>, "many">;
        connections: z.ZodArray<z.ZodObject<{
            from_node: z.ZodString;
            from_port: z.ZodDefault<z.ZodNumber>;
            to_node: z.ZodString;
            to_port: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }, {
            from_node: string;
            to_node: string;
            from_port?: number | undefined;
            to_port?: number | undefined;
        }>, "many">;
        nodeData: z.ZodArray<z.ZodObject<{
            nodeId: z.ZodString;
            transformKeys: z.ZodOptional<z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                x: z.ZodNumber;
                y: z.ZodNumber;
                rotation: z.ZodNumber;
                scaleX: z.ZodNumber;
                scaleY: z.ZodNumber;
                interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }>, "many">>;
            exposures: z.ZodOptional<z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                drawing: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                frame: number;
                drawing: string;
            }, {
                frame: number;
                drawing: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[] | undefined;
        }, {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        version: "1.0.0";
        timestamp: string;
        nodes: {
            type: string;
            id: string;
            name: string;
        }[];
        connections: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
        format: "SceneSnapshotPIR";
        sceneId: string;
        nodeData: {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[] | undefined;
        }[];
    }, {
        version: "1.0.0";
        timestamp: string;
        nodes: {
            type: string;
            id: string;
            name: string;
        }[];
        connections: {
            from_node: string;
            to_node: string;
            from_port?: number | undefined;
            to_port?: number | undefined;
        }[];
        format: "SceneSnapshotPIR";
        sceneId: string;
        nodeData: {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[] | undefined;
        }[];
    }>;
    versionAfter: z.ZodObject<{
        format: z.ZodLiteral<"SceneSnapshotPIR">;
        version: z.ZodLiteral<"1.0.0">;
        sceneId: z.ZodString;
        timestamp: z.ZodString;
        nodes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: string;
            id: string;
            name: string;
        }, {
            type: string;
            id: string;
            name: string;
        }>, "many">;
        connections: z.ZodArray<z.ZodObject<{
            from_node: z.ZodString;
            from_port: z.ZodDefault<z.ZodNumber>;
            to_node: z.ZodString;
            to_port: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }, {
            from_node: string;
            to_node: string;
            from_port?: number | undefined;
            to_port?: number | undefined;
        }>, "many">;
        nodeData: z.ZodArray<z.ZodObject<{
            nodeId: z.ZodString;
            transformKeys: z.ZodOptional<z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                x: z.ZodNumber;
                y: z.ZodNumber;
                rotation: z.ZodNumber;
                scaleX: z.ZodNumber;
                scaleY: z.ZodNumber;
                interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }>, "many">>;
            exposures: z.ZodOptional<z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                drawing: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                frame: number;
                drawing: string;
            }, {
                frame: number;
                drawing: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[] | undefined;
        }, {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        version: "1.0.0";
        timestamp: string;
        nodes: {
            type: string;
            id: string;
            name: string;
        }[];
        connections: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
        format: "SceneSnapshotPIR";
        sceneId: string;
        nodeData: {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[] | undefined;
        }[];
    }, {
        version: "1.0.0";
        timestamp: string;
        nodes: {
            type: string;
            id: string;
            name: string;
        }[];
        connections: {
            from_node: string;
            to_node: string;
            from_port?: number | undefined;
            to_port?: number | undefined;
        }[];
        format: "SceneSnapshotPIR";
        sceneId: string;
        nodeData: {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[] | undefined;
        }[];
    }>;
}, "strict", z.ZodTypeAny, {
    versionBefore: {
        version: "1.0.0";
        timestamp: string;
        nodes: {
            type: string;
            id: string;
            name: string;
        }[];
        connections: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
        format: "SceneSnapshotPIR";
        sceneId: string;
        nodeData: {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[] | undefined;
        }[];
    };
    versionAfter: {
        version: "1.0.0";
        timestamp: string;
        nodes: {
            type: string;
            id: string;
            name: string;
        }[];
        connections: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
        format: "SceneSnapshotPIR";
        sceneId: string;
        nodeData: {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[] | undefined;
        }[];
    };
}, {
    versionBefore: {
        version: "1.0.0";
        timestamp: string;
        nodes: {
            type: string;
            id: string;
            name: string;
        }[];
        connections: {
            from_node: string;
            to_node: string;
            from_port?: number | undefined;
            to_port?: number | undefined;
        }[];
        format: "SceneSnapshotPIR";
        sceneId: string;
        nodeData: {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[] | undefined;
        }[];
    };
    versionAfter: {
        version: "1.0.0";
        timestamp: string;
        nodes: {
            type: string;
            id: string;
            name: string;
        }[];
        connections: {
            from_node: string;
            to_node: string;
            from_port?: number | undefined;
            to_port?: number | undefined;
        }[];
        format: "SceneSnapshotPIR";
        sceneId: string;
        nodeData: {
            nodeId: string;
            exposures?: {
                frame: number;
                drawing: string;
            }[] | undefined;
            transformKeys?: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[] | undefined;
        }[];
    };
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    correction: z.ZodObject<{
        correctionId: z.ZodString;
        sceneId: z.ZodString;
        versionBefore: z.ZodString;
        versionAfter: z.ZodString;
        timestamp: z.ZodString;
        artistId: z.ZodOptional<z.ZodString>;
        scope: z.ZodEnum<["key_poses", "timing", "camera", "layer_structure", "palette", "representation", "full_scene"]>;
        type: z.ZodEnum<["position", "rotation", "scale", "keyframe_timing", "keyframe_value", "exposure_change", "drawing_substitution", "deformer_adjustment", "palette_color", "camera_move", "representation_change", "structural"]>;
        affectedParts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        affectedFrames: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        delta: z.ZodRecord<z.ZodString, z.ZodAny>;
        comment: z.ZodOptional<z.ZodString>;
        reason: z.ZodOptional<z.ZodString>;
        timeSpentMinutes: z.ZodOptional<z.ZodNumber>;
        accepted: z.ZodDefault<z.ZodBoolean>;
        previousCriticOutput: z.ZodOptional<z.ZodAny>;
        chosenRepresentation: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        type: "rotation" | "position" | "scale" | "camera_move" | "drawing_substitution" | "keyframe_timing" | "keyframe_value" | "exposure_change" | "deformer_adjustment" | "palette_color" | "representation_change" | "structural";
        timestamp: string;
        delta: Record<string, any>;
        sceneId: string;
        affectedFrames: number[];
        affectedParts: string[];
        correctionId: string;
        versionBefore: string;
        versionAfter: string;
        accepted: boolean;
        scope: "palette" | "timing" | "camera" | "representation" | "key_poses" | "layer_structure" | "full_scene";
        reason?: string | undefined;
        comment?: string | undefined;
        artistId?: string | undefined;
        timeSpentMinutes?: number | undefined;
        previousCriticOutput?: any;
        chosenRepresentation?: string | undefined;
    }, {
        type: "rotation" | "position" | "scale" | "camera_move" | "drawing_substitution" | "keyframe_timing" | "keyframe_value" | "exposure_change" | "deformer_adjustment" | "palette_color" | "representation_change" | "structural";
        timestamp: string;
        delta: Record<string, any>;
        sceneId: string;
        correctionId: string;
        versionBefore: string;
        versionAfter: string;
        scope: "palette" | "timing" | "camera" | "representation" | "key_poses" | "layer_structure" | "full_scene";
        reason?: string | undefined;
        comment?: string | undefined;
        affectedFrames?: number[] | undefined;
        affectedParts?: string[] | undefined;
        accepted?: boolean | undefined;
        artistId?: string | undefined;
        timeSpentMinutes?: number | undefined;
        previousCriticOutput?: any;
        chosenRepresentation?: string | undefined;
    }>;
    targetManifest: z.ZodAny;
}, "strict", z.ZodTypeAny, {
    correction: {
        type: "rotation" | "position" | "scale" | "camera_move" | "drawing_substitution" | "keyframe_timing" | "keyframe_value" | "exposure_change" | "deformer_adjustment" | "palette_color" | "representation_change" | "structural";
        timestamp: string;
        delta: Record<string, any>;
        sceneId: string;
        affectedFrames: number[];
        affectedParts: string[];
        correctionId: string;
        versionBefore: string;
        versionAfter: string;
        accepted: boolean;
        scope: "palette" | "timing" | "camera" | "representation" | "key_poses" | "layer_structure" | "full_scene";
        reason?: string | undefined;
        comment?: string | undefined;
        artistId?: string | undefined;
        timeSpentMinutes?: number | undefined;
        previousCriticOutput?: any;
        chosenRepresentation?: string | undefined;
    };
    targetManifest?: any;
}, {
    correction: {
        type: "rotation" | "position" | "scale" | "camera_move" | "drawing_substitution" | "keyframe_timing" | "keyframe_value" | "exposure_change" | "deformer_adjustment" | "palette_color" | "representation_change" | "structural";
        timestamp: string;
        delta: Record<string, any>;
        sceneId: string;
        correctionId: string;
        versionBefore: string;
        versionAfter: string;
        scope: "palette" | "timing" | "camera" | "representation" | "key_poses" | "layer_structure" | "full_scene";
        reason?: string | undefined;
        comment?: string | undefined;
        affectedFrames?: number[] | undefined;
        affectedParts?: string[] | undefined;
        accepted?: boolean | undefined;
        artistId?: string | undefined;
        timeSpentMinutes?: number | undefined;
        previousCriticOutput?: any;
        chosenRepresentation?: string | undefined;
    };
    targetManifest?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    correctionId: z.ZodString;
    action: z.ZodEnum<["lock", "unlock", "revert"]>;
}, "strict", z.ZodTypeAny, {
    action: "lock" | "unlock" | "revert";
    correctionId: string;
}, {
    action: "lock" | "unlock" | "revert";
    correctionId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    exportId: z.ZodString;
    sceneIds: z.ZodArray<z.ZodString, "many">;
    format: z.ZodDefault<z.ZodEnum<["jsonl", "json", "parquet"]>>;
    includeCorrections: z.ZodDefault<z.ZodBoolean>;
    includePreferences: z.ZodDefault<z.ZodBoolean>;
    includeCriticReports: z.ZodDefault<z.ZodBoolean>;
    privacyLevel: z.ZodDefault<z.ZodEnum<["public", "studio_only", "private"]>>;
    outputPath: z.ZodString;
    timestamp: z.ZodString;
}, "strict", z.ZodTypeAny, {
    timestamp: string;
    outputPath: string;
    format: "json" | "jsonl" | "parquet";
    privacyLevel: "public" | "studio_only" | "private";
    exportId: string;
    sceneIds: string[];
    includeCorrections: boolean;
    includePreferences: boolean;
    includeCriticReports: boolean;
}, {
    timestamp: string;
    outputPath: string;
    exportId: string;
    sceneIds: string[];
    format?: "json" | "jsonl" | "parquet" | undefined;
    privacyLevel?: "public" | "studio_only" | "private" | undefined;
    includeCorrections?: boolean | undefined;
    includePreferences?: boolean | undefined;
    includeCriticReports?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>>)[];
