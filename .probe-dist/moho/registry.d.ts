/**
 * registry.ts — шов между Moho-тулами и диспетчером этого проекта.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. `tools.ts` приехал из отдельного репозитория,
 * где регистрировался через новый SDK API (`McpServer.tool(...)`). В этом
 * проекте 561 Harmony-тул регистрируется иначе: массив `defineTool`-объектов,
 * который диспетчер в `src/index.ts` перебирает вручную. Два способа
 * регистрации в одном процессе невозможны, и по контракту побеждает стиль
 * Harmony — потому что переписывать 59 тулов дешевле и безопаснее, чем 561.
 *
 * Вместо переписывания 59 хендлеров здесь подменяется ОДНА обёртка: файл
 * предоставляет объект, совместимый по вызову с `McpServer`, но вместо
 * регистрации в SDK складывающий тулы в массив.
 *
 * ДВА РАСХОЖДЕНИЯ, КОТОРЫЕ ЗДЕСЬ ИСПРАВЛЯЮТСЯ. Их легко пропустить, потому
 * что типы совпадают и код собирается в обоих случаях:
 *
 *   1. ДВОЙНАЯ УПАКОВКА. Harmony-хендлер возвращает СЫРЫЕ данные, а
 *      диспетчер сам заворачивает их в `{ content: [{ type, text }] }`.
 *      Moho-хендлеры уже возвращают готовый `{ content: [...] }` через
 *      `successContent`. Без распаковки клиент получил бы JSON-строку,
 *      внутри которой лежит ещё один блок `content` с JSON-строкой внутри —
 *      то есть данные, которые модель не сможет прочитать.
 *
 *   2. ПРОГЛОЧЕННАЯ ОШИБКА. `errorContent` не бросает, а ВОЗВРАЩАЕТ объект
 *      с `isError: true`. Для диспетчера Harmony это обычный успешный
 *      результат: он выставляет `isError` только на пойманном исключении.
 *      Без обратного превращения в исключение отказ Moho («плагин не
 *      отвечает», «нет подтверждения разрушающей операции») пришёл бы
 *      клиенту как успех, и агент продолжил бы работу на ложных данных.
 */
import type { z } from 'zod';
import type { TypedTool } from '../tools/defineTool.js';
/** Ошибка Moho-тула, восстановленная из проглоченного `errorContent`. */
export declare class MohoToolError extends Error {
    readonly code: string;
    readonly details: unknown;
    constructor(message: string, code: string, details: unknown);
}
/** Приводит результат Moho-хендлера к тому, что ожидает диспетчер Harmony. */
export declare function adaptHandlerResult(raw: unknown): unknown;
/**
 * Приёмник регистрации, совместимый по вызову с `McpServer`.
 *
 * `tools.ts` вызывает `(server as any).tool(name, description, schema, handler)`.
 * Здесь тот же вызов складывает тул в массив, попутно переименовывая его по
 * карте и оборачивая хендлер адаптером результата.
 */
export declare class MohoToolCollector {
    private readonly schemaFactory;
    private readonly collected;
    private readonly seen;
    private readonly skippedLegacyAliases;
    /**
     * @param schemaFactory Собирает Zod-объект из «сырых» полей схемы. Передаётся
     *   снаружи, чтобы этот файл не решал, какой именно `zod` использовать: у
     *   схем Moho и у диспетчера Harmony должен быть один экземпляр библиотеки.
     */
    constructor(schemaFactory: (shape: Record<string, z.ZodTypeAny>) => z.ZodTypeAny);
    tool(name: string, description: string, shape: Record<string, z.ZodTypeAny>, handler: (args: Record<string, unknown>) => Promise<unknown> | unknown): void;
    /** Собранные тулы в порядке регистрации. */
    tools(): TypedTool<z.ZodTypeAny>[];
    /** Пропущенные легаси-алиасы. Пусто, если MOHO_MCP_ENABLE_LEGACY_ALIASES не включён. */
    skipped(): string[];
}
