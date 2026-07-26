import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { pirV1Schema, PIRv1 } from '../src/schemas/pirV1.js';
import { PIRCompiler } from '../src/adapters/pirCompiler.js';
import { ClosedLoopQaEngine } from '../src/adapters/closedLoopQaEngine.js';

describe('Production Slice: Core Animation Compiler Runtime', () => {
  let tempDir: string;
  let compiler: PIRCompiler;
  let qaEngine: ClosedLoopQaEngine;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'harmony_slice_test_'));
    compiler = new PIRCompiler();
    qaEngine = new ClosedLoopQaEngine();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('executes end-to-end production slice: PIR v1 -> humanoid_standard rig -> 3 primitives -> .xstage -> render -> QA defect -> PIR patch -> re-render pass', async () => {
    const rawPir: PIRv1 = {
      version: '1.0',
      shotId: 'S01_SH004',
      durationFrames: 144,
      fps: 24,
      productionProfile: 'limited_tv_2d_cutout_v1',
      inputContract: {
        characterId: 'char_scientist_01',
        characterName: 'Scientist',
        topology: 'humanoid_standard',
        turnaroundApproved: true,
        mouthChartVersion: 'v1.0'
      },
      actingPrimitives: [
        {
          type: 'anticipation',
          startFrame: 12,
          endFrame: 36,
          intensity: 0.8
        },
        {
          type: 'recoil',
          startFrame: 37,
          endFrame: 65,
          intensity: 0.85 // High intensity causes recoil angle > 25°
        },
        {
          type: 'comedic_hold',
          startFrame: 66,
          endFrame: 130,
          intensity: 0.5
        }
      ],
      validationRules: {
        maxOvershootClippingDegrees: 5.0,
        maxFootSlidePixels: 2.0,
        allowDeformerClipping: false,
        requireAutopatchIntegrity: true
      }
    };

    // 1. Zod Validation
    const parsedPir = pirV1Schema.parse(rawPir);
    expect(parsedPir.version).toBe('1.0');
    expect(parsedPir.actingPrimitives).toHaveLength(3);

    // 2. Initial Compilation to Harmony .xstage
    const bundle = compiler.compileToHarmonyScene(parsedPir, tempDir);
    expect(bundle.frameCount).toBe(144);
    expect(bundle.rigTemplate.topology).toBe('humanoid_standard');
    expect(bundle.performance.primitivesEvaluated).toEqual(['anticipation', 'recoil', 'comedic_hold']);

    // Check disk files
    const xstageExists = await fs.stat(bundle.scenePath).then(s => s.isFile()).catch(() => false);
    const commandPlanExists = await fs.stat(bundle.commandPlanPath).then(s => s.isFile()).catch(() => false);
    expect(xstageExists).toBe(true);
    expect(commandPlanExists).toBe(true);

    const xstageXml = await fs.readFile(bundle.scenePath, 'utf-8');
    expect(xstageXml).toContain('sceneName="S01_SH004_scene"');
    expect(xstageXml).toContain('Master-P');
    expect(xstageXml).toContain('autopatch joint="shoulder_r"');

    // 3. Render Preview & Initial QA Audit
    const initialFrames = qaEngine.renderPreview(bundle, tempDir);
    expect(initialFrames.length).toBeGreaterThan(0);

    const initialAudit = qaEngine.auditScene(parsedPir, bundle, initialFrames);
    expect(initialAudit.passed).toBe(false);
    expect(initialAudit.defectsFound.length).toBeGreaterThan(0);
    expect(initialAudit.defectsFound[0]).toContain('RECOIL_OVERSHOOT_CLIPPING');
    expect(initialAudit.patchGenerated).toBeDefined();

    // 4. Apply Automated PIR Patch
    const patch = initialAudit.patchGenerated!;
    expect(patch.defectReason).toContain('RECOIL_OVERSHOOT_CLIPPING');
    expect(patch.primitiveModifications[0].updatedIntensity).toBe(0.55);

    // 5. Re-compile & Re-render
    const recompileResult = qaEngine.applyPatchAndRecompile(parsedPir, patch, tempDir);
    expect(recompileResult.newAudit.passed).toBe(true);
    expect(recompileResult.newAudit.defectsFound).toHaveLength(0);
    expect(recompileResult.newBundle.performance.maxPeakRecoilAngle).toBeLessThanOrEqual(25.0);

    // Verify patched command plan on disk
    const updatedPlanRaw = await fs.readFile(recompileResult.newBundle.commandPlanPath, 'utf-8');
    const updatedPlan = JSON.parse(updatedPlanRaw);
    expect(updatedPlan.maxPeakRecoilAngle).toBeLessThanOrEqual(25.0);
  });
});
