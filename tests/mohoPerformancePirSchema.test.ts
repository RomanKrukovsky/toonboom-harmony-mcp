import { describe, it, expect } from '@jest/globals';

import {
  mohoPerformancePirSchema,
  MOHO_PERFORMANCE_PIR_SCHEMA_VERSION,
  type MohoPerformancePir
} from '../src/schemas/mohoPerformancePir.js';

function validMohoPerformancePir(): MohoPerformancePir {
  return {
    schemaVersion: MOHO_PERFORMANCE_PIR_SCHEMA_VERSION,
    performanceId: 'perf_main_v1',
    rigType: 'humanoid_2leg',
    shotManifestRef: 'show/shot_manifest.json',
    mohoShowBibleRef: 'show/moho_show_bible.json',
    boneKeys: [],
    switchKeys: [],
    smartBoneActions: [],
    cameraKeys: [],
    fxKeys: [],
    deterministicFingerprint: 'a'.repeat(64),
    provenance: {
      compiledAt: '2026-07-27T12:00:00Z',
      compilerVersion: 'moho-pir-compiler/1.0.0'
    }
  };
}

describe('mohoPerformancePirSchema', () => {
  it('accepts a valid minimal PerformancePIR with all defaults', () => {
    expect(mohoPerformancePirSchema.safeParse(validMohoPerformancePir()).success).toBe(true);
  });

  it('accepts a valid humanoid PerformancePIR with bone + switch + smartBone keys', () => {
    const fixture: MohoPerformancePir = {
      ...validMohoPerformancePir(),
      rigType: 'humanoid_2leg',
      boneKeys: [
        {
          boneId: 1,
          boneName: 'Head_Peg',
          channel: 'rotation',
          frame: 12,
          value: 15,
          interpolation: 'ease_in_out'
        },
        {
          boneId: 2,
          boneName: 'Spine_Peg',
          channel: 'translation',
          frame: 24,
          value: -5,
          interpolation: 'linear'
        }
      ],
      switchKeys: [
        {
          switchLayerName: 'Hand_Switch',
          frame: 6,
          choice: 'open_hand',
          interpolation: 'step'
        }
      ],
      smartBoneActions: [
        {
          actionName: 'smile',
          targetBone: 'Mouth_SmartBone',
          frame: 10,
          angleDeg: 0,
          scaleX: 1,
          scaleY: 1
        }
      ]
    };
    expect(mohoPerformancePirSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts a valid quadruped PerformancePIR', () => {
    const fixture: MohoPerformancePir = {
      ...validMohoPerformancePir(),
      rigType: 'quadruped',
      boneKeys: [
        {
          boneId: 5,
          boneName: 'Front_Left_Leg',
          channel: 'rotation',
          frame: 18,
          value: 22.5,
          interpolation: 'ease_in'
        }
      ]
    };
    expect(mohoPerformancePirSchema.safeParse(fixture).success).toBe(true);
  });

  it('rejects an invalid rigType', () => {
    const bad = { ...validMohoPerformancePir(), rigType: 'sentient_plant' as any };
    expect(mohoPerformancePirSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an invalid bone channel', () => {
    const bad = {
      ...validMohoPerformancePir(),
      boneKeys: [
        {
          boneId: 1,
          boneName: 'Head_Peg',
          channel: 'shear' as any,
          frame: 12,
          value: 15,
          interpolation: 'ease_in_out' as const
        }
      ]
    };
    expect(mohoPerformancePirSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an invalid interpolation value on a bone key', () => {
    const bad = {
      ...validMohoPerformancePir(),
      boneKeys: [
        {
          boneId: 1,
          boneName: 'Head_Peg',
          channel: 'rotation' as const,
          frame: 12,
          value: 15,
          interpolation: 'wobbly_bounce' as any
        }
      ]
    };
    expect(mohoPerformancePirSchema.safeParse(bad).success).toBe(false);
  });

  it('requires switch layer keys to use step interpolation (rejects linear)', () => {
    const bad = {
      ...validMohoPerformancePir(),
      switchKeys: [
        {
          switchLayerName: 'Hand_Switch',
          frame: 6,
          choice: 'open_hand',
          interpolation: 'linear' as any
        }
      ]
    };
    expect(mohoPerformancePirSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts empty keys arrays (boneKeys/switchKeys/smartBoneActions/cameraKeys/fxKeys)', () => {
    const fixture = validMohoPerformancePir();
    expect(fixture.boneKeys).toEqual([]);
    expect(fixture.switchKeys).toEqual([]);
    expect(fixture.smartBoneActions).toEqual([]);
    expect(fixture.cameraKeys).toEqual([]);
    expect(fixture.fxKeys).toEqual([]);
    expect(mohoPerformancePirSchema.safeParse(fixture).success).toBe(true);
  });

  it('requires the deterministicFingerprint field', () => {
    const bad = { ...validMohoPerformancePir() } as Record<string, unknown>;
    delete bad.deterministicFingerprint;
    expect(mohoPerformancePirSchema.safeParse(bad).success).toBe(false);
  });

  it('.strict() rejects extra root fields', () => {
    const bad = { ...validMohoPerformancePir(), secretSauce: 'on' } as any;
    expect(mohoPerformancePirSchema.safeParse(bad).success).toBe(false);
  });
});