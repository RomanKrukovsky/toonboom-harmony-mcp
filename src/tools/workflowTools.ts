import { z } from 'zod';
import { tracker } from '../adapters/sqliteTracker.js';
import { executeWithDryRun } from '../security.js';

export const workflowTools = [
  {
    name: 'harmony.workflow.create_production',
    description: 'Инициализация нового рабочего пространства производства в трекере.',
    inputSchema: z.object({
      name: z.string().describe('Название производства (проекта/сезона).'),
      description: z.string().optional(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('create_production', args, args.dryRun, async () => {
        await tracker.initialize();
        const res = await tracker.createProduction(args.name, args.description);
        return {
          status: 'success',
          production: res
        };
      });
    }
  },
  {
    name: 'harmony.workflow.create_episode',
    description: 'Добавление нового эпизода к проекту производства.',
    inputSchema: z.object({
      productionId: z.number().describe('ID родительского проекта производства.'),
      name: z.string().describe('Название/Код эпизода (например: EP101).'),
      description: z.string().optional(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('create_episode', args, args.dryRun, async () => {
        await tracker.initialize();
        const res = await tracker.createEpisode(args.productionId, args.name, args.description);
        return {
          status: 'success',
          episode: res
        };
      });
    }
  },
  {
    name: 'harmony.workflow.create_sequence',
    description: 'Добавление новой сцены/сиквенса (sequence) к указанному эпизоду.',
    inputSchema: z.object({
      episodeId: z.number().describe('ID родительского эпизода.'),
      name: z.string().describe('Название/Код сиквенса (например: SEQ01).'),
      description: z.string().optional(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('create_sequence', args, args.dryRun, async () => {
        await tracker.initialize();
        const res = await tracker.createSequence(args.episodeId, args.name, args.description);
        return {
          status: 'success',
          sequence: res
        };
      });
    }
  },
  {
    name: 'harmony.workflow.create_shot',
    description: 'Добавление кадра (shot) к сиквенсу с привязками к окружениям/проектам Harmony.',
    inputSchema: z.object({
      sequenceId: z.number().describe('ID родительского сиквенса.'),
      name: z.string().describe('Название/Код кадра (например: SH010).'),
      description: z.string().optional(),
      harmonyEnv: z.string().optional().describe('Связанное окружение в Harmony Server.'),
      harmonyJob: z.string().optional().describe('Связанный проект (job) в Harmony Server.'),
      harmonyScene: z.string().optional().describe('Связанная сцена в Harmony Server.'),
      harmonyVersion: z.number().optional().describe('Связанная версия сцены.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('create_shot', args, args.dryRun, async () => {
        await tracker.initialize();
        const res = await tracker.createShot(args.sequenceId, args.name, args.description);
        if (args.harmonyEnv || args.harmonyJob || args.harmonyScene || args.harmonyVersion) {
          await tracker.linkHarmony(
            res.id,
            args.harmonyEnv || '',
            args.harmonyJob || '',
            args.harmonyScene || '',
            args.harmonyVersion || 1
          );
          res.harmony_env = args.harmonyEnv;
          res.harmony_job = args.harmonyJob;
          res.harmony_scene = args.harmonyScene;
          res.harmony_version = args.harmonyVersion;
        }
        return {
          status: 'success',
          shot: res
        };
      });
    }
  },
  {
    name: 'harmony.workflow.assign_status',
    description: 'Изменение статуса кадра или подзадачи в трекере.',
    inputSchema: z.object({
      entityType: z.enum(['shot', 'task']).describe('Тип объекта (shot или task).'),
      entityId: z.number().describe('ID объекта.'),
      status: z.string().describe('Новое значение статуса (например: In Progress, Completed, Approved).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('assign_status', args, args.dryRun, async () => {
        await tracker.initialize();
        if (args.entityType === 'shot') {
          await tracker.updateShotStatus(args.entityId, args.status);
        } else {
          await tracker.updateTaskStatus(args.entityId, args.status);
        }
        return {
          status: 'success',
          message: `Статус ${args.entityType === 'shot' ? 'кадра' : 'задачи'} ${args.entityId} успешно изменен на "${args.status}"`
        };
      });
    }
  },
  {
    name: 'harmony.workflow.get_status_report',
    description: 'Получение сводного структурированного отчета по статусам всех задач и кадров.',
    inputSchema: z.object({}),
    handler: async () => {
      await tracker.initialize();
      const report = await tracker.getStatusReport();
      return {
        status: 'success',
        report
      };
    }
  },
  {
    name: 'harmony.workflow.generate_production_report',
    description: 'Генерация полного иерархического отчета производства (проекты -> эпизоды -> сиквенсы -> кадры).',
    inputSchema: z.object({}),
    handler: async () => {
      await tracker.initialize();
      const report = await tracker.generateProductionReport();
      return {
        status: 'success',
        productions: report
      };
    }
  }
];
