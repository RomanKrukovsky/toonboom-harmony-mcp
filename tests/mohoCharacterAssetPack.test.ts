import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { mohoCharacterAssetPackV1Schema } from '../src/schemas/mohoCharacterAssetPackV1.js';
import { validateMohoCharacterAssetPack } from '../src/services/mohoCharacterAssetPackValidator/index.js';
import { mohoCharacterAssetPackTools } from '../src/tools/mohoCharacterAssetPackTools.js';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lbMcWQAAAABJRU5ErkJggg==',
  'base64'
);

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function createPackRoot(): string {
  const root = fs.mkdtempSync(path.join(process.cwd(), 'tmp-moho-character-pack-'));
  fs.writeFileSync(path.join(root, 'asset.png'), transparentPng);
  return root;
}

function makePack() {
  const choiceLayers = [
    ...Array.from({ length: 8 }, (_, index) => ({
      layerId: `mouth_${index}`,
      kind: 'mouth' as const,
      choiceName: `mouth_${index}`,
      sourcePath: 'asset.png',
      parentLayerId: 'head',
      jointOverlapPx: 0,
      sha256: sha256(transparentPng)
    })),
    ...['open', 'closed'].map(choiceName => ({
      layerId: `eyes_${choiceName}`,
      kind: 'eye' as const,
      choiceName,
      sourcePath: 'asset.png',
      parentLayerId: 'head',
      jointOverlapPx: 0,
      sha256: sha256(transparentPng)
    })),
    ...['open', 'fist', 'point'].map(choiceName => ({
      layerId: `hand_${choiceName}`,
      kind: 'hand' as const,
      choiceName,
      sourcePath: 'asset.png',
      parentLayerId: 'forearm',
      jointOverlapPx: 0,
      sha256: sha256(transparentPng)
    }))
  ];

  return {
    schemaVersion: '1.0' as const,
    characterId: 'character.hero',
    canvas: { width: 1920, height: 1080 },
    views: ['front', 'three_quarter', 'side'] as const,
    layers: [
      {
        layerId: 'body', kind: 'body' as const, choiceName: null, sourcePath: 'asset.png',
        parentLayerId: null, jointOverlapPx: 0, sha256: sha256(transparentPng)
      },
      {
        layerId: 'head', kind: 'head' as const, choiceName: null, sourcePath: 'asset.png',
        parentLayerId: 'body', jointOverlapPx: 0, sha256: sha256(transparentPng)
      },
      {
        layerId: 'forearm', kind: 'limb' as const, choiceName: null, sourcePath: 'asset.png',
        parentLayerId: 'body', jointOverlapPx: 16, sha256: sha256(transparentPng)
      },
      ...choiceLayers
    ]
  };
}

describe('Moho character asset pack', () => {
  const cleanup: string[] = [];

  afterEach(() => {
    for (const root of cleanup.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  });

  it('accepts a production pack with required views and drawing choices', () => {
    expect(() => mohoCharacterAssetPackV1Schema.parse(makePack())).not.toThrow();
  });

  it('rejects an articulated limb without joint overlap', () => {
    const root = createPackRoot();
    cleanup.push(root);
    const pack = makePack();
    const forearm = pack.layers.find(layer => layer.layerId === 'forearm');
    if (!forearm) throw new Error('Test fixture forearm is missing.');
    forearm.jointOverlapPx = 0;
    const packPath = path.join(root, 'character-pack.json');
    fs.writeFileSync(packPath, JSON.stringify(pack));

    const report = validateMohoCharacterAssetPack(packPath);

    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'JOINT_OVERLAP_REQUIRED', path: 'layers.2.jointOverlapPx' })
    ]));
  });

  it('rejects duplicate layer IDs', () => {
    const pack = makePack();
    pack.layers[1].layerId = 'body';

    const parsed = mohoCharacterAssetPackV1Schema.safeParse(pack);

    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error('Expected duplicate layer ID validation to fail.');
    expect(parsed.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ['layers', 1, 'layerId'], message: 'layerId must be unique.' })
    ]));
  });

  it('requires body and head layers', () => {
    const pack = makePack();
    pack.layers[0].kind = 'head';

    const parsed = mohoCharacterAssetPackV1Schema.safeParse(pack);

    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error('Expected missing body validation to fail.');
    expect(parsed.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ['layers'], message: 'At least one body layer is required.' })
    ]));
  });

  it('rejects an asset whose SHA-256 does not match the manifest', () => {
    const root = createPackRoot();
    cleanup.push(root);
    const pack = makePack();
    pack.layers[0].sha256 = '0'.repeat(64);
    const packPath = path.join(root, 'character-pack.json');
    fs.writeFileSync(packPath, JSON.stringify(pack));

    const report = validateMohoCharacterAssetPack(packPath);

    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'HASH_MISMATCH', path: 'layers.0.sha256' })
    ]));
  });

  it('rejects missing and empty asset files', () => {
    const root = createPackRoot();
    cleanup.push(root);
    fs.writeFileSync(path.join(root, 'empty.png'), Buffer.alloc(0));
    const pack = makePack();
    pack.layers[0].sourcePath = 'missing.png';
    pack.layers[1].sourcePath = 'empty.png';
    pack.layers[1].sha256 = sha256(Buffer.alloc(0));
    const packPath = path.join(root, 'character-pack.json');
    fs.writeFileSync(packPath, JSON.stringify(pack));

    const report = validateMohoCharacterAssetPack(packPath);

    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ASSET_NOT_FOUND', path: 'layers.0.sourcePath' }),
      expect.objectContaining({ code: 'ASSET_EMPTY', path: 'layers.1.sourcePath' })
    ]));
  });

  it('exposes validation through one read-only MCP tool', async () => {
    const root = createPackRoot();
    cleanup.push(root);
    const packPath = path.join(root, 'character-pack.json');
    fs.writeFileSync(packPath, JSON.stringify(makePack()));

    expect(mohoCharacterAssetPackTools.map(tool => tool.name)).toEqual(['moho.character_pack.validate']);
    const result = await mohoCharacterAssetPackTools[0].handler({ packPath });

    expect(result).toMatchObject({ valid: true, characterId: 'character.hero', assetCount: 16 });
  });
});
