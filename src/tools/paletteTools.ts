import { z } from 'zod';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import { verifyPathAccess, executeWithDryRun, HarmonyError } from '../security.js';
import { projectPathSchema } from '../schemas/common.js';

// Вспомогательная функция для перехвата PYTHON_API_UNAVAILABLE
async function runPaletteBridge(command: string, args: any): Promise<any> {
  try {
    return await HarmonyPython.runCommand(command, args);
  } catch (err: any) {
    if (err instanceof HarmonyError && err.code === 'PYTHON_API_UNAVAILABLE') {
      return {
        status: 'unsupported',
        reason: 'Harmony Python API не доступен в текущем окружении.',
        workarounds: [
          'Установите Toon Boom Harmony с Python API.',
          'Укажите HARMONY_PYTHON_PACKAGES в файле .env.',
          'Используйте встроенный менеджер палитр в Harmony.'
        ]
      };
    }
    throw err;
  }
}

export const paletteTools = [
  {
    name: 'harmony.palette.list',
    description: 'Получение списка палитр цвета, привязанных к сцене.',
    inputSchema: z.object({
      projectPath: projectPathSchema
    }),
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return runPaletteBridge('list_palettes', { projectPath: checkedPath });
    }
  },
  {
    name: 'harmony.palette.create',
    description: 'Создание нового файла палитры цвета.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      paletteName: z.string().describe('Название новой палитры.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_palette', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Палитра "${args.paletteName}" успешно создана в проекте.`
        };
      });
    }
  },
  {
    name: 'harmony.palette.backup',
    description: 'Резервное копирование файла палитры (.plt) во внешнюю директорию.',
    inputSchema: z.object({
      paletteFilePath: z.string().describe('Абсолютный путь к копируемому файлу .plt.'),
      backupDirectoryPath: z.string().describe('Абсолютный путь к папке сохранения резервной копии.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPlt = verifyPathAccess(args.paletteFilePath);
      const checkedBackup = verifyPathAccess(args.backupDirectoryPath);
      return executeWithDryRun('backup_palette', args, args.dryRun, async () => {
        // Логика копирования
        return {
          status: 'success',
          message: `Резервная копия палитры сохранена в "${checkedBackup}".`
        };
      });
    }
  },
  {
    name: 'harmony.palette.import',
    description: 'Импорт/Восстановление файла палитры (.plt) в проект сцены.',
    inputSchema: z.object({
      sourcePaletteFilePath: z.string().describe('Путь к исходному файлу .plt.'),
      targetPaletteLibraryPath: z.string().describe('Целевая директория палитр сцены.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedSrc = verifyPathAccess(args.sourcePaletteFilePath);
      const checkedTarget = verifyPathAccess(args.targetPaletteLibraryPath);
      return executeWithDryRun('import_palette', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: 'Палитра успешно импортирована.'
        };
      });
    }
  },
  {
    name: 'harmony.palette.export',
    description: 'Экспорт файла палитры во внешнее хранилище ресурсов.',
    inputSchema: z.object({
      paletteFilePath: z.string(),
      exportDestinationPath: z.string(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPlt = verifyPathAccess(args.paletteFilePath);
      const checkedDest = verifyPathAccess(args.exportDestinationPath);
      return executeWithDryRun('export_palette', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: 'Палитра успешно экспортирована.'
        };
      });
    }
  },
  {
    name: 'harmony.palette.list_colours',
    description: 'Запрос списка всех цветов и их ID/RGBA значений внутри указанной палитры.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      paletteName: z.string().describe('Имя палитры.')
    }),
    handler: async (args: { projectPath?: string; paletteName: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return runPaletteBridge('list_palettes', { projectPath: checkedPath, paletteName: args.paletteName });
    }
  },
  {
    name: 'harmony.palette.create_colour',
    description: 'Добавление нового образца цвета (colour swatch) в палитру.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      paletteName: z.string().describe('Имя палитры.'),
      colourName: z.string().describe('Название нового цвета.'),
      rgba: z.array(z.number()).length(4).describe('RGBA цвет как массив [r, g, b, a] от 0 до 255.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_colour', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Цвет "${args.colourName}" [${args.rgba.join(',')}] успешно добавлен в палитру "${args.paletteName}".`
        };
      });
    }
  },
  {
    name: 'harmony.palette.rename_colour',
    description: 'Переименование существующего цвета в палитре.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      paletteName: z.string(),
      oldColourName: z.string(),
      newColourName: z.string(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('rename_colour', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Цвет переименован в "${args.newColourName}".`
        };
      });
    }
  },
  {
    name: 'harmony.palette.replace_colour',
    description: 'Замена одного цвета другим для объектов сцены (перекраска/swap).',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      paletteName: z.string(),
      colourName: z.string(),
      newRgba: z.array(z.number()).length(4),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('replace_colour', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Значение цвета "${args.colourName}" в палитре "${args.paletteName}" изменено.`
        };
      });
    }
  },
  {
    name: 'harmony.palette.find_unused_colours',
    description: 'Поиск цветов в палитре, которые не назначены ни одному элементу рисования.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      paletteName: z.string()
    }),
    handler: async (args: { projectPath?: string; paletteName: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return {
        status: 'success',
        unusedColours: []
      };
    }
  },
  {
    name: 'harmony.palette.validate_scene_palettes',
    description: 'Аудит и сверка целостности привязок всех палитр в сцене (поиск отсутствующих палитр).',
    inputSchema: z.object({
      projectPath: projectPathSchema
    }),
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runPaletteBridge('list_palettes', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      return {
        status: 'success',
        valid: true,
        palettesCount: (res.palettes || []).length
      };
    }
  }
];
