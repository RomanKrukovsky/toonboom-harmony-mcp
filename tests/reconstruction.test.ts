import fs from 'fs';
import os from 'os';
import path from 'path';

import { config } from '../src/config.js';
import { HarmonyPython } from '../src/adapters/harmonyPython.js';
import { HarmonySceneCompiler } from '../src/adapters/harmonySceneCompiler.js';
import { ReconstructionClient } from '../src/adapters/reconstructionClient.js';
import {
  reconstructionManifestSchema,
  harmonyCommandPlanSchema,
  type HarmonyReconstructionManifest
} from '../src/schemas/reconstruction.js';

function manifestFixture(): HarmonyReconstructionManifest {
  return {
    schemaVersion: '2.0', manifestId: '1234567890abcdef', createdAt: '2026-07-12T10:00:00Z', mode: 'frame_by_frame_vector',
    source: {
      videoPath: '/tmp/input.mp4', sha256: 'a'.repeat(64), width: 96, height: 64, fps: 12,
      timeBase: '1/12', durationSeconds: 0.1667, frameCount: 2, variableFrameRate: false,
      rotation: 0, colorSpace: 'bt709', hasAlpha: false
    },
    scene: { name: 'Test', width: 96, height: 64, fps: 12, startFrame: 1, endFrame: 2 },
    palettes: [{ id: 'palette_main', name: 'Test_Palette', colors: [{
      id: 'COLOR_001', name: 'COLOR_001', rgba: [255, 0, 0, 255],
      originalRgba: [255, 0, 0, 255], replacementError: 0,
      confidence: 1.0, artistModified: false, artistLocked: false
    }] }],
    elements: [{ id: 'element_main', name: 'Test_Drawings', nodeName: 'Test_READ', drawingIds: ['drawing_000001'], locked: false, artistModified: false, artistLocked: false }],
    drawings: [{
      id: 'drawing_000001', name: 'F_000001', sourceFrame: 1, normalizedImagePath: '/tmp/frame.png',
      shapes: [{
        id: 'shape_1', colorId: 'COLOR_001', closed: true,
        points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], area: 10,
        source: { frame: 1, method: 'contour_trace' },
        confidence: 1.0, uncertaintyCategories: []
      }], pointCount: 3, locked: false, artistModified: false, artistLocked: false, confidence: 1.0, uncertaintyCategories: [], provenance: 'automatic_video_reconstruction'
    }],
    exposures: [{ frame: 1, duration: 2, drawingId: 'drawing_000001', confidence: 1.0 }],
    nodes: [
      { id: 'node_read', name: 'Test_READ', type: 'READ', autoCreated: true, locked: false, artistModified: false, artistLocked: false },
      { id: 'node_composite', name: 'Test_COMPOSITE', type: 'COMPOSITE', autoCreated: true, locked: false, artistModified: false, artistLocked: false },
      { id: 'node_display', name: 'Test_DISPLAY', type: 'DISPLAY', autoCreated: true, locked: false, artistModified: false, artistLocked: false }
    ],
    connections: [
      { from: 'node_read', to: 'node_composite', fromPort: 0, toPort: 0 },
      { from: 'node_composite', to: 'node_display', fromPort: 0, toPort: 0 }
    ],
    diagnostics: {
      uniqueDrawingCount: 1, duplicateFrameCount: 1, paletteColorCount: 1, totalPointCount: 3,
      warnings: [], stageDurationsMs: {},
      capability: { vectorBackend: 'python_dom_shapes', lineArt: false, colourArt: true, nativeTvgRequired: true },
      problemFrames: [], representationSegments: []
    },
    provenance: null
  };
}

