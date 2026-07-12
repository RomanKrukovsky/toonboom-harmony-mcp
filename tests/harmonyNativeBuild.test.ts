import { HarmonyManifestV3Compiler } from '../src/adapters/harmonyManifestV3/index.js';
import { HarmonyCommandPlanV3Generator } from '../src/adapters/harmonyCommandPlanV3Generator/index.js';
import { PortableIntegrationPackageGenerator } from '../src/adapters/portableIntegrationPackage/index.js';
import { harmonyManifestV3Schema } from '../src/schemas/harmonyManifestV3.js';
import { commandPlanV3Schema } from '../src/schemas/harmonyCommandPlanV3.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('HarmonyManifestV3Compiler', () => {
  let compiler: HarmonyManifestV3Compiler;

  beforeEach(() => {
    compiler = new HarmonyManifestV3Compiler();
  });

  test('compiles minimal manifest', () => {
    const manifest = compiler.compile({
      sceneId: 'test_scene'
    });

    expect(manifest.sceneId).toBe('test_scene');
    expect(manifest.schemaVersion).toBe('3.0');
    expect(manifest.manifestId).toContain('test_scene');
    expect(manifest.limitations.ruleBasedBaseline).toBe(true);
    expect(manifest.limitations.noHarmonyApplied).toBe(true);
  });

  test('generates Zod-valid manifest', () => {
    const manifest = compiler.compile({
      sceneId: 'test_scene',
      sceneUnderstanding: {
        schemaVersion: '1.0',
        sceneId: 'test_scene',
        sceneName: 'Test Scene',
        sourceScript: 'Test script',
        totalDurationSeconds: 10,
        endFrame: 240,
        sceneIntent: 'Test intent',
        characters: [
          {
            characterId: 'c1',
            name: 'Character 1',
            goalInScene: 'Test goal',
            emotionalArc: 'calm',
            hasDialogue: false
          }
        ],
        beats: [
          {
            beatId: 'beat_1',
            startTime: 0,
            endTime: 5,
            primaryCharacter: 'c1',
            intent: 'speak',
            emotion: 'neutral',
            action: 'test',
            importance: 0.5
          }
        ],
        provenance: {
          engine: 'rule_based SceneUnderstandingEngine v1',
          createdAt: new Date().toISOString()
        }
      }
    });

    const parsed = harmonyManifestV3Schema.safeParse(manifest);
    expect(parsed.success).toBe(true);
  });

  test('includes all provided data', () => {
    const manifest = compiler.compile({
      sceneId: 'test_scene',
      motionTracks: [{
        trackId: 't1',
        characterId: 'c1',
        partId: 'p1',
        representation: 'peg_transform',
        keyframes: [],
        startFrame: 1,
        endFrame: 24
      }],
      drawings: [{
        drawingId: 'd1',
        partId: 'p1',
        name: 'test_drawing',
        path: '/test/path.png',
        variantType: 'front' as const,
        inferred: false
      }]
    });

    expect(manifest.motionTracks).toHaveLength(1);
    expect(manifest.drawings).toHaveLength(1);
  });

  test('builds representation segments from routing plan', () => {
    const manifest = compiler.compile({
      sceneId: 'test_scene',
      routingPlan: {
        schemaVersion: '1.0',
        characterId: 'c1',
        sceneId: 'test_scene',
        decisions: [],
        segments: [
          {
            partId: 'p1',
            segments: [
              { startFrame: 1, endFrame: 24, representation: 'peg_transform', decisionId: 'd1', explanation: 'test', confidence: 0.9 }
            ]
          }
        ],
        summary: {
          totalDecisions: 0,
          representationCounts: {} as any,
          averageConfidence: 0,
          lockedPartCount: 0
        },
        provenance: {
          engine: 'test',
          createdAt: new Date().toISOString()
        }
      }
    });

    expect(manifest.representationSegments).toHaveLength(1);
    expect(manifest.representationSegments?.[0].partId).toBe('p1');
  });

  test('includes provenance and metadata', () => {
    const manifest = compiler.compile({
      sceneId: 'test_scene',
      iterations: [1, 2, 3]
    });

    expect(manifest.provenance.pipeline).toBe('AI Animation Studio');
    expect(manifest.provenance.iterations).toEqual([1, 2, 3]);
    expect(manifest.provenance.engine).toContain('HarmonyManifestV3Compiler');
    expect(manifest.createdAt).toBeDefined();
  });
});

