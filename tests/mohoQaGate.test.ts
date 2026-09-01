import { describe, it, expect } from '@jest/globals';

import { MohoQaGate } from '../src/services/mohoQaGate/index.js';
import type { MohoQaGateInput } from '../src/services/mohoQaGate/index.js';
import type { MohoQaThresholds } from '../src/schemas/mohoQaThresholds.js';
import type { MohoPerformancePir } from '../src/schemas/mohoPerformancePir.js';
import { validMohoQaThresholds } from './fixtures/mohoShowBible.valid.js';

const FIXED_APPROVAL_DATE = '2026-01-01T00:00:00.000Z';

function basePir(): MohoPerformancePir {
  return {
    schemaVersion: '1.0',
    performanceId: 'perf_test_v1',
    rigType: 'humanoid_2leg',
    shotManifestRef: 'shots/test.json',
    mohoShowBibleRef: 'bibles/show_test.json',
    boneKeys: [],
    switchKeys: [],
    smartBoneActions: [],
    cameraKeys: [],
    fxKeys: [],
    deterministicFingerprint: 'a'.repeat(64),
    provenance: {
      compiledAt: FIXED_APPROVAL_DATE,
      compilerVersion: 'moho-pir-compiler/1.0.0'
    }
  };
}

function baseRenderResult(input: Partial<{
  status: 'rendered' | 'requires_real_moho' | 'dry_run' | 'failed';
  exitCode: number;
  errorMessage: string;
}> = {}): MohoQaGateInput['renderResult'] {
  return {
    jobId: 'render_test_job',
    status: input.status ?? 'rendered',
    detectedMohoPath: '/Applications/Moho Pro/Moho Pro.app',
    commandLine: '"Moho" -r test.moho -start 1 -end 24',
    outputDir: '/tmp/moho-render',
    renderedFiles: [],
    totalFrames: 24,
    durationMs: 100,
    fps: 24,
    resolution: { width: 1920, height: 1080 },
    codec: null,
    qaFindings: [],
    exitCode: input.exitCode ?? 0,
    errorMessage: input.errorMessage
  };
}

function baseInput(overrides: Partial<MohoQaGateInput> = {}): MohoQaGateInput {
  const thresholds: MohoQaThresholds = validMohoQaThresholds();
  return {
    shotId: 'shot_test_001',
    renderResult: baseRenderResult(),
    visualDiff: undefined,
    pir: basePir(),
    thresholds,
    characterBible: undefined,
    ...overrides
  };
}

describe('MohoQaGate — overallStatus', () => {
  it('returns "pass" when no findings are produced', () => {
    const gate = new MohoQaGate();
    const result = gate.evaluate(baseInput({
      thresholds: { ...validMohoQaThresholds(), forbidOrphanBones: false }
    }));
    expect(result.overallStatus).toBe('pass');
    expect(result.findings).toHaveLength(0);
    expect(result.criticalFindings).toBe(0);
  });

  it('returns "warn" for a single medium severity finding', () => {
    const gate = new MohoQaGate();
    const pir = basePir();
    pir.switchKeys = [
      { switchLayerName: 'Mouth', frame: 1, choice: 'rest', interpolation: 'step' },
      { switchLayerName: 'Mouth', frame: 2, choice: 'open', interpolation: 'step' }
    ];

    const result = gate.evaluate(baseInput({ pir }));

    const subTwoFrame = result.findings.find(f => f.check === 'switch_layer_sub2f');
    expect(subTwoFrame).toBeDefined();
    expect(subTwoFrame?.severity).toBe('medium');
    expect(result.criticalFindings).toBe(0);
    expect(result.overallStatus).toBe('warn');
  });

  it('returns "fail" when a critical finding is present and counts it', () => {
    const gate = new MohoQaGate();
    const result = gate.evaluate(baseInput({
      renderResult: baseRenderResult({ status: 'failed', exitCode: 1, errorMessage: 'boom' })
    }));

    expect(result.findings.some(f => f.check === 'render_failed' && f.severity === 'critical')).toBe(true);
    expect(result.criticalFindings).toBe(1);
    expect(result.overallStatus).toBe('fail');
  });
});

describe('MohoQaGate — requiresHumanApproval', () => {
  it('sets requiresHumanApproval=true when requireHumanApprovalFor category matches a finding', () => {
    const gate = new MohoQaGate();
    const thresholds = validMohoQaThresholds();

    expect(thresholds.requireHumanApprovalFor).toContain('key_pose');

    const renderDryResult = gate.evaluate(baseInput({
      thresholds: { ...thresholds, forbidOrphanBones: false },
      renderResult: baseRenderResult({ status: 'requires_real_moho', exitCode: 1 })
    }));

    expect(renderDryResult.requiresHumanApproval).toBe(true);
    expect(renderDryResult.criticalFindings).toBeGreaterThan(0);
  });

  it('sets requiresHumanApproval=false when only low severity findings are present', () => {
    const gate = new MohoQaGate();
    const pir = basePir();
    pir.boneKeys = [
      { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 1, value: 0, interpolation: 'ease_in_out' },
      { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 2, value: 5.5, interpolation: 'ease_in_out' }
    ];

    const result = gate.evaluate(baseInput({
      pir,
      thresholds: { ...validMohoQaThresholds(), requireHumanApprovalFor: [], forbidOrphanBones: false }
    }));

    const angleFinding = result.findings.find(f => f.check === 'bone_angle_tolerance');
    expect(angleFinding).toBeDefined();
    expect(angleFinding?.severity).toBe('low');
    expect(result.criticalFindings).toBe(0);
    expect(result.requiresHumanApproval).toBe(false);
  });
});

