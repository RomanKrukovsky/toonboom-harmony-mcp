/**
 * Tests for legalTools — real asset licence compliance.
 *
 * These four tools used to be placeholders: `generate_asset_report` returned an
 * invented path, `check_provenance` always answered `provenanceValid: true`, and
 * `detect_missing_permissions` always returned an empty list. Everything needed
 * to do the work was already implemented and unit-tested in
 * `src/schemas/assetLicense.ts` — the tools simply never imported it.
 *
 * The tests below build real packages on disk and assert that violations are
 * actually found: an NC licence is rejected, a missing contract is caught, and a
 * file edited after sign-off fails its digest check.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

import { legalTools } from '../src/tools/legalTools.js';
import { requireTool } from './helpers/toolInvocation.js';

const report = requireTool(legalTools, 'harmony.legal.generate_asset_report');
const provenance = requireTool(legalTools, 'harmony.legal.check_provenance');
const delivery = requireTool(legalTools, 'harmony.legal.build_delivery_manifest');
const missing = requireTool(legalTools, 'harmony.legal.detect_missing_permissions');

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Packages live under the repo's own output/ dir because verifyPathAccess()
 * restricts writes to the allowlisted project root.
 */
function makePackage(name: string): string {
  const dir = path.resolve(process.cwd(), 'output', 'legal-tests', `${name}-${process.pid}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'art'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'contracts'), { recursive: true });
  return dir;
}

function writeCommercialAsset(dir: string, opts: { withContract?: boolean; withDigest?: boolean } = {}) {
  const asset = path.join(dir, 'art', 'hero.png');
  fs.writeFileSync(asset, 'PNG_PIXEL_DATA');
  if (opts.withContract !== false) {
    fs.writeFileSync(path.join(dir, 'contracts', 'hero.pdf'), 'SIGNED CONTRACT');
  }
  fs.writeFileSync(
    path.join(dir, 'art', 'asset_license.json'),
    JSON.stringify({
      schemaVersion: '1.0',
      assetId: 'hero_art',
      creator: 'Studio',
      source: 'commission',
      license: 'exclusive commercial assignment',
      commercialUse: true,
      modificationAllowed: true,
      datasetUseAllowed: true,
      redistributionAllowed: false,
      contractPath: 'contracts/hero.pdf',
      forbiddenTags: [],
      ...(opts.withDigest ? { sha256: sha256(asset) } : {})
    })
  );
  return asset;
}

function writeNonCommercialAsset(dir: string) {
  fs.mkdirSync(path.join(dir, 'audio'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'audio', 'voice.wav'), 'WAV_DATA');
  fs.writeFileSync(
    path.join(dir, 'audio', 'asset_license.json'),
    JSON.stringify({
      schemaVersion: '1.0',
      assetId: 'voice_nc',
      creator: 'Someone',
      source: 'freesound_cc_by',
      license: 'CC BY-NC 4.0',
      commercialUse: false,
      modificationAllowed: true,
      datasetUseAllowed: true,
      redistributionAllowed: true,
      contractPath: 'contracts/none.pdf',
      forbiddenTags: ['NC']
    })
  );
}

const created: string[] = [];
function pkg(name: string): string {
  const dir = makePackage(name);
  created.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of created) fs.rmSync(dir, { recursive: true, force: true });
});

describe('generate_asset_report', () => {
  it('clears a properly licensed asset and rejects an NC one', async () => {
    const dir = pkg('mixed');
    writeCommercialAsset(dir, { withDigest: true });
    writeNonCommercialAsset(dir);

    const result: any = await report.handler({ packageDir: dir, writeReport: true });

    expect(result.verification).toBe('verified_real');
    expect(result.simulated).toBe(false);
    expect(result.summary.totalFiles).toBe(2);
    expect(result.summary.cleared).toBe(1);
    expect(result.summary.rejected).toBe(1);
    // A package containing an NC asset must not be deliverable.
    expect(result.deliverable).toBe(false);

    const rejected = result.assets.find((a: any) => a.file.includes('voice.wav'));
    expect(rejected.status).toBe('rejected');
    expect(rejected.reason).toMatch(/NonCommercial/i);
  });

  it('writes a real report file with digests', async () => {
    const dir = pkg('written');
    writeCommercialAsset(dir, { withDigest: true });

    const result: any = await report.handler({ packageDir: dir, writeReport: true });
    // The placeholder returned a path for a file it never created.
    expect(fs.existsSync(result.reportPath)).toBe(true);

    const onDisk = JSON.parse(fs.readFileSync(result.reportPath, 'utf-8'));
    expect(onDisk.assets[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(onDisk.assets[0].sizeBytes).toBeGreaterThan(0);
  });

  it('flags files with no licence declaration', async () => {
    const dir = pkg('undeclared');
    fs.writeFileSync(path.join(dir, 'art', 'orphan.png'), 'DATA');

    const result: any = await report.handler({ packageDir: dir, writeReport: false });
    expect(result.summary.undeclared).toBe(1);
    expect(result.deliverable).toBe(false);
  });

  it('rejects a package directory that does not exist', async () => {
    await expect(
      report.handler({ packageDir: path.resolve(process.cwd(), 'output', 'no-such-pkg') })
    ).rejects.toThrow(/PATH_NOT_FOUND/);
  });
});

describe('check_provenance', () => {
  it('validates a compliant asset against its real files', async () => {
    const dir = pkg('valid');
    writeCommercialAsset(dir, { withDigest: true });

    const result: any = await provenance.handler({ packageDir: dir, assetId: 'hero_art' });
    expect(result.provenanceValid).toBe(true);
    expect(result.contract.present).toBe(true);
    expect(result.digestChecks[0].matches).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it('detects a file edited after the licence was signed', async () => {
    const dir = pkg('tampered');
    const asset = writeCommercialAsset(dir, { withDigest: true });
    fs.writeFileSync(asset, 'REPLACED CONTENT ENTIRELY');

    const result: any = await provenance.handler({ packageDir: dir, assetId: 'hero_art' });
    expect(result.provenanceValid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.blockers.join(' ')).toMatch(/sha256/i);
  });

  it('detects a missing contract file', async () => {
    const dir = pkg('nocontract');
    writeCommercialAsset(dir, { withContract: false });

    const result: any = await provenance.handler({ packageDir: dir, assetId: 'hero_art' });
    expect(result.provenanceValid).toBe(false);
    expect(result.blockers.join(' ')).toMatch(/договор|contract/i);
  });

  it('does not claim validity for an unknown assetId', async () => {
    const dir = pkg('unknown');
    writeCommercialAsset(dir);

    const result: any = await provenance.handler({ packageDir: dir, assetId: 'does_not_exist' });
    expect(result.provenanceValid).toBe(false);
    expect(result.knownAssetIds).toContain('hero_art');
  });
});

describe('build_delivery_manifest', () => {
  it('refuses to build while a violation exists', async () => {
    const dir = pkg('blocked');
    writeCommercialAsset(dir);
    writeNonCommercialAsset(dir);

    const result: any = await delivery.handler({ packageDir: dir });
    expect(result.status).toBe('blocked');
    expect(result.violations.length).toBe(1);
  });

  it('builds with digests and sizes for a clean package', async () => {
    const dir = pkg('clean');
    writeCommercialAsset(dir, { withDigest: true });

    const result: any = await delivery.handler({ packageDir: dir });
    expect(result.status).toBe('success');
    expect(fs.existsSync(result.deliveryManifestPath)).toBe(true);
    // The old FinalPackager manifest had neither hashes nor sizes.
    expect(result.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.totalSizeBytes).toBeGreaterThan(0);
    expect(result.redistributable).toBe(false);
  });

  it('can build an annotated manifest when explicitly allowed', async () => {
    const dir = pkg('forced');
    writeCommercialAsset(dir);
    writeNonCommercialAsset(dir);

    const result: any = await delivery.handler({ packageDir: dir, allowIncomplete: true });
    expect(result.status).toBe('partial_success');
    expect(result.violationCount).toBe(1);
  });
});

describe('detect_missing_permissions', () => {
  it('returns an empty list only when the package is genuinely clean', async () => {
    const dir = pkg('cleanperm');
    writeCommercialAsset(dir, { withDigest: true });

    const result: any = await missing.handler({ packageDir: dir });
    expect(result.missingPermissions).toEqual([]);
    expect(result.clearedForCommercialUse).toBe(true);
    expect(result.scannedFileCount).toBe(1);
  });

  it('reports a specific issue code per problem', async () => {
    const dir = pkg('problems');
    writeNonCommercialAsset(dir);
    fs.writeFileSync(path.join(dir, 'art', 'nodecl.png'), 'DATA');

    const result: any = await missing.handler({ packageDir: dir });
    const issues = result.missingPermissions.map((m: any) => m.issue);
    expect(issues).toContain('license_not_permitted');
    expect(issues).toContain('no_license_declaration');
    expect(result.clearedForCommercialUse).toBe(false);
  });

  it('spots declarations that govern no files', async () => {
    const dir = pkg('orphan');
    writeCommercialAsset(dir, { withDigest: true });
    // Remove the asset but keep its declaration.
    fs.unlinkSync(path.join(dir, 'art', 'hero.png'));

    const result: any = await missing.handler({ packageDir: dir });
    expect(result.orphanDeclarations.length).toBe(1);
    expect(result.orphanDeclarations[0].assetId).toBe('hero_art');
  });
});
