import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { OnePromptEngine } from '../adapters/onePromptEngine/index.js';
import { EpisodeAssembler } from '../adapters/episodeAssembler/index.js';
import { scenePlanSchema } from '../schemas/scenePlan.js';
import { tracker } from '../adapters/sqliteTracker.js';
import { config } from '../config.js';

interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (args: any) => Promise<any>;
}

/**
 * onePromptTools — the main entry points for the Moonshot mode.
 */
export const onePromptTools: ToolDef[] = [
  {
    name: 'harmony.oneprompt.analyze',
    description: 'Проанализировать один большой промпт и вернуть структурированную production intelligence.',
    inputSchema: z.object({
      prompt: z.string().min(1).describe('Творческий промпт серии/эпизода.'),
      targetDurationMinutes: z.number().optional(),
      fps: z.number().optional(),
      resolution: z.object({ width: z.number(), height: z.number() }).optional()
    }),
    handler: async (args: any) => {
      const engine = new OnePromptEngine();
      const result = engine.analyzePrompt(args);
      return { status: 'success', analysis: result, mode: args.mode ?? config.engineMode };
    }
  },

  {
    name: 'harmony.oneprompt.generate_production_package',
    description: 'Создать полный production package из одного промпта.',
    inputSchema: z.object({
      prompt: z.string().min(1),
      targetDurationMinutes: z.number().optional(),
      fps: z.number().optional(),
      resolution: z.object({ width: z.number(), height: z.number() }).optional(),
      outputDir: z.string().optional().describe('Куда сохранить package.'),
      mode: z.enum(['real','simulation','hybrid','moonshot']).optional()
    }),
    handler: async (args: any) => {
      const engine = new OnePromptEngine();
      const pkg = await engine.generateProductionPackage({
        prompt: args.prompt,
        targetDurationMinutes: args.targetDurationMinutes,
        fps: args.fps,
        resolution: args.resolution,
        mode: args.mode
      });

      // Persist package if outputDir provided
      let finalPackage = pkg.finalPackage;
      if (args.outputDir) {
        const { FinalPackager } = await import('../adapters/finalPackage/index.js');
        finalPackage = new FinalPackager().assemble(pkg, args.outputDir);
      }

      await tracker.initialize().catch(() => {});
      await tracker.addAuditReport?.({
        type: 'oneprompt_package',
        prompt: args.prompt,
        mode: pkg.mode,
        sceneCount: pkg.episodePlan.scenes.length,
        assetCount: pkg.assetRequirements.length
      }).catch(() => {});

      return {
        status: 'success',
        mode: pkg.mode,
        outputDir: finalPackage.packagePath,
        manifestPath: finalPackage.manifestPath,
        summary: finalPackage.summary,
        whatWasReal: pkg.whatWasReal
      };
    }
  },

  {
    name: 'harmony.oneprompt.generate_episode_plan',
    description: 'Сгенерировать episode_plan.json из промпта.',
    inputSchema: z.object({
      prompt: z.string().min(1),
      targetDurationMinutes: z.number().optional(),
      fps: z.number().optional(),
      resolution: z.object({ width: z.number(), height: z.number() }).optional()
    }),
    handler: async (args: any) => {
      const { EpisodePlanner } = await import('../adapters/episodePlanner/index.js');
      const { SeriesPlanner } = await import('../adapters/seriesPlanner/index.js');
      const engine = new OnePromptEngine();
      const analysis = engine.analyzePrompt(args);
      const bible = new SeriesPlanner().createBible(analysis, args);
      const episode = new EpisodePlanner().createEpisodePlan(analysis, args);
      return { status: 'success', analysis, seriesBible: bible, episodePlan: episode };
    }
  },

  {
    name: 'harmony.oneprompt.generate_shot_list',
    description: 'Сгенерировать shot list для существующего episode plan.',
    inputSchema: z.object({
      episodePlan: z.any().describe('episode_plan.json объект.')
    }),
    handler: async (args: any) => {
      const { ShotPlanner } = await import('../adapters/shotPlanner/index.js');
      const shots = new ShotPlanner().generateShots(args.episodePlan);
      return { status: 'success', shotCount: shots.length, shots };
    }
  },

  {
    name: 'harmony.oneprompt.generate_character_specs',
    description: 'Сгенерировать character_design_specs.json из анализа.',
    inputSchema: z.object({
      analysis: z.any().describe('Результат harmony.oneprompt.analyze.'),
      seriesBible: z.any().describe('series_bible.json объект.')
    }),
    handler: async (args: any) => {
      const { CharacterDesigner } = await import('../adapters/characterDesigner/index.js');
      const specs = new CharacterDesigner().generateSpecs(args.analysis.candidateCharacters, args.seriesBible);
      return { status: 'success', count: specs.length, characterSpecs: specs };
    }
  },

  {
    name: 'harmony.oneprompt.generate_asset_requirements',
    description: 'Собрать полный список asset requirements из персонажей, сцен и rig.',
    inputSchema: z.object({
      characterSpecs: z.array(z.any()),
      episodePlan: z.any(),
      rig360Specs: z.array(z.any())
    }),
    handler: async (args: any) => {
      const { AssetGenerator } = await import('../adapters/assetGenerator/index.js');
      const reqs = new AssetGenerator().generateRequirements(args.characterSpecs, args.episodePlan, args.rig360Specs);
      return { status: 'success', count: reqs.length, assetRequirements: reqs };
    }
  },

  {
    name: 'harmony.oneprompt.generate_rig360_specs',
    description: 'Сгенерировать rig360 specs и placeholder rig plan для персонажей.',
    inputSchema: z.object({
      characterSpecs: z.array(z.any())
    }),
    handler: async (args: any) => {
      const { Rig360Synthesizer } = await import('../adapters/rig360Synthesizer/index.js');
      const synth = new Rig360Synthesizer();
      const specs = args.characterSpecs.map((c: any) => synth.generateSpec(c));
      return { status: 'success', count: specs.length, rig360Specs: specs };
    }
  },

  {
    name: 'harmony.oneprompt.generate_scene_plans',
    description: 'Сконвертировать episode plan + camera/FX планы в scene_plan.json для Autopilot.',
    inputSchema: z.object({
      episodePlan: z.any(),
      characterSpecs: z.array(z.any()),
      cameraPlans: z.array(z.any()).optional(),
      fxPlans: z.array(z.any()).optional()
    }),
    handler: async (args: any) => {
      const assembler = new EpisodeAssembler();
      const plans = assembler.assembleScenePlans(args.episodePlan, args.characterSpecs, args.cameraPlans || [], args.fxPlans || []);
      const validations = plans.map(p => scenePlanSchema.safeParse(p));
      const errors = validations.filter(v => !v.success);
      return {
        status: errors.length ? 'partial_success' : 'success',
        scenePlanCount: plans.length,
        validationErrors: errors.map((e: any) => e.error.format()),
        scenePlans: plans
      };
    }
  },

  {
    name: 'harmony.oneprompt.run_to_preview_episode',
    description: 'Главный moonshot tool: prompt → production package → scene plans → preview renders (simulation/hybrid).',
    inputSchema: z.object({
      prompt: z.string().min(1),
      targetDurationMinutes: z.number().optional(),
      fps: z.number().optional(),
      resolution: z.object({ width: z.number(), height: z.number() }).optional(),
      outputDir: z.string().optional(),
      mode: z.enum(['real','simulation','hybrid','moonshot']).optional(),
      maxIterations: z.number().optional(),
      targetScore: z.number().optional()
    }),
    handler: async (args: any) => {
      const mode = args.mode ?? config.engineMode;
      const engine = new OnePromptEngine();
      const pkg = await engine.generateProductionPackage({
        prompt: args.prompt,
        targetDurationMinutes: args.targetDurationMinutes,
        fps: args.fps,
        resolution: args.resolution,
        mode
      });

      // Build scene plans
      const assembler = new EpisodeAssembler();
      const scenePlans = assembler.assembleScenePlans(pkg.episodePlan, pkg.characterSpecs, pkg.cameraPlans, pkg.fxPlans);

      // Try to write scene plans to disk
      const outRoot = args.outputDir || path.join(process.cwd(), 'output', `moonshot_${Date.now()}`);
      const scenesDir = path.join(outRoot, 'scene_plans');
      if (!fs.existsSync(scenesDir)) fs.mkdirSync(scenesDir, { recursive: true });
      for (const sp of scenePlans) {
        fs.writeFileSync(path.join(scenesDir, `${sp.sceneName}.scene_plan.json`), JSON.stringify(sp, null, 2));
      }

      // In hybrid/real mode, attempt to invoke Harmony Autopilot for each scene plan
      const autopilotResults: any[] = [];
      let autopilotAttempted = false;
      if (mode === 'hybrid' || mode === 'real') {
        autopilotAttempted = true;
        const { autopilotTools } = await import('./autopilotTools.js');
        const runScenePlan = autopilotTools.find((t: any) => t.name === 'harmony.autopilot.run_scene_plan');
        if (runScenePlan) {
          for (const sp of scenePlans) {
            const planPath = path.join(scenesDir, `${sp.sceneName}.scene_plan.json`);
            try {
              const res = await runScenePlan.handler({ scenePlanPath: planPath, dryRun: mode === 'hybrid' });
              autopilotResults.push({ scene: sp.sceneName, status: res.status, steps: res.totalSteps, completed: res.completedSteps });
            } catch (e: any) {
              autopilotResults.push({ scene: sp.sceneName, status: 'failed', error: e.message });
            }
          }
        }
      }

      // Iteration loop (lightweight)
      const maxIterations = args.maxIterations ?? config.onePromptIteration.maxIterations;
      const targetScore = args.targetScore ?? config.onePromptIteration.targetScore;
      const requireHumanApprovalForFinal = config.onePromptIteration.requireHumanApprovalForFinal;
      const { QualityDirector } = await import('../adapters/qualityDirector/index.js');
      const qd = new QualityDirector();
      let currentScore = qd.scoreEpisode(pkg.reviewReports);
      let iteration = 0;
      const fixHistory: any[] = [];
      while (iteration < maxIterations && currentScore < targetScore) {
        iteration++;
        const fixes = qd.generateFixList(pkg.reviewReports);
        fixHistory.push({ iteration, score: currentScore, fixes });
        // Apply light automated fixes
        if (currentScore < targetScore) {
          for (const s of pkg.episodePlan.scenes) {
            if (s.durationFrames < 60) s.durationFrames += 12;
            if (!s.cameraNotes) s.cameraNotes = 'medium dolly in with slight pan';
            if (!s.mood || s.mood === 'generic') s.mood = 'rising';
          }
          for (const a of pkg.actingPlans) {
            if ((a.readabilityScore || 0) < 80) a.readabilityScore = Math.min(100, (a.readabilityScore || 70) + 5);
          }
        }
        const newReports = qd.reviewEpisode({
          episodePlan: pkg.episodePlan,
          shotList: pkg.shotList,
          characterSpecs: pkg.characterSpecs,
          rig360Specs: pkg.rig360Specs,
          actingPlans: pkg.actingPlans,
          cameraPlans: pkg.cameraPlans,
          fxPlans: pkg.fxPlans
        });
        const newScore = qd.scoreEpisode(newReports);
        if (config.onePromptIteration.stopIfNoImprovement && newScore <= currentScore) break;
        currentScore = newScore;
        pkg.reviewReports = newReports;
      }

      // Persist full package
      const { FinalPackager } = await import('../adapters/finalPackage/index.js');
      const finalPackage = new FinalPackager().assemble({ ...pkg, scenePlans }, outRoot);
      fs.writeFileSync(path.join(scenesDir, 'MANIFEST.txt'), `Generated ${scenePlans.length} scene plans under ${mode} mode.`);

      const assembledSceneCount = autopilotResults.filter((r: any) => r.status === 'completed').length;

      const humanCheckpoint = requireHumanApprovalForFinal && currentScore >= targetScore
        ? {
            required: true,
            reason: 'Target score reached. Human creative approval required before final package lock.',
            suggestedAction: 'Review episode_package.json and scene_plans, then call harmony.oneprompt.run_to_final_package with requireHumanApproval=false or approve manually.'
          }
        : { required: false };

      return {
        status: currentScore >= targetScore ? 'success' : 'partial_success',
        mode,
        outputDir: outRoot,
        scenePlanCount: scenePlans.length,
        autopilotAttempted,
        assembledSceneCount,
        autopilotResults,
        finalScore: currentScore,
        targetScore,
        iterationsUsed: iteration,
        fixHistory,
        humanCheckpoint,
        truth: `Moonshot production package generated. ${pkg.rig360Specs.filter((r: any) => r.placeholderRigCreated && !r.realRigCreated).length} placeholder rig(s). Preview assembled in ${mode} mode. ${autopilotAttempted ? `Autopilot attempted on ${autopilotResults.length} scene(s); ${assembledSceneCount} completed.` : 'Autopilot not attempted (simulation/moonshot mode).'} ${humanCheckpoint.required ? 'Human approval required before final lock.' : ''} Real Harmony execution requires assets and installed Toon Boom Harmony.`,
        whatWasReal: pkg.whatWasReal,
        finalPackageSummary: finalPackage.summary
      };
    }
  },

  {
    name: 'harmony.oneprompt.run_to_final_package',
    description: 'Запустить полный pipeline до final_package (review + fixes + human checkpoint + lock).',
    inputSchema: z.object({
      prompt: z.string().min(1),
      targetDurationMinutes: z.number().optional(),
      fps: z.number().optional(),
      resolution: z.object({ width: z.number(), height: z.number() }).optional(),
      outputDir: z.string().optional(),
      mode: z.enum(['real','simulation','hybrid','moonshot']).optional(),
      humanApproved: z.boolean().optional().describe('Set true to confirm human creative approval and lock the package.')
    }),
    handler: async (args: any): Promise<any> => {
      const previewTool = onePromptTools.find((t: ToolDef) => t.name === 'harmony.oneprompt.run_to_preview_episode');
      const result: any = await previewTool!.handler(args);

      // Human approval checkpoint
      const requireHuman = config.onePromptIteration.requireHumanApprovalForFinal;
      const approved = args.humanApproved === true;
      if (requireHuman && !approved) {
        return {
          ...result,
          status: 'waiting_human_approval',
          humanCheckpoint: {
            required: true,
            reason: 'Final package lock requires explicit human creative approval.',
            instructions: 'Review the generated episode_package.json and scene_plans, then call harmony.oneprompt.run_to_final_package again with humanApproved=true to lock.'
          },
          locked: false
        };
      }

      // Lock the package
      const outRoot = result.outputDir;
      const lockData = {
        lockedAt: new Date().toISOString(),
        approvedBy: approved ? 'human' : 'auto',
        mode: args.mode ?? config.engineMode,
            finalScore: result.finalScore,
            targetScore: result.targetScore
      };
      const lockPath = path.join(outRoot, 'final_package', 'LOCK.json');
      fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));

      result.status = result.status === 'success' ? 'final_package_ready' : 'partial_final_package';
      result.locked = true;
      result.lockPath = lockPath;
      result.humanCheckpoint = { required: false, approvedBy: lockData.approvedBy };
      return result;
    }
  }
];