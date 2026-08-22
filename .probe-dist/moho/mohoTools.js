/**
 * mohoTools.ts — сборка набора тулов Moho для диспетчера.
 *
 * Единственное место, где Moho-мост встречается с реестром тулов сервера.
 * Здесь создаётся IPC-клиент, тулы регистрируются в коллектор (см.
 * ./registry.ts) и отдаются наружу массивом в том же виде, что любой
 * Harmony-набор из src/tools/*.
 *
 * Модуль намеренно НЕ импортируется из src/index.ts на верхнем уровне:
 * при ANIM_HOST=harmony IPC-клиент Moho создаваться не должен. Загрузка
 * выполняется по требованию, когда активный хост действительно moho.
 */
import { z } from 'zod';
import { MohoClient } from './moho-client.js';
import { MohoToolCollector } from './registry.js';
import { registerTools } from './tools.js';
/**
 * Собирает набор Moho-тулов.
 *
 * `z.object` передаётся фабрикой, чтобы схемы строились тем же экземпляром
 * zod, которым диспетчер потом делает safeParse: два разных экземпляра
 * библиотеки в одном процессе дают схемы, не узнающие друг друга.
 */
export function buildMohoTools() {
    const collector = new MohoToolCollector(shape => z.object(shape));
    const client = new MohoClient();
    // registerTools ожидает объект с методом .tool(...) — коллектор совместим
    // по вызову. Приведение локально и намеренно: реального McpServer здесь нет.
    registerTools(collector, client);
    // Предупреждение о пропущенных легаси-алиасах — в stderr: stdout занят
    // каналом JSON-RPC, любая посторонняя запись туда ломает протокол.
    const skipped = collector.skipped();
    if (skipped.length > 0) {
        console.error(`[moho] Пропущено легаси-алиасов: ${skipped.length} (${skipped.join(', ')}). ` +
            'В едином сервере они не поддерживаются — используйте имена moho.*. ' +
            'Снимите MOHO_MCP_ENABLE_LEGACY_ALIASES, чтобы убрать это предупреждение.');
    }
    return collector.tools();
}
