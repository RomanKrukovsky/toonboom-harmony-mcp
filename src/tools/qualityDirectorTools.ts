import { z } from 'zod';
import { QualityDirector } from '../adapters/qualityDirector/index.js';

/**
 * qualityDirectorTools — review and score generated plans.
 */
export const qualityDirectorTools = [
  {
    name: 'harmony.quality.review_preview',
    description: 'Провести quality review всего episode package.',
    inputSchema: z.object({
      episodePlan: z.any(),
      shotList: z.array(z.any()).optional(),
      characterSpecs: z.array(z.any()).optional(),
      rig360Specs: z.array(z.any()).optional(),
      actingPlans: z.array(z.any()).optional(),
      cameraPlans: z.array(z.any()).optional(),
      fxPlans: z.array(z.any()).optional()
    }),
    handler: async (args: any) => {
      const qd = new QualityDirector();
      const reports = qd.reviewEpisode({
        episodePlan: args.episodePlan,
        shotList: args.shotList || [],
        characterSpecs: args.characterSpecs || [],
        rig360Specs: args.rig360Specs || [],
        actingPlans: args.actingPlans || [],
        cameraPlans: args.cameraPlans || [],
        fxPlans: args.fxPlans || []
      });
      return { status: 'success', reports, episodeScore: qd.scoreEpisode(reports) };
    }
  },

  {
    name: 'harmony.quality.review_scene_plan',
    description: 'Проверить одну сцену.',
    inputSchema: z.object({
      scene: z.any(),
      episodePlan: z.any().optional()
    }),
    handler: async (args: any) => {
      const qd = new QualityDirector();
      const report = qd.reviewScene(args.scene, { episodePlan: args.episodePlan });
      return { status: report.sceneScore >= 70 ? 'success' : 'partial_success', report };
    }
  },

  {
    name: 'harmony.quality.review_acting_plan',
    description: 'Проверить acting plan.',
    inputSchema: z.object({
      actingPlans: z.array(z.any())
    }),
    handler: async (args: any) => {
      const qd = new QualityDirector();
      return { status: 'success', report: qd.reviewActing(args.actingPlans) };
    }
  },

  {
    name: 'harmony.quality.review_rig',
    description: 'Проверить rig360 specs.',
    inputSchema: z.object({
      rig360Specs: z.array(z.any())
    }),
    handler: async (args: any) => {
      const qd = new QualityDirector();
      return { status: 'success', report: qd.reviewRigs(args.rig360Specs) };
    }
  },

  {
    name: 'harmony.quality.generate_fix_list',
    description: 'Сгенерировать список исправлений из review reports.',
    inputSchema: z.object({
      reports: z.array(z.any())
    }),
    handler: async (args: any) => {
      const qd = new QualityDirector();
      return { status: 'success', fixes: qd.generateFixList(args.reports) };
    }
  },

  {
    name: 'harmony.quality.score_scene',
    description: 'Оценить одну сцену.',
    inputSchema: z.object({
      scene: z.any(),
      episodePlan: z.any().optional()
    }),
    handler: async (args: any) => {
      const qd = new QualityDirector();
      return { status: 'success', score: qd.scoreScene(args.scene, { episodePlan: args.episodePlan }) };
    }
  },

  {
    name: 'harmony.quality.score_episode',
    description: 'Оценить весь эпизод.',
    inputSchema: z.object({
      reports: z.array(z.any())
    }),
    handler: async (args: any) => {
      const qd = new QualityDirector();
      return { status: 'success', score: qd.scoreEpisode(args.reports) };
    }
  }
];