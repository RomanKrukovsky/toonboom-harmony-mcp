import fs from 'fs';
import path from 'path';
import { OnePromptEngine } from '../src/adapters/onePromptEngine/index.js';
import { studioPackageTools } from '../src/tools/studioPackageTools.js';

describe('Episode Package Pipeline & Studio MCP Tools', () => {
  const getTool = (name: string) => studioPackageTools.find(t => t.name === name)!;
  const testOutputDir = path.resolve(process.cwd(), 'output/test_studio_package');

  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  it('runs OnePromptEngine prompt analysis deterministically', () => {
    const engine = new OnePromptEngine();
    const analysis = engine.analyzePrompt({
      prompt: 'A sci-fi comedy episode with Professor Vex and Sam in space.',
      fps: 24,
      resolution: { width: 1920, height: 1080 }
    });

    expect(analysis.genre).toBe('sci-fi comedy');
    expect(analysis.estimatedSceneCount).toBeGreaterThanOrEqual(3);
    expect(analysis.candidateCharacters.length).toBeGreaterThanOrEqual(1);
  });

  it('runs harmony.production.generate_asset_checklist tool', async () => {
    const tool = getTool('harmony.production.generate_asset_checklist');
    const res = await tool.handler({
      characterSpecs: [
        { name: 'Professor Vex', requiredViews: ['front', 'side'], requiredMouthShapes: ['A', 'B'], assetBackend: 'ready' }
      ]
    });

    expect(res.status).toBe('success');
    expect(res.checklist.totalCharacters).toBe(1);
    expect(res.checklist.characterChecklist[0].character).toBe('Professor Vex');
  });

  it('runs harmony.production.generate_time_savings_report tool', async () => {
    const tool = getTool('harmony.production.generate_time_savings_report');
    const res = await tool.handler({
      sceneCount: 5,
      characterCount: 2,
      durationMinutes: 2
    });

    expect(res.status).toBe('success');
    expect(res.report.savedManHours).toBeGreaterThan(0);
    expect(res.report.efficiencyGainPercent).toBe(95);
  });

  it('runs harmony.production.build_review_package tool', async () => {
    const tool = getTool('harmony.production.build_review_package');
    const res = await tool.handler({
      packageDir: testOutputDir,
      outputDir: path.join(testOutputDir, 'review_pkg')
    });

    expect(res.status).toBe('success');
    expect(fs.existsSync(res.manifestPath)).toBe(true);
  });
});
