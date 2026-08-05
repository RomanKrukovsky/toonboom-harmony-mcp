import { describe, expect, it } from '@jest/globals';
import {
  buildRetargetingPlan,
  compileToHarmonyPlan,
  reduceKeys,
  resampleKeys,
  maxDeviation,
  solveTwoBoneIk,
  type RigDefinition,
  type ChannelKey
} from '../../src/services/poseRetargetCompiler/index.js';
import { harmonyCommandPlanV5Schema, checkPlanInvariants } from '../../src/schemas/harmonyCommandPlanV5.js';
import { MlError } from '../../src/errors/mlErrorRegistry.js';

const provenance = {
  providerId: 'dwpose', modelId: 'dwpose-ll-ucoco-384', modelRevision: 'dw-ll_ucoco_384',
  repositoryUrl: null, repositoryCommit: null,
  weightsFiles: ['w.onnx'], weightsSha256: ['a'.repeat(64)],
  runtimeName: 'onnxruntime', runtimeVersion: '1.28.0', pythonVersion: '3.14.6',
  device: 'cpu', precision: 'float32',
  startedAt: '2026-07-28T00:00:00.000Z', completedAt: '2026-07-28T00:00:01.000Z',
  durationMs: 1000, peakMemoryMb: null, seed: null, deterministic: true,
  inputArtifactHashes: [], outputArtifactHashes: [], licenseDecisionId: 'lic_1',
  commercialMode: 'preview' as const, realInferenceExecuted: true, simulated: false,
  cacheHit: false, correlationId: 'corr_1', jobId: 'job_1'
};

const rig: RigDefinition = {
  characterId: 'test',
  rigVersion: '1.0.0',
  rootNodePath: 'Top/Character/Root_Peg',
  restTorsoLength: 3.2,
  bindings: [
    { joint: 'spine_mid', nodePath: 'Top/Character/Torso_Peg', channels: ['rotationZ'] },
    { joint: 'nose', nodePath: 'Top/Character/Head_Peg', channels: ['rotationZ'], rotationLimits: { min: -90, max: 90 } },
    { joint: 'shoulder_left', nodePath: 'Top/Character/Arm_L_Upper', channels: ['rotationZ'] },
    { joint: 'elbow_left', nodePath: 'Top/Character/Arm_L_Lower', channels: ['rotationZ'], rotationLimits: { min: 0, max: 150 } }
  ],
  ikChains: [{
    name: 'arm_left', root: 'shoulder_left', mid: 'elbow_left', end: 'wrist_left',
    poleSign: 1, upperNodePath: 'Top/Character/Arm_L_Upper', lowerNodePath: 'Top/Character/Arm_L_Lower'
  }],
  footJoints: ['ankle_left']
};

/** Builds a synthetic but schema-valid pose sequence with a moving arm. */
function poseSequence(frameCount: number, frameBase: 1 | 0 = 1) {
  const frames = Array.from({ length: frameCount }, (_, i) => {
    const t = i / Math.max(1, frameCount - 1);
    const kp = (joint: string, x: number, y: number, sourceIndex: number) =>
      ({ joint, sourceIndex, x, y, confidence: 0.9, interpolated: false, gated: false });
    return {
      frame: frameBase + i,
      personId: 'p0',
      bbox: { x: 0, y: 0, width: 200, height: 400 },
      detectionScore: 0.95,
      keypoints: [
        kp('nose', 100, 40, 0),
        kp('neck', 100, 80, 5),
        kp('hip_center', 100 + t * 20, 200, 11),
        kp('hip_left', 90, 200, 11),
        kp('hip_right', 110, 200, 12),
        kp('shoulder_left', 80, 90, 5),
        kp('elbow_left', 70 + t * 30, 130, 7),
        kp('wrist_left', 60 + t * 60, 170, 9),
        kp('spine_mid', 100, 140, 5)
      ],
      mirrored: false
    };
  });
  return {
    schemaVersion: '2.0',
    sequenceId: 'pose_test',
    taskType: 'pose_estimation',
    skeletonConvention: 'coco_wholebody133',
    skeletonMappingId: 'coco_wholebody133_to_canonical_v1',
    coordinates: {
      coordinateSpace: 'image_pixels', origin: 'top_left',
      axisDirection: { x: 'right', y: 'down' },
      width: 512, height: 512, normalized: false, pixelAspectRatio: 1,
      harmonyFieldTransform: { a: 0.0234375, b: 0, tx: -6, c: 0, d: -0.0234375, ty: 6, unitsPerField: 12 }
    },
    timing: { frameBase, fps: 24, frameCount, startFrame: frameBase, endFrame: frameBase + frameCount - 1 },
    frames,
    rawOutputArtifactId: 'art_raw',
    overlayArtifactId: null,
    postProcessing: {
      confidenceGate: 0.3, maxInterpolatedGapFrames: 2, outlierRejection: 'none',
      temporalSmoothing: 'none', smoothingParameters: {}, scaleNormalized: false
    },
    warnings: [],
    provenance
  };
}

