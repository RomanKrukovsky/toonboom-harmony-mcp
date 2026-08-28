import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from '@jest/globals';
import { MohoBespokeCreatureBuilder } from '../../src/services/mohoBespokeCreatureBuilder/index.js';
import { MohoProjectCompiler } from '../../src/services/mohoProjectCompiler/index.js';
import { MohoProductionQualityAuditor } from '../../src/services/mohoProductionQualityAuditor/index.js';
import { MohoRenderManager } from '../../src/services/mohoRenderManager/index.js';
import { MohoStudioMasterRigGenerator } from '../../src/services/mohoStudioMasterRigGenerator/index.js';
import type { MohoProductionRigSpec } from '../../src/schemas/mohoProductionRig.js';

const installedMoho = '/Applications/Moho.app/Contents/MacOS/Moho';
const describeWithRealMoho = process.platform === 'darwin' && fs.existsSync(installedMoho)
  ? describe
  : describe.skip;

describeWithRealMoho('Moho real project round-trip', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-real-roundtrip-'));
  const spec: MohoProductionRigSpec = {
    characterId: 'real_roundtrip_character',
    characterName: 'Real Roundtrip Character',
    turnaroundAngles: ['Front', '3/4 R', 'Side R', '1/4 R', 'Back', '1/4 L', 'Side L', '3/4 L'],
    smartDials: [],
    vitruvianGroups: [],
    jointCorrections: [],
    squashStretch: [],
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

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('opens a compiled project in Moho 14 and renders a real PNG frame', async () => {
    const projectPath = path.join(tempDir, 'generated-character.moho');
    const renderDir = path.join(tempDir, 'render');

    MohoProjectCompiler.compileToFile({ outputPath: projectPath, spec });
    const result = await MohoRenderManager.executeRender({
      mohoProjectPath: projectPath,
      outputDirectory: renderDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 1
    });

    expect(result.isExecutableFound).toBe(true);
    expect(result.status).toBe('rendered');

    const renderedPngs = fs.readdirSync(renderDir)
      .filter(name => name.toLowerCase().endsWith('.png'));
    expect(renderedPngs).toHaveLength(1);

    const png = fs.readFileSync(path.join(renderDir, renderedPngs[0]));
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  }, 30_000);

  it('reports a damaged project as failed even when Moho exits with code zero', async () => {
    const projectPath = path.join(tempDir, 'damaged.moho');
    const renderDir = path.join(tempDir, 'damaged-render');
    fs.writeFileSync(projectPath, Buffer.from('not a Moho archive'));

    const result = await MohoRenderManager.executeRender({
      mohoProjectPath: projectPath,
      outputDirectory: renderDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 1
    });

    expect(result.status).toBe('failed');
    expect(result.renderedFiles).toEqual([]);
    expect(result.errorMessage).toMatch(/did not create/i);
  }, 30_000);

  it('keeps a native project openable after automatic quality fixes', async () => {
    const projectPath = path.join(tempDir, 'auto-fixed.moho');
    const renderDir = path.join(tempDir, 'auto-fixed-render');
    MohoProjectCompiler.compileToFile({ outputPath: projectPath, spec });

    const report = MohoProductionQualityAuditor.auditAndFixMohoFile(projectPath, true);
    expect(report.fixedIssuesCount).toBeGreaterThan(0);

    const result = await MohoRenderManager.executeRender({
      mohoProjectPath: projectPath,
      outputDirectory: renderDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 1
    });
    expect(result.status).toBe('rendered');
    expect(result.renderedFiles).toHaveLength(1);
  }, 30_000);

  it('creates openable native files through every direct rig generator', async () => {
    const creaturePath = path.join(tempDir, 'creature.moho');
    const masterPath = path.join(tempDir, 'master.moho');
    MohoBespokeCreatureBuilder.buildCreature({
      creatureName: 'Test Creature',
      bodyType: 'soft_body_slime',
      limbs: [],
      heads: [{
        name: 'Head',
        rootBone: 'Body_Center',
        offsetX: 0,
        offsetY: 80,
        radius: 30,
        eyesCount: 2,
        hasMouth: true
      }],
      outputPath: creaturePath
    });
    MohoStudioMasterRigGenerator.generateMasterRig({
      characterName: 'Test Master',
      outputPath: masterPath
    });

    for (const [projectPath, renderName] of [[creaturePath, 'creature'], [masterPath, 'master']] as const) {
      const result = await MohoRenderManager.executeRender({
        mohoProjectPath: projectPath,
        outputDirectory: path.join(tempDir, `${renderName}-render`),
        format: 'png_sequence',
        startFrame: 1,
        endFrame: 1
      });
      expect(result.status).toBe('rendered');
      expect(result.renderedFiles).toHaveLength(1);
    }
  }, 30_000);
});
