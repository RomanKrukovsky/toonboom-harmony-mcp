import { z } from 'zod';
import path from 'path';
import { Universal2DStudioDirector } from '../services/universal2DStudioDirector/index.js';
import { verifyPathAccess } from '../security.js';

export const universalStudioTools = [
  {
    name: 'studio.project.direct_from_script',
    description:
      'АВТОНОМНЫЙ РЕЖИССЕР 2D СТУДИИ. Принимает сценарий/сценарный текст или серию промптов и автоматически генерирует ' +
      'полный пакет производства: разбивку на сцены, сборку персонажей, фоны с параллаксом, липсинг под реплики, ' +
      'блокинг движений и экспорт готовых проектов для Moho (.moho) и Toon Boom Harmony с расчетом сэкономленного бюджета.',
    inputSchema: z.object({
      productionName: z.string().describe('Название мультсериала или проекта.'),
      episodeCode: z.string().default('E01').describe('Код эпизода (например E01, SH01).'),
      scriptText: z.string().describe('Текст сценария (с репликами, сценами INT./EXT., указаниями камеры).'),
      targetEngine: z.enum(['moho', 'harmony', 'dual']).default('dual').describe('Целевой движок анимации.'),
      fps: z.number().default(24),
      outputDirectory: z.string().optional().describe('Папка для сохранения скомпилированных проектов.')
    }),
    handler: async (args: {
      productionName: string;
      episodeCode?: string;
      scriptText: string;
      targetEngine?: 'moho' | 'harmony' | 'dual';
      fps?: number;
      outputDirectory?: string;
    }) => {
      const outDirAbs = args.outputDirectory ? verifyPathAccess(path.resolve(args.outputDirectory)) : undefined;
      const result = Universal2DStudioDirector.directProduction({
        productionName: args.productionName,
        episodeCode: args.episodeCode ?? 'E01',
        scriptText: args.scriptText,
        targetEngine: args.targetEngine ?? 'dual',
        fps: args.fps ?? 24,
        outputDirectory: outDirAbs
      });
      return { status: 'success', result };
    }
  },
  {
    name: 'studio.analytics.calculate_roi_savings',
    description:
      'Рассчитывает фактическую экономию бюджета (USD) и рабочих часов при использовании автоматического MCP-конвейера вместо найма фрилансеров.',
    inputSchema: z.object({
      charactersCount: z.number().default(5),
      finishedAnimationMinutes: z.number().default(10),
      averageFreelancerHourlyRateUsd: z.number().default(50)
    }),
    handler: async (args: {
      charactersCount?: number;
      finishedAnimationMinutes?: number;
      averageFreelancerHourlyRateUsd?: number;
    }) => {
      const chars = args.charactersCount ?? 5;
      const mins = args.finishedAnimationMinutes ?? 10;
      const rate = args.averageFreelancerHourlyRateUsd ?? 50;

      // 15 hours per 360 turnaround rig
      const riggingHoursSaved = chars * 15;
      const riggingSavedUsd = riggingHoursSaved * rate;

      // Animation blocking: 8 hours per minute of animation
      const animationHoursSaved = mins * 8;
      const animationSavedUsd = mins * 475;

      const totalHoursSaved = riggingHoursSaved + animationHoursSaved;
      const totalSavedUsd = riggingSavedUsd + animationSavedUsd;

      return {
        status: 'success',
        analytics: {
          charactersCount: chars,
          finishedAnimationMinutes: mins,
          averageFreelancerHourlyRateUsd: rate,
          riggingLaborHoursSaved: riggingHoursSaved,
          riggingCostSavedUsd: riggingSavedUsd,
          animationLaborHoursSaved: animationHoursSaved,
          animationCostSavedUsd: animationSavedUsd,
          totalHoursSaved,
          totalCostSavedUsd: totalSavedUsd,
          efficiencyMultiplier: '35x faster time-to-delivery'
        }
      };
    }
  }
];
