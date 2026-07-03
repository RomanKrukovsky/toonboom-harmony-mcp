import fs from 'fs';
import { onePromptTools } from '../src/tools/onePromptTools.js';
import { characterGenerationTools } from '../src/tools/characterGenerationTools.js';
import { config } from '../src/config.js';
import { rig360GenerationTools } from '../src/tools/rig360GenerationTools.js';
import { actingTools } from '../src/tools/actingTools.js';
import { qualityDirectorTools } from '../src/tools/qualityDirectorTools.js';
import { seriesTools } from '../src/tools/seriesTools.js';
import { episodeAssemblyTools } from '../src/tools/episodeAssemblyTools.js';
import { LipsyncPlanner } from '../src/adapters/lipsyncPlanner/index.js';
import { BackgroundPlanner } from '../src/adapters/backgroundPlanner/index.js';
import { ScriptPlanner } from '../src/adapters/scriptPlanner/index.js';

describe('Moonshot tools registration', () => {
  test('onePrompt tools include main entry points', () => {
    const names = onePromptTools.map((t: any) => t.name);
    expect(names).toContain('harmony.oneprompt.analyze');
    expect(names).toContain('harmony.oneprompt.generate_production_package');
    expect(names).toContain('harmony.oneprompt.run_to_preview_episode');
    expect(names).toContain('harmony.oneprompt.run_to_final_package');
  });

  test('character tools generate spec', async () => {
    const tool = characterGenerationTools.find((t: any) => t.name === 'harmony.character.generate_spec');
    const res: any = await tool!.handler({ name: 'Vex', role: 'professor', personality: 'chaotic' });
    expect(res.status).toBe('success');
    expect(res.characterSpec.assetBackend).toBe('missing');
  });

  test('rig360 tools produce placeholder', async () => {
    const tool = rig360GenerationTools.find((t: any) => t.name === 'harmony.rig360.build_placeholder_rig');
    const characterSpec = {
      name: 'Vex',
      role: 'professor',
      personality: 'chaotic',
      visualStyle: 'sci-fi',
      bodyType: 'thin',
      requiredViews: ['front','side','back'],
      requiredExpressions: ['neutral'],
      requiredMouthShapes: ['A'],
      requiredHandPoses: ['open'],
      layerPlan: { head: ['skull'], body: ['torso'] }
    };
    const res: any = await tool!.handler({ characterSpec });
    expect(res.status).toBe('success');
    expect(res.placeholder.missingAssets.length).toBeGreaterThan(0);
  });

  test('acting analyze_dialogue', async () => {
    const tool = actingTools.find((t: any) => t.name === 'harmony.acting.analyze_dialogue');
    const res: any = await tool!.handler({ dialogue: 'What?! NO!!!' });
    expect(res.status).toBe('success');
    expect(['normal','fast','slow']).toContain(res.analysis.pace);
  });

  test('quality score_scene', async () => {
    const tool = qualityDirectorTools.find((t: any) => t.name === 'harmony.quality.score_scene');
    const res: any = await tool!.handler({ scene: { sceneId: 'SC_001', durationFrames: 120, characters: ['Hero'], location: 'lab', mood: 'rising' } });
    expect(res.status).toBe('success');
    expect(res.score.total).toBeGreaterThanOrEqual(0);
  });

  test('series run_episode_pipeline returns honest note', async () => {
    const tool = seriesTools.find((t: any) => t.name === 'harmony.series.run_episode_pipeline');
    const bible = {
      title: 'Test Show',
      logLine: 'Test log line',
      genre: 'comedy',
      tone: 'comedic',
      recurringCharacters: [{ name: 'Hero', role: 'hero', personality: 'brave', visualStyle: '', appearsInEpisodes: [] }],
      recurringLocations: ['lab'],
      episodeTitles: ['E01'],
      themes: ['friendship']
    };
    const res: any = await tool!.handler({ seriesBible: bible, episodeNumber: 1, mode: 'moonshot' });
    expect(res.note).toContain('not a replacement for human creative direction');
    expect(res.truth).toContain('Moonshot production package generated');
  });

  test('assembly build_scene_plans returns plans', async () => {
    const tool = episodeAssemblyTools.find((t: any) => t.name === 'harmony.assembly.build_scene_plans');
    const episodePlan = {
      episodeTitle: 'Test',
      durationMinutes: 1,
      fps: 24,
      scenes: [{ sceneId: 'SC_001', sceneName: 'intro', durationFrames: 144, startFrame: 0, endFrame: 144, characters: ['Hero'], location: 'lab' }]
    };
    const res: any = await tool!.handler({ episodePlan, characterSpecs: [{ name: 'Hero' }] });
    expect(res.status).toBe('success');
    expect(res.scenePlanCount).toBe(1);
  });

  test('rig360 build_from_assets reports missing assets honestly', async () => {
    const tool = rig360GenerationTools.find((t: any) => t.name === 'harmony.rig360.build_from_assets');
    const characterSpec = {
      name: 'Vex',
      requiredViews: ['front'],
      requiredExpressions: ['neutral'],
      requiredMouthShapes: ['A'],
      requiredHandPoses: ['open'],
      layerPlan: { head: ['skull'], body: ['torso'] }
    };
    const res: any = await tool!.handler({ characterSpec, assetPaths: {} });
    expect(res.status).toBe('partial_success');
    expect(res.realRigCreated).toBe(false);
    expect(res.placeholderRigCreated).toBe(true);
    expect(res.missingAssets.length).toBeGreaterThan(0);
  });

  test('rig360 build_from_assets can mark real rig when all assets provided', async () => {
    const tool = rig360GenerationTools.find((t: any) => t.name === 'harmony.rig360.build_from_assets');
    const characterSpec = {
      name: 'Vex',
      requiredViews: ['front'],
      requiredExpressions: ['neutral'],
      requiredMouthShapes: ['A'],
      requiredHandPoses: ['open'],
      layerPlan: { head: ['skull'], body: ['torso'] }
    };
    // Generate placeholder spec to know exact asset keys
    const placeholderTool = rig360GenerationTools.find((t: any) => t.name === 'harmony.rig360.generate_spec');
    const placeholder: any = await placeholderTool!.handler({ characterSpec });
    const assetPaths: Record<string, string> = {};
    for (const asset of placeholder.rig360Spec.requiredAssets) {
      assetPaths[`${asset.view}_${asset.layer}`] = `/fake/${asset.view}_${asset.layer}.png`;
    }
    const res: any = await tool!.handler({ characterSpec, assetPaths });
    expect(res.status).toBe('success');
    expect(res.realRigCreated).toBe(true);
    expect(res.placeholderRigCreated).toBe(false);
  });

  test('rig.generate_spec produces simple rig fallback', async () => {
    const tool = rig360GenerationTools.find((t: any) => t.name === 'harmony.rig.generate_spec');
    const characterSpec = {
      name: 'Vex',
      requiredViews: ['front'],
      requiredExpressions: ['neutral'],
      requiredMouthShapes: ['A'],
      requiredHandPoses: ['open'],
      layerPlan: { head: ['skull'], body: ['torso'] }
    };
    const res: any = await tool!.handler({ characterSpec });
    expect(res.status).toBe('success');
    expect(res.rigSpec.rigType).toBeDefined();
    expect(res.rigSpec.parts.length).toBeGreaterThan(0);
  });

  test('lipsync planner produces placeholder plan without audio', () => {
    const planner = new LipsyncPlanner();
    const scene = {
      sceneId: 'SC_001',
      sceneName: 'intro',
      durationFrames: 48,
      startFrame: 0,
      endFrame: 48,
      characters: ['Hero']
    };
    const plan = planner.generatePlanForScene(scene, 24);
    expect(plan.sceneId).toBe('SC_001');
    expect(plan.origin).toBe('placeholder');
    expect(plan.missingAssets).toContain('recorded dialogue audio');
    expect(plan.dialogues.length).toBeGreaterThan(0);
  });

  test('background planner generates placeholder plans for locations', () => {
    const planner = new BackgroundPlanner();
    const episodePlan = {
      episodeTitle: 'Test',
      durationMinutes: 1,
      fps: 24,
      scenes: [
        { sceneId: 'SC_001', durationFrames: 48, characters: ['Hero'], location: 'Lab' },
        { sceneId: 'SC_002', durationFrames: 48, characters: ['Hero'], location: 'Lab' },
        { sceneId: 'SC_003', durationFrames: 48, characters: ['Hero'], location: 'Street' }
      ]
    } as any;
    const plans = planner.generatePlans(episodePlan);
    expect(plans.length).toBe(2); // Lab and Street
    expect(plans[0].placeholder).toBe(true);
    expect(plans[0].layers.length).toBeGreaterThan(0);
  });

  test('script planner generates real dialogue per character role', () => {
    const planner = new ScriptPlanner();
    const episodePlan = {
      episodeTitle: 'Test',
      durationMinutes: 1,
      fps: 24,
      scenes: [
        { sceneId: 'SC_001', sceneName: 'intro', durationFrames: 96, characters: ['Professor Vex', 'Sam'], location: 'Lab', mood: 'rising' }
      ]
    } as any;
    const analysis = {
      candidateCharacters: [
        { name: 'Professor Vex', role: 'mad scientist mentor', oneLine: 'brilliant, chaotic' },
        { name: 'Sam', role: 'nervous student assistant', oneLine: 'tense' }
      ]
    };
    const script = planner.generateScript(episodePlan, analysis);
    const dialogue = script.scenes[0].dialogue;
    expect(dialogue.length).toBe(4);
    expect(dialogue[0].text).not.toContain('[placeholder');
    expect(dialogue.some((d: any) => d.speaker === 'Professor Vex')).toBe(true);
    expect(dialogue.some((d: any) => d.speaker === 'Sam')).toBe(true);
  });

  test('run_to_preview_episode in hybrid mode attempts autopilot dry-run', async () => {
    const tool = onePromptTools.find((t: any) => t.name === 'harmony.oneprompt.run_to_preview_episode');
    const res: any = await tool!.handler({
      prompt: 'A short test episode about a robot in a lab.',
      targetDurationMinutes: 1,
      mode: 'hybrid',
      outputDir: '/tmp/harmony_mcp_hybrid_test'
    });
    expect(res.autopilotAttempted).toBe(true);
    expect(res.autopilotResults.length).toBeGreaterThan(0);
    // All dry-run attempts should complete without real Harmony errors
    expect(res.autopilotResults.every((r: any) => r.status === 'completed')).toBe(true);
  });

  test('run_to_preview_episode produces preview render paths and scene plans', async () => {
    const tool = onePromptTools.find((t: any) => t.name === 'harmony.oneprompt.run_to_preview_episode');
    const res: any = await tool!.handler({
      prompt: 'A short test episode about a robot in a lab.',
      targetDurationMinutes: 1,
      mode: 'moonshot',
      outputDir: '/tmp/harmony_mcp_preview_paths_test'
    });
    expect(res.previewCount).toBeGreaterThan(0);
    expect(res.previewPaths.length).toBeGreaterThan(0);
    expect(res.scenePlanCount).toBeGreaterThan(0);
    expect(res.finalScore).toBeGreaterThanOrEqual(0);
    expect(res.truth).toContain('Moonshot production package generated');
  });

  describe('run_to_final_package human approval checkpoint', () => {
    const originalRequireHuman = config.onePromptIteration.requireHumanApprovalForFinal;

    beforeEach(() => {
      config.onePromptIteration.requireHumanApprovalForFinal = true;
    });

    afterAll(() => {
      config.onePromptIteration.requireHumanApprovalForFinal = originalRequireHuman;
    });

    test('blocks final lock without humanApproved=true', async () => {
      const tool = onePromptTools.find((t: any) => t.name === 'harmony.oneprompt.run_to_final_package');
      const res: any = await tool!.handler({
        prompt: 'A short test episode about a robot in a lab.',
        targetDurationMinutes: 1,
        outputDir: '/tmp/harmony_mcp_final_no_approve',
        humanApproved: false
      });
      expect(res.status).toBe('waiting_human_approval');
      expect(res.locked).toBe(false);
      expect(res.humanCheckpoint.required).toBe(true);
    });

    test('locks package when humanApproved=true', async () => {
      const tool = onePromptTools.find((t: any) => t.name === 'harmony.oneprompt.run_to_final_package');
      const res: any = await tool!.handler({
        prompt: 'A short test episode about a robot in a lab.',
        targetDurationMinutes: 1,
        outputDir: '/tmp/harmony_mcp_final_approved',
        humanApproved: true
      });
      expect(res.locked).toBe(true);
      expect(res.lockPath).toBeDefined();
      expect(fs.existsSync(res.lockPath)).toBe(true);
      expect(res.humanCheckpoint.required).toBe(false);
    });
  });
});
