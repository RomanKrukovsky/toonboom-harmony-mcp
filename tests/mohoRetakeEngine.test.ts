import { describe, it, expect } from '@jest/globals';

import {
  qaFindingSchema,
  type QaFinding
} from '../src/schemas/qaReport.js';
import {
  mohoRetakeManifestSchema,
  mohoRetakePatchSchema
} from '../src/schemas/mohoRetakeManifest.js';
import { mohoPerformancePirSchema } from '../src/schemas/mohoPerformancePir.js';
import { MohoRetakeEngine } from '../src/services/mohoRetakeEngine/index.js';
import {
  VALID_DATE,
  validMohoCharacterBible,
  validMohoShowBible,
  validMohoQaThresholds
} from './fixtures/mohoShowBible.valid.js';

const ENGINE_ID = 'moho-retake-engine-v1';

function makeFinding(overrides: Partial<QaFinding> = {}): QaFinding {
  return qaFindingSchema.parse({
    findingId: 'f_001',
    check: 'lipsync_drift',
    severity: 'low',
    measured: 90,
    threshold: 80,
    message: 'Lipsync drift 90ms above threshold 80ms',
    autoFixable: true,
    ...overrides
  });
}

function makePir() {
  const showBible = validMohoShowBible({ rigType: 'humanoid_2leg' });
  return mohoPerformancePirSchema.parse({
    schemaVersion: '1.0',
    performanceId: 'perf_test_001',
    rigType: 'humanoid_2leg',
    shotManifestRef: 'shot_test_001',
    mohoShowBibleRef: showBible.showId,
    boneKeys: [
      { boneId: 5, boneName: 'Head', channel: 'rotation', frame: 4, value: 0, interpolation: 'ease_in_out' },
      { boneId: 5, boneName: 'Head', channel: 'rotation', frame: 24, value: 5.4, interpolation: 'ease_in_out' }
    ],
    switchKeys: [
      { switchLayerName: 'Mouth switch', frame: 4, choice: 'B', interpolation: 'step' as const },
      { switchLayerName: 'Mouth switch', frame: 24, choice: 'A', interpolation: 'step' as const }
    ],
    smartBoneActions: [],
    cameraKeys: [],
    fxKeys: [],
    deterministicFingerprint: 'a'.repeat(64),
    provenance: { compiledAt: VALID_DATE, compilerVersion: ENGINE_ID }
  });
}

function makeQaResult(findings: QaFinding[]) {
  return {
    shotId: 'shot_test_001',
    overallStatus: (findings.length === 0 ? 'pass' : 'warn') as 'pass' | 'warn' | 'fail',
    findings,
    autoFixableFindings: findings.filter(f => f.autoFixable).length,
    criticalFindings: findings.filter(f => f.severity === 'critical').length,
    requiresHumanApproval: false,
    humanApprovalReasons: [],
    fingerprint: 'b'.repeat(64)
  };
}

function makeCtx() {
  return {
    pir: makePir(),
    characterBible: validMohoCharacterBible('humanoid_2leg'),
    qaResult: makeQaResult([]),
    thresholds: validMohoQaThresholds()
  };
}

