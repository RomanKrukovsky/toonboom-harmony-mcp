export declare class WebhookNotifier {
    /**
     * Отправляет сообщение в Discord/Slack вебхук при важных событиях конвейера
     * @param event Название события
     * @param details Подробности
     * @param level Уровень важности ('info' | 'warning' | 'error')
     */
    static sendNotification(event: string, details: string, level?: 'info' | 'warning' | 'error'): Promise<void>;
}
