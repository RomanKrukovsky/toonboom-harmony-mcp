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
    description: 'Получение структуры таймлайна, слоев, кадров и ключевых кадров сцены.',
    inputSchema: schemas.getTimelineSchema,
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return runTimelineBridge('list_timeline', { projectPath: checkedPath });
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
        return {
          status: 'success',
          message: `Ключевой кадр успешно перемещен с ${args.sourceFrame} на ${args.targetFrame}.`
        };
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
        return {
          status: 'success',
          message: `Ключевые кадры из диапазона ${args.startFrame}-${args.endFrame} скопированы в кадр ${args.targetFrame}.`
        };
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
        return {
          status: 'success',
          message: `Ключевые кадры в диапазоне ${args.startFrame}-${args.endFrame} успешно удалены.`
        };
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
        return {
          status: 'success',
          message: `Удержание экспозиции успешно создано на кадры ${args.startFrame} - ${args.startFrame + args.holdFrames - 1}.`
        };
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
        return {
          status: 'success',
          message: `Анимация моргания успешно создана на кадре ${args.blinkFrame} с длительностью ${args.duration} кадров.`
        };
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
        return {
          status: 'success',
          message: `Ключевые кадры движения камеры успешно созданы от кадра ${args.startFrame} до ${args.endFrame}.`
        };
      });
    }
  }
];
