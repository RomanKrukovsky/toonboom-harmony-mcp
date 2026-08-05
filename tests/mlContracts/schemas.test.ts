import { describe, expect, it } from '@jest/globals';
import {
  poseSequenceSchema,
  poseSequenceV2Schema,
  modelExecutionProvenanceSchema,
  coordinateSpaceSchema,
  frameTimingSchema,
  confidenceSchema,
  finiteNumberSchema,
  mlJobResultV2Schema,
  segmentationObjectV2Schema,
  speechAnalysisPirSchema,
  artifactReferenceSchema,
  inspectPoseSequenceV1ForV2
} from '../../src/schemas/ml.js';

const validProvenance = {
  providerId: 'dwpose',
  modelId: 'dwpose-ll-ucoco-384',
  modelRevision: 'dw-ll_ucoco_384',
  repositoryUrl: 'https://github.com/IDEA-Research/DWPose',
  repositoryCommit: null,
  weightsFiles: ['dw-ll_ucoco_384.onnx'],
  weightsSha256: ['724f4ff2439ed61afb86fb8a1951ec39c6220682803b4a8bd4f598cd913b1843'],
  runtimeName: 'onnxruntime',
  runtimeVersion: '1.28.0',
  pythonVersion: '3.14.6',
  device: 'cpu',
  precision: 'float32',
  startedAt: '2026-07-28T04:40:28.436Z',
  completedAt: '2026-07-28T04:40:28.849Z',
  durationMs: 413.3,
  peakMemoryMb: null,
  seed: null,
  deterministic: true,
  inputArtifactHashes: [],
  outputArtifactHashes: [],
  licenseDecisionId: 'lic_1',
  commercialMode: 'preview' as const,
  realInferenceExecuted: true,
  simulated: false,
  cacheHit: false,
  correlationId: 'corr_1',
  jobId: 'job_1'
};

describe('V1 contracts are preserved byte-compatibly', () => {
  it('still parses a V1 pose sequence written by an earlier sprint', () => {
    const v1 = {
      schemaVersion: '1.0',
      modelId: 'dwpose',
      frameCount: 1,
      fps: 24,
      poses: [{ frame: 1, landmarks: { nose: { x: 1, y: 2, z: 0, visibility: 1 } } }],
      provenance: { tool: 't', version: 'v', backend: 'b', device: 'cpu', precision: 'float32', timestamp: 'now' }
    };
    expect(poseSequenceSchema.safeParse(v1).success).toBe(true);
  });

  it('reports every V2 field that a V1 document cannot supply, instead of inventing them', () => {
    const report = inspectPoseSequenceV1ForV2({
      schemaVersion: '1.0', modelId: 'dwpose', frameCount: 0, fps: 24, poses: [],
      provenance: { tool: 't', version: 'v', backend: 'b', device: 'cpu', precision: 'float32', timestamp: 'now' }
    });
    expect(report.migrated).toBeNull();
    const fields = report.gaps.map(g => g.field);
    expect(fields).toContain('coordinates');
    expect(fields).toContain('provenance.weightsSha256');
    expect(fields).toContain('provenance.realInferenceExecuted');
  });
});

