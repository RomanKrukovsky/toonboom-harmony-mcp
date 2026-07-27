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

export const SPEECH_TIMING_SCHEMA_VERSION = '1.0.0';

export const timedWordSchema = z.object({
  startSeconds: z.number().min(0),
  endSeconds: z.number().positive(),
  text: z.string().min(1),
  confidence: z.number().min(0).max(1),
  speaker: z.string().nullable(),
  language: z.string().nullable()
}).strict().refine(v => v.endSeconds > v.startSeconds, {
  message: 'endSeconds must be greater than startSeconds'
});

export const timedPhonemeSchema = z.object({
  startSeconds: z.number().min(0),
  endSeconds: z.number().positive(),
  phone: z.string().min(1),
  wordIndex: z.number().int().min(0)
}).strict().refine(v => v.endSeconds > v.startSeconds, {
  message: 'endSeconds must be greater than startSeconds'
});

export const pauseSchema = z.object({
  startSeconds: z.number().min(0),
  endSeconds: z.number().positive(),
  kind: z.enum(['breath', 'hesitation', 'turn_gap', 'silence'])
}).strict();

export const speechTimingProvenanceSchema = z.object({
  recognizer: z.enum(['whisperx', 'blocked']),
  recognizerModel: z.string().nullable(),
  recognizerSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  aligner: z.enum(['mfa', 'whisperx_internal']).nullable(),
  realInferenceExecuted: z.boolean(),
  runnerVersion: z.string().min(1),
  createdAt: z.string().min(1)
}).strict();

export const speechTimingSequenceSchema = z.object({
  schemaVersion: z.literal(SPEECH_TIMING_SCHEMA_VERSION),
  sourceKind: z.enum(['audio', 'blocked']),
  sourcePath: z.string().nullable(),
  durationSeconds: z.number().min(0),
  sampleRate: z.number().int().min(0),
  language: z.string().nullable(),
  words: z.array(timedWordSchema),
  pauses: z.array(pauseSchema),
  phonemes: z.array(timedPhonemeSchema),
  speechRateWpm: z.number().min(0),
  assumptions: z.array(z.string()),
  warnings: z.array(z.string()),
  provenance: speechTimingProvenanceSchema
}).strict().superRefine((seq, ctx) => {
  if (seq.sourceKind === 'audio' && !seq.provenance.realInferenceExecuted) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'sourceKind="audio" requires provenance.realInferenceExecuted=true',
      path: ['provenance', 'realInferenceExecuted']
    });
  }
  if (seq.sourceKind === 'blocked' && seq.provenance.realInferenceExecuted) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'sourceKind="blocked" must not have provenance.realInferenceExecuted=true',
      path: ['provenance', 'realInferenceExecuted']
    });
  }
  if (seq.sourceKind === 'blocked') {
    if (seq.words.length !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'blocked sequence must have no words', path: ['words'] });
    }
    if (seq.pauses.length !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'blocked sequence must have no pauses', path: ['pauses'] });
    }
    if (seq.phonemes.length !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'blocked sequence must have no phonemes', path: ['phonemes'] });
    }
    if (seq.speechRateWpm !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'blocked sequence must have speechRateWpm=0', path: ['speechRateWpm'] });
    }
  }
});

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
export function buildBlockedSpeechTiming(args: {
  reason: string;
  createdAt: string;
}): SpeechTimingSequence {
  return speechTimingSequenceSchema.parse({
    schemaVersion: SPEECH_TIMING_SCHEMA_VERSION,
    sourceKind: 'blocked',
    sourcePath: null,
    durationSeconds: 0,
    sampleRate: 0,
    language: null,
    words: [],
    pauses: [],
    phonemes: [],
    speechRateWpm: 0,
    assumptions: [],
    warnings: [args.reason],
    provenance: {
      recognizer: 'blocked',
      recognizerModel: null,
      recognizerSha256: null,
      aligner: null,
      realInferenceExecuted: false,
      runnerVersion: '1.0.0',
      createdAt: args.createdAt
    }
  });
}