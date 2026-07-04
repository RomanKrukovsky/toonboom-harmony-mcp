import { HarmonyPython } from '../adapters/harmonyPython.js';
import { verifyPathAccess, executeWithDryRun, HarmonyError } from '../security.js';
import * as schemas from '../schemas/timeline.js';

// Вспомогательная функция для перехвата PYTHON_API_UNAVAILABLE
async function runTimelineBridge(command: string, args: any): Promise<any> {
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
          'Используйте встроенный таймлайн Harmony для настройки экспозиции и анимации.'
        ]
      };
    }
    throw err;
  }
}

export const timelineTools = [
  {
    name: 'harmony.timeline.get',
    description: 'Получение структуры таймлайна, слоев, кадров, ключевых кадров сцены. Включает информацию о Key Exposure для Drawing Substitutions — отсутствие Key Exposure вызывает смену рисунка на всех кадрах сразу (Reddit: drawing_substitutions_disappear).',
    inputSchema: schemas.getTimelineSchema,
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runTimelineBridge('list_timeline', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;

      const warnings: string[] = [];
      const layers = res.layers || res.timeline || [];

      for (const layer of layers) {
        const exposures = layer.exposures || layer.drawing_exposures || [];
        if (exposures.length === 0) continue;

        let prevDrawing: string | null = null;
        let blockStart = 0;
        for (let i = 0; i < exposures.length; i++) {
          const exp = exposures[i];
          const drawingName = exp.drawing || exp.drawing_name || exp.substitution;
          if (drawingName && drawingName !== prevDrawing) {
            if (prevDrawing !== null && !exp.is_key_exposure) {
              warnings.push(
                `Key Exposure Warning: Layer "${layer.name || layer.node_path}" — drawing substitution changed at frame ${exp.frame || i + 1} from "${prevDrawing}" to "${drawingName}" without a Key Exposure. This will change the drawing on ALL frames in the previous block. Use harmony.drawings.duplicate_active_exposure to create a Key Exposure before substituting.`
              );
            }
            prevDrawing = drawingName;
            blockStart = exp.frame || i + 1;
          }
        }
      }

      return {
        ...res,
        keyExposureWarnings: warnings,
        keyExposureWarningCount: warnings.length,
        keyExposureTip: warnings.length > 0
          ? `${warnings.length} layer(s) may have Drawing Substitution without Key Exposure. Use harmony.drawings.duplicate_active_exposure to break exposure blocks before changing drawings.`
          : 'All drawing substitutions appear to have proper Key Exposures.'
      };
    }
  },
  {
    name: 'harmony.timeline.set_frame_range',
    description: 'Настройка диапазона воспроизведения (длины) таймлайна сцены.',
    inputSchema: schemas.setFrameRangeSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('set_frame_range', args, args.dryRun, () => {
        return runTimelineBridge('set_node_attr', {
          projectPath: checkedPath,
          nodePath: 'Top',
          attributeName: 'num_frames',
          value: args.endFrame
        });
      });
    }
  },
  {
    name: 'harmony.timeline.set_exposure',
    description: 'Установка экспозиции (подстановки рисунка) для слоя Read на таймлайне.',
    inputSchema: schemas.setExposureSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('set_exposure', args, args.dryRun, () => {
        if (args.exposures && args.exposures.length > 0) {
          return runTimelineBridge('set_exposures_batch', {
            projectPath: checkedPath,
            nodePath: args.nodePath,
            exposures: args.exposures
          });
        }
        return runTimelineBridge('set_exposure', {
          projectPath: checkedPath,
          nodePath: args.nodePath,
          startFrame: args.startFrame,
          duration: args.duration,
          drawingName: args.drawingName
        });
      });
    }
  },
  {
    name: 'harmony.timeline.clear_exposure',
    description: 'Очистка экспозиции на таймлайне для определенного интервала кадров.',
    inputSchema: schemas.clearExposureSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('clear_exposure', args, args.dryRun, () => {
        return runTimelineBridge('set_exposure', {
          projectPath: checkedPath,
          nodePath: args.nodePath,
          startFrame: args.startFrame,
          duration: args.duration,
          drawingName: ''
        });
      });
    }
  },
  {
    name: 'harmony.timeline.create_keyframe',
    description: 'Создание ключевого кадра с анимационным значением атрибута.',
    inputSchema: schemas.createKeyframeSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_keyframe', args, args.dryRun, () => {
        return runTimelineBridge('set_keyframe', {
          projectPath: checkedPath,
          nodePath: args.nodePath,
          attributeName: args.attributeName,
          frame: args.frame,
          value: args.value
        });
      });
    }
  },
  {
    name: 'harmony.timeline.move_keyframe',
    description: 'Перемещение ключевого кадра на таймлайне на другую позицию.',
    inputSchema: schemas.moveKeyframeSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('move_keyframe', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "move_keyframe" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.timeline.copy_keyframes',
    description: 'Копирование ключевых кадров из одного диапазона в другой.',
    inputSchema: schemas.copyKeyframesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('copy_keyframes', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "copy_keyframes" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.timeline.delete_keyframes',
    description: 'Удаление ключевых кадров в указанном диапазоне.',
    inputSchema: schemas.deleteKeyframesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('delete_keyframes', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "delete_keyframes" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.timeline.create_hold',
    description: 'Создание удержания (hold) экспозиции рисунка.',
    inputSchema: schemas.createHoldSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_hold', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_hold" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.timeline.create_blink',
    description: 'Добавление автоматического моргания (blink) для глаз персонажа.',
    inputSchema: schemas.createBlinkSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_blink', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_blink" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.timeline.create_camera_move',
    description: 'Быстрое создание ключевых кадров движения камеры (панорамирование/наезд).',
    inputSchema: schemas.createCameraMoveSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_camera_move', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_camera_move" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.timeline.export_otio',
    description: 'Экспорт структуры таймлайна в OpenTimelineIO (.otio) для NLE монтажа.',
    inputSchema: schemas.exportOtioSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const targetOtio = args.outputPath || (checkedPath ? checkedPath.replace(/\.xstage$/, '.otio') : 'output_timeline.otio');
      return executeWithDryRun('export_otio', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "export_otio" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.timeline.import_otio',
    description: 'Импорт таймлайна OpenTimelineIO (.otio) и разметка экспозиций кадров.',
    inputSchema: schemas.importOtioSchema,
    handler: async (args: any) => {
      const checkedOtio = verifyPathAccess(args.otioFilePath);
      return executeWithDryRun('import_otio', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "import_otio" требует подключённого Python API Harmony.');
      });
    }
  }
];
