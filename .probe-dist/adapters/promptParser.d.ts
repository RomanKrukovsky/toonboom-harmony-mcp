import { ParsedScene } from '../schemas/studio.js';
/**
 * PromptParser — разбирает free-form промпт сцены → структурированные данные.
 *
 * ВАЖНО: MCP-сервер не имеет прямого доступа к LLM.
 * Этот модуль выполняет ЭВРИСТИЧЕСКИЙ разбор (regex + keywords) для
 * создания базовой структуры. Вызывающий агент (Claude/Gemini) получает
 * промпт-шаблоны через resources/prompts и выполняет умный разбор сам.
 *
 * Для production-качества агент должен:
 *   1. Вызвать harmony.studio.from_prompt
 *   2. Получить prompt_template из результата
 *   3. Выполнить собственный LLM-вызов со structured output
 *   4. Вернуть результат в harmony.studio.run_full_pipeline
 */
export declare class PromptParser {
    /**
     * Главный метод: промпт → ParsedScene (эвристика + defaults).
     * Возвращает базовую структуру, которую агент может уточнить.
     */
    static parse(opts: {
        prompt: string;
        production?: string;
        episode?: string;
        sceneName?: string;
        fps?: number;
        durationSeconds?: number;
        resolution?: {
            width: number;
            height: number;
        };
        language?: 'ru' | 'en' | 'auto';
    }): ParsedScene;
    private static extractCharacters;
    private static buildCharacterSpec;
    private static extractSetting;
    private static extractMood;
    private static extractTimeOfDay;
    private static extractDialogues;
    private static buildCameraPlan;
    private static buildLipsyncPlan;
    private static generatePlaceholderPhonemes;
    private static buildBlockingPlan;
    private static buildAssetRequirements;
    private static buildScenePlan;
    private static extractSceneName;
    private static estimateConfidence;
    /**
     * Генерирует системный промпт для LLM-агента,
     * чтобы тот улучшил эвристический разбор до production-качества.
     */
    static generateAgentPrompt(parsedScene: ParsedScene): string;
}
