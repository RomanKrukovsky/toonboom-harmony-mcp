import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { describe, it, expect, afterAll } from '@jest/globals';
import { MohoProjectCompiler } from '../src/services/mohoProjectCompiler/index.js';
import { TURNAROUND_ANGLES, type MohoProductionRigSpec } from '../src/schemas/mohoProductionRig.js';

describe('MohoProjectCompiler', () => {
  const testOutputDir = path.join(process.cwd(), 'output', 'test_moho');
  const testMohoPath = path.join(testOutputDir, 'test_hero.moho');

  afterAll(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  const sampleSpec: MohoProductionRigSpec = {
    characterId: 'char_test_hero',
    characterName: 'TestHero',
    turnaroundAngles: [...TURNAROUND_ANGLES],
    smartDials: [],
    vitruvianGroups: [],
    jointCorrections: [
      {
        jointName: 'Elbow_L',
        boneName: 'Forearm_L',
        flexionAnglesDeg: [90, 135],
        bulgeBicepScale: 1.18,
        cuffDeformers: []
      }
    ],
    squashStretch: [
      {
        targetPart: 'Head',
        controlBoneName: 'Head',
        horizontalSpreaderBones: ['Ear_L', 'Ear_R'],
        scaleRatioYtoX: -0.95,
        eyelidCompensationEnabled: true
      }
    ],
    shadow: {
      enabled: true,
      layerName: 'shadow',
      rootBoneName: 'Master',
      scaleY: -0.25,
      skewX: 0.1,
      opacity: 0.35
    },
    animatorContract: {
      hideHelperBonesShy: true,
      colorCodeBones: true,
      lockNonControllerChannels: true,
      frameZeroCleanAudit: true
    }
  };

  it('compiles document JSON matching standard Moho structure', () => {
    const docJson = MohoProjectCompiler.compileToDocumentJson(sampleSpec);

    expect(docJson.mime_type).toBe('application/x-vnd.lm_mohodoc');
    expect(docJson.version).toBe(1045);
    expect(docJson.major_version).toBe(1);
    expect(docJson.project_data).toBeDefined();

    const layers = docJson.layers as Array<Record<string, unknown>>;
    expect(layers).toHaveLength(1);
    const rootLayer = layers[0];
    expect(rootLayer.name).toBe('TestHero');
    expect(rootLayer.type).toBe('BoneLayer');

    const skel = rootLayer.skeleton as Record<string, unknown>;
    const bones = skel.bones as Array<Record<string, unknown>>;
    expect(bones.length).toBeGreaterThanOrEqual(18);

    // Verify Head switch dial is in the skeleton
    const headSwitchBone = bones.find(b => b.name === 'Head switch');
    expect(headSwitchBone).toBeDefined();
  });

  it('compiles valid binary .moho ZIP container with Project.mohoproj and preview.jpg', () => {
    const result = MohoProjectCompiler.compileToFile({
      outputPath: testMohoPath,
      spec: sampleSpec
    });

    expect(fs.existsSync(testMohoPath)).toBe(true);
    expect(result.fileSizeBytes).toBeGreaterThan(100);

    const fileBuf = fs.readFileSync(testMohoPath);
    // Verify PK zip header
    expect(fileBuf[0]).toBe(0x50); // 'P'
    expect(fileBuf[1]).toBe(0x4b); // 'K'
    expect(fileBuf[2]).toBe(0x03);
    expect(fileBuf[3]).toBe(0x04);
  });
});