describe('MohoQaGate — fingerprint determinism', () => {
  it('produces the same fingerprint for identical inputs', () => {
    const gate = new MohoQaGate();
    const pir = basePir();
    pir.boneKeys = [
      { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 1, value: 0, interpolation: 'ease_in_out' },
      { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 10, value: 7, interpolation: 'ease_in_out' }
    ];

    const input = baseInput({ pir });
    const a = gate.evaluate(input);
    const b = gate.evaluate(input);

    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('MohoQaGate — bone_angle_tolerance check', () => {
  it('produces a bone_angle_tolerance finding when delta exceeds tolerance', () => {
    const gate = new MohoQaGate();
    const pir = basePir();
    pir.boneKeys = [
      { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 1, value: 0, interpolation: 'ease_in_out' },
      { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 2, value: 10, interpolation: 'ease_in_out' }
    ];

    const result = gate.evaluate(baseInput({
      pir,
      thresholds: { ...validMohoQaThresholds(), requireHumanApprovalFor: [] }
    }));

    const angleFinding = result.findings.find(f => f.check === 'bone_angle_tolerance');
    expect(angleFinding).toBeDefined();
    expect(angleFinding?.measured).toBe(10);
    expect(angleFinding?.threshold).toBe(2);
  });
});

describe('MohoQaGate — switch_layer_rate check', () => {
  it('produces a switch_layer_rate finding when too many switch keys per second', () => {
    const gate = new MohoQaGate();
    const pir = basePir();
    pir.switchKeys = Array.from({ length: 250 }, (_, i) => ({
      switchLayerName: 'Mouth',
      frame: i + 1,
      choice: i % 2 === 0 ? 'rest' : 'open',
      interpolation: 'step' as const
    }));

    const result = gate.evaluate(baseInput({
      pir,
      thresholds: { ...validMohoQaThresholds(), requireHumanApprovalFor: [], forbidOrphanBones: false }
    }));

    const rateFinding = result.findings.find(f => f.check === 'switch_layer_rate');
    expect(rateFinding).toBeDefined();
    expect(rateFinding!.measured).toBeGreaterThan(6);
    expect(rateFinding!.threshold).toBe(6);
  });
});

describe('MohoQaGate — orphan_bone_key check', () => {
  it('produces an orphan finding when a boneId is not in the characterBible', () => {
    const gate = new MohoQaGate();
    const pir = basePir();
    pir.boneKeys = [
      { boneId: 999, boneName: 'ghost_bone', channel: 'rotation', frame: 1, value: 0, interpolation: 'ease_in_out' }
    ];

    const result = gate.evaluate(baseInput({
      pir,
      thresholds: { ...validMohoQaThresholds(), requireHumanApprovalFor: [] },
      characterBible: {
        characterId: 'char_test_humanoid',
        bones: [
          { boneId: 0, boneName: 'head_root' },
          { boneId: 1, boneName: 'body_root' }
        ]
      }
    }));

    const orphan = result.findings.find(f => f.check === 'orphan_bone_key');
    expect(orphan).toBeDefined();
    expect(orphan?.severity).toBe('high');
    expect(orphan?.measured).toBe(999);
  });
});

describe('MohoQaGate — palette_delta check (visualDiff integration)', () => {
  it('produces a palette_delta finding when MSE is above threshold', () => {
    const gate = new MohoQaGate();
    const result = gate.evaluate(baseInput({
      thresholds: { ...validMohoQaThresholds(), requireHumanApprovalFor: [] },
      visualDiff: {
        shotId: 'shot_test_001',
        mse: 0.08,
        paletteDelta: undefined,
        referencePath: '/refs/shot_001.png',
        candidatePath: '/candidates/shot_001.png'
      }
    }));

    const paletteFinding = result.findings.find(f => f.check === 'palette_delta');
    expect(paletteFinding).toBeDefined();
    expect(paletteFinding?.measured).toBe(0.08);
    expect(paletteFinding?.threshold).toBe(0.02);
  });
});

describe('MohoQaGate — listChecks', () => {
  it('returns a non-empty array of registered checks', () => {
    const gate = new MohoQaGate();
    const checks = gate.listChecks();
    expect(Array.isArray(checks)).toBe(true);
    expect(checks.length).toBeGreaterThan(0);
    expect(checks[0]).toHaveProperty('name');
    expect(checks[0]).toHaveProperty('description');
    expect(checks[0]).toHaveProperty('defaultSeverity');
  });
});