describe('video reconstruction vertical slice', () => {
  test('Zod validates references and complete exposure timing', () => {
    expect(reconstructionManifestSchema.parse(manifestFixture()).drawings).toHaveLength(1);
    const invalid: any = manifestFixture();
    invalid.exposures[0].drawingId = 'missing';
    expect(reconstructionManifestSchema.safeParse(invalid).success).toBe(false);
  });

  test('ReconstructionClient validates a manifest loaded from disk', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reconstruction-manifest-'));
    const file = path.join(directory, 'manifest.json');
    fs.writeFileSync(file, JSON.stringify(manifestFixture()));
    try {
      const loaded = new ReconstructionClient('http://127.0.0.1:1').loadManifest(file);
      expect(loaded.source.frameCount).toBe(2);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('HarmonySceneCompiler generates a valid HarmonyCommandPlan', () => {
    const compiler = new HarmonySceneCompiler();
    const manifest = manifestFixture();
    const plan = compiler.generateCommandPlan(manifest);
    
    // Проверка Zod-валидации сгенерированного плана
    const parsed = harmonyCommandPlanSchema.parse(plan);
    expect(parsed.manifestId).toBe(manifest.manifestId);
    expect(parsed.commands.length).toBeGreaterThan(5);

    // Проверка порядка операций
    const cmdTypes = plan.commands.map(c => c.type);
    
    const firstPalette = cmdTypes.indexOf('create_palette');
    const firstSwatch = cmdTypes.indexOf('add_palette_swatch');
    const firstElement = cmdTypes.indexOf('create_drawing_element');
    const firstDrawing = cmdTypes.indexOf('create_drawing');
    const firstPath = cmdTypes.indexOf('write_path');
    const firstExposure = cmdTypes.indexOf('set_exposure');
    const firstSave = cmdTypes.indexOf('save_project');

    // 1. Палитра должна быть создана до добавления цветов
    expect(firstPalette).toBeLessThan(firstSwatch);
    // 2. Элемент должен быть создан до создания рисунков
    expect(firstElement).toBeLessThan(firstDrawing);
    // 3. Рисунки должны быть созданы до записи путей
    expect(firstDrawing).toBeLessThan(firstPath);
    // 4. Пути и рисунки должны быть созданы до назначения экпозиции
    expect(firstPath).toBeLessThan(firstExposure);
    // 5. Сохранение проекта должно быть последней операцией
    expect(firstSave).toBe(plan.commands.length - 1);
  });

  test('mock compiler copies the scene, applies once and verifies native audit', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-compiler-'));
    const oldRoots = config.allowedRoots;
    config.allowedRoots = [...oldRoots, directory];
    const sourceDir = path.join(directory, 'source');
    fs.mkdirSync(sourceDir);
    const source = path.join(sourceDir, 'scene.xstage');
    fs.writeFileSync(source, '<project/>');
    const output = path.join(directory, 'result', 'scene.xstage');
    
    const spy = jest.spyOn(HarmonyPython, 'runCommand').mockImplementation(async (command: string, args: any) => {
      if (command === 'execute_command_plan') {
        return { status: 'success', saved: true };
      }
      if (command === 'audit_reconstruction_scene') {
        return {
          status: 'success',
          verified: true,
          reopenedFromDisk: true,
          nativeAudit: {
            elementCount: 1,
            vectorType: 'TVG',
            drawingCount: 1,
            nonemptyDrawingCount: 1,
            exposureFrameCount: 2,
            exposureTimingMatches: true,
            repeatedDrawingsReused: true,
            paletteColorCount: 1,
            paletteLinked: true,
            nodeExists: true,
            displayExists: true,
            writeExists: true,
            editableVectorGeometry: true
          }
        };
      }
      if (command === 'render_reconstruction_preview') {
        const outDir = args.outputDirectory;
        fs.mkdirSync(outDir, { recursive: true });
        const p1 = path.join(outDir, 'preview_1.png');
        const p2 = path.join(outDir, 'preview_2.png');
        const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        fs.writeFileSync(p1, pngHeader);
        fs.writeFileSync(p2, pngHeader);
        return {
          status: 'success',
          rendered: true,
          previewPaths: [p1, p2]
        };
      }
      return { status: 'success' };
    });

    const mockComparisonClient = {
      compareRender: jest.fn().mockResolvedValue({
        status: 'success',
        allImagesReadable: true,
        allSizesMatch: true
      })
    };

    try {
      const compiler = new HarmonySceneCompiler(mockComparisonClient);
      const manifest = manifestFixture();
      const result: any = await compiler.compile(manifest, {
        targetProjectPath: source, outputProjectPath: output, dryRun: false
      });
      expect(result.realSceneCreated).toBe(true);
      expect(fs.existsSync(output)).toBe(true);
      
      // Проверяем, что command_plan.json действительно записан на диск
      const planPath = path.join(path.dirname(output), 'command_plan.json');
      expect(fs.existsSync(planPath)).toBe(true);
      const loadedPlan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
      expect(loadedPlan.manifestId).toBe(manifest.manifestId);

      expect(spy).toHaveBeenCalled();
      await expect(compiler.compile(manifestFixture(), {
        targetProjectPath: source, outputProjectPath: output, dryRun: false
      })).rejects.toThrow('не пуст');
    } finally {
      spy.mockRestore();
      config.allowedRoots = oldRoots;
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('Zod parses V2 schema manifest with Problem Frames and Provenance', () => {
    const manifest = manifestFixture();
    manifest.schemaVersion = '2.0';
    manifest.provenance = {
      tool: 'harmony-reconstruction-core',
      version: '2.0.0',
      arguments: { maxColors: 12 },
      timestamp: new Date().toISOString()
    };
    manifest.diagnostics.problemFrames = [
      {
        frame: 2,
        severity: 'high',
        category: 'contour_count_jump',
        sourcePreviewPath: 'frames/frame_000002.png',
        vectorPreviewPath: 'problem_previews/render_drawing_dr_2.png',
        differencePreviewPath: 'problem_previews/diff_drawing_dr_2.png',
        affectedDrawingId: 'drawing_000001',
        metrics: { vectorization_error: 15.2 },
        recommendedAction: 'Verify contours'
      }
    ];
    manifest.diagnostics.representationSegments = [
      {
        startFrame: 1,
        endFrame: 2,
        routingChoice: 'frame_by_frame_vector',
        averageConfidence: 0.95,
        drawingIds: ['drawing_000001'],
        problemFrames: [2],
        explanation: 'Contiguous segment'
      }
    ];

    const parsed = reconstructionManifestSchema.parse(manifest);
    expect(parsed.schemaVersion).toBe('2.0');
    expect(parsed.provenance?.tool).toBe('harmony-reconstruction-core');
    expect(parsed.diagnostics.problemFrames).toHaveLength(1);
    expect(parsed.diagnostics.problemFrames[0].category).toBe('contour_count_jump');
    expect(parsed.diagnostics.representationSegments).toHaveLength(1);
  });

  test('Reconstruction tools list contains all V2 tools', () => {
    const { reconstructionTools } = require('../src/tools/reconstructionTools.js');
    const toolNames = reconstructionTools.map((t: any) => t.name);
    expect(toolNames).toContain('harmony.reconstruct.get_problem_frames');
    expect(toolNames).toContain('harmony.reconstruct.get_problem_frame');
    expect(toolNames).toContain('harmony.reconstruct.refine_range');
    expect(toolNames).toContain('harmony.reconstruct.lock_elements');
    expect(toolNames).toContain('harmony.reconstruct.unlock_elements');
    expect(toolNames).toContain('harmony.reconstruct.list_versions');
    expect(toolNames).toContain('harmony.reconstruct.rollback_version');
  });
});
