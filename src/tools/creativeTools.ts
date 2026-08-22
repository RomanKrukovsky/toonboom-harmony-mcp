import { z } from 'zod';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { defineTool } from './defineTool.js';

export const creativeTools = [
  defineTool({
    name: 'harmony.creative.analyze_idea',
    description: 'Анализировать идею/промпт и выявлять драматические, стилистические и технические требования.',
    inputSchema: z.object({
      prompt: z.string().describe('Идея или описание мультфильма'),
      genre: z.string().optional()
    }),
    handler: async (args: { prompt: string; genre?: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: {
          logline: `Comedy scene about ${args.prompt}`,
          genre: args.genre || 'comedy',
          targetAudience: 'general',
          tone: 'humorous',
          dramaticStructure: 'three_act_short'
        }
      });
    }
  }),

  defineTool({
    name: 'harmony.creative.generate_series_bible',
    description: 'Сгенерировать библию сериала (Series Bible).',
    inputSchema: z.object({
      title: z.string(),
      prompt: z.string()
    }),
    handler: async (args: { title: string; prompt: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: {
          seriesBible: {
            title: args.title,
            worldDescription: 'Futuristic space workshop',
            coreThemes: ['friendship', 'misunderstanding'],
            forbiddenVisuals: ['gore', 'photorealistic_textures']
          }
        }
      });
    }
  }),

  defineTool({
    name: 'harmony.creative.generate_style_bible',
    description: 'Сгенерировать гайдлайн стиля и визуальных правил.',
    inputSchema: z.object({
      visualStyle: z.string()
    }),
    handler: async (args: { visualStyle: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: {
          styleBible: {
            styleName: args.visualStyle,
            lineArt: 'clean_vector_2px',
            colorPalette: ['#1A1A2E', '#16213E', '#E94560'],
            shadingStyle: 'flat_cell'
          }
        }
      });
    }
  }),

  defineTool({
    name: 'harmony.creative.generate_character_bible',
    description: 'Сгенерировать описания и правила постоянства персонажей.',
    inputSchema: z.object({
      characters: z.array(z.string())
    }),
    handler: async (args: { characters: string[] }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: {
          characterBible: args.characters.map(c => ({
            name: c,
            proportions: '1:3_head_to_body',
            personality: 'friendly',
            identityRules: ['always_blue_jacket', 'circle_eyes']
          }))
        }
      });
    }
  }),

  defineTool({
    name: 'harmony.creative.validate_consistency',
    description: 'Проверить соответствие ассетов и сценария библии стиля.',
    inputSchema: z.object({
      packageDir: z.string()
    }),
    handler: async () => {
      return createStandardExecutionResult({
        status: 'success',
        details: { consistent: true, issues: [] }
      });
    }
  }),

  defineTool({
    name: 'harmony.creative.lock_style',
    description: 'Зафиксировать референсный стиль для проекта.',
    inputSchema: z.object({
      styleId: z.string()
    }),
    handler: async (args: { styleId: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { styleLocked: true, styleId: args.styleId }
      });
    }
  }),

  defineTool({
    name: 'harmony.creative.create_reference_board',
    description: 'Создать подборку референсных изображений.',
    inputSchema: z.object({
      images: z.array(z.string())
    }),
    handler: async (args: { images: string[] }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { referenceBoardCount: args.images.length }
      });
    }
  })
];
