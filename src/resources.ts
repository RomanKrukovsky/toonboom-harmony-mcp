import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { tracker } from './adapters/sqliteTracker.js';
import { limitOutput } from './security.js';

export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: () => Promise<string>;
}

export const resources: McpResource[] = [
  {
    uri: 'harmony://config',
    name: 'Конфигурация Harmony',
    description: 'Текущие настройки сервера (пути установки, политики безопасности, разрешенные директории).',
    mimeType: 'application/json',
    read: async () => {
      const redacted = {
        harmonyInstall: config.harmonyInstall,
        harmonyCcHost: config.harmonyCcHost,
        harmonyCcPort: config.harmonyCcPort,
        harmonyCcUser: config.harmonyCcUser,
        scriptTimeoutMs: config.scriptTimeoutMs,
        dryRunDefault: config.dryRunDefault,
        allowDestructive: config.allowDestructive,
        allowRawScripts: config.allowRawScripts,
        allowedRoots: config.allowedRoots,
        logDir: config.logDir
      };
      return JSON.stringify(redacted, null, 2);
    }
  },
  {
    uri: 'harmony://capabilities',
    name: 'Доступные функции Harmony',
    description: 'Проверка доступности различных интерфейсов автоматизации (Python, Control Center) в текущей среде.',
    mimeType: 'application/json',
    read: async () => {
      return JSON.stringify({
        hasPythonApi: fs.existsSync(config.harmonyPythonPackages),
        hasControlCenterBin: fs.existsSync(config.harmonyCcBin),
        scriptServerPort: config.harmonyCcPort
      }, null, 2);
    }
  },
  {
    uri: 'harmony://logs/latest',
    name: 'Лог операций Harmony MCP',
    description: 'Последние операции сервера MCP в структурированном формате JSONL.',
    mimeType: 'text/plain',
    read: async () => {
      const logFile = path.join(config.logDir, 'harmony_mcp.log');
      if (!fs.existsSync(logFile)) {
        return 'Логи не найдены.';
      }
      const logs = fs.readFileSync(logFile, 'utf-8');
      return limitOutput(logs);
    }
  },
  {
    uri: 'harmony://production/status',
    name: 'Статус локального трекера',
    description: 'Текущий сводный статус задач и сцен в базе данных локального трекера.',
    mimeType: 'application/json',
    read: async () => {
      await tracker.initialize();
      const report = await tracker.getStatusReport();
      return JSON.stringify(report, null, 2);
    }
  },
  {
    uri: 'harmony://docs/setup',
    name: 'Справка по установке и настройке',
    description: 'Руководство по развертыванию Toon Boom Harmony Server.',
    mimeType: 'text/markdown',
    read: async () => {
      return `
# Установка и настройка Harmony Server
1. Установите Harmony Server на главную машину.
2. Проинициализируйте общую сетевую базу данных USA_DB.
3. Убедитесь в наличии прав сетевого доступа к USA_DB для всех рендер-нод студии.
4. Откройте порты 5678 и 5680 в брандмауэре.
      `.trim();
    }
  },
  {
    uri: 'harmony://docs/control-center-scripting',
    name: 'Справка по скриптам Control Center',
    description: 'Справочные примечания по написанию и вызову скриптов Control Center.',
    mimeType: 'text/markdown',
    read: async () => {
      return `
# Примечания по скриптам Control Center
- Скрипты должны определять функцию и запускать ее.
- В пакетном режиме (\`-runScript\`) НЕ оборачивайте тело скрипта в команды \`TB_BeginScript\` и \`TB_EndScript\`.
- В режиме удаленного Telnet-вызова тело скрипта ОБЯЗАТЕЛЬНО должно находиться внутри \`TB_BeginScript\` и \`TB_EndScript\`.
- Администратор по умолчанию: \`usabatch\` (НЕ УДАЛЯТЬ).
      `.trim();
    }
  },
  {
    uri: 'harmony://docs/python-api',
    name: 'Справка по Python API Harmony',
    description: 'Справочные примечания по работе с локальным Python API Toon Boom.',
    mimeType: 'text/markdown',
    read: async () => {
      return `
# Справка по Python API Harmony
- Стандартный импорт: \`from ToonBoom import harmony\`
- Получение активного проекта: \`harmony.session().project\`
- Любые изменения в сцене должны сохраняться явным вызовом \`project.save()\`.
- Синхронизируйте изменения в дереве нод с помощью блокировки потока:
  \`\`\`python
  with harmony.thread_lock():
      # операции изменения графа нод
  \`\`\`
      `.trim();
    }
  },
  {
    uri: 'harmony://docs/security',
    name: 'Безопасность автоматизации Harmony',
    description: 'Политики безопасности, ограничения доступа и dry-run симуляции.',
    mimeType: 'text/markdown',
    read: async () => {
      return `
# Безопасность Harmony MCP
1. Dry-run включен по умолчанию для предотвращения порчи данных.
2. Все деструктивные операции требуют явного confirm и подписи confirmationText.
3. Path traversal блокируется проверкой путей внутри разрешенных HARMONY_ALLOWED_ROOTS.
4. Прямой запуск shell-команд полностью запрещен.
      `.trim();
    }
  },
  {
    uri: 'harmony://docs/limitations',
    name: 'Ограничения автоматизации',
    description: 'Текущие функциональные ограничения и поддерживаемые версии Harmony.',
    mimeType: 'text/markdown',
    read: async () => {
      return `
# Известные ограничения
- Python API официально поддерживается начиная с версии Harmony 24.
- Некоторые изменения интерфейса и Master Controllers требуют обязательного перезапуска сцены или вызова refresh.
- Удаленная Telnet-сессия Control Center не имеет доступа к графическому интерфейсу Qt.
      `.trim();
    }
  }
];
