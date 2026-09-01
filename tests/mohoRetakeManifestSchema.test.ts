import { describe, it, expect } from '@jest/globals';

import {
  mohoRetakeManifestSchema,
  mohoRetakePatchSchema,
  MOHO_RETAKE_MANIFEST_SCHEMA_VERSION,
  type MohoRetakeManifest,
  type MohoRetakePatch
} from '../src/schemas/mohoRetakeManifest.js';

function validPatch(overrides: Partial<MohoRetakePatch> = {}): MohoRetakePatch {
  return {
    patchId: 'patch_001',
    targetRigType: 'humanoid_2leg',
    boneId: 1,
    boneName: 'Head_Peg',
    channel: 'rotation',
    frame: 24,
    newValue: 12.5,
    interpolation: 'ease_in_out',
    recordedBy: 'supervisor_a',
    recordedAt: '2026-08-15T10:00:00Z',
    ...overrides
  };
}

function validManifest(overrides: Partial<MohoRetakeManifest> = {}): MohoRetakeManifest {
  return {
    schemaVersion: MOHO_RETAKE_MANIFEST_SCHEMA_VERSION,
    retakeId: 'retake_001',
    sourcePerformanceId: 'perf_001',
    sourceMohoCommandPlanId: 'plan_001',
    rigType: 'humanoid_2leg',
    patches: [validPatch()],
    severity: 'low',
    autoApplicable: false,
    provenance: {
      recordedBy: 'supervisor_a',
      recordedAt: '2026-08-15T10:00:00Z'
    },
    ...overrides
  };
}

describe('mohoRetakeManifestSchema', () => {
  it('1. accepts a valid single-patch retake manifest', () => {
    expect(mohoRetakeManifestSchema.safeParse(validManifest()).success).toBe(true);
  });

  it('2. accepts a multi-patch retake manifest', () => {
    const fixture = validManifest({
      patches: [
        validPatch({ patchId: 'patch_001', channel: 'rotation', frame: 24, newValue: 12.5 }),
        validPatch({ patchId: 'patch_002', channel: 'translation', frame: 48, newValue: -3.2, boneId: 2, boneName: 'Spine_Peg' }),
        validPatch({ patchId: 'patch_003', channel: 'scale', frame: 72, newValue: 1.05, interpolation: 'linear' })
      ]
    });
    expect(mohoRetakeManifestSchema.safeParse(fixture).success).toBe(true);
  });

  it('3. rejects an invalid rigType', () => {
    const bad = { ...validManifest(), rigType: 'sentient_plant' as any };
    expect(mohoRetakeManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('4. rejects an invalid channel on a patch', () => {
    const bad = validManifest({
      patches: [validPatch({ channel: 'warp_factor' as any })]
    });
    expect(mohoRetakeManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('5. rejects an invalid interpolation value on a patch', () => {
    const bad = validManifest({
      patches: [validPatch({ interpolation: 'bouncy_castle' as any })]
    });
    expect(mohoRetakeManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('6. allows autoApplicable=false with severity high (gate inactive)', () => {
    const fixture = validManifest({ autoApplicable: false, severity: 'high' });
    expect(mohoRetakeManifestSchema.safeParse(fixture).success).toBe(true);
  });

  it('7. allows autoApplicable=true with severity low (gate passes)', () => {
    const fixture = validManifest({ autoApplicable: true, severity: 'low' });
    expect(mohoRetakeManifestSchema.safeParse(fixture).success).toBe(true);
  });

  it('8. rejects autoApplicable=true with severity high (gate tripped)', () => {
    const bad = validManifest({ autoApplicable: true, severity: 'high' });
    expect(mohoRetakeManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('9. accepts an empty patches array (translator may produce 0 patches for identical PIRs)', () => {
    const ok = validManifest({ patches: [] });
    expect(mohoRetakeManifestSchema.safeParse(ok).success).toBe(true);
  });

  it('10. .strict() rejects extra fields on the root manifest', () => {
    const bad = { ...validManifest(), timeMachineEnabled: true } as any;
    expect(mohoRetakeManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('.strict() rejects extra fields on a patch', () => {
    const bad = { ...validPatch(), quantumFlux: 9000 } as any;
    expect(mohoRetakePatchSchema.safeParse(bad).success).toBe(false);
  });
});