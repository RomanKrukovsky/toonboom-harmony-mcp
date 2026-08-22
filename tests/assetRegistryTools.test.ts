/**
 * Tests for assetRegistryTools — the least honest module before this rewrite.
 *
 * Eight of ten tools returned `status: 'success'` with invented data and no
 * `placeholder` flag, so callers could not distinguish them from working code:
 *   * `check_license` always said `Commercial_Approved, clean: true`;
 *   * `validate` always said `valid: true` without opening the file;
 *   * `version` always returned `2`;
 *   * `build_manifest` returned a path to a file it never wrote;
 *   * `find_reuse_candidates` always returned `[]`;
 *   * `generate_placeholder` returned a path with no file behind it.
 *
 * Every test below asserts the tool reacts to real input — a constant would fail.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { assetRegistryTools } from '../src/tools/assetRegistryTools.js';
import { requireTool } from './helpers/toolInvocation.js';

const plan = requireTool(assetRegistryTools, 'harmony.assets.plan');
const importAsset = requireTool(assetRegistryTools, 'harmony.assets.import');
const validate = requireTool(assetRegistryTools, 'harmony.assets.validate');
const version = requireTool(assetRegistryTools, 'harmony.assets.version');
const approve = requireTool(assetRegistryTools, 'harmony.assets.approve');
const findReuse = requireTool(assetRegistryTools, 'harmony.assets.find_reuse_candidates');
const placeholder = requireTool(assetRegistryTools, 'harmony.assets.generate_placeholder');
const checkLicense = requireTool(assetRegistryTools, 'harmony.assets.check_license');
const buildManifest = requireTool(assetRegistryTools, 'harmony.assets.build_manifest');

const ROOT = path.resolve(process.cwd(), 'output', 'asset-registry-tests');
let counter = 0;

/** Each test gets its own registry so ordering can never matter. */
function workspace(): { dir: string; registryDir: string } {
  const dir = path.join(ROOT, `case-${process.pid}-${counter++}`);
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  return { dir, registryDir: path.join(dir, 'registry') };
}