describe('HarmonyCommandPlanV3Generator', () => {
  let generator: HarmonyCommandPlanV3Generator;
  let manifestCompiler: HarmonyManifestV3Compiler;

  beforeEach(() => {
    generator = new HarmonyCommandPlanV3Generator();
    manifestCompiler = new HarmonyManifestV3Compiler();
  });

  test('generates Zod-valid command plan', () => {
    const manifest = manifestCompiler.compile({ sceneId: 'test_scene' });
    const plan = generator.generate(manifest);

    const parsed = commandPlanV3Schema.safeParse(plan);
    expect(parsed.success).toBe(true);
  });

  test('uses only whitelist operations', () => {
    const manifest = manifestCompiler.compile({ sceneId: 'test_scene' });
    const plan = generator.generate(manifest);

    const validOps = [
      'create_group', 'create_drawing_element', 'create_drawing', 'write_path',
      'create_palette', 'add_palette_swatch', 'create_peg', 'attach_drawing_to_peg',
      'set_pivot', 'set_transform_keyframe', 'set_transform_interpolation',
      'create_deformer', 'configure_deformer', 'set_deformer_key',
      'set_exposure', 'set_substitution', 'create_camera', 'set_camera_key',
      'create_composite', 'connect_nodes', 'set_node_attribute',
      'lock_element', 'save_version', 'render_preview'
    ];

    for (const op of plan.operations) {
      expect(validOps).toContain(op.operation);
    }
  });

  test('generates operations in correct order', () => {
    const manifest = manifestCompiler.compile({
      sceneId: 'test_scene',
      palettes: [{
        paletteId: 'p1',
        name: 'test_palette',
        colors: [{ colorId: 'c1', name: 'red', r: 255, g: 0, b: 0, a: 255 }]
      }]
    });

    const plan = generator.generate(manifest);

    // Check that order numbers are sequential
    for (let i = 0; i < plan.operations.length; i++) {
      expect(plan.operations[i].order).toBe(i);
    }
  });

  test('includes palette operations', () => {
    const manifest = manifestCompiler.compile({
      sceneId: 'test_scene',
      palettes: [{
        paletteId: 'p1',
        name: 'test_palette',
        colors: [
          { colorId: 'c1', name: 'red', r: 255, g: 0, b: 0, a: 255 },
          { colorId: 'c2', name: 'blue', r: 0, g: 0, b: 255, a: 255 }
        ]
      }]
    });

    const plan = generator.generate(manifest);
    const paletteOps = plan.operations.filter(op => op.operation === 'create_palette');
    const swatchOps = plan.operations.filter(op => op.operation === 'add_palette_swatch');

    expect(paletteOps).toHaveLength(1);
    expect(swatchOps).toHaveLength(2);
  });

  test('includes drawing and peg operations', () => {
    const manifest = manifestCompiler.compile({
      sceneId: 'test_scene',
      drawings: [
        { drawingId: 'd1', partId: 'p1', name: 'drawing1', path: '/test1.png', variantType: 'front' as const, inferred: false },
        { drawingId: 'd2', partId: 'p2', name: 'drawing2', path: '/test2.png', variantType: 'front' as const, inferred: false }
      ],
      partDecomposition: {
        schemaVersion: '1.0',
        characterId: 'c1',
        parts: [
          {
            partId: 'p1',
            identity: { partId: 'p1', label: 'Part 1', isHumanoidPart: true, parentPartId: null, depthOrder: 0 },
            frameStates: []
          },
          {
            partId: 'p2',
            identity: { partId: 'p2', label: 'Part 2', isHumanoidPart: true, parentPartId: null, depthOrder: 1 },
            frameStates: []
          }
        ],
        occlusionGraph: [],
        identityContinuityScore: 0.5,
        totalProblemRanges: 0,
        provenance: {
          engine: 'test',
          createdAt: new Date().toISOString(),
          method: 'cpu_heuristic'
        }
      }
    });

    const plan = generator.generate(manifest);
    const drawingOps = plan.operations.filter(op => op.operation === 'create_drawing');
    const pegOps = plan.operations.filter(op => op.operation === 'create_peg');

    expect(drawingOps).toHaveLength(2);
    expect(pegOps).toHaveLength(2);
  });

  test('includes motion track operations', () => {
    const manifest = manifestCompiler.compile({
      sceneId: 'test_scene',
      motionTracks: [{
        trackId: 't1',
        characterId: 'c1',
        partId: 'p1',
        representation: 'peg_transform',
        keyframes: [
          { frame: 1, position: { x: 0, y: 0 }, interpolation: 'ease_in_out' },
          { frame: 24, position: { x: 100, y: 50 }, interpolation: 'ease_in_out' }
        ],
        startFrame: 1,
        endFrame: 24
      }]
    });

    const plan = generator.generate(manifest);
    const keyframeOps = plan.operations.filter(op => op.operation === 'set_transform_keyframe');

    expect(keyframeOps).toHaveLength(2);
  });

  test('includes save_version at the end', () => {
    const manifest = manifestCompiler.compile({ sceneId: 'test_scene' });
    const plan = generator.generate(manifest);

    const lastOp = plan.operations[plan.operations.length - 1];
    expect(lastOp.operation).toBe('save_version');
  });

  test('supports rollback', () => {
    const manifest = manifestCompiler.compile({ sceneId: 'test_scene' });
    const plan = generator.generate(manifest);

    expect(plan.rollbackPlan.supported).toBe(true);
  });
});

