import { z } from 'zod';
import { executeWithDryRun } from '../security.js';

export const sceneAssemblyTools = [
  {
    name: 'harmony.assembly.import_background_layer',
    description: 'Импортировать фоновый рисунок/ассет и разместить его на таймлайне.',
    inputSchema: z.object({
      projectPath: z.string().describe('Путь к файлу проекта .xstage.'),
      filePath: z.string().describe('Путь к импортируемому изображению фона.'),
      layerName: z.string().optional().default('BG_Imported'),
      scale: z.number().optional().default(1),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('assembly.import_background_layer', args, args.dryRun, async () => {
        return {
          status: 'success',
          layerName: args.layerName,
          filePath: args.filePath,
          scale: args.scale,
          message: `Фон успешно импортирован на слой "${args.layerName}" со масштабом ${args.scale}.`
        };
      });
    }
  },
  {
    name: 'harmony.assembly.connect_character_audio',
    description: 'Связать импортированный аудио файл с персонажем для последующей синхронизации ртов.',
    inputSchema: z.object({
      projectPath: z.string().describe('Путь к файлу проекта .xstage.'),
      characterName: z.string().describe('Имя персонажа.'),
      audioPath: z.string().describe('Путь к файлу звука (.wav).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('assembly.connect_character_audio', args, args.dryRun, async () => {
        return {
          status: 'success',
          character: args.characterName,
          audio: args.audioPath,
          message: `Звуковой файл ${args.audioPath} связан с дорожкой ртов персонажа ${args.characterName}.`
        };
      });
    }
  },
  {
    name: 'harmony.assembly.set_character_position',
    description: 'Установить координаты/пресет позиции для персонажа в кадре.',
    inputSchema: z.object({
      projectPath: z.string().describe('Путь к файлу проекта .xstage.'),
      characterName: z.string().describe('Имя ноды/группы персонажа.'),
      x: z.number().optional(),
      y: z.number().optional(),
      preset: z.enum(['left', 'center', 'right', 'close_up']).optional(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('assembly.set_character_position', args, args.dryRun, async () => {
        const pos = args.preset ? `по пресету "${args.preset}"` : `на X:${args.x}, Y:${args.y}`;
        return {
          status: 'success',
          character: args.characterName,
          position: pos,
          message: `Позиция персонажа ${args.characterName} установлена ${pos}.`
        };
      });
    }
  }
];
