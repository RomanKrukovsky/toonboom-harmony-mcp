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
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_drawing" требует подключённого Python API Harmony.');
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
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "import_sequence" требует подключённого Python API Harmony.');
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
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "replace_drawing" требует подключённого Python API Harmony.');
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
  },
  {
    name: 'harmony.drawings.clean_unused_substitutions',
    description: 'Поиск и удаление неиспользуемых файлов рисунков (.tvg) из папки элемента сцены.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('clean_unused_substitutions', args, args.dryRun, () => {
        return runDrawingBridge('clean_unused_substitutions', {
          projectPath: checkedPath
        });
      });
    }
  },
  {
    name: 'harmony.drawings.sync_substitutions_pivots',
    description: 'Пакетная синхронизация пивотов векторных рисунков между субституциями указанного слоя. Возвращает отчёт о расхождениях до и после синхронизации (diff report) — какие субституции имели неверные пивоты и какие координаты были установлены.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      layerNodePath: z.string().describe('Путь к слою рисования (Read ноде).'),
      sourceSubName: z.string().describe('Имя эталонной субституции, с которой копируется пивот.'),
      targetSubNames: z.array(z.string()).optional().describe('Опциональный список целевых субституций. Если опущен — копируется на все.'),
      syncWithParentPeg: z.boolean().optional().describe('Синхронизировать опорную точку со связанным родительским Peg нодой.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;

      let beforeDiff: any[] = [];
      let sourcePivot: { x: number; y: number } | null = null;

      try {
        const subsRes = await runDrawingBridge('list_drawings', { projectPath: checkedPath });
        if (subsRes.status !== 'unsupported') {
          const found = (subsRes.drawings || []).find((d: any) => d.node_path === args.layerNodePath);
          if (found) {
            const subs = found.substitutions || [];
            const sourceSub = subs.find((s: any) => (s.name || s.drawing_name) === args.sourceSubName);
            if (sourceSub) {
              sourcePivot = {
                x: parseFloat(sourceSub.pivot_x || sourceSub.PIVOT_X || 0),
                y: parseFloat(sourceSub.pivot_y || sourceSub.PIVOT_Y || 0)
              };
            }

            for (const sub of subs) {
              const subName = sub.name || sub.drawing_name;
              if (subName === args.sourceSubName) continue;
              if (args.targetSubNames && !args.targetSubNames.includes(subName)) continue;

              const subPivot = {
                x: parseFloat(sub.pivot_x || sub.PIVOT_X || 0),
                y: parseFloat(sub.pivot_y || sub.PIVOT_Y || 0)
              };

              if (sourcePivot) {
                const dx = Math.abs(subPivot.x - sourcePivot.x);
                const dy = Math.abs(subPivot.y - sourcePivot.y);
                if (dx > 0.1 || dy > 0.1) {
                  beforeDiff.push({
                    substitution: subName,
                    beforePivot: subPivot,
                    targetPivot: sourcePivot,
                    delta: { x: dx.toFixed(2), y: dy.toFixed(2) },
                    willChange: true
                  });
                }
              }
            }
          }
        }
      } catch {
        // Pre-check not available — proceed with sync
      }

      return executeWithDryRun('sync_substitutions_pivots', args, args.dryRun, async () => {
        const syncRes = await runDrawingBridge('sync_substitutions_pivots', {
          projectPath: checkedPath,
          layerNodePath: args.layerNodePath,
          sourceSubName: args.sourceSubName,
          targetSubNames: args.targetSubNames,
          syncWithParentPeg: args.syncWithParentPeg
        });

        return {
          ...syncRes,
          sourcePivot,
          pivotDiffReport: {
            substitutionsWithMismatchedPivots: beforeDiff.length,
            details: beforeDiff,
            sourceSubName: args.sourceSubName,
            syncWithParentPeg: args.syncWithParentPeg || false
          },
          recommendation: beforeDiff.length > 0
            ? `${beforeDiff.length} substitution(s) had mismatched pivots. All have been synced to source "${args.sourceSubName}". Verify in Camera View that elements no longer jump when switching drawings.`
            : 'All substitutions already had matching pivots. No changes were needed.'
        };
      });
    }
  },
  {
    name: 'harmony.drawings.duplicate_active_exposure',
    description: 'Разрыв связи экспозиции с дублированием рисунка (.tvg) на диске для создания независимого кадра.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      nodePath: z.string().describe('Путь к слою рисования (Read ноде).'),
      frame: z.number().describe('Кадр таймлайна с рисунком для дублирования.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('duplicate_active_exposure', args, args.dryRun, () => {
        return runDrawingBridge('duplicate_active_exposure', {
          projectPath: checkedPath,
          nodePath: args.nodePath,
          frame: args.frame
        });
      });
    }
  }
];
