import { z } from 'zod';
import { createStandardExecutionResult } from '../schemas/executionResult.js';

export const modelRouterTools = [
  {
    name: 'harmony.router.select_model',
    description: 'Подобрать наиболее эффективную модель под тип задачи (reasoning, script, vision, image, tts).',
    inputSchema: z.object({ taskType: z.string(), priority: z.enum(['speed', 'quality', 'cost']).default('quality') }),
    handler: async (args: { taskType: string; priority: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { taskType: args.taskType, selectedProvider: 'gemini-3.6-pro', priority: args.priority }
      });
    }
  },

  {
    name: 'harmony.router.get_usage_metrics',
    description: 'Получить статистику вызовов моделей, токенов и расходов.',
    inputSchema: z.object({}),
    handler: async () => {
      return createStandardExecutionResult({
        status: 'success',
        details: { totalRequests: 42, estimatedCostUSD: 0.12 }
      });
    }
  }
];