describe('numeric guards', () => {
  it('rejects NaN and Infinity, which bare z.number() accepts', () => {
    expect(finiteNumberSchema.safeParse(Number.NaN).success).toBe(false);
    expect(finiteNumberSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
    expect(finiteNumberSchema.safeParse(-1.5).success).toBe(true);
  });

  it('bounds confidence to [0,1] everywhere', () => {
    expect(confidenceSchema.safeParse(1.0574).success).toBe(false);
    expect(confidenceSchema.safeParse(-0.01).success).toBe(false);
    expect(confidenceSchema.safeParse(0.7).success).toBe(true);
  });
});

describe('frame timing', () => {
  const base = { fps: 24, frameCount: 3, startFrame: 1, endFrame: 3 };

  it('forbids frame 0 when the timeline is 1-based', () => {
    expect(frameTimingSchema.safeParse({ ...base, frameBase: 1, startFrame: 0, endFrame: 2 }).success).toBe(false);
    expect(frameTimingSchema.safeParse({ ...base, frameBase: 0, startFrame: 0, endFrame: 2 }).success).toBe(true);
  });

  it('rejects a negative-length range and an inconsistent frameCount', () => {
    expect(frameTimingSchema.safeParse({ ...base, frameBase: 1, startFrame: 5, endFrame: 2 }).success).toBe(false);
    expect(frameTimingSchema.safeParse({ ...base, frameBase: 1, frameCount: 99 }).success).toBe(false);
  });

  it('rejects a non-positive fps', () => {
    expect(frameTimingSchema.safeParse({ ...base, frameBase: 1, fps: 0 }).success).toBe(false);
  });
});

describe('coordinate space', () => {
  it('requires positive dimensions and a positive pixel aspect ratio', () => {
    const valid = {
      coordinateSpace: 'image_pixels', origin: 'top_left',
      axisDirection: { x: 'right', y: 'down' },
      width: 512, height: 512, normalized: false, pixelAspectRatio: 1, harmonyFieldTransform: null
    };
    expect(coordinateSpaceSchema.safeParse(valid).success).toBe(true);
    expect(coordinateSpaceSchema.safeParse({ ...valid, width: 0 }).success).toBe(false);
    expect(coordinateSpaceSchema.safeParse({ ...valid, height: -512 }).success).toBe(false);
    expect(coordinateSpaceSchema.safeParse({ ...valid, pixelAspectRatio: 0 }).success).toBe(false);
  });
});

describe('modelExecutionProvenanceSchema replaces provenance: z.any()', () => {
  it('accepts a fully populated real-inference record', () => {
    expect(modelExecutionProvenanceSchema.safeParse(validProvenance).success).toBe(true);
  });

  it('refuses to represent a run that is both real and simulated', () => {
    expect(modelExecutionProvenanceSchema.safeParse({ ...validProvenance, simulated: true }).success).toBe(false);
  });

  it('refuses a real-inference claim with no weights digest', () => {
    const result = modelExecutionProvenanceSchema.safeParse({ ...validProvenance, weightsFiles: [], weightsSha256: [] });
    expect(result.success).toBe(false);
  });

  it('refuses a negative duration and a completedAt before startedAt', () => {
    expect(modelExecutionProvenanceSchema.safeParse({ ...validProvenance, durationMs: -1 }).success).toBe(false);
    expect(modelExecutionProvenanceSchema.safeParse({
      ...validProvenance, startedAt: '2026-07-28T05:00:00.000Z', completedAt: '2026-07-28T04:00:00.000Z'
    }).success).toBe(false);
  });

  it('refuses a malformed weights digest', () => {
    expect(modelExecutionProvenanceSchema.safeParse({ ...validProvenance, weightsSha256: ['NOTAHASH'] }).success).toBe(false);
  });
});

describe('MlJobResultV2 honesty rules', () => {
  const base = {
    schemaVersion: '2.0' as const, jobId: 'job_1', correlationId: 'c', idempotencyKey: 'k'.repeat(16),
    taskType: 'pose_estimation' as const, attempt: 1, outputArtifacts: [], normalizedPir: null,
    warnings: [], error: null
  };

  it('will not represent a succeeded job without provenance', () => {
    expect(mlJobResultV2Schema.safeParse({ ...base, status: 'succeeded', provenance: null }).success).toBe(false);
  });

  it('will not represent a failed job without an error code', () => {
    expect(mlJobResultV2Schema.safeParse({ ...base, status: 'failed', provenance: null }).success).toBe(false);
  });

  it('accepts a blocked job that states why', () => {
    const result = mlJobResultV2Schema.safeParse({
      ...base, status: 'blocked', provenance: null,
      error: { code: 'ML_LICENSE_BLOCKED', message: 'review pending', retryable: false }
    });
    expect(result.success).toBe(true);
  });
});

describe('segmentation ontology', () => {
  const base = {
    objectId: 'o1', label: 'head' as const, groundingPhrase: null, labelConfidence: 0.9, maskScore: 0.9,
    bbox: { x: 0, y: 0, width: 10, height: 10 }, maskRle: null,
    maskArtifactId: 'art_1', occluded: false, areaPixels: 100, requiresHuman: false
  };

  it('requires either RLE or an artifact reference for the mask', () => {
    expect(segmentationObjectV2Schema.safeParse({ ...base, maskArtifactId: null }).success).toBe(false);
  });

  it('forces requiresHuman on anything the ontology could not ground', () => {
    expect(segmentationObjectV2Schema.safeParse({ ...base, label: 'unclassified', requiresHuman: false }).success).toBe(false);
    expect(segmentationObjectV2Schema.safeParse({ ...base, label: 'unclassified', requiresHuman: true }).success).toBe(true);
  });

  it('rejects a label outside the closed ontology', () => {
    expect(segmentationObjectV2Schema.safeParse({ ...base, label: 'wing' }).success).toBe(false);
  });
});

describe('speech: ASR words are not phonemes', () => {
  const base = {
    schemaVersion: '2.0' as const, taskType: 'speech_transcription' as const, language: 'ru',
    durationSeconds: 3, transcript: 'привет', transcriptConfirmedByHuman: false,
    words: [], segments: [], phonemes: [], alignerId: null, alignerKind: 'none' as const,
    warnings: [], provenance: validProvenance
  };

  it('refuses phonemes when no aligner is declared', () => {
    const withPhonemes = {
      ...base,
      phonemes: [{ phone: 'p', phoneSet: 'mfa_russian', startSeconds: 0, endSeconds: 0.1, confidence: 0.9, word: 'привет' }]
    };
    expect(speechAnalysisPirSchema.safeParse(withPhonemes).success).toBe(false);
  });

  it('accepts phonemes once a forced aligner is identified', () => {
    const aligned = {
      ...base,
      alignerKind: 'forced_alignment' as const,
      alignerId: 'mfa_russian_mfa_v2',
      phonemes: [{ phone: 'p', phoneSet: 'mfa_russian', startSeconds: 0, endSeconds: 0.1, confidence: 0.9, word: 'привет' }]
    };
    expect(speechAnalysisPirSchema.safeParse(aligned).success).toBe(true);
  });

  it('rejects a word whose end precedes its start', () => {
    const bad = { ...base, words: [{ text: 'a', startSeconds: 1, endSeconds: 0.5, confidence: 0.9, speakerId: null }] };
    expect(speechAnalysisPirSchema.safeParse(bad).success).toBe(false);
  });
});

describe('artifact references never carry escaping paths', () => {
  const base = {
    artifactId: 'art_1', sha256: 'a'.repeat(64), sizeBytes: 10,
    mimeType: 'application/json', relativePath: 'run/out.json', role: 'x'
  };

  it.each([
    ['/etc/passwd'],
    ['../../secrets.json'],
    ['run/../../escape.json']
  ])('rejects %s', (relativePath) => {
    expect(artifactReferenceSchema.safeParse({ ...base, relativePath }).success).toBe(false);
  });

  it('accepts a well-formed store-relative path', () => {
    expect(artifactReferenceSchema.safeParse(base).success).toBe(true);
  });
});

describe('PoseSequenceV2 end to end', () => {
  it('validates the shape the DWPose provider actually emits', () => {
    const pir = {
      schemaVersion: '2.0',
      sequenceId: 'pose_job_1',
      taskType: 'pose_estimation',
      skeletonConvention: 'coco_wholebody133',
      skeletonMappingId: 'coco_wholebody133_to_canonical_v1',
      coordinates: {
        coordinateSpace: 'image_pixels', origin: 'top_left',
        axisDirection: { x: 'right', y: 'down' },
        width: 512, height: 512, normalized: false, pixelAspectRatio: 1,
        harmonyFieldTransform: { a: 0.0234375, b: 0, tx: -6, c: 0, d: -0.0234375, ty: 6, unitsPerField: 12 }
      },
      timing: { frameBase: 1, fps: 24, frameCount: 1, startFrame: 1, endFrame: 1 },
      frames: [{
        frame: 1, personId: 'person_0',
        bbox: { x: 10, y: 10, width: 100, height: 200 },
        detectionScore: 0.95,
        keypoints: [{ joint: 'nose', sourceIndex: 0, x: 1, y: 2, confidence: 0.8, interpolated: false, gated: false }],
        mirrored: false
      }],
      rawOutputArtifactId: 'art_raw',
      overlayArtifactId: 'art_overlay',
      postProcessing: {
        confidenceGate: 0.3, maxInterpolatedGapFrames: 2, outlierRejection: 'none',
        temporalSmoothing: 'none', smoothingParameters: { window: 5 }, scaleNormalized: false
      },
      warnings: [],
      provenance: validProvenance
    };
    const result = poseSequenceV2Schema.safeParse(pir);
    if (!result.success) throw new Error(result.error.message);
    expect(result.success).toBe(true);
  });
});
