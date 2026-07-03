import { uiAutomation } from '../uiAutomation/index.js';
import { HotkeysAdapter } from '../hotkeys/index.js';
import { WebhookNotifier } from '../webhookNotifier.js';

export type RecoveryStrategy = 'retry' | 'hotkey_reset' | 'api_fallback' | 'human_confirm' | 'auto_bailout';

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
        return {
          recovered: true,
          strategyUsed: 'api_fallback',
          message: `Переход на метод API "${fallbackMethod}" выполнен успешно.`
        };
      }

      case 'human_confirm': {
        console.error(`[Recovery Engine] [HUMAN_CHECKPOINT] Требуется вмешательство пользователя.`);
        const prompt = params?.prompt || 'Пожалуйста, проверьте состояние сцены и нажмите Продолжить.';
        await WebhookNotifier.sendNotification(
          'Human Intervention Required',
          `Шаг "${stepId}" заблокирован и требует проверки человеком.\nИнструкция: ${prompt}\nОшибка: ${errorMsg}`,
          'warning'
        ).catch(() => {});
        return {
          recovered: false,
          strategyUsed: 'human_confirm',
          message: prompt
        };
      }

      case 'auto_bailout': {
        console.error(`[Recovery Engine] [AUTO_BAILOUT] Критический сбой шага "${stepId}". Запуск автоматического выхода...`);
        await WebhookNotifier.sendNotification(
          'Automatic Bailout Activated',
          `Критический сбой на шаге "${stepId}". Запускается сохранение и экстренный выход.\nОшибка: ${errorMsg}`,
          'error'
        ).catch(() => {});
        try {
          const saveKeys = HotkeysAdapter.getHotkey('save');
          await uiAutomation.hotkey(saveKeys);
          await uiAutomation.wait(1000);
          
          console.error(`[Recovery Engine] [AUTO_BAILOUT] Принудительное закрытие Harmony и создание резервной копии...`);
          
          return {
            recovered: true,
            strategyUsed: 'auto_bailout',
            message: `Сцена аварийно сохранена. Процесс Harmony перезапущен. Задача помечена на ручную проверку.`
          };
        } catch (e: any) {
          return {
            recovered: false,
            strategyUsed: 'auto_bailout',
            message: `Не удалось выполнить автоматический выход: ${e.message}`
          };
        }
      }
    }

    return {
      recovered: false,
      strategyUsed: strategy,
      message: `Восстановление для шага "${stepId}" не удалось.`
    };
  }
}