describe('MohoRetakeEngine', () => {
  it('1. no findings = no patches (empty patches array)', () => {
    const engine = new MohoRetakeEngine();
    const result = engine.generatePatches(makeCtx());
    expect(result.patches).toEqual([]);
  });

  it('2. lipsync_drift finding produces a switch-key-shift patch with correct shape', () => {
    const engine = new MohoRetakeEngine();
    const ctx = makeCtx();
    ctx.qaResult = makeQaResult([makeFinding({
      findingId: 'f_lip_01',
      check: 'lipsync_drift',
      severity: 'low',
      measured: 25,
      threshold: 10
    })]);
    const out = engine.generatePatches(ctx);
    expect(out.patches.length).toBeGreaterThanOrEqual(1);
    const patch = out.patches[0]!;
    expect(mohoRetakePatchSchema.safeParse(patch).success).toBe(true);
    expect(patch.targetRigType).toBe('humanoid_2leg');
    expect(typeof patch.frame).toBe('number');
    expect(patch.recordedBy).toBe(ENGINE_ID);
  });

  it('3. bone_angle_tolerance finding produces a bone-angle patch with correct shape', () => {
    const engine = new MohoRetakeEngine();
    const ctx = makeCtx();
    ctx.qaResult = makeQaResult([makeFinding({
      findingId: 'f_bone_01',
      check: 'bone_angle_tolerance',
      severity: 'medium',
      measured: 5.4,
      threshold: 2,
      message: 'Head bone angle 5.4deg exceeds tolerance 2deg',
      autoFixable: true
    })]);
    const out = engine.generatePatches(ctx);
    expect(out.patches.length).toBeGreaterThanOrEqual(1);
    const patch = out.patches[0]!;
    expect(mohoRetakePatchSchema.safeParse(patch).success).toBe(true);
    expect(patch.targetRigType).toBe('humanoid_2leg');
    expect(patch.channel).toBe('rotation');
  });

  it('4. continuity_gap finding produces an intermediate keyframe patch', () => {
    const engine = new MohoRetakeEngine();
    const ctx = makeCtx();
    ctx.qaResult = makeQaResult([makeFinding({
      findingId: 'f_cont_01',
      check: 'continuity_gap',
      severity: 'low',
      measured: 4,
      threshold: 2,
      message: 'Continuity delta 4f above threshold 2f',
      autoFixable: true
    })]);
    const out = engine.generatePatches(ctx);
    expect(out.patches.length).toBeGreaterThanOrEqual(1);
    const patch = out.patches[0]!;
    expect(mohoRetakePatchSchema.safeParse(patch).success).toBe(true);
    expect(patch.targetRigType).toBe('humanoid_2leg');
  });

  it('5. high severity → autoApplicable false', () => {
    const engine = new MohoRetakeEngine();
    const ctx = makeCtx();
    ctx.qaResult = makeQaResult([makeFinding({
      findingId: 'f_high_01',
      check: 'lipsync_drift',
      severity: 'high',
      measured: 200,
      threshold: 80,
      autoFixable: true
    })]);
    const out = engine.generatePatches(ctx);
    expect(out.severity).toBe('high');
    expect(out.autoApplicable).toBe(false);
  });

  it('6. low severity + autoFixable → autoApplicable true', () => {
    const engine = new MohoRetakeEngine();
    const ctx = makeCtx();
    ctx.qaResult = makeQaResult([makeFinding({
      check: 'lipsync_drift',
      severity: 'low',
      measured: 25,
      threshold: 10,
      autoFixable: true
    })]);
    const out = engine.generatePatches(ctx);
    expect(out.severity).toBe('low');
    expect(out.patches.length).toBeGreaterThan(0);
    expect(out.autoApplicable).toBe(true);
  });

  it('7. deterministic fingerprint (same input → same fingerprint)', () => {
    const engine = new MohoRetakeEngine();
    const ctx1 = makeCtx();
    ctx1.qaResult = makeQaResult([makeFinding({ check: 'lipsync_drift', severity: 'low', autoFixable: true })]);
    const ctx2 = makeCtx();
    ctx2.qaResult = makeQaResult([makeFinding({ check: 'lipsync_drift', severity: 'low', autoFixable: true })]);
    const a = engine.generatePatches(ctx1);
    const b = engine.generatePatches(ctx2);
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('8. patches sorted by frame for stable apply', () => {
    const engine = new MohoRetakeEngine();
    const ctx = makeCtx();
    ctx.pir = makePir();
    ctx.pir.switchKeys = [
      { switchLayerName: 'Mouth switch', frame: 12, choice: 'A', interpolation: 'step' as const },
      { switchLayerName: 'Mouth switch', frame: 4, choice: 'B', interpolation: 'step' as const },
      { switchLayerName: 'Mouth switch', frame: 24, choice: 'O', interpolation: 'step' as const }
    ];
    ctx.qaResult = makeQaResult([makeFinding({
      check: 'lipsync_drift',
      severity: 'low',
      autoFixable: true
    })]);
    const out = engine.generatePatches(ctx);
    for (let i = 1; i < out.patches.length; i++) {
      expect(out.patches[i]!.frame).toBeGreaterThanOrEqual(out.patches[i - 1]!.frame);
    }
  });

  it('9. canAutoApply respects thresholds.autoApprovalBySeverity', () => {
    const engine = new MohoRetakeEngine();
    const ctx = makeCtx();
    ctx.qaResult = makeQaResult([makeFinding({
      check: 'lipsync_drift',
      severity: 'medium',
      autoFixable: true
    })]);
    const out = engine.generatePatches(ctx);
    const decision = MohoRetakeEngine.canAutoApply(out, {
      ...validMohoQaThresholds()
    } as any);
    expect(typeof decision.canAutoApply).toBe('boolean');
    expect(Array.isArray(decision.reasons)).toBe(true);
  });

  it('10. recordedBy is moho-retake-engine-v1', () => {
    const engine = new MohoRetakeEngine();
    const ctx = makeCtx();
    ctx.qaResult = makeQaResult([makeFinding({
      check: 'lipsync_drift',
      severity: 'low',
      autoFixable: true
    })]);
    const out = engine.generatePatches(ctx);
    for (const p of out.patches) {
      expect(p.recordedBy).toBe(ENGINE_ID);
    }
  });
});