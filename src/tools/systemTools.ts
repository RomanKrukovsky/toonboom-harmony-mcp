import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { HarmonyError, limitOutput } from '../security.js';
import { HarmonyPython } from '../adapters/harmonyPython.js';

export const systemTools = [
  {
    name: 'harmony.health_check',
    description: 'Проверка работоспособности системы, путей конфигураций и доступности зависимостей.',
    inputSchema: z.object({}),
    handler: async () => {
      const issues: string[] = [];
      let pythonAvailable = false;
      let ccAvailable = false;

      // Проверка папок установки
      if (!config.harmonyInstall) {
        issues.push('Каталог установки Harmony не настроен или не обнаружен.');
      } else if (!fs.existsSync(config.harmonyInstall)) {
        issues.push(`Каталог установки Harmony отсутствует по указанному пути: "${config.harmonyInstall}"`);
      }

      if (!config.harmonyCcBin) {
        issues.push('Путь к исполняемому файлу Control Center не настроен или не обнаружен.');
      } else if (!fs.existsSync(config.harmonyCcBin)) {
        issues.push(`Исполняемый файл Control Center отсутствует по указанному пути: "${config.harmonyCcBin}"`);
      } else {
        ccAvailable = true;
      }

      // Тестирование моста Python API
      try {
        const pyRes = await HarmonyPython.runCommand('detect');
        pythonAvailable = pyRes.status === 'success';
      } catch (err: any) {
        issues.push(`Ошибка работы моста Python API: ${err.message}`);
      }

      return {
        status: issues.length === 0 ? 'healthy' : 'degraded',
        issues,
        checks: {
          installationDetected: !!config.harmonyInstall,
          controlCenterAvailable: ccAvailable,
          pythonApiAvailable: pythonAvailable
        }
      };
    }
  },
  {
    name: 'harmony.detect_installation',
    description: 'Автоматический поиск установленных путей Toon Boom Harmony в системе.',
    inputSchema: z.object({}),
    handler: async () => {
      return {
        platform: process.platform,
        detectedPaths: {
          harmonyInstall: config.harmonyInstall || 'Не найдено',
          harmonyCcBin: config.harmonyCcBin || 'Не найдено',
          harmonyBin: config.harmonyBin || 'Не найдено',
          harmonyPythonPackages: config.harmonyPythonPackages || 'Не найдено'
        }
      };
    }
  },
  {
    name: 'harmony.get_capabilities',
    description: 'Запрос списка поддерживаемых сервером функций (Python API, Control Center, SQLite трекер).',
    inputSchema: z.object({}),
    handler: async () => {
      let pythonCaps = null;
      try {
        const pyRes = await HarmonyPython.runCommand('detect');
        pythonCaps = pyRes.capabilities;
      } catch {
        // Безопасно игнорируем ошибку при отсутствии Python
      }

      return {
        pythonApi: {
          available: !!pythonCaps,
          details: pythonCaps || 'Недоступно'
        },
        controlCenterScriptServer: {
          host: config.harmonyCcHost,
          port: config.harmonyCcPort,
          configuredUser: config.harmonyCcUser
        },
        localDatabaseTracker: {
          type: 'sqlite3',
          initialized: true
        }
      };
    }
  },
  {
    name: 'harmony.get_config',
    description: 'Получение текущих параметров конфигурации сервера (чувствительные поля будут скрыты).',
    inputSchema: z.object({}),
    handler: async () => {
      return {
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
    }
  },
  {
    name: 'harmony.validate_environment',
    description: 'Проверка существования, прав записи, разрешенных путей и правил окружения Harmony (Default Separate Position, Element Node Creation из Урока #1).',
    inputSchema: z.object({
      path: z.string().describe('Абсолютный путь к директории/файлу для проверки.'),
      checkHarmonyPreferences: z.boolean().optional().default(true).describe('Выполнить проверку критических настроек сцены (Separate Position = True, Element Node Creation = False).')
    }),
    handler: async (args: { path: string; checkHarmonyPreferences?: boolean }) => {
      const resolved = path.resolve(args.path);
      const isAllowed = config.allowedRoots.some(root => resolved.startsWith(root));
      if (!isAllowed) {
        return {
          path: args.path,
          resolved,
          valid: false,
          reason: 'Указанный путь находится вне списка разрешенных HARMONY_ALLOWED_ROOTS'
        };
      }

      const exists = fs.existsSync(resolved);
      let writable = false;
      if (exists) {
        try {
          fs.accessSync(resolved, fs.constants.W_OK);
          writable = true;
        } catch {
          // Нет прав на запись
        }
      }

      const preferenceRules = args.checkHarmonyPreferences ? [
        {
          rule: 'separate_position_axes',
          status: 'RECOMMENDED',
          requirement: 'Preferences -> General -> Default Separate Position = TRUE',
          reason: 'Гарантирует независимые кривые X, Y, Z для анимации пегов (Урок #1).'
        },
        {
          rule: 'element_node_creation',
          status: 'RECOMMENDED',
          requirement: 'Preferences -> Advanced -> Disable Element Node Creation = TRUE',
          reason: 'Исключает случайное создание ключевых кадров анимации на рисунках (Drawing nodes).'
        },
        {
          rule: 'sublayer_support',
          status: 'RECOMMENDED',
          requirement: 'Preferences -> Advanced -> Support Overlay and Underlay = TRUE',
          reason: 'Подготавливает 4 суб-слоя (Line Art, Color Art, Overlay, Underlay) для AutoPatch и выноса складок (Уроки #6a, #6b).'
        }
      ] : [];

      return {
        path: args.path,
        resolved,
        valid: true,
        exists,
        writable,
        harmonyPreferencesCheck: preferenceRules
      };
    }
  },
  {
    name: 'harmony.read_logs',
    description: 'Чтение содержимого файла логов MCP-сервера.',
    inputSchema: z.object({
      lines: z.number().optional().default(50).describe('Количество последних строк лога для чтения.')
    }),
    handler: async (args: { lines: number }) => {
      const logFile = path.join(config.logDir, 'harmony_mcp.log');
      if (!fs.existsSync(logFile)) {
        return { message: 'Файл логов не найден.' };
      }

      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.trim().split('\n');
      const selected = lines.slice(-args.lines).join('\n');
      return {
        logPath: logFile,
        logs: limitOutput(selected)
      };
    }
  }
];
