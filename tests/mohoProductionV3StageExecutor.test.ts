import { afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { mohoProductionV3StartInputSchema } from '../src/schemas/mohoProductionV3.js';
import { createMohoProductionV3StageExecutor } from '../src/services/mohoProductionV3StageExecutor/index.js';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe('Moho Production v3 stage executor', () => {
  const cleanup: string[] = [];

  afterEach(() => {
    for (const directory of cleanup.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
  });

  function fixture() {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'output', 'v3-stage-executor-'));
    cleanup.push(root);
    const imagePath = path.join(root, 'hero.png');
    fs.writeFileSync(imagePath, PNG_SIGNATURE);
    const input = mohoProductionV3StartInputSchema.parse({
      shotId: 'shot-stage',
      outputDir: path.join(root, 'delivery'),
      artwork: { mode: 'flat_characters', imagePaths: [imagePath], characterRefs: ['hero'] },
      brief: 'Hero waves.',
      durationFrames: 24
    });
    return { root, imagePath, input };
  }

  it('ingests every source with a SHA-256 checkpoint artifact', async () => {
    const { input } = fixture();
    const executor = createMohoProductionV3StageExecutor();
    const result = await executor({
      jobId: 'job-ingest', stage: 'ingest', input,
      previousCheckpoints: {}, patches: [], attempt: 1
    });
    expect(result.checkpoint.assetCount).toBe(1);
    const manifestPath = String(result.checkpoint.manifestPath);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.assets[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.artifacts[0].path).toBe(manifestPath);
  });

  it('creates real PNG part artifacts and records every model call', async () => {
    const { input } = fixture();
    const analysis = {
      parts: [{
        partId: 'body', characterRef: 'hero', sourceIndex: 0, zIndex: 1,
        confidence: 0.92, pivot: { x: 0, y: 0 }, view: 'front', synthesisPrompt: 'isolate full body'
      }],
      occlusionGraph: [], joints: [], requiredViews: ['front'],
      drawings: [{
        drawingId: 'mouth_rest', kind: 'mouth', sourceIndex: 0, choiceName: 'Rest',
        confidence: 0.91, synthesisPrompt: 'neutral closed mouth'
      }],
      overallConfidence: 0.92
    };
    let imageCall = 0;
    const executor = createMohoProductionV3StageExecutor({
      artworkProvider: {
        analyzeStructured: async request => ({
          data: request.schema.parse(analysis), provider: 'openai' as const, model: 'vision-test', callId: 'vision-1',
          requestSha256: 'a'.repeat(64), responseSha256: 'b'.repeat(64)
        }),
        synthesizeTransparentPart: async request => {
          fs.writeFileSync(request.outputPath, PNG_SIGNATURE);
          imageCall += 1;
          return {
            outputPath: request.outputPath, provider: 'openai', model: 'image-test', callId: `image-${imageCall}`,
            requestSha256: String(imageCall).padStart(64, 'c').slice(-64), responseSha256: String(imageCall).padStart(64, 'd').slice(-64)
          };
        }
      }
    });
    const result = await executor({
      jobId: 'job-decompose', stage: 'decomposition', input,
      previousCheckpoints: { ingest: { manifestPath: 'unused' } }, patches: [], attempt: 1
    });
    expect(result.confidence).toBe(0.92);
    expect(result.modelCalls).toHaveLength(3);
    expect(result.artifacts.filter(item => item.mediaType === 'image/png')).toHaveLength(2);
    for (const part of result.artifacts.filter(item => item.mediaType === 'image/png')) {
      expect(fs.readFileSync(part.path).subarray(0, 8)).toEqual(PNG_SIGNATURE);
    }
  });

  it('builds a complete layered artwork pack without calling image models', async () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'output', 'v3-layered-executor-'));
    cleanup.push(root);
    const assetsDir = path.join(root, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    for (const fileName of ['body.png', 'mouth-rest.png', 'eyes-open.png']) {
      fs.writeFileSync(path.join(assetsDir, fileName), PNG_SIGNATURE);
    }
    const layeredManifestPath = path.join(root, 'layered-manifest.json');
    fs.writeFileSync(layeredManifestPath, JSON.stringify({
      schemaVersion: '3.0',
      parts: [{
        partId: 'body',
        characterRef: 'hero',
        sourcePath: 'assets/body.png',
        zIndex: 1,
        confidence: 0.97,
        pivot: { x: 24, y: 60 },
        view: 'front'
      }],
      occlusionGraph: [],
      joints: [],
      requiredViews: ['front'],
      drawingAssets: [
        {
          drawingId: 'mouth_rest', kind: 'mouth', choiceName: 'Rest',
          sourcePath: 'assets/mouth-rest.png', confidence: 0.98
        },
        {
          drawingId: 'eyes_open', kind: 'eye', choiceName: 'Open',
          sourcePath: 'assets/eyes-open.png', confidence: 0.96
        }
      ],
      overallConfidence: 0.96
    }), 'utf8');
    const input = mohoProductionV3StartInputSchema.parse({
      shotId: 'shot-layered',
      outputDir: path.join(root, 'delivery'),
      artwork: { mode: 'layered_manifest', manifestPath: layeredManifestPath },
      brief: 'Hero holds a neutral pose.',
      durationFrames: 24
    });
    const executor = createMohoProductionV3StageExecutor({
      artworkProvider: {
        analyzeStructured: async () => {
          throw new Error('Layered manifest must not call a vision model.');
        },
        synthesizeTransparentPart: async () => {
          throw new Error('Layered manifest must not call an image model.');
        }
      }
    });

    const result = await executor({
      jobId: 'job-layered', stage: 'decomposition', input,
      previousCheckpoints: { ingest: { manifestPath: 'unused' } }, patches: [], attempt: 1
    });

    expect(result.modelCalls).toEqual([]);
    expect(result.confidence).toBe(0.96);
    expect(result.artifacts.filter(item => item.mediaType === 'image/png')).toHaveLength(3);
    const artworkPack = JSON.parse(fs.readFileSync(String(result.checkpoint.artworkPackPath), 'utf8'));
    expect(artworkPack.parts).toEqual([expect.objectContaining({
      partId: 'body', characterRef: 'hero', synthesized: false, view: 'front'
    })]);
    expect(artworkPack.drawingSets).toEqual({ mouth: ['Rest'], eyes: ['Open'], hands: [] });
    expect(artworkPack.drawingAssets).toHaveLength(2);
    expect(artworkPack.provenance.provider).toBe('manifest');
  });
});
