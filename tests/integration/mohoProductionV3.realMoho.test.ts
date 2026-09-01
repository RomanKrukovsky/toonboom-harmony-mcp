import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from '@jest/globals';
import { compileMohoProductionPlanV3 } from '../../src/services/mohoProductionV3Compiler/index.js';
import { MohoNativeProductionBackend } from '../../src/services/mohoProductionV3NativeBackend/index.js';
import type { ArtworkPackV3, RigBlueprintV3 } from '../../src/schemas/mohoProductionV3.js';

const installedMoho = '/Applications/Moho.app/Contents/MacOS/Moho';
const describeWithLicensedMoho = process.env.RUN_REAL_MOHO_TESTS === '1' && fs.existsSync(installedMoho)
  ? describe
  : describe.skip;
const provenance = { provider: 'native-test', model: 'none', callId: 'native-test' };

describeWithLicensedMoho('Moho Production v3 real Moho 14 acceptance', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-production-v3-real-'));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lbMcWQAAAABJRU5ErkJggg==', 'base64');

  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  it('preserves native binding, Smart Action, Smart Warp, mesh and shadow through open/save/reopen/render', async () => {
    const bodyPath = path.join(root, 'body.png');
    const mouthPath = path.join(root, 'mouth_rest.png');
    fs.writeFileSync(bodyPath, png);
    fs.writeFileSync(mouthPath, png);
    const artwork: ArtworkPackV3 = {
      schemaVersion: '3.0', shotId: 'native-v3',
      parts: [{ partId: 'body', characterRef: 'hero', sourcePath: bodyPath, maskPath: null, zIndex: 0, confidence: 1, pivot: { x: 0, y: 0 }, synthesized: false, view: 'front' }],
      occlusionGraph: [], joints: [], requiredViews: ['front'],
      drawingSets: { mouth: ['Rest'], eyes: [], hands: [] },
      drawingAssets: [{ drawingId: 'mouth_rest', kind: 'mouth', sourcePath: mouthPath, confidence: 1 }],
      overallConfidence: 1, provenance
    };
    const blueprint: RigBlueprintV3 = {
      schemaVersion: '3.0', shotId: 'native-v3',
      bones: [
        { boneId: 'root', name: 'Root', parentBoneId: null, x: 0, y: 0, angleDeg: 90, lengthPx: 40 },
        { boneId: 'head', name: 'Head', parentBoneId: 'root', x: 0, y: 40, angleDeg: 90, lengthPx: 30 }
      ],
      bindings: [{ partId: 'body', boneId: 'root', mode: 'layer' }],
      constraints: [{ boneId: 'head', minAngleDeg: -30, maxAngleDeg: 30 }],
      switches: [{ switchId: 'mouth', layerName: 'Mouth', choices: [{ choiceId: 'Rest', partId: 'mouth_rest' }] }],
      actions: [{
        actionId: 'root_turn', driverBoneId: 'root', driverMinAngleDeg: -30, driverMaxAngleDeg: 30,
        targets: [{ boneId: 'head', minAngleDeg: -20, maxAngleDeg: 20 }], minFrame: 0, maxFrame: 100
      }],
      warpMeshes: [{
        meshId: 'body_warp', targetPartId: 'body',
        points: [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }]
      }],
      controlPoses: [],
      vitruvianGroups: [{ groupName: 'head_group', defaultActiveBoneId: 'head', boneIds: ['head'] }],
      shadows: [{ layerName: 'Shadow', rootBoneId: 'root', scaleY: -0.25 }],
      provenance
    };
    const plan = compileMohoProductionPlanV3({
      artwork, blueprint, characterName: 'NativeV3', documentPath: path.join(root, 'native-v3.moho')
    });
    const result = await new MohoNativeProductionBackend().buildRoundTripAndRender({
      plan, outputDir: root, startFrame: 1, endFrame: 1, fps: 24, width: 320, height: 240, timeoutMs: 180_000
    });
    expect(result.freshProcessRoundTrip).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.probe.codec).toBe('h264');
    expect(fs.statSync(result.roundtripMohoPath).size).toBeGreaterThan(0);
    expect(fs.statSync(result.mp4Path).size).toBeGreaterThan(0);
  }, 300_000);
});
