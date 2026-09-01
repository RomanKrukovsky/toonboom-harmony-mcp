import { describe, it, expect } from '@jest/globals';

import { mohoScenePlanTools } from '../src/tools/mohoScenePlanTools.js';
import { mohoRetakeManifestTools } from '../src/tools/mohoRetakeManifestTools.js';
import {
  mohoScenePlanSchema,
  MOHO_SCENE_PLAN_SCHEMA_VERSION,
  type MohoScenePlan
} from '../src/schemas/mohoScenePlan.js';
import {
  MOHO_RETAKE_MANIFEST_SCHEMA_VERSION,
  type MohoRetakeManifest,
  type MohoRetakePatch
} from '../src/schemas/mohoRetakeManifest.js';

function getHandler(toolName: string) {
  const tool = [...mohoScenePlanTools, ...mohoRetakeManifestTools].find(
    (t) => t.name === toolName
  );
  if (!tool) throw new Error(`Tool ${toolName} not found`);
  return tool.handler as (args: any) => Promise<any>;
}

function validScenePlan(): MohoScenePlan {
  return mohoScenePlanSchema.parse({
    schemaVersion: MOHO_SCENE_PLAN_SCHEMA_VERSION,
    planId: 'plan_test_001',
    production: 'prod_test',
    episode: 'ep_001',
    sceneName: 'scene_01',
    resolution: { width: 1920, height: 1080 },
    fps: 24,
    durationFrames: 120,
    assets: [
      {
        assetId: 'asset_bg_01',
        kind: 'image',
        path: 'assets/bg_01.png',
        mohoImportMethod: 'file_menu'
      }
    ],
    characters: [
      {
        characterId: 'char_alice',
        positionPreset: 'left',
        startFrame: 1,
        endFrame: 120,
        actions: [
          { type: 'idle', frames: [1, 60] },
          { type: 'talk', frames: [61, 120], audio: 'audio/dialogue_01.wav' }
        ]
      }
    ],
    effects: [],
    render: {}
  }) as MohoScenePlan;
}

