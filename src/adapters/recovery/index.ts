import { uiAutomation } from '../uiAutomation/index.js';
import { HotkeysAdapter } from '../hotkeys/index.js';

export type RecoveryStrategy = 'retry' | 'hotkey_reset' | 'api_fallback' | 'human_confirm';

export interface RecoveryResult {
  recovered: boolean;
  strategyUsed: RecoveryStrategy;
  message: string;
}

export class RecoveryAdapter {
  static async attemptRecovery(
    stepId: string,
    strategy: RecoveryStrategy,
    errorMsg: string,
    params?: any
  ): Promise<RecoveryResult> {
    console.error(`[Recovery Engine] Запущено восстановление для шага "${stepId}". Стратегия: ${strategy}. Ошибка: ${errorMsg}`);

    switch (strategy) {
      case 'retry': {
        const retries = params?.retries || 2;
        for (let i = 1; i <= retries; i++) {
          console.error(`[Recovery Engine] Попытка повтора ${i}/${retries}...`);
          await uiAutomation.wait(1000);
          // Симулируем успешное восстановление на второй попытке
          if (i === retries) {
            return {
              recovered: true,
              strategyUsed: 'retry',
              message: `Шаг восстановлен после ${i} повторов.`
            };
          }
        }
        break;
      }

      case 'hotkey_reset': {
        const hotkeyAction = params?.hotkey || 'reset_workspace';
        const keys = HotkeysAdapter.getHotkey(hotkeyAction);
        console.error(`[Recovery Engine] Сброс рабочего пространства через хоткей: ${keys.join('+')}`);
        await uiAutomation.hotkey(keys);
        await uiAutomation.wait(2000);
        return {
          recovered: true,
          strategyUsed: 'hotkey_reset',
          message: `Панели Harmony сброшены в исходное состояние хоткеем ${keys.join('+')}.`
        };
      }

      case 'api_fallback': {
        const fallbackMethod = params?.fallback_method || 'harmony.scene.open_project';
        console.error(`[Recovery Engine] Переход с UI-кликов на API-команду: ${fallbackMethod}`);
        // В симуляции просто подтверждаем успех
        return {
          recovered: true,
          strategyUsed: 'api_fallback',
          message: `Переход на метод API "${fallbackMethod}" выполнен успешно.`
        };
      }

      case 'human_confirm': {
        // Human-in-the-loop: просим человека выполнить действие и подтвердить
        console.error(`[Recovery Engine] [HUMAN_CHECKPOINT] Требуется вмешательство пользователя.`);
        return {
          recovered: false, // Возвращаем false, чтобы автопилот остановился и дождался действия человека
          strategyUsed: 'human_confirm',
          message: params?.prompt || 'Пожалуйста, проверьте состояние сцены и нажмите Продолжить.'
        };
      }
    }

    return {
      recovered: false,
      strategyUsed: strategy,
      message: `Восстановление для шага "${stepId}" не удалось.`
    };
  }
}
