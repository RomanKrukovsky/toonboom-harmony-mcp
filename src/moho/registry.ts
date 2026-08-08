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
import { isUnsupportedLegacyAlias, renamed } from './toolNames.js';

/** Форма ответа, которую строят `successContent` / `errorContent` в tools.ts. */
interface McpContentResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: true;
}

/** Ошибка Moho-тула, восстановленная из проглоченного `errorContent`. */
export class MohoToolError extends Error {
  public readonly code: string;
  public readonly details: unknown;

  constructor(message: string, code: string, details: unknown) {
    super(message);
    this.name = 'MohoToolError';
    this.code = code;
    this.details = details;
  }
}

/** Похоже ли значение на результат в формате MCP-контента. */
function isContentResult(value: unknown): value is McpContentResult {
  if (typeof value !== 'object' || value === null) return false;
  const content = (value as { content?: unknown }).content;
  return Array.isArray(content);
}

/**
 * Разворачивает `{ content: [{ text }] }` назад в данные.
 *
 * Хендлеры Moho кладут в `text` результат `JSON.stringify(result, null, 2)`.
 * Возвращаем разобранный объект, чтобы диспетчер завернул его ровно один
 * раз. Если текст не разбирается как JSON (сообщение об ошибке платформы,
 * пустая строка), отдаём строку как есть — терять диагностику нельзя.
 */
function unwrapContent(result: McpContentResult): unknown {
  const parts = result.content
    .filter(part => part && part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text);
  const text = parts.join('\n');

  if (text.length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Превращает проглоченную ошибку обратно в исключение.
 *
 * `errorContent` кодирует отказ IPC как `{ error: { code, message, ... } }`,
 * а прочие сбои — простой строкой. Разбираем оба случая, чтобы диспетчер
 * получил настоящее исключение и выставил клиенту `isError`.
 */
function throwFromErrorContent(result: McpContentResult): never {
  const payload = unwrapContent(result);

  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const err = (payload as { error: Record<string, unknown> }).error ?? {};
    const message = typeof err.message === 'string' ? err.message : 'Moho-тул завершился ошибкой';
    const code = typeof err.code === 'string' || typeof err.code === 'number' ? String(err.code) : 'MOHO_TOOL_ERROR';
    throw new MohoToolError(message, code, err);
  }

  const message = typeof payload === 'string' && payload.length > 0 ? payload : 'Moho-тул завершился ошибкой';
  throw new MohoToolError(message, 'MOHO_TOOL_ERROR', payload);
}

/** Приводит результат Moho-хендлера к тому, что ожидает диспетчер Harmony. */
export function adaptHandlerResult(raw: unknown): unknown {
  if (!isContentResult(raw)) return raw;
  if (raw.isError === true) throwFromErrorContent(raw);
  return unwrapContent(raw);
}

/**
 * Приёмник регистрации, совместимый по вызову с `McpServer`.
 *
 * `tools.ts` вызывает `(server as any).tool(name, description, schema, handler)`.
 * Здесь тот же вызов складывает тул в массив, попутно переименовывая его по
 * карте и оборачивая хендлер адаптером результата.
 */
export class MohoToolCollector {
  private readonly collected: TypedTool<z.ZodTypeAny>[] = [];
  private readonly seen = new Set<string>();
  private readonly skippedLegacyAliases: string[] = [];

  /**
   * @param schemaFactory Собирает Zod-объект из «сырых» полей схемы. Передаётся
   *   снаружи, чтобы этот файл не решал, какой именно `zod` использовать: у
   *   схем Moho и у диспетчера Harmony должен быть один экземпляр библиотеки.
   */
  constructor(private readonly schemaFactory: (shape: Record<string, z.ZodTypeAny>) => z.ZodTypeAny) {}

  tool(
    name: string,
    description: string,
    shape: Record<string, z.ZodTypeAny>,
    handler: (args: Record<string, unknown>) => Promise<unknown> | unknown
  ): void {
    // Легаси-алиасы старого репозитория пропускаются, а не роняют сервер.
    // `tools.ts` регистрирует их при MOHO_MCP_ENABLE_LEGACY_ALIASES=true, и
    // бросок здесь означал бы, что включение флага делает сервер вообще
    // незапускаемым: человек получал бы падение старта вместо 59 рабочих
    // тулов. Пропуск с предупреждением честнее — тулы работают под именами
    // moho.*, а про алиасы сказано прямо. Предупреждение идёт в stderr:
    // stdout занят каналом JSON-RPC.
    if (isUnsupportedLegacyAlias(name)) {
      this.skippedLegacyAliases.push(name);
      return;
    }

    const publicName = renamed(name);

    // Дубликат имени означает, что карта переименования свела два разных тула
    // в одно имя. Молча оставить первый — потерять второй без следа.
    if (this.seen.has(publicName)) {
      throw new Error(`Повторное имя Moho-тула после переименования: ${publicName} (исходное ${name})`);
    }
    this.seen.add(publicName);

    this.collected.push({
      name: publicName,
      description,
      inputSchema: this.schemaFactory(shape ?? {}),
      handler: async (args: unknown) => adaptHandlerResult(await handler((args ?? {}) as Record<string, unknown>))
    });
  }

  /** Собранные тулы в порядке регистрации. */
  tools(): TypedTool<z.ZodTypeAny>[] {
    return this.collected;
  }

  /** Пропущенные легаси-алиасы. Пусто, если MOHO_MCP_ENABLE_LEGACY_ALIASES не включён. */
  skipped(): string[] {
    return [...this.skippedLegacyAliases];
  }
}
