import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { HarmonyPython } from '../src/adapters/harmonyPython.js';

process.env.HARMONY_ALLOW_DESTRUCTIVE = 'true';

import { config } from '../src/config.js';
import { vectorizationTools } from '../src/tools/vectorizationTools.js';

describe('Vectorization MCP Tools Tests', () => {
  const getTool = (name: string) => vectorizationTools.find((t) => t.name === name)!;
  const testImgPath = path.resolve(process.cwd(), 'output', 'test_sample.png');

  beforeAll(() => {
    (config as any).allowDestructive = true;
    const dir = path.dirname(testImgPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // 1x1 transparent PNG
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImgPath, transparentPng);
  });

  afterAll(async () => {
    await HarmonyPython.shutdownDaemon();
    if (fs.existsSync(testImgPath)) {
      fs.unlinkSync(testImgPath);
    }
  });

  it('provides all 7 required vectorization MCP tools', () => {
    const required = [
      'harmony.vectorization.analyze_image',
      'harmony.vectorization.preview',
      'harmony.vectorization.vectorize_character',
      'harmony.vectorization.apply_native_drawing',
      'harmony.vectorization.validate_drawing',
      'harmony.vectorization.compare_render',
      'harmony.vectorization.rollback'
    ];

    for (const toolName of required) {
      expect(getTool(toolName)).toBeDefined();
    }
  });

  it('runs analyze_image on valid test image', async () => {
    const analyzeTool = getTool('harmony.vectorization.analyze_image');
    const res: any = await analyzeTool.handler({ inputPath: testImgPath });

    expect(res.status).toBe('success');
    expect(res.recommendedMode).toBe('black_and_white_lineart');
  });

  it('runs preview and produces a preview token and scene state hash', async () => {
    const previewTool = getTool('harmony.vectorization.preview');

    const res: any = await previewTool.handler({
      inputPath: testImgPath,
      targetNode: 'Char_Drawing',
      targetDrawing: 'frame_1',
      targetFrame: 1,
      artLayer: 'line',
      vectorizationMode: 'black_and_white_lineart',
      qualityPreset: 'production',
      paletteMode: 'create_new_palette'
    });

    expect(res.status).toBe('success');
    expect(res.previewToken).toBeDefined();
    expect(res.previewHash).toBeDefined();
    expect(res.sceneStateHash).toBeDefined();
    expect(res.drawingStrokePIR).toBeDefined();
  });

  it('blocks apply_native_drawing when scene state hash mismatches', async () => {
    const previewTool = getTool('harmony.vectorization.preview');
    const applyTool = getTool('harmony.vectorization.apply_native_drawing');

    const previewRes: any = await previewTool.handler({
      inputPath: testImgPath,
      targetNode: 'Char_Drawing',
      targetDrawing: 'frame_1',
      targetFrame: 1,
      artLayer: 'line',
      vectorizationMode: 'black_and_white_lineart',
      qualityPreset: 'production',
      paletteMode: 'create_new_palette'
    });

    const applyRes: any = await applyTool.handler({
      confirmationToken: previewRes.previewToken,
      previewHash: previewRes.previewHash,
      sceneStateHash: 'mismatched_scene_state_hash',
      confirm: true,
      confirmationText: 'Я понимаю, что это действие изменит базу данных Harmony'
    });

    expect(applyRes.status).toBe('conflict_detected');
    expect(applyRes.expectedHash).toBe(previewRes.sceneStateHash);
  });

  it('successfully applies native drawing with matching confirmation token and scene state hash', async () => {
    const previewTool = getTool('harmony.vectorization.preview');
    const applyTool = getTool('harmony.vectorization.apply_native_drawing');

    const previewRes: any = await previewTool.handler({
      inputPath: testImgPath,
      targetNode: 'Char_Drawing',
      targetDrawing: 'frame_1',
      targetFrame: 1,
      artLayer: 'line',
      vectorizationMode: 'black_and_white_lineart',
      qualityPreset: 'production',
      paletteMode: 'create_new_palette'
    });

    const applyRes: any = await applyTool.handler({
      confirmationToken: previewRes.previewToken,
      previewHash: previewRes.previewHash,
      sceneStateHash: previewRes.sceneStateHash,
      confirm: true,
      confirmationText: 'Я понимаю, что это действие изменит базу данных Harmony',
      dryRun: false
    });

    expect(applyRes.status).toBe('success');
    expect(applyRes.evidenceBundlePath).toBeDefined();
    expect(fs.existsSync(applyRes.evidenceBundlePath)).toBe(true);
  });
});
