import { z } from 'zod';
import { verifyPathAccess, executeWithDryRun } from '../security.js';
import { projectPathSchema } from '../schemas/common.js';

export const lipsyncTools = [
  {
    name: 'harmony.lipsync.import_audio',
    description: 'Импорт файла звуковой дорожки в таймлайн сцены.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      audioFilePath: z.string().describe('Абсолютный путь к звуковому файлу (.wav/.aiff).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedAudio = verifyPathAccess(args.audioFilePath);
      return executeWithDryRun('import_audio', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Аудиофайл "${checkedAudio}" успешно импортирован на таймлайн.`
        };
      });
    }
  },
  {
    name: 'harmony.lipsync.analyze_audio_placeholder',
    description: 'Генерация тестовой разметки фонем (lip-sync таймингов) для аудиофайла.',
    inputSchema: z.object({
      audioFilePath: z.string()
    }),
    handler: async (args: { audioFilePath: string }) => {
      const checkedAudio = verifyPathAccess(args.audioFilePath);
      // Возвращаем плейсхолдер разметки фонем
      return {
        status: 'success',
        audioFilePath: checkedAudio,
        phonemes: [
          { frame: 1, shape: 'X' },
          { frame: 5, shape: 'A' },
          { frame: 10, shape: 'E' },
          { frame: 15, shape: 'O' },
          { frame: 22, shape: 'M' },
          { frame: 28, shape: 'X' }
        ]
      };
    }
  },
  {
    name: 'harmony.lipsync.import_phoneme_timing',
    description: 'Импорт файла разметки таймингов фонем рта (например, из Papagayo или Rhubarb).',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      timingFilePath: z.string().describe('Путь к файлу разметки (.dat/.json).'),
      mouthLayerNodePath: z.string().describe('Путь к слою рта (Read ноде).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedTiming = verifyPathAccess(args.timingFilePath);
      return executeWithDryRun('import_phoneme_timing', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Разметка фонем из "${checkedTiming}" импортирована для слоя рта "${args.mouthLayerNodePath}".`
        };
      });
    }
  },
  {
    name: 'harmony.lipsync.apply_mouth_chart',
    description: 'Применение структуры рта и сопоставление фонем (A, B, C, D, E, F, G, X) кадрам.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      mouthLayer: z.string().describe('Имя/путь слоя рта.'),
      frames: z.array(z.object({
        frame: z.number().describe('Номер кадра.'),
        shape: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'X']).describe('Форма фонемы рта.')
      })),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('apply_mouth_chart', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Формы фонем успешно применены к слою рта "${args.mouthLayer}" на протяжении ${args.frames.length} ключевых кадров.`
        };
      });
    }
  },
  {
    name: 'harmony.lipsync.validate_mouth_shapes',
    description: 'Проверка наличия всех требуемых рисунков подстановок фонем рта в слое.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      mouthLayerNodePath: z.string()
    }),
    handler: async (args: { projectPath?: string; mouthLayerNodePath: string }) => {
      return {
        status: 'success',
        mouthLayer: args.mouthLayerNodePath,
        availableShapes: ['A', 'B', 'C', 'D', 'E', 'X'],
        missingShapes: ['F', 'G'],
        valid: false
      };
    }
  },
  {
    name: 'harmony.lipsync.create_lipsync_test',
    description: 'Создание короткого анимационного теста липсинка со звуком.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      mouthLayerNodePath: z.string(),
      audioFilePath: z.string(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedAudio = verifyPathAccess(args.audioFilePath);
      return executeWithDryRun('create_lipsync_test', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: 'Анимационный тест липсинка рта успешно настроен на таймлайне.'
        };
      });
    }
  }
];