describe('PortableIntegrationPackageGenerator', () => {
  let packageGenerator: PortableIntegrationPackageGenerator;
  let manifestCompiler: HarmonyManifestV3Compiler;
  let commandPlanGenerator: HarmonyCommandPlanV3Generator;
  let tempDir: string;

  beforeEach(async () => {
    packageGenerator = new PortableIntegrationPackageGenerator();
    manifestCompiler = new HarmonyManifestV3Compiler();
    commandPlanGenerator = new HarmonyCommandPlanV3Generator();
    tempDir = path.join(os.tmpdir(), `harmony_package_test_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore
    }
  });

  test('generates complete package', async () => {
    const manifest = manifestCompiler.compile({ sceneId: 'test_scene' });
    const commandPlan = commandPlanGenerator.generate(manifest);

    const result = await packageGenerator.generate({
      manifest,
      commandPlan,
      outputDir: tempDir,
      packageName: 'test_package'
    });

    expect(result.packagePath).toContain('test_package');
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.totalSize).toBeGreaterThan(0);
  });

  test('includes all required files', async () => {
    const manifest = manifestCompiler.compile({ sceneId: 'test_scene' });
    const commandPlan = commandPlanGenerator.generate(manifest);

    const result = await packageGenerator.generate({
      manifest,
      commandPlan,
      outputDir: tempDir
    });

    const fileNames = result.files.map(f => path.basename(f));
    expect(fileNames).toContain('harmony_manifest_v3.json');
    expect(fileNames).toContain('harmony_command_plan_v3.json');
    expect(fileNames).toContain('README.md');
    expect(fileNames).toContain('apply_to_harmony.py');
    expect(fileNames).toContain('package.json');
  });

  test('creates valid manifest JSON', async () => {
    const manifest = manifestCompiler.compile({ sceneId: 'test_scene' });
    const commandPlan = commandPlanGenerator.generate(manifest);

    const result = await packageGenerator.generate({
      manifest,
      commandPlan,
      outputDir: tempDir
    });

    const manifestPath = path.join(result.packagePath, 'manifest', 'harmony_manifest_v3.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.sceneId).toBe('test_scene');
    expect(parsed.schemaVersion).toBe('3.0');
  });

  test('creates valid command plan JSON', async () => {
    const manifest = manifestCompiler.compile({ sceneId: 'test_scene' });
    const commandPlan = commandPlanGenerator.generate(manifest);

    const result = await packageGenerator.generate({
      manifest,
      commandPlan,
      outputDir: tempDir
    });

    const planPath = path.join(result.packagePath, 'command_plan', 'harmony_command_plan_v3.json');
    const content = await fs.readFile(planPath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.operations).toBeDefined();
    expect(parsed.totalOperations).toBeGreaterThan(0);
  });

  test('includes package manifest with metadata', async () => {
    const manifest = manifestCompiler.compile({ sceneId: 'test_scene' });
    const commandPlan = commandPlanGenerator.generate(manifest);

    const result = await packageGenerator.generate({
      manifest,
      commandPlan,
      outputDir: tempDir
    });

    expect(result.manifest.packageName).toBeDefined();
    expect(result.manifest.sceneId).toBe('test_scene');
    expect(result.manifest.manifestId).toBe(manifest.manifestId);
    expect(result.manifest.requiresHarmony).toBe(true);
  });

  test('generates README with documentation', async () => {
    const manifest = manifestCompiler.compile({ sceneId: 'test_scene' });
    const commandPlan = commandPlanGenerator.generate(manifest);

    const result = await packageGenerator.generate({
      manifest,
      commandPlan,
      outputDir: tempDir
    });

    expect(result.readme).toContain('Harmony Integration Package');
    expect(result.readme).toContain('test_scene');
    expect(result.readme).toContain('Manifest V3');
    expect(result.readme).toContain('Command Plan');
  });
});
