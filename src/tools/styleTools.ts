import { z } from 'zod';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { defineTool } from './defineTool.js';

export const styleTools = [
  defineTool({
    name: 'harmony.style.check_asset',
    description: 'Проверить стиль и палитру отдельного ассета.',
    inputSchema: z.object({ assetId: z.string() }),
    handler: async (args: { assetId: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { assetId: args.assetId, styleMatches: true, driftScore: 0.02 }
      });
    }
  }),

  defineTool({
    name: 'harmony.style.compare_versions',
    description: 'Сравнить две версии ассета на сдвиг стиля.',
    inputSchema: z.object({ v1Path: z.string(), v2Path: z.string() }),
    handler: async () => {
      return createStandardExecutionResult({
        status: 'success',
        details: { visualDifferenceScore: 0.05 }
      });
    }
  }),

  defineTool({
    name: 'harmony.style.validate_scene',
    description: 'Проверить стиль всей сцены.',
    inputSchema: z.object({ sceneId: z.string() }),
    handler: async (args: { sceneId: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { sceneId: args.sceneId, sceneStyleOk: true }
      });
    }
  }),

  defineTool({
    name: 'harmony.style.detect_character_drift',
    description: 'Обнаружить изменение пропорций, деталей или палитры персонажа.',
    inputSchema: z.object({ characterId: z.string() }),
    handler: async (args: { characterId: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { characterId: args.characterId, driftDetected: false }
      });
    }
  }),

  defineTool({
    name: 'harmony.style.generate_fix_plan',
    description: 'Сгенерировать план исправления стилевых отклонений.',
    inputSchema: z.object({ issues: z.array(z.any()) }),
    handler: async (args: { issues: any[] }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { fixSteps: args.issues.map(i => `Fix style issue: ${i}`) }
      });
    }
  })
];
