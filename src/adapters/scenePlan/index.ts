import { scenePlanSchema } from '../../schemas/scenePlan.js';
import { HarmonyError } from '../../security.js';

export interface PlanStep {
  id: string;
  type: 'ui' | 'api_or_ui' | 'ui_or_script' | 'template' | 'ui_or_python' | 'script_or_ui' | 'render' | 'audit' | 'manual';
  description: string;
  precondition: string;
  action: {
    method: string;
    params: any;
  };
  verification: {
    expected: string;
    type: 'ui_state' | 'file_exists' | 'api_query' | 'log_regex';
  };
  fallback: {
    strategy: 'retry' | 'hotkey_reset' | 'api_fallback' | 'human_confirm';
    params?: any;
  };
  riskLevel: 'low' | 'medium' | 'high';
  rollbackNote?: string;
}

export interface ExecutionPlan {
  goal: string;
  production: string;
  episode: string;
  sceneName: string;
  steps: PlanStep[];
}

export class ScenePlanAdapter {
  static validate(plan: any): void {
    const res = scenePlanSchema.safeParse(plan);
    if (!res.success) {
      throw new HarmonyError(
        'INVALID_HARMONY_OBJECT',
        `Scene Plan JSON validation failed: ${res.error.message}`,
        res.error.format()
      );
    }
  }

