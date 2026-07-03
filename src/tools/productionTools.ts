import { z } from 'zod';
import { tracker } from '../adapters/sqliteTracker.js';
import { executeWithDryRun } from '../security.js';

export const productionTools = [
  {
    name: 'harmony.production.create',
    description: 'Инициализация нового рабочего пространства производства (сезона/проекта) в трекере.',
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
    name: 'harmony.production.create_episode',
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
    name: 'harmony.production.create_sequence',
    description: 'Добавление нового сиквенса (sequence) к указанному эпизоду.',
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
    name: 'harmony.production.create_shot',
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
    name: 'harmony.production.assign_task',
    description: 'Создание и назначение подзадачи для кадра.',
    inputSchema: z.object({
      shotId: z.number().describe('ID кадра.'),
      name: z.string().describe('Название задачи (например: Rough Animation, Clean Up, Colouring).'),
      assignedUserId: z.number().optional().describe('ID исполнителя.'),
      dueDate: z.string().optional().describe('Срок выполнения (YYYY-MM-DD).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('assign_task', args, args.dryRun, async () => {
        await tracker.initialize();
        const res = await tracker.createTask(args.shotId, args.name, args.assignedUserId, args.dueDate);
        return {
          status: 'success',
          task: res
        };
      });
    }
  },
  {
    name: 'harmony.production.set_status',
    description: 'Изменение статуса кадра или подзадачи в трекере.',
    inputSchema: z.object({
      entityType: z.enum(['shot', 'task']).describe('Тип объекта (shot или task).'),
      entityId: z.number().describe('ID объекта.'),
      status: z.string().describe('Новое значение статуса (например: In Progress, Completed, Approved).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('set_status', args, args.dryRun, async () => {
        await tracker.initialize();
        if (args.entityType === 'shot') {
          await tracker.updateShotStatus(args.entityId, args.status);
        } else {
          await tracker.updateTaskStatus(args.entityId, args.status);
        }
        return {
          status: 'success',
          message: `Статус ${args.entityType === 'shot' ? 'кадра' : 'задачи'} ${args.entityId} изменен на "${args.status}".`
        };
      });
    }
  },
  {
    name: 'harmony.production.get_status_report',
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
    name: 'harmony.production.audit_episode',
    description: 'Анализ состояния готовности кадров внутри указанного эпизода.',
    inputSchema: z.object({
      episodeId: z.number().describe('ID эпизода для проверки.')
    }),
    handler: async (args: { episodeId: number }) => {
      await tracker.initialize();
      const sequences = await tracker.listSequences(args.episodeId);
      const allShots = [];
      for (const seq of sequences) {
        const shots = await tracker.listShots(seq.id);
        allShots.push(...shots);
      }
      const pending = allShots.filter(s => s.status !== 'Approved' && s.status !== 'Completed');
      return {
        status: 'success',
        episodeId: args.episodeId,
        totalShots: allShots.length,
        pendingShotsCount: pending.length,
        pendingShots: pending.map(s => ({ id: s.id, name: s.name, status: s.status }))
      };
    }
  },
  {
    name: 'harmony.production.render_plan',
    description: 'Получение списка всех задач рендеринга в очереди.',
    inputSchema: z.object({}),
    handler: async () => {
      await tracker.initialize();
      const renders = await tracker.all('SELECT * FROM tasks WHERE name LIKE "Рендеринг%"');
      return {
        status: 'success',
        renders
      };
    }
  },
  {
    name: 'harmony.production.export_report',
    description: 'Экспорт полного отчета по иерархии производства в JSON.',
    inputSchema: z.object({}),
    handler: async () => {
      await tracker.initialize();
      const report = await tracker.generateProductionReport();
      return {
        status: 'success',
        report
      };
    }
  }
];
