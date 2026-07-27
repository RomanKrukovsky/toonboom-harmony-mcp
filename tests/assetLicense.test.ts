import {
  assetLicenseSchema,
  assertLicenseAllowed,
  type AssetLicense
} from '../src/schemas/assetLicense.js';

describe('asset_license.json schema', () => {
  const valid: AssetLicense = {
    schemaVersion: '1.0',
    assetId: 'character_main_rig_v1',
    creator: 'Rigger A',
    source: 'commission',
    license: 'exclusive commercial assignment',
    commercialUse: true,
    modificationAllowed: true,
    datasetUseAllowed: true,
    redistributionAllowed: false,
    contractPath: 'legal/contracts/rig_character_main.pdf',
    forbiddenTags: [],
    sha256: 'a'.repeat(64)
  };

  it('validates a commissioned rig licence', () => {
    expect(assetLicenseSchema.safeParse(valid).success).toBe(true);
  });

  it('validates a self-recorded audio licence', () => {
    const self: AssetLicense = {
      ...valid,
      assetId: 'dialogue_take_001',
      source: 'self_recorded',
      license: 'self owned, commercial use granted',
      contractPath: 'legal/self_recorded_permission.txt'
    };
    expect(assetLicenseSchema.safeParse(self).success).toBe(true);
  });

  it('rejects a licence missing the contractPath', () => {
    const bad = { ...valid, contractPath: '' };
    expect(assetLicenseSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown source enum', () => {
    const bad = { ...valid, source: 'github_random' } as any;
    expect(assetLicenseSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an invalid SHA-256', () => {
    const bad = { ...valid, sha256: 'nothex' };
    expect(assetLicenseSchema.safeParse(bad).success).toBe(false);
  });

  it('assertLicenseAllowed rejects NC in the commercial core', () => {
    const nc: AssetLicense = { ...valid, license: 'CC BY-NC 4.0', commercialUse: false };
    const res = assertLicenseAllowed(nc, ['NC']);
    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/NonCommercial|NC/);
  });

  it('assertLicenseAllowed rejects when commercialUse is false', () => {
    const noCommercial: AssetLicense = { ...valid, commercialUse: false };
    const res = assertLicenseAllowed(noCommercial, []);
    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/commercialUse/);
  });

  it('assertLicenseAllowed rejects when modificationAllowed is false', () => {
    const noModify: AssetLicense = { ...valid, modificationAllowed: false };
    const res = assertLicenseAllowed(noModify, []);
    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/modificationAllowed/);
  });

  it('assertLicenseAllowed passes for a clean commissioned rig', () => {
    expect(assertLicenseAllowed(valid, ['NC', 'third_party_series']).allowed).toBe(true);
  });

  it('assertLicenseAllowed rejects when a forbidden tag matches ShowBible.forbiddenSources', () => {
    const withTag: AssetLicense = { ...valid, license: 'CC BY-SA 4.0', forbiddenTags: ['SA'] };
    const res = assertLicenseAllowed(withTag, ['SA']);
    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/SA/);
  });
});