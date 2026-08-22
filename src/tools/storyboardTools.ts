import { z } from 'zod';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { defineTool } from './defineTool.js';

export const storyboardTools = [
  defineTool({
    name: 'harmony.storyboard.generate_shot_list',
    description: 'Генерировать список шотов (Shot List) из сценария.',
    inputSchema: z.object({ sceneId: z.string() }),
    handler: async (args: { sceneId: string }) => {
      return createStandardExecutionResult({
        simulated: true,
        placeholder: true,
        details: {
          sceneId: args.sceneId,
          shotList: [
            { shotId: 'SHOT_01', type: 'medium_two_shot', camera: 'slow_push_in', durationSeconds: 5 },
            { shotId: 'SHOT_02', type: 'close_up_robot', camera: 'static', durationSeconds: 3 }
          ]
        }
      });
    }
  }),

  defineTool({
    name: 'harmony.storyboard.generate_boards',
    description: 'Генерировать раскадровку (panels & layout).',
    inputSchema: z.object({ shotList: z.array(z.any()) }),
    handler: async (args: { shotList: any[] }) => {
      return createStandardExecutionResult({
        simulated: true,
        placeholder: true,
        details: { storyboardPanels: args.shotList.map(s => ({ shotId: s.shotId, panelUrl: `board_${s.shotId}.png` })) }
      });
    }
  }),

  defineTool({
    name: 'harmony.storyboard.regenerate_panel',
    description: 'Перегенерировать конкретную панель раскадровки.',
    inputSchema: z.object({ panelId: z.string(), instruction: z.string() }),
    handler: async (args: { panelId: string; instruction: string }) => {
      return createStandardExecutionResult({
        simulated: true,
        placeholder: true,
        details: { panelId: args.panelId, updated: true }
      });
    }
  }),

  defineTool({
    name: 'harmony.storyboard.validate_screen_direction',
    description: 'Проверить правило 180 градусов и направление взгляда.',
    inputSchema: z.object({ shotList: z.array(z.any()) }),
    handler: async () => {
      return createStandardExecutionResult({
        simulated: true,
        placeholder: true,
        details: { screenDirectionValid: true, violations: [] }
      });
    }
  }),

  defineTool({
    name: 'harmony.storyboard.validate_staging',
    description: 'Проверить стейджинг и читаемость композиции.',
    inputSchema: z.object({ shotList: z.array(z.any()) }),
    handler: async () => {
      return createStandardExecutionResult({
        simulated: true,
        placeholder: true,
        details: { stagingValid: true }
      });
    }
  }),

  defineTool({
    name: 'harmony.animatic.build',
    description: 'Собрать аниматик на основе раскадровки и чернового звука.',
    inputSchema: z.object({ storyboardId: z.string() }),
    handler: async (args: { storyboardId: string }) => {
      return createStandardExecutionResult({
        simulated: true,
        placeholder: true,
        details: { animaticPath: `animatic_${args.storyboardId}.mp4` }
      });
    }
  }),

  defineTool({
    name: 'harmony.animatic.adjust_timing',
    description: 'Скорректировать тайминг кадров аниматика.',
    inputSchema: z.object({ panelId: z.string(), newDurationFrames: z.number() }),
    handler: async (args: { panelId: string; newDurationFrames: number }) => {
      return createStandardExecutionResult({
        simulated: true,
        placeholder: true,
        details: { panelId: args.panelId, newDurationFrames: args.newDurationFrames }
      });
    }
  }),

  defineTool({
    name: 'harmony.animatic.export_preview',
    description: 'Экспортировать preview аниматика.',
    inputSchema: z.object({ animaticId: z.string() }),
    handler: async (args: { animaticId: string }) => {
      return createStandardExecutionResult({
        simulated: true,
        placeholder: true,
        details: { previewUrl: `preview_${args.animaticId}.mp4` }
      });
    }
  })
];
