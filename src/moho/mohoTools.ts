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
import type { TypedTool } from '../tools/defineTool.js';
import { config } from './config.js';
import { MohoClient } from './moho-client.js';
import { attachFileSink } from './observability/logger.js';
import { MohoToolCollector } from './registry.js';
import { registerTools } from './tools.js';

/**
 * Подключает файловый сток логов, если задан MOHO_MCP_LOG_FILE.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ФУНКЦИЯ. `attachFileSink` существовал в logger.ts, но его
 * никто не вызывал: переменная MOHO_MCP_LOG_FILE читалась в конфиг и молча
 * никуда не шла. Человек задавал путь, был уверен, что логи пишутся, а файла
 * не появлялось — худший вид отказа, потому что он выглядит как успех.
 *
 * Функция не бросает: невозможность писать лог не должна мешать работе с
 * анимацией. Но и не молчит — про отказ сообщается в stderr, потому что
 * молчание здесь вернуло бы ту же ложь в другом виде.
 */
async function enableFileLogging(): Promise<void> {
  const target = config.moho.logFile;
  if (!target) return;

  const attached = await attachFileSink(target);
  if (attached) {
    console.error(`[moho] Лог пишется в файл: ${target}`);
  } else {
    console.error(
      `[moho] Не удалось открыть файл лога ${target}. Логи остаются только в stderr. ` +
        'Причина указана в диагностическом сообщении выше.'
    );
  }
}

/**
 * Снимает блокировку клиента при завершении процесса.
 *
 * ЗАЧЕМ. `client_lock.json` даёт единственному потребителю право читать
 * ответы из общей папки. Файл создавался, но НЕ удалялся: `disconnect()` в
 * клиенте никто не вызывал, а обработчиков выхода не было. В результате папка
 * копила блокировку с PID мёртвого процесса, и следующий запуск падал с
 * «удерживается другим живым процессом» — процессом, которого нет. Спасал
 * только срок жизни блокировки, то есть ожидание вместо работы.
 *
 * Обработчики ставятся один раз на процесс: повторная сборка набора тулов не
 * должна плодить слушателей (Node предупреждает после десятого).
 *
 * `exit` обязателен: только в нём успевает выполниться синхронное удаление.
 * Сигналы обрабатываются отдельно, потому что при обработчике на SIGINT/SIGTERM
 * Node больше не завершает процесс сам — приходится завершать вручную, иначе
 * Ctrl+C перестанет закрывать сервер.
 */
let exitHandlersInstalled = false;

function installLockRelease(client: MohoClient): void {
  if (exitHandlersInstalled) return;
  exitHandlersInstalled = true;

  process.on('exit', () => client.releaseClientLockSync());

  // SIGHUP включён наравне с SIGINT/SIGTERM: он приходит при закрытии
  // терминала, из которого запущен сервер. Без обработчика такой выход
  // оставлял бы блокировку — тот же дефект, что и раньше, просто по другому
  // сценарию, и найти его было бы сложнее (человек закрыл окно, а следующий
  // запуск ссылается на мёртвый процесс).
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
  const exitCodes: Record<(typeof signals)[number], number> = {
    // Стандартный код завершения по сигналу: 128 + номер сигнала.
    SIGHUP: 129,
    SIGINT: 130,
    SIGTERM: 143
  };

  for (const signal of signals) {
    process.on(signal, () => {
      client.releaseClientLockSync();
      process.exit(exitCodes[signal]);
    });
  }
}

/**
 * Собирает набор Moho-тулов.
 *
 * `z.object` передаётся фабрикой, чтобы схемы строились тем же экземпляром
 * zod, которым диспетчер потом делает safeParse: два разных экземпляра
 * библиотеки в одном процессе дают схемы, не узнающие друг друга.
 */
export function buildMohoTools(): TypedTool<z.ZodTypeAny>[] {
  const collector = new MohoToolCollector(shape => z.object(shape));
  const client = new MohoClient();

  installLockRelease(client);

  // Подключение файлового стока асинхронно, а сборка тулов — нет. Ждать здесь
  // нельзя, не сделав функцию async и не сломав её вызов из диспетчера;
  // терять ошибку тоже нельзя, поэтому отказ логируется в самом обработчике.
  void enableFileLogging();

  // registerTools ожидает объект с методом .tool(...) — коллектор совместим
  // по вызову. Приведение локально и намеренно: реального McpServer здесь нет.
  registerTools(collector as never, client);

  // Предупреждение о пропущенных легаси-алиасах — в stderr: stdout занят
  // каналом JSON-RPC, любая посторонняя запись туда ломает протокол.
  const skipped = collector.skipped();
  if (skipped.length > 0) {
    console.error(
      `[moho] Пропущено легаси-алиасов: ${skipped.length} (${skipped.join(', ')}). ` +
        'В едином сервере они не поддерживаются — используйте имена moho.*. ' +
        'Снимите MOHO_MCP_ENABLE_LEGACY_ALIASES, чтобы убрать это предупреждение.'
    );
  }

  return collector.tools();
}
