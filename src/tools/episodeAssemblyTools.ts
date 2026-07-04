import { z } from 'zod';
import { EpisodeAssembler } from '../adapters/episodeAssembler/index.js';

/**
 * episodeAssemblyTools — assemble episode plans into editable
 * Harmony scene plans and render plans.
 */
export const episodeAssemblyTools = [
  {
    name: 'harmony.assembly.build_scene_plans',
    description: 'Сконвертировать episodePlan в набор scene_plan.json для Autopilot.',
    inputSchema: z.object({
      episodePlan: z.any(),
      characterSpecs: z.array(z.any()),
      cameraPlans: z.array(z.any()).optional(),
      fxPlans: z.array(z.any()).optional()
    }),
    handler: async (args: any) => {
      const assembler = new EpisodeAssembler();
      const plans = assembler.assembleScenePlans(args.episodePlan, args.characterSpecs, args.cameraPlans || [], args.fxPlans || []);
      return { status: 'success', scenePlanCount: plans.length, scenePlans: plans };
    }
  },

  {
    name: 'harmony.assembly.generate_render_plan',
    description: 'Создать render_plan.json для эпизода.',
    inputSchema: z.object({
      episodePlan: z.any(),
      cameraPlans: z.array(z.any()).optional(),
      fxPlans: z.array(z.any()).optional()
    }),
    handler: async (args: any) => {
      const assembler = new EpisodeAssembler();
      const plan = assembler.generateRenderPlan(args.episodePlan, args.cameraPlans || [], args.fxPlans || []);
      return { status: 'success', renderPlan: plan };
    }
  },

  {
    name: 'harmony.episode.build_review_package',
    description: 'Собрать final_package c previews, final_render, и отчётами.',
    inputSchema: z.object({
      packageInput: z.any().describe('Объект production package для сборки.'),
      outputDir: z.string().optional()
    }),
    handler: async (args: any) => {
      const { FinalPackager } = await import('../adapters/finalPackage/index.js');
      const packager = new FinalPackager();
      const res = packager.assemble(args.packageInput, args.outputDir);
      return {
        status: 'success',
        packagePath: res.packagePath,
        manifestPath: res.manifestPath,
        summary: res.summary
      };
    }
  }
];