  static generateExecutionPlan(plan: any): ExecutionPlan {
    this.validate(plan);

    const steps: PlanStep[] = [];

    // 1. Открытие программы
    steps.push({
      id: 'open_harmony',
      type: 'ui',
      description: 'Открыть приложение Toon Boom Harmony',
      precondition: 'Harmony Premium не активна или находится в фоновом режиме',
      action: {
        method: 'start_application',
        params: { app: 'HarmonyPremium' }
      },
      verification: {
        expected: 'Harmony Premium активное окно',
        type: 'ui_state'
      },
      fallback: {
        strategy: 'human_confirm',
        params: { prompt: 'Пожалуйста, откройте Toon Boom Harmony вручную и нажмите продолжить.' }
      },
      riskLevel: 'low'
    });

    // 2. Создание или открытие сцены
    steps.push({
      id: 'create_scene',
      type: 'api_or_ui',
      description: `Создать или открыть сцену ${plan.sceneName}`,
      precondition: 'Harmony Premium запущена',
      action: {
        method: 'create_scene_from_template',
        params: {
          sceneName: plan.sceneName,
          template: plan.workspaceTemplate || 'default_scene_template',
          width: plan.resolution?.width || 1920,
          height: plan.resolution?.height || 1080,
          fps: plan.fps || 24,
          frames: plan.durationFrames || 192
        }
      },
      verification: {
        expected: `scene_open: ${plan.sceneName}`,
        type: 'ui_state'
      },
      fallback: {
        strategy: 'api_fallback',
        params: { fallback_method: 'harmony.scene.open_project' }
      },
      riskLevel: 'medium',
      rollbackNote: 'Удалить созданную директорию сцены при сбое'
    });

    // 3. Импорт фона
    if (plan.background) {
      steps.push({
        id: 'import_background',
        type: 'ui_or_script',
        description: `Импортировать фоновое изображение: ${plan.background.file}`,
        precondition: 'Сцена открыта',
        action: {
          method: 'import_background_layer',
          params: {
            file: plan.background.file,
            layerName: plan.background.layerName,
            scale: plan.background.scale || 1
          }
        },
        verification: {
          expected: `asset_exists:${plan.background.layerName}`,
          type: 'ui_state'
        },
        fallback: {
          strategy: 'retry',
          params: { retries: 2 }
        },
        riskLevel: 'low'
      });
    }

    // 4. Импорт персонажей и их расстановка
    if (plan.characters && plan.characters.length > 0) {
      for (const char of plan.characters) {
        steps.push({
          id: `import_rig_${char.name.toLowerCase()}`,
          type: 'template',
          description: `Импортировать риг персонажа: ${char.name} (${char.rig})`,
          precondition: 'Сцена открыта',
          action: {
            method: 'import_character_rig',
            params: {
              name: char.name,
              rig: char.rig,
              positionPreset: char.positionPreset || 'center'
            }
          },
          verification: {
            expected: `asset_exists:${char.name}`,
            type: 'ui_state'
          },
          fallback: {
            strategy: 'human_confirm',
            params: { prompt: `Не удалось импортировать риг ${char.name}. Импортируйте его вручную и нажмите продолжить.` }
          },
          riskLevel: 'medium'
        });

        // Импорт аудио и липсинк для персонажей
        if (char.actions) {
          for (let aIdx = 0; aIdx < char.actions.length; aIdx++) {
            const action = char.actions[aIdx];
            if (action.audio) {
              steps.push({
                id: `import_audio_${char.name.toLowerCase()}_act_${aIdx}`,
                type: 'ui_or_script',
                description: `Импортировать аудио дорожку: ${action.audio} для ${char.name}`,
                precondition: 'Сцена открыта',
                action: {
                  method: 'import_audio_track',
                  params: {
                    file: action.audio,
                    startFrame: action.frames[0] || 1
                  }
                },
                verification: {
                  expected: `asset_exists:${action.audio.split('/').pop()}`,
                  type: 'ui_state'
                },
                fallback: {
                  strategy: 'retry',
                  params: { retries: 1 }
                },
                riskLevel: 'low'
              });

              if (action.mouthChart) {
                steps.push({
                  id: `lipsync_${char.name.toLowerCase()}_act_${aIdx}`,
                  type: 'ui_or_python',
                  description: `Применить черновой липсинк для ${char.name} с таблицей ${action.mouthChart}`,
                  precondition: `Аудио дорожка ${action.audio} импортирована`,
                  action: {
                    method: 'apply_lipsync_mouth_chart',
                    params: {
                      character: char.name,
                      audio: action.audio,
                      mouthChart: action.mouthChart,
                      startFrame: action.frames[0],
                      endFrame: action.frames[1]
                    }
                  },
                  verification: {
                    expected: `lipsync_applied:${char.name}`,
                    type: 'ui_state'
                  },
                  fallback: {
                    strategy: 'human_confirm',
                    params: { prompt: `Пожалуйста, проверьте lipsync для ${char.name} на таймлайне и нажмите продолжить.` }
                  },
                  riskLevel: 'medium'
                });
              }
            }
          }
        }
      }
    }

    // 5. Анимация камеры
    if (plan.camera) {
      steps.push({
        id: 'camera_move',
        type: 'script_or_ui',
        description: `Применить движение камеры по пресету: ${plan.camera.preset}`,
        precondition: 'Сцена открыта, камера присутствует',
        action: {
          method: 'apply_camera_preset',
          params: {
            preset: plan.camera.preset,
            startFrame: plan.camera.startFrame || 1,
            endFrame: plan.camera.endFrame || 192
          }
        },
        verification: {
          expected: 'Камера содержит ключевые кадры движения',
          type: 'ui_state'
        },
        fallback: {
          strategy: 'hotkey_reset',
          params: { hotkey: 'reset_workspace' }
        },
        riskLevel: 'medium'
      });
    }

    // 6. Спецэффекты
    if (plan.effects && plan.effects.length > 0) {
      for (const fx of plan.effects) {
        steps.push({
          id: `fx_${fx.type}_on_${fx.target}`,
          type: 'script_or_ui',
          description: `Применить эффект ${fx.type} к узлу ${fx.target}`,
          precondition: `Узел ${fx.target} существует в сцене`,
          action: {
            method: 'apply_fx_preset',
            params: {
              type: fx.type,
              target: fx.target,
              startFrame: fx.frames[0],
              endFrame: fx.frames[1]
            }
          },
          verification: {
            expected: `Эффект ${fx.type} подключен к ${fx.target}`,
            type: 'ui_state'
          },
          fallback: {
            strategy: 'human_confirm',
            params: { prompt: `Добавьте эффект ${fx.type} к ${fx.target} вручную и нажмите продолжить.` }
          },
          riskLevel: 'medium'
        });
      }
    }

    // 7. Сохранение сцены
    steps.push({
      id: 'save_scene',
      type: 'api_or_ui',
      description: 'Сохранить текущие изменения сцены',
      precondition: 'Сцена открыта и изменена',
      action: {
        method: 'save_scene',
        params: {}
      },
      verification: {
        expected: 'Harmony Premium - [Saved]',
        type: 'ui_state'
      },
      fallback: {
        strategy: 'hotkey_reset',
        params: { hotkey: 'save' }
      },
      riskLevel: 'low'
    });

    // 8. Рендеринг
    if (plan.render) {
      steps.push({
        id: 'render_preview',
        type: 'render',
        description: `Выполнить рендеринг превью сцены (${plan.render.format})`,
        precondition: 'Сцена сохранена',
        action: {
          method: 'render_scene_preview',
          params: {
            format: plan.render.format || 'mp4',
            quality: plan.render.quality || 'low'
          }
        },
        verification: {
          expected: 'Файл превью-рендера существует на диске и размер > 0',
          type: 'file_exists'
        },
        fallback: {
          strategy: 'human_confirm',
          params: { prompt: 'Рендеринг завершился с ошибкой. Запустите рендер вручную, проверьте результат и нажмите продолжить.' }
        },
        riskLevel: 'high'
      });
    }

    // 9. Финальный аудит
    steps.push({
      id: 'audit_result',
      type: 'audit',
      description: 'Провести финальный аудит и проверку сцены на целостность ассетов',
      precondition: 'Сцена готова к сдаче',
      action: {
        method: 'audit_scene_result',
        params: {}
      },
      verification: {
        expected: 'Аудит пройден: 0 битых связей, все слои заполнены',
        type: 'api_query'
      },
      fallback: {
        strategy: 'human_confirm',
        params: { prompt: 'Обнаружены ошибки сборки в аудите. Исправьте их перед сдачей и нажмите продолжить.' }
      },
      riskLevel: 'low'
    });

    return {
      goal: `Собрать сцену Harmony: ${plan.sceneName}`,
      production: plan.production,
      episode: plan.episode,
      sceneName: plan.sceneName,
      steps
    };
  }
}
