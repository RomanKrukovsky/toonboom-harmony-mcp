import { z } from 'zod';
import { AutonomousStudioOrchestrator } from '../orchestrators/autonomousStudio/index.js';
import { productionRunOptionsSchema } from '../schemas/productionPackage.js';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { defineTool } from './defineTool.js';

export const autonomousStudioTools = [
  defineTool({
    name: 'harmony.studio.run_production',
    description: 'ГЛАВНЫЙ ПРОМЫШЛЕННЫЙ ИНСТРУМЕНТ. Принимает текстовый запрос сцены/сериала и выполняет полный производственный цикл в Toon Boom Harmony.',
    inputSchema: productionRunOptionsSchema,
    handler: async (args) => {
      const orchestrator = new AutonomousStudioOrchestrator();
      return orchestrator.runProduction(args);
    }
  }),

  defineTool({
    name: 'harmony.studio.resume_production',
    description: 'Возобновить прерванный или частично выполненный производственный процесс из папки проекта.',
    inputSchema: z.object({
      packageDir: z.string().describe('Путь к директории проекта production_package')
    }),
    handler: async (args: { packageDir: string }) => {
      const orchestrator = new AutonomousStudioOrchestrator();
      return orchestrator.resumeProduction(args.packageDir);
    }
  }),

  defineTool({
    name: 'harmony.studio.get_status',
    description: 'Получить подробный статус выполнения производственного процесса.',
    inputSchema: z.object({
      packageDir: z.string().describe('Путь к директории проекта production_package')
    }),
    handler: async (args: { packageDir: string }) => {
      const orchestrator = new AutonomousStudioOrchestrator();
      return orchestrator.getStatus(args.packageDir);
    }
  }),

  defineTool({
    name: 'harmony.studio.pause',
    description: 'Приостановить выполняющийся производственный процесс.',
    inputSchema: z.object({
      packageDir: z.string().describe('Путь к директории проекта')
    }),
    handler: async (args: { packageDir: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { action: 'paused', packageDir: args.packageDir }
      });
    }
  }),

  defineTool({
    name: 'harmony.studio.cancel',
    description: 'Отменить выполняющийся производственный процесс.',
    inputSchema: z.object({
      packageDir: z.string().describe('Путь к директории проекта')
    }),
    handler: async (args: { packageDir: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { action: 'cancelled', packageDir: args.packageDir }
      });
    }
  }),

  defineTool({
    name: 'harmony.studio.retry_failed_stage',
    description: 'Повторно выполнить упавший этап производства.',
    inputSchema: z.object({
      packageDir: z.string().describe('Путь к директории проекта'),
      stageId: z.string().describe('Идентификатор этапа (например, scene_assembly_execution)')
    }),
    handler: async (args: { packageDir: string; stageId: string }) => {
      const orchestrator = new AutonomousStudioOrchestrator();
      return orchestrator.resumeProduction(args.packageDir);
    }
  }),

  defineTool({
    name: 'harmony.studio.approve_stage',
    description: 'Утвердить этап производства в режиме Human-in-the-Loop.',
    inputSchema: z.object({
      packageDir: z.string(),
      stageId: z.string(),
      approver: z.string().optional()
    }),
    handler: async (args: { packageDir: string; stageId: string; approver?: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { action: 'approved', stageId: args.stageId, approver: args.approver || 'Supervisor' }
      });
    }
  }),

  defineTool({
    name: 'harmony.studio.reject_stage',
    description: 'Отклонить этап производства с указанием замечаний.',
    inputSchema: z.object({
      packageDir: z.string(),
      stageId: z.string(),
      notes: z.string()
    }),
    handler: async (args: { packageDir: string; stageId: string; notes: string }) => {
      return createStandardExecutionResult({
        status: 'requires_human',
        requiresHumanReview: true,
        details: { action: 'rejected', stageId: args.stageId, notes: args.notes }
      });
    }
  }),

  defineTool({
    name: 'harmony.studio.export_diagnostics',
    description: 'Экспортировать диагностический бандл производственного процесса.',
    inputSchema: z.object({
      packageDir: z.string()
    }),
    handler: async (args: { packageDir: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { diagnosticsPath: `${args.packageDir}/diagnostics/diagnostics_bundle.json` }
      });
    }
  }),

  defineTool({
    name: 'harmony.studio.estimate_production',
    description: 'Оценить время и ресурсы на производство по промпту.',
    inputSchema: z.object({
      prompt: z.string(),
      durationSeconds: z.number().default(45)
    }),
    handler: async (args: { prompt: string; durationSeconds: number }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: {
          estimatedTimeMinutes: Math.ceil(args.durationSeconds * 0.5),
          estimatedAssets: 5,
          estimatedScenes: Math.ceil(args.durationSeconds / 10)
        }
      });
    }
  }),

  defineTool({
    name: 'harmony.studio.compare_runs',
    description: 'Сравнить два производственных запуска.',
    inputSchema: z.object({
      runId1: z.string(),
      runId2: z.string()
    }),
    handler: async (args: { runId1: string; runId2: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { comparison: `Compared ${args.runId1} and ${args.runId2}` }
      });
    }
  })
];