describe('two-bone IK', () => {
  it('returns 0 bend when the chain is fully extended', () => {
    const solved = solveTwoBoneIk({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, 1);
    expect(Math.abs(solved.lowerAngle)).toBeLessThan(1);
  });

  it('bends towards the pole side, consistently', () => {
    const positive = solveTwoBoneIk({ x: 0, y: 0 }, { x: 0.5, y: 0.8 }, { x: 0, y: 1.6 }, 1);
    const negative = solveTwoBoneIk({ x: 0, y: 0 }, { x: 0.5, y: 0.8 }, { x: 0, y: 1.6 }, -1);
    expect(positive.lowerAngle).toBeGreaterThan(0);
    expect(negative.lowerAngle).toBeLessThan(0);
    expect(positive.lowerAngle).toBeCloseTo(-negative.lowerAngle, 6);
  });

  it('stays finite for a degenerate chain instead of producing NaN', () => {
    // Coincident joints make both bone lengths zero, which is where an unguarded acos would
    // divide by zero and hand a NaN straight into a Harmony function point.
    const degenerate = solveTwoBoneIk({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    expect(Number.isFinite(degenerate.upperAngle)).toBe(true);
    expect(Number.isFinite(degenerate.lowerAngle)).toBe(true);

    const extreme = solveTwoBoneIk({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 50 }, 1);
    expect(Number.isFinite(extreme.upperAngle)).toBe(true);
    expect(Number.isFinite(extreme.lowerAngle)).toBe(true);
  });
});

describe('key reduction', () => {
  const straightLine: ChannelKey[] = Array.from({ length: 20 }, (_, i) => ({ frame: i + 1, value: i * 2, extremum: false }));

  it('collapses a straight ramp to its endpoints', () => {
    const reduced = reduceKeys(straightLine, 0.001);
    expect(reduced).toHaveLength(2);
    expect(reduced[0].frame).toBe(1);
    expect(reduced[1].frame).toBe(20);
  });

  it('keeps local extrema even when the tolerance would allow removing them', () => {
    const withPeak: ChannelKey[] = [
      { frame: 1, value: 0, extremum: false },
      { frame: 2, value: 0.001, extremum: false },
      { frame: 3, value: 0, extremum: false }
    ];
    const reduced = reduceKeys(withPeak, 10);
    expect(reduced.map(k => k.frame)).toContain(2);
    expect(reduced.find(k => k.frame === 2)?.extremum).toBe(true);
  });

  it('never introduces an error larger than the tolerance', () => {
    const noisy: ChannelKey[] = Array.from({ length: 60 }, (_, i) => ({
      frame: i + 1, value: Math.sin(i / 4) * 10 + Math.cos(i / 1.7) * 0.4, extremum: false
    }));
    for (const tolerance of [0.1, 0.5, 2]) {
      const reduced = reduceKeys(noisy, tolerance);
      expect(maxDeviation(noisy, reduced)).toBeLessThanOrEqual(tolerance + 1e-9);
      expect(reduced.length).toBeLessThan(noisy.length);
    }
  });

  it('does not write a key on every frame when the curve is approximable', () => {
    const smooth: ChannelKey[] = Array.from({ length: 100 }, (_, i) => ({ frame: i + 1, value: i * 0.5, extremum: false }));
    expect(reduceKeys(smooth, 0.5).length).toBeLessThan(10);
  });
});

describe('frame rate conversion', () => {
  it('resamples 30 fps onto a 24 fps 1-based timeline', () => {
    const source: ChannelKey[] = Array.from({ length: 31 }, (_, i) => ({ frame: i + 1, value: i, extremum: false }));
    const converted = resampleKeys(source, 30, 24);
    expect(converted[0].frame).toBe(1);
    expect(converted.every(k => k.frame >= 1)).toBe(true);
    expect(converted.length).toBeLessThan(source.length);
  });
});

describe('buildRetargetingPlan', () => {
  it('produces channels with finite values on a 1-based timeline', () => {
    const plan = buildRetargetingPlan(poseSequence(24), rig);
    expect(plan.channels.length).toBeGreaterThan(0);
    expect(plan.startFrame).toBeGreaterThanOrEqual(1);
    for (const channel of plan.channels) {
      for (const key of channel.keys) {
        expect(Number.isFinite(key.value)).toBe(true);
        expect(key.frame).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('shifts a 0-based source onto the 1-based Harmony timeline and says so', () => {
    const plan = buildRetargetingPlan(poseSequence(10, 0), rig);
    expect(plan.frameBase).toBe(1);
    expect(plan.startFrame).toBeGreaterThanOrEqual(1);
    expect(plan.warnings.join(' ')).toMatch(/1-based/);
  });

  it('refuses a pose sequence with no Harmony field transform rather than guessing one', () => {
    const pose = poseSequence(5) as Record<string, unknown>;
    (pose.coordinates as Record<string, unknown>).harmonyFieldTransform = null;
    expect(() => buildRetargetingPlan(pose, rig)).toThrow(MlError);
  });

  it('refuses input that is not a valid PoseSequenceV2', () => {
    expect(() => buildRetargetingPlan({ nope: true }, rig)).toThrow(MlError);
  });

  it('drops keypoints below the confidence gate instead of trusting them', () => {
    const pose = poseSequence(10) as ReturnType<typeof poseSequence>;
    for (const frame of pose.frames) for (const kp of frame.keypoints) kp.confidence = 0.1;
    expect(() => buildRetargetingPlan(pose, rig, { confidenceGate: 0.5 })).toThrow(/no frame with keypoints/);
  });

  it('records the tolerance each channel was reduced against', () => {
    const plan = buildRetargetingPlan(poseSequence(30), rig, {
      keyReductionToleranceDegrees: 1, keyReductionToleranceField: 0.05
    });
    for (const channel of plan.channels) {
      expect(channel.reductionTolerance).toBe(channel.channel === 'rotationZ' ? 1 : 0.05);
      expect(channel.reconstructionError).toBeLessThanOrEqual(channel.reductionTolerance + 1e-9);
    }
  });

  it('normalises scale so a larger on-screen character does not drive larger rig values', () => {
    const small = buildRetargetingPlan(poseSequence(12), rig);
    const scaledPose = poseSequence(12) as ReturnType<typeof poseSequence>;
    for (const frame of scaledPose.frames) {
      for (const kp of frame.keypoints) { kp.x = kp.x * 1.8; kp.y = kp.y * 1.8; }
    }
    const large = buildRetargetingPlan(scaledPose, rig);

    const rotationOf = (plan: typeof small, node: string) =>
      plan.channels.find(c => c.nodePath === node && c.channel === 'rotationZ')?.keys.map(k => k.value) ?? [];

    const a = rotationOf(small, 'Top/Character/Arm_L_Upper');
    const b = rotationOf(large, 'Top/Character/Arm_L_Upper');
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBe(a.length);
    // Rotations are scale-invariant by construction; this asserts the pipeline preserves that.
    for (let i = 0; i < a.length; i += 1) expect(b[i]).toBeCloseTo(a[i], 4);
  });

  it('clamps to declared joint limits and reports which source frames were clamped', () => {
    const narrow: RigDefinition = {
      ...rig,
      bindings: rig.bindings.map(b => b.nodePath === 'Top/Character/Head_Peg'
        ? { ...b, rotationLimits: { min: -0.001, max: 0.001 } } : b)
    };
    const plan = buildRetargetingPlan(poseSequence(12), narrow);
    const head = plan.channels.find(c => c.nodePath === 'Top/Character/Head_Peg');
    expect(head).toBeDefined();
    expect(head!.clampedSourceFrames.length).toBeGreaterThan(0);
    for (const key of head!.keys) expect(Math.abs(key.value)).toBeLessThanOrEqual(0.001 + 1e-9);
  });

  it('is deterministic: identical input yields an identical plan id', () => {
    const a = buildRetargetingPlan(poseSequence(15), rig);
    const b = buildRetargetingPlan(poseSequence(15), rig);
    expect(a.planId).toBe(b.planId);
    expect(a.inputHash).toBe(b.inputHash);
  });
});

describe('compileToHarmonyPlan', () => {
  const options = {
    manifestId: 'manifest_test',
    shotId: 'sh010',
    sourceManifestSha256: 'e'.repeat(64),
    executionMode: 'offline_deterministic' as const,
    requiresRealHarmony: false
  };

  it('emits a plan that validates and violates no invariant', () => {
    const plan = compileToHarmonyPlan(buildRetargetingPlan(poseSequence(24), rig), options);
    const parsed = harmonyCommandPlanV5Schema.safeParse(plan);
    expect(parsed.success).toBe(true);
    expect(checkPlanInvariants(parsed.data!)).toEqual([]);
  });

  it('snapshots before it writes anything', () => {
    const plan = compileToHarmonyPlan(buildRetargetingPlan(poseSequence(12), rig), options);
    expect(plan.commands[0].payload.type).toBe('snapshot_project');
  });

  it('gives every command a rollback and a source PIR', () => {
    const retarget = buildRetargetingPlan(poseSequence(12), rig);
    const plan = compileToHarmonyPlan(retarget, options);
    for (const command of plan.commands) {
      expect(command.rollback.strategy).toBeDefined();
      expect(command.sourcePirId).toBe(retarget.planId);
      expect(command.sourcePirKind).toBe('RetargetingPlan');
    }
  });

  it('writes one function point per retained key, and no more', () => {
    const retarget = buildRetargetingPlan(poseSequence(24), rig);
    const expected = retarget.channels.reduce((sum, c) => sum + c.keys.length, 0);
    const plan = compileToHarmonyPlan(retarget, options);
    const points = plan.commands.filter(c => c.payload.type === 'set_function_point');
    expect(points).toHaveLength(expected);
  });

  it('never emits frame 0 and never emits a non-finite value', () => {
    const plan = compileToHarmonyPlan(buildRetargetingPlan(poseSequence(24), rig), options);
    for (const command of plan.commands) {
      if (command.payload.type !== 'set_function_point') continue;
      expect(command.payload.params.frame).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(command.payload.params.value)).toBe(true);
    }
  });

  it('refuses to claim Harmony execution it did not perform', () => {
    const plan = compileToHarmonyPlan(buildRetargetingPlan(poseSequence(12), rig), options);
    expect(plan.requiresRealHarmony).toBe(false);
    expect(plan.status).toBe('compiled');
    expect(plan.executionMode).toBe('offline_deterministic');
  });

  it('records the ML job that produced the pose it was compiled from', () => {
    const plan = compileToHarmonyPlan(buildRetargetingPlan(poseSequence(12), rig), options);
    expect(plan.provenance.contributingMlJobIds).toContain('job_1');
  });
});
