import fs from 'fs';
import path from 'path';
import { config, validatePath } from './config.js';

export type HarmonyErrorCode =
  | 'HARMONY_NOT_INSTALLED'
  | 'HARMONY_VERSION_UNKNOWN'
  | 'CONTROL_CENTER_NOT_FOUND'
  | 'CONTROL_CENTER_UNREACHABLE'
  | 'CONTROL_CENTER_AUTH_FAILED'
  | 'SCRIPT_TIMEOUT'
  | 'SCRIPT_FAILED'
  | 'PYTHON_API_UNAVAILABLE'
  | 'PYTHON_BRIDGE_FAILED'
  | 'UNSUPPORTED_BY_VERSION'
  | 'DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION'
  | 'PATH_NOT_ALLOWED'
  | 'PATH_TRAVERSAL_BLOCKED'
  | 'RAW_QTSCRIPT_DISABLED'
  | 'INVALID_HARMONY_OBJECT'
  | 'SCENE_LOCKED'
  | 'SCENE_NOT_FOUND'
  | 'JOB_NOT_FOUND'
  | 'ENVIRONMENT_NOT_FOUND'
  | 'RENDER_FAILED'
  | 'VECTORIZE_FAILED'
  | 'RECONSTRUCTION_CORE_UNAVAILABLE'
  | 'RECONSTRUCTION_FAILED'
  | 'INVALID_RECONSTRUCTION_MANIFEST'
  | 'HARMONY_SCENE_VERIFICATION_FAILED'
  | 'WEBCC_UNAVAILABLE'
  | 'HELPER_UNAVAILABLE'
  | 'CAPABILITY_NOT_DETECTED';

/**
 * Unified result verification status for all tools.
 * Use this instead of generic success/error to be honest about what was actually executed.
 */
export type ResultStatus = 
  | 'verified_real'           // Actually tested on real Harmony, produces real artifacts
  | 'implemented_unverified'  // Code exists but never verified on real Harmony
  | 'mock_only'               // Intentional mock/stub, never calls real API
  | 'not_implemented'         // Throws UNSUPPORTED_BY_VERSION or similar
  | 'requires_real_harmony'   // Needs licensed Harmony to execute
  | 'failed';                 // Actual error occurred

export interface ResultWithStatus<T = any> {
  verification: ResultStatus;
  data?: T;
  message?: string;
  note?: string;
  implemented?: 'full' | 'partial' | 'stub';
  artifactCreated?: boolean;
}

export function createResult<T>(
  verification: ResultStatus,
  data?: T,
  message?: string,
  options?: {
    note?: string;
    implemented?: 'full' | 'partial' | 'stub';
    artifactCreated?: boolean;
  }
): ResultWithStatus<T> {
  return {
    verification,
    data,
    message,
    note: options?.note,
    implemented: options?.implemented,
    artifactCreated: options?.artifactCreated
  };
}

export class HarmonyError extends Error {
  code: HarmonyErrorCode;
  details?: any;

  constructor(code: HarmonyErrorCode, message: string, details?: any) {
    const fullMessage = message.includes(code) ? message : `[${code}] ${message}`;
    super(fullMessage);
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
  const existingAncestor = findExistingAncestor(normalized);
  const realAncestor = fs.realpathSync(existingAncestor);
  const suffix = path.relative(existingAncestor, normalized);
  const realCandidate = path.resolve(realAncestor, suffix);
  if (!validatePath(realCandidate)) {
    throw new HarmonyError(
      'PATH_TRAVERSAL_BLOCKED',
      `Путь "${filePath}" выходит из разрешённого корня через символическую ссылку.`
    );
  }
  return normalized;
}

function findExistingAncestor(candidate: string): string {
  let current = candidate;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
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
export interface DryRunResult {
  dryRun: true;
  message: string;
  params: any;
}

export function executeWithDryRun<T>(operationName: string, params: any, dryRun: true, executeFn: () => T | Promise<T>, dryRunFn?: undefined): DryRunResult;
export function executeWithDryRun<T>(operationName: string, params: any, dryRun: false, executeFn: () => T | Promise<T>, dryRunFn?: () => T | Promise<T>): Promise<T> | T;
export function executeWithDryRun<T>(operationName: string, params: any, dryRun: boolean | undefined, executeFn: () => T | Promise<T>, dryRunFn?: () => T | Promise<T>): Promise<T> | T | DryRunResult;
export function executeWithDryRun<T>(
  operationName: string,
  params: any,
  dryRun: boolean | undefined,
  executeFn: () => T | Promise<T>,
  dryRunFn?: () => T | Promise<T>
): Promise<T> | T | DryRunResult {
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
    };
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

// Unified verification status for honest reporting
export type VerificationStatus = 
  | 'verified_real'           // Actually tested on real Harmony, produces real artifacts
  | 'implemented_unverified'  // Code exists but never tested on real Harmony
  | 'mock_only'               // Returns placeholder/fake data, never calls real API
  | 'not_implemented'         // Throws UNSUPPORTED_BY_VERSION or similar
  | 'requires_real_harmony'   // Needs licensed Harmony to execute
  | 'failed';                 // Actual error occurred

export interface VerifiedResult<T = any> {
  verification: VerificationStatus;
  data?: T;
  message?: string;
  note?: string;
  executed?: boolean;
  artifactCreated?: boolean;
}

export function createVerifiedResult<T>(
  verification: VerificationStatus,
  data?: T,
  options?: { message?: string; note?: string; executed?: boolean; artifactCreated?: boolean }
): VerifiedResult<T> {
  return {
    verification,
    data,
    message: options?.message,
    note: options?.note,
    executed: options?.executed ?? false,
    artifactCreated: options?.artifactCreated ?? false
  };
}
