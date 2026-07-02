import fs from 'fs';
import path from 'path';
import { config, validatePath } from './config.js';

export type HarmonyErrorCode =
  | 'HARMONY_NOT_INSTALLED'
  | 'CONTROL_CENTER_NOT_FOUND'
  | 'CONTROL_CENTER_UNREACHABLE'
  | 'SCRIPT_TIMEOUT'
  | 'PYTHON_API_UNAVAILABLE'
  | 'UNSUPPORTED_BY_VERSION'
  | 'DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION'
  | 'PATH_NOT_ALLOWED'
  | 'INVALID_HARMONY_OBJECT';

export class HarmonyError extends Error {
  code: HarmonyErrorCode;
  details?: any;

  constructor(code: HarmonyErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'HarmonyError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, HarmonyError.prototype);
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

// Форматирование и управление логами
const logFile = path.join(config.logDir, 'harmony_mcp.log');

function ensureLogDir() {
  const dir = path.dirname(logFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function redactSecrets(data: any): any {
  if (!data) return data;
  if (typeof data === 'string') {
    // Маскирование паттернов паролей, например: -password XXX
    return data.replace(/(-pass|-password|-pwd)\s+\S+/g, '$1 ********');
  }
  if (typeof data === 'object') {
    const redacted = { ...data };
    for (const key of Object.keys(redacted)) {
      if (['password', 'pass', 'token', 'secret'].includes(key.toLowerCase())) {
        redacted[key] = '********';
      } else {
        redacted[key] = redactSecrets(redacted[key]);
      }
    }
    return redacted;
  }
  return data;
}

export function logOperation(operation: string, params: any, status: 'SUCCESS' | 'ERROR' | 'DRY_RUN', error?: any) {
  try {
    ensureLogDir();
    const entry = {
      timestamp: new Date().toISOString(),
      operation,
      params: redactSecrets(params),
      status,
      error: error ? { message: error.message, code: error.code, details: error.details } : undefined
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    console.error('Не удалось записать лог-файл:', err);
  }
}

// Проверка доступа к путям файловой системы
export function verifyPathAccess(filePath: string): string {
  const normalized = path.resolve(filePath);
  if (!validatePath(normalized)) {
    throw new HarmonyError(
      'PATH_NOT_ALLOWED',
      `Доступ к пути "${filePath}" ограничен настройками безопасности.`
    );
  }
  return normalized;
}

// Валидация опасных/деструктивных операций
export interface ConfirmationParams {
  confirm?: boolean;
  confirmationText?: string;
}

const EXPECTED_CONFIRMATION = 'Я понимаю, что это действие изменит базу данных Harmony';

export function enforceDestructiveSafety(operationName: string, confirmation?: ConfirmationParams) {
  if (!config.allowDestructive) {
    throw new HarmonyError(
      'DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION',
      `Деструктивное действие "${operationName}" отключено в настройках конфигурации сервера.`
    );
  }

  if (!confirmation || confirmation.confirm !== true || confirmation.confirmationText !== EXPECTED_CONFIRMATION) {
    throw new HarmonyError(
      'DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION',
      `Деструктивное действие "${operationName}" требует явного подтверждения: параметр "confirm" должен быть равен true, а "confirmationText" должен содержать точную фразу "${EXPECTED_CONFIRMATION}".`
    );
  }
}

// Обертка для поддержки dry-run (симуляции выполнения)
export function executeWithDryRun<T>(
  operationName: string,
  params: any,
  dryRun: boolean | undefined,
  executeFn: () => T | Promise<T>,
  dryRunFn?: () => T | Promise<T>
): Promise<T> | T {
  const isDryRun = dryRun ?? config.dryRunDefault;

  if (isDryRun) {
    logOperation(operationName, params, 'DRY_RUN');
    if (dryRunFn) {
      return dryRunFn();
    }
    // Возвращаем стандартный ответ симуляции
    return {
      dryRun: true,
      message: `Симуляция (dry-run): операция "${operationName}" была бы запущена в обычном режиме.`,
      params
    } as unknown as T;
  }

  try {
    const result = executeFn();
    if (result instanceof Promise) {
      return result
        .then(res => {
          logOperation(operationName, params, 'SUCCESS');
          return res;
        })
        .catch(err => {
          logOperation(operationName, params, 'ERROR', err);
          throw err;
        });
    }
    logOperation(operationName, params, 'SUCCESS');
    return result;
  } catch (err) {
    logOperation(operationName, params, 'ERROR', err);
    throw err;
  }
}

// Лимитирование размера выводимых логов
const MAX_OUTPUT_SIZE = 1024 * 100; // Лимит 100КБ
export function limitOutput(output: string): string {
  if (output.length > MAX_OUTPUT_SIZE) {
    return output.substring(0, MAX_OUTPUT_SIZE) + '\n[Вывод урезан из-за превышения лимита размера]';
  }
  return output;
}
