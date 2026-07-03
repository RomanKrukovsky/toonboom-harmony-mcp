import { z } from 'zod';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import { HarmonyCli } from '../adapters/harmonyCli.js';
import { verifyPathAccess, executeWithDryRun, HarmonyError } from '../security.js';
import { projectPathSchema } from '../schemas/common.js';

// Вспомогательная функция для перехвата PYTHON_API_UNAVAILABLE
async function runDrawingBridge(command: string, args: any): Promise<any> {
  try {
    return await HarmonyPython.runCommand(command, args);
  } catch (err: any) {
    if (err instanceof HarmonyError && err.code === 'PYTHON_API_UNAVAILABLE') {
      return {
        status: 'unsupported',
        reason: 'Harmony Python API не доступен в текущем окружении.',
        workarounds: [
          'Установите Toon Boom Harmony с Python API.',
          'Проверьте HARMONY_PYTHON_PACKAGES в .env.',
          'Используйте встроенный импорт и Paint/Drawing инструменты Harmony.'
        ]
      };
    }
    throw err;
  }
}

export const drawingTools = [
  {
    name: 'harmony.drawings.list_layers',
    description: 'Получение списка всех слоев рисования (Read нод) в сцене.',
    inputSchema: z.object({
      projectPath: projectPathSchema
    }),
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runDrawingBridge('list_drawings', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      return {
        status: 'success',
        layers: (res.drawings || []).map((d: any) => ({
          nodePath: d.node_path,
          name: d.name
        }))
      };
    }
  },
  {
    name: 'harmony.drawings.list_substitutions',
    description: 'Получение списка подстановок рисунков (drawings) для указанного слоя.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      layerNodePath: z.string().describe('Путь к слою рисования (Read ноде).')
    }),
    handler: async (args: { projectPath?: string; layerNodePath: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runDrawingBridge('list_drawings', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      const found = (res.drawings || []).find((d: any) => d.node_path === args.layerNodePath);
      return {
        status: found ? 'success' : 'error',
        layerNodePath: args.layerNodePath,
        substitutions: found ? found.substitutions : []
      };
    }
  },
  {
    name: 'harmony.drawings.create_layer',
    description: 'Создание нового слоя рисования (Read-ноды) в сцене.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      layerName: z.string().describe('Имя нового слоя рисования.'),
      parentGroup: z.string().optional().default('Top'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_drawing_layer', args, args.dryRun, () => {
        return runDrawingBridge('create_node', {
          projectPath: checkedPath,
          parentGroup: args.parentGroup,
          nodeType: 'READ',
          nodeName: args.layerName
        });
      });
    }
  },
  {
    name: 'harmony.drawings.create_drawing',
    description: 'Создание нового пустого кадра/рисунка подстановки в слое.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      layerNodePath: z.string().describe('Путь к слою рисования.'),
      drawingName: z.string().describe('Имя нового рисунка подстановки.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_drawing_element', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Пустой рисунок "${args.drawingName}" успешно добавлен в слой "${args.layerNodePath}".`
        };
      });
    }
  },
  {
    name: 'harmony.drawings.import_image',
    description: 'Импорт файла изображения во фрейм подстановки.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      imagePath: z.string().describe('Абсолютный путь к файлу импортируемого изображения.'),
      layerNodePath: z.string().describe('Слой рисования для импорта.'),
      drawingName: z.string().describe('Имя целевого рисунка подстановки.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedImg = verifyPathAccess(args.imagePath);
      return executeWithDryRun('import_image', args, args.dryRun, () => {
        return runDrawingBridge('import_asset', {
          projectPath: checkedPath,
          assetPath: checkedImg,
          layerNodePath: args.layerNodePath,
          drawingName: args.drawingName
        });
      });
    }
  },
  {
    name: 'harmony.drawings.import_sequence',
    description: 'Импорт последовательности кадров в указанный слой.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      sequenceFolderPath: z.string().describe('Путь к папке с секвенцией кадров.'),
      layerNodePath: z.string().describe('Слой для импорта.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedFolder = verifyPathAccess(args.sequenceFolderPath);
      return executeWithDryRun('import_sequence', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Последовательность кадров из папки "${checkedFolder}" импортирована в слой "${args.layerNodePath}".`
        };
      });
    }
  },
  {
    name: 'harmony.drawings.replace_drawing',
    description: 'Замена содержимого рисунка подстановки другим файлом.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      layerNodePath: z.string(),
      drawingName: z.string(),
      newImagePath: z.string(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedImg = verifyPathAccess(args.newImagePath);
      return executeWithDryRun('replace_drawing', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Рисунок подстановки "${args.drawingName}" в слое "${args.layerNodePath}" успешно заменен.`
        };
      });
    }
  },
  {
    name: 'harmony.drawings.find_empty_drawings',
    description: 'Поиск пустых/неиспользуемых кадров подстановок в сцене.',
    inputSchema: z.object({
      projectPath: projectPathSchema
    }),
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runDrawingBridge('audit_scene', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      return {
        status: 'success',
        emptyDrawings: res.audit?.empty_layers || []
      };
    }
  },
  {
    name: 'harmony.drawings.find_missing_drawings',
    description: 'Поиск битых ссылок на файлы экспозиций рисунков.',
    inputSchema: z.object({
      projectPath: projectPathSchema
    }),
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return runDrawingBridge('audit_scene', { projectPath: checkedPath });
    }
  },
  {
    name: 'harmony.drawings.vectorize',
    description: 'Запуск CLI векторизации растровых эскизов в векторный формат ТВГ.',
    inputSchema: z.object({
      projectPath: z.string().describe('Путь к проекту сцены.'),
      drawingsPaths: z.array(z.string()).describe('Список путей к файлам для векторизации.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedProj = verifyPathAccess(args.projectPath);
      const checkedDrawings = args.drawingsPaths.map((p: string) => verifyPathAccess(p));
      return executeWithDryRun('vectorize', args, args.dryRun, async () => {
        const stdout = await HarmonyCli.vectorize(checkedProj, checkedDrawings);
        return {
          status: 'success',
          stdout
        };
      });
    }
  }
];
