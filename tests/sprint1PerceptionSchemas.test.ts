/**
 * Sprint 1 contract tests — FacePerformance and SpeechTiming TS schemas parity with the
 * Python Pydantic shapes so a TS consumer cannot misinterpret a blocked sequence as a real
 * one. These are the mirror of services/ml-runtime/tests/test_{face,whisper}*.py.
 */

import {
  buildBlockedFacePerformance,
  facePerformanceSequenceSchema,
  FACE_PERFORMANCE_SCHEMA_VERSION,
  FACE_BLENDSHAPE_NAMES
} from '../src/schemas/facePerformance.js';

import {
  buildBlockedSpeechTiming,
  speechTimingSequenceSchema,
  SPEECH_TIMING_SCHEMA_VERSION
} from '../src/schemas/speechTiming.js';

describe('FacePerformanceSequence schema', () => {
  it('accepts a blocked sequence from the builder', () => {
    const seq = buildBlockedFacePerformance({
      reason: 'MediaPipe FaceLandmarker model task file not found at <repo>/services/ml-runtime/weights/mediapipe/face_landmarker.task',
      modelTask: 'face_landmarker.task',
      createdAt: '2026-07-27T00:00:00Z'
    });
    expect(seq.sourceKind).toBe('blocked');
    expect(seq.provenance.realInferenceExecuted).toBe(false);
    expect(seq.frames).toEqual([]);
    expect(seq.provenance.modelSha256).toBeNull();
    expect(seq.sourcePath).toBeNull();
    expect(seq.warnings.length).toBeGreaterThan(0);
  });

  it('rejects a "video" sequence without a realInferenceExecuted true', () => {
    expect(() =>
      facePerformanceSequenceSchema.parse({
        schemaVersion: FACE_PERFORMANCE_SCHEMA_VERSION,
        sourceKind: 'video',
        sourcePath: 'fixtures/clip.mp4',
        sourceWidth: 640,
        sourceHeight: 480,
        analyzedFrames: 1,
        framesWithFace: 1,
        frames: [
          {
            frameIndex: 0,
            timestampMs: 0,
            landmarks: [],
            blendshapes: [],
            transformationMatrix: [],
            inferenceDurationMs: 0,
            warnings: []
          }
        ],
        warnings: [],
        provenance: {
          engine: 'mediapipe_face_landmarker',
          modelTask: 'face_landmarker.task',
          modelSha256: null,
          realInferenceExecuted: false, // impossible: video implies real run
          runnerVersion: '1.0.0',
          createdAt: '2026-07-27T00:00:00Z'
        }
      })
    ).toThrow();
  });

  it('reports 52 canonical blendshape names', () => {
    expect(FACE_BLENDSHAPE_NAMES.length).toBe(52);
    expect(FACE_BLENDSHAPE_NAMES[0]).toBe('_neutral');
    expect(new Set(FACE_BLENDSHAPE_NAMES).size).toBe(FACE_BLENDSHAPE_NAMES.length);
  });

  it('does not leak absolute user paths through the blocked builder', () => {
    const seq = buildBlockedFacePerformance({
      reason: 'blocked',
      modelTask: 'face_landmarker.task',
      createdAt: '2026-07-27T00:00:00Z'
    });
    expect(JSON.stringify(seq)).not.toContain('/Users/');
  });
});

describe('SpeechTimingSequence schema', () => {
  it('accepts a blocked sequence from the builder', () => {
    const seq = buildBlockedSpeechTiming({
      reason: 'WhisperX weights for large-v3 not found',
      createdAt: '2026-07-27T00:00:00Z'
    });
    expect(seq.sourceKind).toBe('blocked');
    expect(seq.provenance.realInferenceExecuted).toBe(false);
    expect(seq.words).toEqual([]);
    expect(seq.pauses).toEqual([]);
    expect(seq.phonemes).toEqual([]);
    expect(seq.speechRateWpm).toBe(0);
    expect(seq.provenance.recognizer).toBe('blocked');
    expect(seq.provenance.aligner).toBeNull();
  });

  it('parses the blocked entry against the schema version', () => {
    const seq = buildBlockedSpeechTiming({ reason: 'blocked', createdAt: '2026-07-27T00:00:00Z' });
    expect(seq.schemaVersion).toBe(SPEECH_TIMING_SCHEMA_VERSION);
    expect(speechTimingSequenceSchema.safeParse(seq).success).toBe(true);
  });

  it('rejects an "audio" sequence with realInferenceExecuted false', () => {
    expect(() =>
      speechTimingSequenceSchema.parse({
        schemaVersion: SPEECH_TIMING_SCHEMA_VERSION,
        sourceKind: 'audio',
        sourcePath: 'fixtures/audio.wav',
        durationSeconds: 1.0,
        sampleRate: 16000,
        language: 'en',
        words: [],
        pauses: [],
        phonemes: [],
        speechRateWpm: 0,
        assumptions: [],
        warnings: [],
        provenance: {
          recognizer: 'whisperx',
          recognizerModel: 'large-v3',
          recognizerSha256: null,
          aligner: null,
          realInferenceExecuted: false, // incompatible with sourceKind='audio'
          runnerVersion: '1.0.0',
          createdAt: '2026-07-27T00:00:00Z'
        }
      })
    ).toThrow();
  });

  it('does not leak absolute user paths through the blocked builder', () => {
    const seq = buildBlockedSpeechTiming({ reason: 'blocked', createdAt: '2026-07-27T00:00:00Z' });
    expect(JSON.stringify(seq)).not.toContain('/Users/');
  });
});