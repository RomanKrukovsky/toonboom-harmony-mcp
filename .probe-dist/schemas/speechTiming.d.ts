/**
 * Sprint 1 — Speech timing sequence TS schema (zod).
 *
 * Parity with services/ml-runtime/pipelines/speech_timing_schema.py so a TS consumer
 * (contract tests, capability registry, MCP tool) can validate the same shape.
 *
 * Honest-blocking rule: when `provenance.realInferenceExecuted` is false the sequence is
 * a blocked placeholder and MUST NOT be cited as evidence.
 */
import { z } from 'zod';
export declare const SPEECH_TIMING_SCHEMA_VERSION = "1.0.0";
export declare const timedWordSchema: z.ZodEffects<z.ZodObject<{
    startSeconds: z.ZodNumber;
    endSeconds: z.ZodNumber;
    text: z.ZodString;
    confidence: z.ZodNumber;
    speaker: z.ZodNullable<z.ZodString>;
    language: z.ZodNullable<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    text: string;
    language: string | null;
    speaker: string | null;
    startSeconds: number;
    endSeconds: number;
}, {
    confidence: number;
    text: string;
    language: string | null;
    speaker: string | null;
    startSeconds: number;
    endSeconds: number;
}>, {
    confidence: number;
    text: string;
    language: string | null;
    speaker: string | null;
    startSeconds: number;
    endSeconds: number;
}, {
    confidence: number;
    text: string;
    language: string | null;
    speaker: string | null;
    startSeconds: number;
    endSeconds: number;
}>;
export declare const timedPhonemeSchema: z.ZodEffects<z.ZodObject<{
    startSeconds: z.ZodNumber;
    endSeconds: z.ZodNumber;
    phone: z.ZodString;
    wordIndex: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    wordIndex: number;
    startSeconds: number;
    endSeconds: number;
    phone: string;
}, {
    wordIndex: number;
    startSeconds: number;
    endSeconds: number;
    phone: string;
}>, {
    wordIndex: number;
    startSeconds: number;
    endSeconds: number;
    phone: string;
}, {
    wordIndex: number;
    startSeconds: number;
    endSeconds: number;
    phone: string;
}>;
export declare const pauseSchema: z.ZodObject<{
    startSeconds: z.ZodNumber;
    endSeconds: z.ZodNumber;
    kind: z.ZodEnum<["breath", "hesitation", "turn_gap", "silence"]>;
}, "strict", z.ZodTypeAny, {
    kind: "breath" | "hesitation" | "turn_gap" | "silence";
    startSeconds: number;
    endSeconds: number;
}, {
    kind: "breath" | "hesitation" | "turn_gap" | "silence";
    startSeconds: number;
    endSeconds: number;
}>;
export declare const speechTimingProvenanceSchema: z.ZodObject<{
    recognizer: z.ZodEnum<["whisperx", "blocked"]>;
    recognizerModel: z.ZodNullable<z.ZodString>;
    recognizerSha256: z.ZodNullable<z.ZodString>;
    aligner: z.ZodNullable<z.ZodEnum<["mfa", "whisperx_internal"]>>;
    realInferenceExecuted: z.ZodBoolean;
    runnerVersion: z.ZodString;
    createdAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    createdAt: string;
    realInferenceExecuted: boolean;
    runnerVersion: string;
    recognizer: "blocked" | "whisperx";
    recognizerModel: string | null;
    recognizerSha256: string | null;
    aligner: "mfa" | "whisperx_internal" | null;
}, {
    createdAt: string;
    realInferenceExecuted: boolean;
    runnerVersion: string;
    recognizer: "blocked" | "whisperx";
    recognizerModel: string | null;
    recognizerSha256: string | null;
    aligner: "mfa" | "whisperx_internal" | null;
}>;
export declare const speechTimingSequenceSchema: z.ZodEffects<z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0.0">;
    sourceKind: z.ZodEnum<["audio", "blocked"]>;
    sourcePath: z.ZodNullable<z.ZodString>;
    durationSeconds: z.ZodNumber;
    sampleRate: z.ZodNumber;
    language: z.ZodNullable<z.ZodString>;
    words: z.ZodArray<z.ZodEffects<z.ZodObject<{
        startSeconds: z.ZodNumber;
        endSeconds: z.ZodNumber;
        text: z.ZodString;
        confidence: z.ZodNumber;
        speaker: z.ZodNullable<z.ZodString>;
        language: z.ZodNullable<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        text: string;
        language: string | null;
        speaker: string | null;
        startSeconds: number;
        endSeconds: number;
    }, {
        confidence: number;
        text: string;
        language: string | null;
        speaker: string | null;
        startSeconds: number;
        endSeconds: number;
    }>, {
        confidence: number;
        text: string;
        language: string | null;
        speaker: string | null;
        startSeconds: number;
        endSeconds: number;
    }, {
        confidence: number;
        text: string;
        language: string | null;
        speaker: string | null;
        startSeconds: number;
        endSeconds: number;
    }>, "many">;
    pauses: z.ZodArray<z.ZodObject<{
        startSeconds: z.ZodNumber;
        endSeconds: z.ZodNumber;
        kind: z.ZodEnum<["breath", "hesitation", "turn_gap", "silence"]>;
    }, "strict", z.ZodTypeAny, {
        kind: "breath" | "hesitation" | "turn_gap" | "silence";
        startSeconds: number;
        endSeconds: number;
    }, {
        kind: "breath" | "hesitation" | "turn_gap" | "silence";
        startSeconds: number;
        endSeconds: number;
    }>, "many">;
    phonemes: z.ZodArray<z.ZodEffects<z.ZodObject<{
        startSeconds: z.ZodNumber;
        endSeconds: z.ZodNumber;
        phone: z.ZodString;
        wordIndex: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        wordIndex: number;
        startSeconds: number;
        endSeconds: number;
        phone: string;
    }, {
        wordIndex: number;
        startSeconds: number;
        endSeconds: number;
        phone: string;
    }>, {
        wordIndex: number;
        startSeconds: number;
        endSeconds: number;
        phone: string;
    }, {
        wordIndex: number;
        startSeconds: number;
        endSeconds: number;
        phone: string;
    }>, "many">;
    speechRateWpm: z.ZodNumber;
    assumptions: z.ZodArray<z.ZodString, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
    provenance: z.ZodObject<{
        recognizer: z.ZodEnum<["whisperx", "blocked"]>;
        recognizerModel: z.ZodNullable<z.ZodString>;
        recognizerSha256: z.ZodNullable<z.ZodString>;
        aligner: z.ZodNullable<z.ZodEnum<["mfa", "whisperx_internal"]>>;
        realInferenceExecuted: z.ZodBoolean;
        runnerVersion: z.ZodString;
        createdAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        createdAt: string;
        realInferenceExecuted: boolean;
        runnerVersion: string;
        recognizer: "blocked" | "whisperx";
        recognizerModel: string | null;
        recognizerSha256: string | null;
        aligner: "mfa" | "whisperx_internal" | null;
    }, {
        createdAt: string;
        realInferenceExecuted: boolean;
        runnerVersion: string;
        recognizer: "blocked" | "whisperx";
        recognizerModel: string | null;
        recognizerSha256: string | null;
        aligner: "mfa" | "whisperx_internal" | null;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        createdAt: string;
        realInferenceExecuted: boolean;
        runnerVersion: string;
        recognizer: "blocked" | "whisperx";
        recognizerModel: string | null;
        recognizerSha256: string | null;
        aligner: "mfa" | "whisperx_internal" | null;
    };
    schemaVersion: "1.0.0";
    durationSeconds: number;
    warnings: string[];
    sourcePath: string | null;
    assumptions: string[];
    phonemes: {
        wordIndex: number;
        startSeconds: number;
        endSeconds: number;
        phone: string;
    }[];
    language: string | null;
    pauses: {
        kind: "breath" | "hesitation" | "turn_gap" | "silence";
        startSeconds: number;
        endSeconds: number;
    }[];
    sampleRate: number;
    words: {
        confidence: number;
        text: string;
        language: string | null;
        speaker: string | null;
        startSeconds: number;
        endSeconds: number;
    }[];
    speechRateWpm: number;
    sourceKind: "audio" | "blocked";
}, {
    provenance: {
        createdAt: string;
        realInferenceExecuted: boolean;
        runnerVersion: string;
        recognizer: "blocked" | "whisperx";
        recognizerModel: string | null;
        recognizerSha256: string | null;
        aligner: "mfa" | "whisperx_internal" | null;
    };
    schemaVersion: "1.0.0";
    durationSeconds: number;
    warnings: string[];
    sourcePath: string | null;
    assumptions: string[];
    phonemes: {
        wordIndex: number;
        startSeconds: number;
        endSeconds: number;
        phone: string;
    }[];
    language: string | null;
    pauses: {
        kind: "breath" | "hesitation" | "turn_gap" | "silence";
        startSeconds: number;
        endSeconds: number;
    }[];
    sampleRate: number;
    words: {
        confidence: number;
        text: string;
        language: string | null;
        speaker: string | null;
        startSeconds: number;
        endSeconds: number;
    }[];
    speechRateWpm: number;
    sourceKind: "audio" | "blocked";
}>, {
    provenance: {
        createdAt: string;
        realInferenceExecuted: boolean;
        runnerVersion: string;
        recognizer: "blocked" | "whisperx";
        recognizerModel: string | null;
        recognizerSha256: string | null;
        aligner: "mfa" | "whisperx_internal" | null;
    };
    schemaVersion: "1.0.0";
    durationSeconds: number;
    warnings: string[];
    sourcePath: string | null;
    assumptions: string[];
    phonemes: {
        wordIndex: number;
        startSeconds: number;
        endSeconds: number;
        phone: string;
    }[];
    language: string | null;
    pauses: {
        kind: "breath" | "hesitation" | "turn_gap" | "silence";
        startSeconds: number;
        endSeconds: number;
    }[];
    sampleRate: number;
    words: {
        confidence: number;
        text: string;
        language: string | null;
        speaker: string | null;
        startSeconds: number;
        endSeconds: number;
    }[];
    speechRateWpm: number;
    sourceKind: "audio" | "blocked";
}, {
    provenance: {
        createdAt: string;
        realInferenceExecuted: boolean;
        runnerVersion: string;
        recognizer: "blocked" | "whisperx";
        recognizerModel: string | null;
        recognizerSha256: string | null;
        aligner: "mfa" | "whisperx_internal" | null;
    };
    schemaVersion: "1.0.0";
    durationSeconds: number;
    warnings: string[];
    sourcePath: string | null;
    assumptions: string[];
    phonemes: {
        wordIndex: number;
        startSeconds: number;
        endSeconds: number;
        phone: string;
    }[];
    language: string | null;
    pauses: {
        kind: "breath" | "hesitation" | "turn_gap" | "silence";
        startSeconds: number;
        endSeconds: number;
    }[];
    sampleRate: number;
    words: {
        confidence: number;
        text: string;
        language: string | null;
        speaker: string | null;
        startSeconds: number;
        endSeconds: number;
    }[];
    speechRateWpm: number;
    sourceKind: "audio" | "blocked";
}>;
export type TimedWord = z.infer<typeof timedWordSchema>;
export type TimedPhoneme = z.infer<typeof timedPhonemeSchema>;
export type Pause = z.infer<typeof pauseSchema>;
export type SpeechTimingProvenance = z.infer<typeof speechTimingProvenanceSchema>;
export type SpeechTimingSequence = z.infer<typeof speechTimingSequenceSchema>;
/**
 * Build a blocked speech timing sequence. This is the only sanctioned way to produce a
 * "no inference ran" object for TS consumers; it forces realInferenceExecuted=false,
 * sourceKind='blocked', and carries the blocking reason in warnings.
 */
export declare function buildBlockedSpeechTiming(args: {
    reason: string;
    createdAt: string;
}): SpeechTimingSequence;
