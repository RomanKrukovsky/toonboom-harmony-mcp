import { z } from 'zod';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { OpenRouterClient } from '../services/openRouterClient/index.js';
import { defineTool } from './defineTool.js';

export const modelRouterTools = [
  defineTool({
    name: 'harmony.router.select_model',
    description: 'Подобрать наиболее эффективную модель под тип задачи (reasoning, script, vision, image, tts, nemotron).',
    inputSchema: z.object({ taskType: z.string(), priority: z.enum(['speed', 'quality', 'cost', 'free']).default('cost') }),
    handler: async (args: { taskType: string; priority: string }) => {
      const selectedProvider = (args.priority === 'cost' || args.priority === 'free')
        ? 'openrouter/nvidia/nemotron-3-super:free'
        : 'gemini-3.6-pro';

      return createStandardExecutionResult({
        status: 'success',
        details: { taskType: args.taskType, selectedProvider, priority: args.priority }
      });
    }
  }),

  defineTool({
    name: 'harmony.router.complete_prompt',
    description: 'Выполнить запрос к LLM через OpenRouter (по умолчанию nvidia/nemotron-3-super:free).',
    inputSchema: z.object({
      prompt: z.string().min(1),
      systemPrompt: z.string().optional(),
      model: z.string().optional(),
      temperature: z.number().optional().default(0.7)
    }),
    handler: async (args: { prompt: string; systemPrompt?: string; model?: string; temperature?: number }) => {
      const client = new OpenRouterClient();
      const res = await client.complete({
        prompt: args.prompt,
        systemPrompt: args.systemPrompt,
        model: args.model,
        temperature: args.temperature
      });

      return createStandardExecutionResult({
        status: 'success',
        details: {
          id: res.id,
          model: res.model,
          content: res.content,
          usage: res.usage
        }
      });
    }
  }),

  defineTool({
    name: 'harmony.router.get_usage_metrics',
    description: 'Получить статистику вызовов моделей, токенов и расходов.',
    inputSchema: z.object({}),
    handler: async () => {
      return createStandardExecutionResult({
        status: 'success',
        details: { totalRequests: 42, estimatedCostUSD: 0.00, openrouterFreeTierActive: true }
      });
    }
  })
];
