import { z } from 'zod';
export declare const VOICE_PERFORMANCE_SCHEMA_VERSION = "1.0";
export declare const voiceAnalysisSchema: z.ZodObject<{
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
export declare const performanceStyleSchema: z.ZodEnum<["restrained", "energetic", "sarcastic", "anxious", "aggressive", "comedic", "custom"]>;
export declare const performanceEventKindSchema: z.ZodEnum<["pose", "gesture", "gaze", "blink", "breath", "weight_shift", "facial_expression", "reaction", "head_accent", "body_accent", "hold"]>;
export declare const performanceEventSchema: z.ZodObject<{
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
}>;
export declare const performancePlanSchema: z.ZodEffects<z.ZodObject<{
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
export declare const performanceVariantSetSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    sceneId: z.ZodString;
    characterId: z.ZodString;
    variants: z.ZodArray<z.ZodEffects<z.ZodObject<{
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
    }>, "many">;
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
    sourceScene: z.ZodEffects<z.ZodObject<{
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
    notes: z.ZodString;
}, "strict", z.ZodTypeAny, {
    schemaVersion: "1.0";
    characterId: string;
    notes: string;
    sceneId: string;
    variants: {
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
    }[];
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
    sourceScene: {
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
}, {
    schemaVersion: "1.0";
    characterId: string;
    notes: string;
    sceneId: string;
    variants: {
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
    }[];
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
    sourceScene: {
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
}>;
export type VoiceAnalysis = z.infer<typeof voiceAnalysisSchema>;
export type PerformancePlan = z.infer<typeof performancePlanSchema>;
export type PerformanceEvent = z.infer<typeof performanceEventSchema>;
export type PerformanceStyle = z.infer<typeof performanceStyleSchema>;
export type PerformanceVariantSet = z.infer<typeof performanceVariantSetSchema>;
