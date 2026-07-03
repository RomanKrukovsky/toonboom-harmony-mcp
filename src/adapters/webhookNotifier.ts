import { config } from '../config.js';

export class WebhookNotifier {
  /**
   * Отправляет сообщение в Discord/Slack вебхук при важных событиях конвейера
   * @param event Название события
   * @param details Подробности
   * @param level Уровень важности ('info' | 'warning' | 'error')
   */
  static async sendNotification(
    event: string,
    details: string,
    level: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    const url = process.env.HARMONY_WEBHOOK_URL || '';
    if (!url) {
      return;
    }

    const colors = {
      info: 3447003, // Синий
      warning: 16776960, // Желтый
      error: 15158332 // Красный
    };

    const payload = {
      username: 'Harmony Autopilot MCP',
      embeds: [
        {
          title: `🤖 Autopilot: ${event}`,
          description: details,
          color: colors[level],
          timestamp: new Date().toISOString(),
          footer: {
            text: `Host: ${config.harmonyCcHost}`
          }
        }
      ]
    };

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e: any) {
      console.error(`[WebhookNotifier] Не удалось отправить уведомление: ${e.message}`);
    }
  }
}