describe('mohoScenePlanTools', () => {
  it('moho.scene_plan.validate returns valid for a well-formed scene plan', async () => {
    const handler = getHandler('moho.scene_plan.validate');
    const result = await handler({ scenePlan: validScenePlan() });
    expect(result.status).toBe('valid');
    expect(typeof result.fingerprint).toBe('string');
    expect(result.fingerprint).toHaveLength(64);
  });

  it('moho.scene_plan.validate returns invalid with errors for a malformed scene plan', async () => {
    const handler = getHandler('moho.scene_plan.validate');
    const broken = {
      schemaVersion: '999.0',
      planId: 'plan_bad',
      production: 'prod',
      episode: 'ep',
      sceneName: 'scene',
      resolution: { width: -10, height: 1080 },
      durationFrames: 0
    };
    const result = await handler({ scenePlan: broken });
    expect(result.status).toBe('invalid');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('moho.scene_plan.fingerprint is deterministic across key reordering', async () => {
    const handler = getHandler('moho.scene_plan.fingerprint');
    const plan = validScenePlan();
    const reordered: any = {};
    const keys = Object.keys(plan).reverse();
    for (const k of keys) reordered[k] = (plan as any)[k];
    const fp1 = (await handler({ scenePlan: plan })).fingerprint;
    const fp2 = (await handler({ scenePlan: reordered })).fingerprint;
    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('moho.scene_plan.to_command_plan honestly rejects the retired placeholder', async () => {
    const handler = getHandler('moho.scene_plan.to_command_plan');
    const plan = validScenePlan();
    const validateFp = (
      await getHandler('moho.scene_plan.fingerprint')({ scenePlan: plan })
    ).fingerprint;
    const result = await handler({
      scenePlan: plan,
      mohoShowBiblePath: 'show/moho_show_bible.json'
    });
    expect(result.status).toBe('deprecated');
    expect(result.code).toBe('USE_MOHO_PRODUCTION_V3');
    expect(result.fingerprint).toBe(validateFp);
  });
});

function validPatch(overrides: Partial<MohoRetakePatch> = {}): MohoRetakePatch {
  return {
    patchId: crypto.randomUUID(),
    targetRigType: 'humanoid_2leg',
    boneId: 1,
    channel: 'rotation',
    frame: 10,
    newValue: 15.5,
    interpolation: 'ease_in_out',
    recordedBy: 'supervisor_01',
    recordedAt: new Date().toISOString(),
    ...overrides
  };
}

function validRetakeManifest(overrides: Partial<MohoRetakeManifest> = {}): MohoRetakeManifest {
  return {
    schemaVersion: MOHO_RETAKE_MANIFEST_SCHEMA_VERSION,
    retakeId: 'retake_test_001',
    sourcePerformanceId: 'perf_test_001',
    sourceMohoCommandPlanId: 'cmdplan_test_001',
    rigType: 'humanoid_2leg',
    patches: [validPatch()],
    severity: 'low',
    autoApplicable: false,
    provenance: {
      recordedBy: 'supervisor_01',
      recordedAt: new Date().toISOString()
    },
    ...overrides
  };
}

describe('mohoRetakeManifestTools', () => {
  it('moho.retake_manifest.validate returns valid for a well-formed manifest', async () => {
    const handler = getHandler('moho.retake_manifest.validate');
    const result = await handler({ retakeManifest: validRetakeManifest() });
    expect(result.status).toBe('valid');
  });

  it('moho.retake_manifest.create_patch produces a valid patch for humanoid + boneId + frame', async () => {
    const handler = getHandler('moho.retake_manifest.create_patch');
    const result = await handler({
      targetRigType: 'humanoid_2leg',
      boneId: 7,
      channel: 'rotation',
      frame: 24,
      newValue: -12.0,
      interpolation: 'ease_in_out',
      recordedBy: 'supervisor_01'
    });
    expect(result.status).toBe('success');
    expect(result.patch.targetRigType).toBe('humanoid_2leg');
    expect(result.patch.boneId).toBe(7);
    expect(result.patch.frame).toBe(24);
    expect(result.patch.newValue).toBe(-12.0);
    expect(typeof result.patch.patchId).toBe('string');
    expect(typeof result.patch.recordedAt).toBe('string');
    const reparsed = mohoScenePlanSchema ? null : null;
    expect(result.patch).toBeDefined();
    void reparsed;
  });

  it('moho.retake_manifest.create_patch produces a valid patch for mechanical + boneName + frame', async () => {
    const handler = getHandler('moho.retake_manifest.create_patch');
    const result = await handler({
      targetRigType: 'mechanical',
      boneName: 'crank_arm_03',
      channel: 'translation',
      frame: 48,
      newValue: 32.5,
      interpolation: 'linear',
      note: 'tighten arc on the second beat',
      recordedBy: 'supervisor_01'
    });
    expect(result.status).toBe('success');
    expect(result.patch.targetRigType).toBe('mechanical');
    expect(result.patch.boneName).toBe('crank_arm_03');
    expect(result.patch.frame).toBe(48);
    expect(result.patch.channel).toBe('translation');
    expect(result.patch.interpolation).toBe('linear');
    expect(result.patch.note).toBe('tighten arc on the second beat');
  });

  it('moho.retake_manifest.can_auto_apply allows severity=low with autoApplicable=true', async () => {
    const handler = getHandler('moho.retake_manifest.can_auto_apply');
    const manifest = validRetakeManifest({
      severity: 'low',
      autoApplicable: true
    });
    const result = await handler({
      retakeManifest: manifest,
      qaThresholds: { autoApprovalBySeverity: { low: true, medium: false, high: false } }
    });
    expect(result.status).toBe('success');
    expect(result.canAutoApply).toBe(true);
  });

  it('moho.retake_manifest.can_auto_apply forbids severity=high via qaThresholds gate', async () => {
    const handler = getHandler('moho.retake_manifest.can_auto_apply');
    const manifest = validRetakeManifest({
      severity: 'high',
      autoApplicable: false
    });
    const result = await handler({
      retakeManifest: manifest,
      qaThresholds: { autoApprovalBySeverity: { high: false } }
    });
    expect(result.status).toBe('success');
    expect(result.canAutoApply).toBe(false);
    expect(result.reasons.some((r: string) => /severity=high|запрещено/i.test(r))).toBe(true);
  });

  it('moho.retake_manifest.can_auto_apply forbids severity=medium when autoApplicable=false', async () => {
    const handler = getHandler('moho.retake_manifest.can_auto_apply');
    const manifest = validRetakeManifest({
      severity: 'medium',
      autoApplicable: false
    });
    const result = await handler({
      retakeManifest: manifest,
      qaThresholds: {}
    });
    expect(result.status).toBe('success');
    expect(result.canAutoApply).toBe(false);
    expect(result.reasons.some((r: string) => /autoApplicable/i.test(r))).toBe(true);
  });
});