/** A structurally valid PNG with real IHDR dimensions and colour type. */
function writePng(filePath: string, width: number, height: number, alpha: boolean, salt = ''): string {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;                    // bit depth
  ihdr[9] = alpha ? 6 : 2;        // 6 = RGBA, 2 = RGB
  const buffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(4),
    Buffer.from('IHDR'),
    ihdr,
    Buffer.from(salt)
  ]);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function writeLicense(dir: string, overrides: Record<string, unknown> = {}): string {
  fs.mkdirSync(path.join(dir, 'contracts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'contracts', 'c.pdf'), 'SIGNED');
  const file = path.join(dir, 'asset_license.json');
  fs.writeFileSync(file, JSON.stringify({
    schemaVersion: '1.0',
    assetId: 'hero',
    creator: 'Studio',
    source: 'commission',
    license: 'exclusive commercial assignment',
    commercialUse: true,
    modificationAllowed: true,
    datasetUseAllowed: true,
    redistributionAllowed: false,
    contractPath: 'contracts/c.pdf',
    forbiddenTags: [],
    ...overrides
  }));
  return file;
}

afterAll(() => {
  fs.rmSync(ROOT, { recursive: true, force: true });
});

describe('assets.plan', () => {
  it('scales the plan with scene contents instead of returning three fixed assets', async () => {
    const small: any = await plan.handler({ sceneId: 'S', characters: ['Hero'], locations: ['lab'] });
    const large: any = await plan.handler({
      sceneId: 'S', characters: ['A', 'B'], locations: ['lab', 'street'], props: ['wrench']
    });
    expect(large.details.assetCount).toBeGreaterThan(small.details.assetCount);
  });

  it('adds a mouth chart only when lip-sync is required', async () => {
    const without: any = await plan.handler({ sceneId: 'S', characters: ['Hero'] });
    const with_: any = await plan.handler({ sceneId: 'S', characters: ['Hero'], requiresLipSync: true });
    const ids = (r: any) => r.details.requiredAssets.map((a: any) => a.id);
    expect(ids(without).some((id: string) => id.includes('mouth_chart'))).toBe(false);
    expect(ids(with_)).toContain('mouth_chart_Hero');
  });

  it('produces one design per requested view angle', async () => {
    const result: any = await plan.handler({
      sceneId: 'S', characters: ['Hero'], viewAngles: ['front', 'side']
    });
    const characterAssets = result.details.requiredAssets.filter((a: any) => a.id.startsWith('char_'));
    expect(characterAssets.length).toBe(2);
  });

  it('warns rather than inventing assets for an empty scene', async () => {
    const result: any = await plan.handler({ sceneId: 'S' });
    expect(result.details.assetCount).toBe(0);
    expect(result.warnings.join(' ')).toMatch(/план пуст/);
  });
});

describe('assets.validate', () => {
  it('reads real dimensions and alpha from the PNG header', async () => {
    const { dir } = workspace();
    const file = writePng(path.join(dir, 'src', 'a.png'), 1920, 1080, true);
    const result: any = await validate.handler({ filePath: file });
    expect(result.details.width).toBe(1920);
    expect(result.details.height).toBe(1080);
    expect(result.details.hasAlpha).toBe(true);
    expect(result.details.detectedFormat).toBe('png');
  });

  it('fails a file that is too small for the requirement', async () => {
    const { dir } = workspace();
    const file = writePng(path.join(dir, 'src', 'small.png'), 64, 64, true);
    const result: any = await validate.handler({ filePath: file, minWidth: 512 });
    // The placeholder always answered valid: true.
    expect(result.details.valid).toBe(false);
    expect(result.details.issues.join(' ')).toMatch(/64px меньше/);
  });

  it('detects a missing alpha channel', async () => {
    const { dir } = workspace();
    const file = writePng(path.join(dir, 'src', 'opaque.png'), 512, 512, false);
    const result: any = await validate.handler({ filePath: file, requireAlpha: true });
    expect(result.details.hasAlpha).toBe(false);
    expect(result.details.valid).toBe(false);
  });

  it('rejects a file whose bytes are not a known format', async () => {
    const { dir } = workspace();
    const file = path.join(dir, 'src', 'fake.png');
    fs.writeFileSync(file, 'definitely not a png');
    const result: any = await validate.handler({ filePath: file });
    expect(result.details.detectedFormat).toBe('unknown');
    expect(result.details.valid).toBe(false);
  });

  it('blocks instead of validating a missing file', async () => {
    const { dir } = workspace();
    const result: any = await validate.handler({ filePath: path.join(dir, 'ghost.png') });
    expect(result.status).toBe('blocked');
    expect(result.details.valid).toBe(false);
  });
});

describe('assets.import and versioning', () => {
  it('starts at version 1 and increments only on changed bytes', async () => {
    const { dir, registryDir } = workspace();
    const file = writePng(path.join(dir, 'src', 'hero.png'), 512, 512, true, 'v1');

    const first: any = await importAsset.handler({ filePath: file, assetType: 'character', assetId: 'hero', registryDir });
    expect(first.details.version).toBe(1);

    // Same bytes must dedupe, not fabricate a version.
    const again: any = await importAsset.handler({ filePath: file, assetType: 'character', assetId: 'hero', registryDir });
    expect(again.details.version).toBe(1);
    expect(again.details.deduplicated).toBe(true);

    writePng(file, 512, 512, true, 'v2-different');
    const second: any = await importAsset.handler({ filePath: file, assetType: 'character', assetId: 'hero', registryDir });
    expect(second.details.version).toBe(2);
  });

  it('stores a copy that actually exists on disk', async () => {
    const { dir, registryDir } = workspace();
    const file = writePng(path.join(dir, 'src', 'bg.png'), 256, 256, true);
    const result: any = await importAsset.handler({ filePath: file, assetType: 'background', registryDir });
    expect(fs.existsSync(result.details.importedPath)).toBe(true);
    expect(result.details.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('refuses to import a missing file', async () => {
    const { dir, registryDir } = workspace();
    const result: any = await importAsset.handler({
      filePath: path.join(dir, 'nope.png'), assetType: 'prop', registryDir
    });
    expect(result.status).toBe('blocked');
  });

  it('reports unknown assets rather than a default version number', async () => {
    const { registryDir } = workspace();
    const result: any = await version.handler({ assetId: 'never_imported', registryDir });
    expect(result.status).toBe('blocked');
    expect(result.details.version).toBeUndefined();
  });

  it('persists versions across separate registry reads', async () => {
    const { dir, registryDir } = workspace();
    const file = writePng(path.join(dir, 'src', 'p.png'), 100, 100, true, 'a');
    await importAsset.handler({ filePath: file, assetType: 'prop', assetId: 'p', registryDir });
    writePng(file, 100, 100, true, 'b');
    await importAsset.handler({ filePath: file, assetType: 'prop', assetId: 'p', registryDir });

    const result: any = await version.handler({ assetId: 'p', registryDir });
    expect(result.details.version).toBe(2);
    expect(result.details.versionCount).toBe(2);
  });
});

describe('assets.approve', () => {
  it('pins approval to the exact bytes', async () => {
    const { dir, registryDir } = workspace();
    const file = writePng(path.join(dir, 'src', 'h.png'), 512, 512, true, 'x');
    const imported: any = await importAsset.handler({ filePath: file, assetType: 'character', assetId: 'h', registryDir });

    const result: any = await approve.handler({ assetId: 'h', approvedBy: 'Director', registryDir });
    expect(result.details.approved).toBe(true);
    expect(result.details.approvedSha256).toBe(imported.details.sha256);
    expect(result.details.approvedBy).toBe('Director');
  });

  it('revokes approval when a new version is imported', async () => {
    const { dir, registryDir } = workspace();
    const file = writePng(path.join(dir, 'src', 'h.png'), 512, 512, true, 'r1');
    await importAsset.handler({ filePath: file, assetType: 'character', assetId: 'h', registryDir });
    await approve.handler({ assetId: 'h', registryDir });

    writePng(file, 512, 512, true, 'r2-changed');
    await importAsset.handler({ filePath: file, assetType: 'character', assetId: 'h', registryDir });

    const result: any = await version.handler({ assetId: 'h', registryDir });
    // Approving v1 must not silently bless v2.
    expect(result.details.approved).toBe(false);
  });

  it('cannot approve an unknown asset', async () => {
    const { registryDir } = workspace();
    const result: any = await approve.handler({ assetId: 'ghost', registryDir });
    expect(result.status).toBe('blocked');
  });
});

describe('assets.find_reuse_candidates', () => {
  it('returns real registry contents rather than an empty list', async () => {
    const { dir, registryDir } = workspace();
    const a = writePng(path.join(dir, 'src', 'a.png'), 100, 100, true, 'aa');
    await importAsset.handler({ filePath: a, assetType: 'character', assetId: 'a', registryDir });

    const result: any = await findReuse.handler({ assetType: 'character', registryDir });
    expect(result.details.candidateCount).toBe(1);
    expect(result.details.reuseCandidates[0].assetId).toBe('a');
  });

  it('spots identical bytes stored under different ids', async () => {
    const { dir, registryDir } = workspace();
    const a = writePng(path.join(dir, 'src', 'a.png'), 100, 100, true, 'same');
    const b = path.join(dir, 'src', 'b.png');
    fs.copyFileSync(a, b);
    await importAsset.handler({ filePath: a, assetType: 'prop', assetId: 'a', registryDir });
    await importAsset.handler({ filePath: b, assetType: 'prop', assetId: 'b', registryDir });

    const result: any = await findReuse.handler({ registryDir });
    expect(result.details.exactDuplicates.length).toBe(1);
    expect(result.details.exactDuplicates[0].assetIds.sort()).toEqual(['a', 'b']);
  });

  it('filters by type and approval state', async () => {
    const { dir, registryDir } = workspace();
    const a = writePng(path.join(dir, 'src', 'c.png'), 100, 100, true, 'c');
    const b = writePng(path.join(dir, 'src', 'p.png'), 100, 100, true, 'p');
    await importAsset.handler({ filePath: a, assetType: 'character', assetId: 'c', registryDir });
    await importAsset.handler({ filePath: b, assetType: 'prop', assetId: 'p', registryDir });
    await approve.handler({ assetId: 'c', registryDir });

    const characters: any = await findReuse.handler({ assetType: 'character', registryDir });
    expect(characters.details.candidateCount).toBe(1);

    const approvedOnly: any = await findReuse.handler({ approvedOnly: true, registryDir });
    expect(approvedOnly.details.reuseCandidates.map((r: any) => r.assetId)).toEqual(['c']);
  });
});

describe('assets.generate_placeholder', () => {
  it('writes a real, valid transparent PNG', async () => {
    const { dir } = workspace();
    const result: any = await placeholder.handler({ assetName: 'stub', outputDir: dir });

    // The placeholder version returned a path to nothing.
    expect(fs.existsSync(result.details.path)).toBe(true);
    expect(result.details.detectedFormat).toBe('png');
    expect(result.details.hasAlpha).toBe(true);
    expect(result.details.sizeBytes).toBeGreaterThan(0);
    // The file is real but the artwork is a stand-in — both stated.
    expect(result.placeholder).toBe(true);
    expect(result.simulated).toBe(false);
  });

  it('produces a file that passes its own validator', async () => {
    const { dir } = workspace();
    const created: any = await placeholder.handler({ assetName: 'stub2', outputDir: dir });
    const checked: any = await validate.handler({ filePath: created.details.path });
    expect(checked.details.valid).toBe(true);
  });
});

describe('assets.check_license', () => {
  it('reports the real licence label from the declaration', async () => {
    const { dir } = workspace();
    const assetDir = path.join(dir, 'art');
    const file = writePng(path.join(assetDir, 'hero.png'), 512, 512, true);
    writeLicense(assetDir);

    const result: any = await checkLicense.handler({ filePath: file });
    expect(result.details.license).toBe('exclusive commercial assignment');
    expect(result.details.clean).toBe(true);
    expect(result.details.contractPresent).toBe(true);
  });

  it('rejects a NonCommercial licence', async () => {
    const { dir } = workspace();
    const assetDir = path.join(dir, 'art');
    const file = writePng(path.join(assetDir, 'hero.png'), 512, 512, true);
    writeLicense(assetDir, { license: 'CC BY-NC 4.0', commercialUse: false, forbiddenTags: ['NC'] });

    const result: any = await checkLicense.handler({ filePath: file });
    // The placeholder always answered Commercial_Approved.
    expect(result.details.clean).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.details.blockers.join(' ')).toMatch(/NonCommercial/i);
  });

  it('blocks when no declaration exists', async () => {
    const { dir } = workspace();
    const file = writePng(path.join(dir, 'loose', 'x.png'), 10, 10, true);
    const result: any = await checkLicense.handler({ filePath: file });
    expect(result.details.clean).toBe(false);
    expect(result.details.license).toBeNull();
  });

  it('detects a file changed after the licence was signed', async () => {
    const { dir } = workspace();
    const assetDir = path.join(dir, 'art');
    const file = writePng(path.join(assetDir, 'hero.png'), 512, 512, true, 'original');
    const digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    writeLicense(assetDir, { sha256: digest });

    writePng(file, 512, 512, true, 'tampered-content');
    const result: any = await checkLicense.handler({ filePath: file });
    expect(result.details.digestMatches).toBe(false);
    expect(result.details.clean).toBe(false);
  });
});

describe('assets.build_manifest', () => {
  it('writes a manifest that actually exists, with digests and sizes', async () => {
    const { dir, registryDir } = workspace();
    const file = writePng(path.join(dir, 'src', 'a.png'), 128, 128, true, 'm');
    await importAsset.handler({ filePath: file, assetType: 'character', assetId: 'a', registryDir });

    const result: any = await buildManifest.handler({ packageDir: dir, registryDir });
    expect(fs.existsSync(result.details.manifestPath)).toBe(true);

    const onDisk = JSON.parse(fs.readFileSync(result.details.manifestPath, 'utf-8'));
    expect(onDisk.assetCount).toBe(1);
    expect(onDisk.assets[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(onDisk.totalSizeBytes).toBeGreaterThan(0);
  });

  it('flags registry entries whose files have disappeared', async () => {
    const { dir, registryDir } = workspace();
    const file = writePng(path.join(dir, 'src', 'a.png'), 128, 128, true, 'gone');
    const imported: any = await importAsset.handler({ filePath: file, assetType: 'prop', assetId: 'a', registryDir });
    fs.unlinkSync(imported.details.importedPath);

    const result: any = await buildManifest.handler({ packageDir: dir, registryDir });
    expect(result.details.missingFileCount).toBe(1);
    expect(result.status).toBe('partial_success');
  });

  it('blocks on a package directory that does not exist', async () => {
    const { registryDir } = workspace();
    const result: any = await buildManifest.handler({
      packageDir: path.join(ROOT, 'no-such-package'), registryDir
    });
    expect(result.status).toBe('blocked');
  });
});
