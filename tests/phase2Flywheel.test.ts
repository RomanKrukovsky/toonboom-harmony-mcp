import fs from 'fs';
import path from 'path';
import { OpenRouterClient } from '../src/services/openRouterClient/index.js';
import { ArtistCorrectionEngine } from '../src/adapters/artistCorrectionEngine/index.js';
import { modelRouterTools } from '../src/tools/modelRouterTools.js';
import { aiStudioTools } from '../src/tools/aiStudioTools.js';

describe('Phase 2: AI Offline Fallback & Studio Flywheel Dataset Engine', () => {
  const outputDir = path.resolve(process.cwd(), 'output/flywheel_dataset');

  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  describe('2.1 Zero-Cost Offline Fallback Guarantees', () => {
    it('executes OpenRouterClient in offline fallback mode when no API key is provided', async () => {
      const client = new OpenRouterClient('');
      const response = await client.complete({
        prompt: 'Generate acting beat breakdown for character turnaround.'
      });

      expect(response.id).toMatch(/^(offline|fallback)/);
      expect(response.content).toContain('[OFFLINE FALLBACK MODE]');
      expect(response.usage?.totalTokens).toBe(0);
    });

    it('executes harmony.router.complete_prompt tool cleanly without network calls in fallback mode', async () => {
      const promptTool = modelRouterTools.find(t => t.name === 'harmony.router.complete_prompt');
      expect(promptTool).toBeDefined();

      const res: any = await (promptTool!.handler as any)({
        prompt: 'Analyze key poses for jump sequence.'
      });

      expect(res.status).toBe('success');
      expect(res.details.content).toContain('[OFFLINE FALLBACK MODE]');
    });

    it('returns model router selection deterministically', async () => {
      const selectTool = modelRouterTools.find(t => t.name === 'harmony.router.select_model');
      expect(selectTool).toBeDefined();

      const res: any = await (selectTool!.handler as any)({
        taskType: 'reasoning',
        priority: 'cost'
      });

      expect(res.status).toBe('success');
      expect(res.details.selectedProvider).toBe('openrouter/nvidia/nemotron-3-super:free');
    });
  });

  describe('2.2 Artist Correction Engine & Dataset Export Flywheel', () => {
    let engine: ArtistCorrectionEngine;
    const storageFile = path.join(outputDir, 'test_artist_corrections.json');

    beforeEach(() => {
      if (fs.existsSync(storageFile)) {
        fs.unlinkSync(storageFile);
      }
      engine = new ArtistCorrectionEngine(storageFile);
    });

    it('records artist correction delta with scope and affected frames', () => {
      const correction = engine.recordCorrection({
        sceneId: 'SCENE_001',
        versionBefore: 'v1.0',
        versionAfter: 'v1.1',
        delta: { Head_Rotation: { frame10: 15.0, frame20: 22.5 } },
        scope: 'key_poses',
        type: 'rotation',
        accepted: true,
        affectedParts: ['Head', 'Neck'],
        affectedFrames: [10, 20],
        comment: 'Adjusted head tilt for better eyeline alignment'
      });

      expect(correction.correctionId).toMatch(/^corr_/);
      expect(correction.scope).toBe('key_poses');
      expect(correction.affectedFrames).toEqual([10, 20]);
    });

    it('records pairwise preferences for taste model evaluation', () => {
      const preference = engine.recordPreference({
        sceneId: 'SCENE_001',
        versionA: 'var_director_a',
        versionB: 'var_director_b',
        preferredVersion: 'var_director_a',
        criteria: ['Better silhouette clarity', 'Stronger anticipation frame'],
        confidence: 0.95
      });

      expect(preference.preferenceId).toMatch(/^pref_/);
      expect(preference.preferredVersion).toBe('var_director_a');
    });

    it('exports studio flywheel dataset in JSON and JSONL formats', () => {
      // 1. Record correction & preference
      const corr = engine.recordCorrection({
        sceneId: 'SCENE_EXPORT',
        versionBefore: 'v1',
        versionAfter: 'v2',
        delta: { Arm_Rotation: 12.0 },
        scope: 'key_poses',
        type: 'rotation',
        accepted: true,
        affectedParts: ['Arm'],
        affectedFrames: [5]
      });

      engine.generateTrainingSample(
        'SCENE_EXPORT',
        corr.correctionId,
        { pose: 'raw' },
        { pose: 'corrected' }
      );

      engine.recordPreference({
        sceneId: 'SCENE_EXPORT',
        versionA: 'vA',
        versionB: 'vB',
        preferredVersion: 'vA',
        criteria: ['Superior staging'],
        confidence: 1.0
      });

      // 2. Export JSON
      const jsonPath = path.join(outputDir, 'export_dataset.json');
      const jsonRes = engine.exportDataset({
        sceneIds: ['SCENE_EXPORT'],
        outputPath: jsonPath,
        format: 'json',
        includeCorrections: true,
        includePreferences: true,
        includeCriticReports: false,
        privacyLevel: 'studio_only'
      });

      expect(jsonRes.count).toBeGreaterThan(0);
      expect(fs.existsSync(jsonPath)).toBe(true);

      // 3. Export JSONL
      const jsonlPath = path.join(outputDir, 'export_dataset.jsonl');
      const jsonlRes = engine.exportDataset({
        sceneIds: ['SCENE_EXPORT'],
        outputPath: jsonlPath,
        format: 'jsonl',
        includeCorrections: true,
        includePreferences: true,
        includeCriticReports: false,
        privacyLevel: 'studio_only'
      });

      expect(jsonlRes.count).toBeGreaterThan(0);
      expect(fs.existsSync(jsonlPath)).toBe(true);
      const lines = fs.readFileSync(jsonlPath, 'utf-8').trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('executes harmony.ai_studio.record_artist_correction tool cleanly', async () => {
      const tool = aiStudioTools.find(t => t.name === 'harmony.ai_studio.record_artist_correction');
      expect(tool).toBeDefined();

      const res: any = await (tool!.handler as any)({
        sceneId: 'SCENE_TOOL',
        versionBefore: 'v1.0',
        versionAfter: 'v1.1',
        delta: { Arm_Flex: 10 },
        scope: 'key_poses',
        type: 'rotation',
        accepted: true,
        affectedParts: ['Arm'],
        affectedFrames: [1, 2, 3]
      });

      expect(res.status).toBe('success');
      expect(res.correctionId).toBeDefined();
    });
  });
});
