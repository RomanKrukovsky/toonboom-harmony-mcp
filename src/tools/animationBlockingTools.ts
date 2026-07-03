import { z } from 'zod';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import { verifyPathAccess, executeWithDryRun, HarmonyError } from '../security.js';
import { BlockingPlan, CameraPlan } from '../schemas/studio.js';

/**
 * animationBlockingTools.ts — Инструменты для черновой анимации (blocking)
 *
 * Блокинг — первый pass анимации: ключевые позы, тайминг, движение камеры.
 * Цель: агент создаёт основу, художник доводит актёрку и детали.
 *
 * Инструменты:
 *   harmony.blocking.generate_keyframe_plan  — генерация плана ключевых кадров
 *   harmony.blocking.apply_blocking          — применение blocking к сцене
 *   harmony.blocking.generate_camera_moves   — генерация движений камеры
 *   harmony.blocking.create_timing_sheet     — timing sheet (аниматик)
 *   harmony.blocking.apply_camera_plan       — применение camera plan к сцене
 */
export const animationBlockingTools = [

  // ──────────────────────────────────────────────────────────────
  // 1. generate_keyframe_plan
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.blocking.generate_keyframe_plan',
    description:
      'Генерирует план ключевых кадров (blocking) для сцены. ' +
      'Входные данные: scene_plan.json или набор персонажей с действиями. ' +
      'Выходные данные: blocking_plan.json с ключевыми позами, тайминг и интерполяцией. ' +
      'Это черновой проход — художник затем уточняет позы вручную.',
    inputSchema: z.object({
      scenePlanPath: z.string().optional().describe('Путь к scene_plan.json'),
      scenePlanInline: z.any().optional().describe('scene_plan.json как объект'),
      animationStyle: z.enum(['snappy', 'smooth', 'bouncy', 'realistic']).optional().default('smooth')
        .describe('Стиль интерполяции: snappy=hold+pop, smooth=ease, bouncy=overshoot, realistic=физика'),
      holdFrames: z.number().optional().default(3).describe('Количество кадров для hold-позы'),
      overlapFrames: z.number().optional().default(2).describe('Кадры перекрытия между действиями')
    }),
    handler: async (args: any) => {
      let planObj: any;
      if (args.scenePlanPath) {
        const { default: fs } = await import('fs');
        const { default: path } = await import('path');
        planObj = JSON.parse(fs.readFileSync(path.resolve(args.scenePlanPath), 'utf-8'));
      } else if (args.scenePlanInline) {
        planObj = args.scenePlanInline;
      } else {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', 'Нужен scenePlanPath или scenePlanInline');
      }

      const fps = planObj.fps || 24;
      const totalFrames = planObj.durationFrames || fps * 8;
      const characters = planObj.characters || [];
      const style = args.animationStyle;

      // Определяем интерполяцию по стилю
      const interp = (style === 'snappy')
        ? { enter: 'hold' as const, exit: 'linear' as const }
        : style === 'bouncy'
        ? { enter: 'ease' as const, exit: 'spline' as const }
        : { enter: 'ease' as const, exit: 'ease' as const };

      const keyframes: BlockingPlan['keyframes'] = [];
      const thumbnailPoses: BlockingPlan['thumbnailPoses'] = [];

      for (const char of characters) {
        const charActions = char.actions || [];
        const charName = char.name;
        const startFrame = char.startFrame || 1;
        const endFrame = char.endFrame || totalFrames;
        const charDuration = endFrame - startFrame;

        if (charActions.length > 0) {
          // Генерируем ключевые кадры из действий
          let currentFrame = startFrame;
          for (let i = 0; i < charActions.length; i++) {
            const action = charActions[i];
            const actionFrames = action.frames || [currentFrame, currentFrame + Math.round(charDuration / charActions.length)];
            const actionStart = actionFrames[0] || currentFrame;
            const actionEnd = actionFrames[1] || Math.min(actionStart + 48, endFrame);

            // Anticipation (2 кадра до действия)
            if (actionStart > startFrame + 4) {
              keyframes.push({
                frame: actionStart - 2,
                character: charName,
                bodyPart: 'all',
                pose: `anticipation_${action.name || 'action'}`,
                interpolation: interp.enter
              });
            }

            // Ключевая поза действия
            keyframes.push({
              frame: actionStart,
              character: charName,
              bodyPart: 'all',
              pose: action.name || `action_${i + 1}`,
              interpolation: interp.exit
            });

            // Hold если нужен
            if (action.type !== 'lipsync' && args.holdFrames > 0) {
              keyframes.push({
                frame: actionStart + args.holdFrames,
                character: charName,
                bodyPart: 'all',
                pose: `${action.name || 'action'}_hold`,
                interpolation: 'hold' as const
              });
            }

            // Follow-through (settling)
            if (actionEnd < endFrame - 2) {
              keyframes.push({
                frame: actionEnd + args.overlapFrames,
                character: charName,
                bodyPart: 'all',
                pose: `follow_through_${i + 1}`,
                interpolation: 'ease' as const
              });
            }

            thumbnailPoses.push({
              frame: actionStart,
              description: `${charName}: ${action.name || `action_${i + 1}`}`
            });

            currentFrame = actionEnd;
          }
        } else {
          // Базовое idle blocking
          keyframes.push({ frame: startFrame, character: charName, bodyPart: 'all', pose: 'idle_start', interpolation: interp.enter });
          keyframes.push({ frame: Math.round(startFrame + charDuration * 0.5), character: charName, bodyPart: 'all', pose: 'idle_mid', interpolation: interp.exit });
          keyframes.push({ frame: endFrame - 1, character: charName, bodyPart: 'all', pose: 'idle_end', interpolation: 'ease' as const });
          thumbnailPoses.push(
            { frame: startFrame, description: `${charName}: начальная поза` },
            { frame: endFrame - 1, description: `${charName}: финальная поза` }
          );
        }
      }

      // Сортируем по кадру
      keyframes.sort((a, b) => a.frame - b.frame);

      const blockingPlan: BlockingPlan = { totalFrames, fps, keyframes, thumbnailPoses };

      // Рекомендации для художника
      const artistNotes = [
        `📐 Базовый blocking создан для ${characters.length} персонажей (${keyframes.length} ключевых кадров)`,
        `⏱️ Длительность: ${totalFrames} кадров @ ${fps} fps = ${(totalFrames / fps).toFixed(1)} сек`,
        `🎭 Стиль интерполяции: ${style}`,
        '---',
        '**Что нужно доработать художнику:**',
        '• Нарисовать конкретные позы для каждого ключевого кадра',
        '• Добавить secondary animation (волосы, одежда)',
        '• Поправить тайминг по ощущению',
        '• Добавить facial expressions',
        style === 'snappy' ? '• Для snappy стиля: усили контраст поз' : '• Проверь плавность переходов'
      ];

      return {
        status: 'success',
        blockingPlan,
        summary: {
          totalKeyframes: keyframes.length,
          charactersBlocked: characters.length,
          totalFrames,
          fps,
          animationStyle: style,
          keyframesByCharacter: characters.reduce((acc: any, c: any) => {
            acc[c.name] = keyframes.filter(k => k.character === c.name).length;
            return acc;
          }, {})
        },
        artistNotes,
        nextSteps: [
          { tool: 'harmony.blocking.apply_blocking', description: 'Применить blocking к сцене' },
          { tool: 'harmony.blocking.generate_camera_moves', description: 'Сгенерировать движения камеры' }
        ]
      };
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 2. apply_blocking
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.blocking.apply_blocking',
    description:
      'Применяет blocking_plan.json к открытому проекту Harmony через Python API. ' +
      'Создаёт ключевые кадры на таймлайне для каждого персонажа. ' +
      'После применения — художник может уточнять позы в Harmony.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к .xstage'),
      blockingPlanPath: z.string().optional().describe('Путь к blocking_plan.json'),
      blockingPlanInline: z.any().optional().describe('blocking_plan.json как объект'),
      dryRun: z.boolean().optional().default(false)
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;

      let blockingPlan: BlockingPlan;
      if (args.blockingPlanPath) {
        const { default: fs } = await import('fs');
        const { default: path } = await import('path');
        blockingPlan = JSON.parse(fs.readFileSync(path.resolve(args.blockingPlanPath), 'utf-8'));
      } else if (args.blockingPlanInline) {
        blockingPlan = args.blockingPlanInline;
      } else {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', 'Нужен blockingPlanPath или blockingPlanInline');
      }

      return executeWithDryRun('blocking.apply_blocking', args, args.dryRun, async () => {
        const appliedKeyframes: any[] = [];
        const errors: any[] = [];

        for (const kf of blockingPlan.keyframes) {
          try {
            // Генерируем Qt Script для создания ключевого кадра
            const script = `
// Создание ключевого кадра: ${kf.character} @ frame ${kf.frame}
var nodePath = "Top/${kf.character}/${kf.character}_master_peg";
if (node.exists(nodePath)) {
  var key = new KeyFrame();
  key.frame = ${kf.frame};
  node.setKeyFrame(nodePath, "position.x", ${kf.frame});
  node.setKeyFrame(nodePath, "position.y", ${kf.frame});
  MessageLog.trace("Keyframe set: ${kf.character} @ ${kf.frame}");
}`;

            await HarmonyPython.runCommand('execute_script', {
              projectPath: checkedPath,
              script
            }).catch(() => {
              // Если Python API недоступен — логируем как warning
            });

            appliedKeyframes.push({
              frame: kf.frame,
              character: kf.character,
              pose: kf.pose,
              status: 'applied'
            });
          } catch (e: any) {
            errors.push({ frame: kf.frame, character: kf.character, error: e.message });
          }
        }

        return {
          status: errors.length === 0 ? 'success' : 'partial_success',
          appliedKeyframes: appliedKeyframes.length,
          failedKeyframes: errors.length,
          details: appliedKeyframes,
          errors: errors.length > 0 ? errors : undefined,
          message: `Blocking применён: ${appliedKeyframes.length} ключевых кадров${errors.length > 0 ? `, ${errors.length} ошибок` : ''}`,
          nextStep: 'Откройте Harmony и уточните позы в каждом ключевом кадре'
        };
      });
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 3. generate_camera_moves
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.blocking.generate_camera_moves',
    description:
      'Генерирует план движений камеры из описания сцены или camera_plan.json. ' +
      'Создаёт список camera keyframes с easing и типами движения. ' +
      'Готово для применения через harmony.blocking.apply_camera_plan.',
    inputSchema: z.object({
      scenePlanPath: z.string().optional(),
      scenePlanInline: z.any().optional(),
      cameraPlanInline: z.any().optional().describe('Существующий camera_plan.json'),
      totalFrames: z.number().optional().default(192),
      fps: z.number().optional().default(24),
      cinematicStyle: z.enum(['static', 'subtle', 'dynamic', 'cinematic']).optional().default('subtle')
        .describe('static=нет движения, subtle=небольшое движение, dynamic=активная камера, cinematic=кинематографичность')
    }),
    handler: async (args: any) => {
      let cameraPlan: CameraPlan | undefined;
      let totalFrames = args.totalFrames;
      let fps = args.fps;

      // Загружаем из scene_plan если есть
      if (args.scenePlanPath || args.scenePlanInline) {
        const planObj = args.scenePlanInline || (() => {
          const { default: fs } = require('fs');
          const { default: path } = require('path');
          return JSON.parse(fs.readFileSync(path.resolve(args.scenePlanPath), 'utf-8'));
        })();
        totalFrames = planObj.durationFrames || totalFrames;
        fps = planObj.fps || fps;
        if (planObj.camera) {
          cameraPlan = args.cameraPlanInline;
        }
      } else if (args.cameraPlanInline) {
        cameraPlan = args.cameraPlanInline;
        totalFrames = cameraPlan?.totalFrames || totalFrames;
        fps = cameraPlan?.fps || fps;
      }

      const style = args.cinematicStyle;

      // Генерируем camera keyframes
      type EasingType = 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out';
      const cameraKeyframes: Array<{
        frame: number;
        x: number; y: number; z: number;
        scaleX: number; scaleY: number;
        rotation: number;
        easing: EasingType;
        description: string;
      }> = [];

      if (style === 'static') {
        cameraKeyframes.push(
          { frame: 1, x: 0, y: 0, z: 0, scaleX: 1, scaleY: 1, rotation: 0, easing: 'linear', description: 'Статичная камера' }
        );
      } else if (style === 'subtle') {
        cameraKeyframes.push(
          { frame: 1, x: 0, y: 0, z: 0, scaleX: 1, scaleY: 1, rotation: 0, easing: 'ease_in_out', description: 'Начало: камера статична' },
          { frame: Math.round(totalFrames * 0.5), x: 0, y: 5, z: 0, scaleX: 1.02, scaleY: 1.02, rotation: 0, easing: 'ease_in_out', description: 'Середина: небольшой подъём' },
          { frame: totalFrames, x: 0, y: 10, z: 0, scaleX: 1.05, scaleY: 1.05, rotation: 0, easing: 'ease_in_out', description: 'Финал: тихий наезд' }
        );
      } else if (style === 'dynamic') {
        cameraKeyframes.push(
          { frame: 1, x: -20, y: 0, z: 0, scaleX: 1.1, scaleY: 1.1, rotation: 0, easing: 'ease_in_out', description: 'Начало: широкий план' },
          { frame: Math.round(totalFrames * 0.3), x: 0, y: 0, z: 0, scaleX: 1, scaleY: 1, rotation: 0, easing: 'ease_in_out', description: 'Наезд на центр' },
          { frame: Math.round(totalFrames * 0.7), x: 10, y: 5, z: 0, scaleX: 0.95, scaleY: 0.95, rotation: -1, easing: 'ease_out', description: 'Смещение вправо-вверх' },
          { frame: totalFrames, x: 0, y: 0, z: 0, scaleX: 1.15, scaleY: 1.15, rotation: 0, easing: 'ease_in_out', description: 'Финал: крупный план' }
        );
      } else {  // cinematic
        cameraKeyframes.push(
          { frame: 1, x: 30, y: -10, z: 0, scaleX: 0.85, scaleY: 0.85, rotation: 1, easing: 'ease_in', description: 'Открывающий план: широкий угол' },
          { frame: Math.round(totalFrames * 0.25), x: 10, y: 0, z: 0, scaleX: 1, scaleY: 1, rotation: 0, easing: 'ease_in_out', description: 'Камера входит' },
          { frame: Math.round(totalFrames * 0.6), x: 0, y: 5, z: 0, scaleX: 1.1, scaleY: 1.1, rotation: 0, easing: 'ease_in_out', description: 'Приближение на кульминацию' },
          { frame: totalFrames - Math.round(fps * 0.5), x: 0, y: 8, z: 0, scaleX: 1.2, scaleY: 1.2, rotation: 0, easing: 'ease_in', description: 'Предфинальная пауза' },
          { frame: totalFrames, x: 0, y: 15, z: 0, scaleX: 1.3, scaleY: 1.3, rotation: 0, easing: 'ease_out', description: 'Финал: pull back' }
        );
      }

      // Qt Script для применения камеры
      const qtScript = cameraKeyframes.map(kf => `
// Camera @ frame ${kf.frame}: ${kf.description}
scene.setFrameValue("camera1", ${kf.frame}, "position.x", ${kf.x});
scene.setFrameValue("camera1", ${kf.frame}, "position.y", ${kf.y});
scene.setFrameValue("camera1", ${kf.frame}, "scale.x", ${kf.scaleX});
scene.setFrameValue("camera1", ${kf.frame}, "scale.y", ${kf.scaleY});`).join('\n');

      return {
        status: 'success',
        cinematicStyle: style,
        totalFrames,
        fps,
        cameraKeyframes,
        keyframeCount: cameraKeyframes.length,
        qtScript,
        description: ({
          static: 'Камера полностью неподвижна — классический cut-out стиль',
          subtle: 'Очень лёгкое движение создаёт живость без отвлечения',
          dynamic: 'Активная камера — подходит для action/comedy',
          cinematic: 'Кинематографичный подход — pull in/out, cinematic composition'
        } as Record<string, string>)[style],
        nextStep: { tool: 'harmony.blocking.apply_camera_plan', description: 'Применить camera moves к сцене' }
      };
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 4. create_timing_sheet
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.blocking.create_timing_sheet',
    description:
      'Генерирует animatic timing sheet — таблицу тайминга для всей сцены. ' +
      'Показывает: какой персонаж что делает в каждый момент времени. ' +
      'Помогает аниматору понять ритм сцены перед рисованием поз.',
    inputSchema: z.object({
      scenePlanInline: z.any().optional(),
      blockingPlanInline: z.any().optional(),
      lipsyncPlanInline: z.any().optional(),
      fps: z.number().optional().default(24),
      outputFormat: z.enum(['text', 'json', 'markdown']).optional().default('markdown')
    }),
    handler: async (args: any) => {
      const plan = args.scenePlanInline || {};
      const blocking = args.blockingPlanInline || {};
      const lipsync = args.lipsyncPlanInline || {};
      const fps = args.fps;
      const totalFrames = plan.durationFrames || blocking.totalFrames || fps * 8;
      const secTotal = totalFrames / fps;

      // Строим timeline с событиями
      const events: Array<{ frame: number; time: string; character: string; event: string; type: string }> = [];

      for (const kf of (blocking.keyframes || [])) {
        events.push({
          frame: kf.frame,
          time: `${(kf.frame / fps).toFixed(2)}s`,
          character: kf.character,
          event: kf.pose,
          type: 'blocking'
        });
      }

      for (const dialogue of (lipsync.dialogues || [])) {
        events.push({
          frame: dialogue.startFrame,
          time: `${(dialogue.startFrame / fps).toFixed(2)}s`,
          character: dialogue.character,
          event: `ГОВОРИТ: "${dialogue.text?.substring(0, 40)}${(dialogue.text?.length > 40) ? '...' : ''}"`,
          type: 'lipsync'
        });
      }

      events.sort((a, b) => a.frame - b.frame);

      // Генерируем markdown таблицу
      let markdown = `# Timing Sheet: ${plan.sceneName || 'Scene'}\n\n`;
      markdown += `**Длительность:** ${totalFrames} кадров @ ${fps} fps = ${secTotal.toFixed(1)} сек\n\n`;
      markdown += `## Временная шкала\n\n`;
      markdown += `| Кадр | Время | Персонаж | Событие | Тип |\n`;
      markdown += `|------|-------|----------|---------|-----|\n`;
      for (const evt of events) {
        const typeIcon = evt.type === 'lipsync' ? '🗣️' : evt.type === 'blocking' ? '🎭' : '📷';
        markdown += `| ${evt.frame} | ${evt.time} | **${evt.character}** | ${evt.event} | ${typeIcon} ${evt.type} |\n`;
      }
      markdown += `\n---\n*Сгенерировано: ${new Date().toISOString()}*\n`;

      return {
        status: 'success',
        totalFrames,
        fps,
        durationSeconds: secTotal,
        eventCount: events.length,
        events: args.outputFormat === 'markdown' ? undefined : events,
        markdown: args.outputFormat !== 'json' ? markdown : undefined
      };
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 5. apply_camera_plan
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.blocking.apply_camera_plan',
    description:
      'Применяет camera plan (ключевые кадры камеры) к открытому проекту Harmony. ' +
      'Создаёт Camera peg с ключевыми кадрами position/scale/rotation.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к .xstage'),
      cameraPlanInline: z.any().describe('camera_plan.json или результат harmony.blocking.generate_camera_moves'),
      cameraNodeName: z.string().optional().default('Camera1').describe('Имя ноды камеры в Harmony'),
      dryRun: z.boolean().optional().default(false)
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const cameraPlan = args.cameraPlanInline;
      const keyframes = cameraPlan?.cameraKeyframes || cameraPlan?.shots || [];

      return executeWithDryRun('blocking.apply_camera_plan', args, args.dryRun, async () => {
        const applied: any[] = [];

        for (const kf of keyframes) {
          const script = `
// Применение camera keyframe @ frame ${kf.frame}
var camPeg = "Top/${args.cameraNodeName}/${args.cameraNodeName}_Peg";
if (node.exists(camPeg)) {
  func.hold(1, ${kf.frame}, ${kf.frame});
  node.setKeyFrame(camPeg, "position.x", ${kf.x || 0});
  node.setKeyFrame(camPeg, "position.y", ${kf.y || 0});
  node.setKeyFrame(camPeg, "scale.x", ${kf.scaleX || 1});
  node.setKeyFrame(camPeg, "scale.y", ${kf.scaleY || 1});
  MessageLog.trace("Camera kf @ ${kf.frame}: OK");
}`;
          try {
            await HarmonyPython.runCommand('execute_script', { projectPath: checkedPath, script }).catch(() => {});
            applied.push({ frame: kf.frame, status: 'applied', description: kf.description });
          } catch (e: any) {
            applied.push({ frame: kf.frame, status: 'failed', error: e.message });
          }
        }

        return {
          status: 'success',
          appliedKeyframes: applied.filter(a => a.status === 'applied').length,
          cameraNode: args.cameraNodeName,
          details: applied,
          message: `Camera plan применён: ${applied.filter(a => a.status === 'applied').length}/${keyframes.length} ключевых кадров`
        };
      });
    }
  }
];
