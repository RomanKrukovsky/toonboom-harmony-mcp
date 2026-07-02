import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { HarmonyError, HarmonyErrorCode } from '../security.js';

export interface PythonBridgeResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  [key: string]: any;
}

export class HarmonyPython {
  private static getPythonExecutable(): string {
    // Если у пользователя задан собственный путь к Python, используем его. Иначе берем системный python3 / python
    const configured = process.env.PYTHON_BIN;
    if (configured) return configured;

    return process.platform === 'win32' ? 'python' : 'python3';
  }

  static async runCommand(command: string, args: any = {}): Promise<PythonBridgeResponse> {
    const pythonBin = this.getPythonExecutable();
    // Разрешаем абсолютный путь к harmony_bridge.py
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const bridgeScript = path.resolve(
      path.join(__dirname, '../../scripts/python/harmony_bridge.py')
    );

    // Проверяем существование скрипта-моста
    if (!fs.existsSync(bridgeScript)) {
      throw new HarmonyError(
        'PYTHON_API_UNAVAILABLE',
        `Скрипт-мост Python не найден по пути "${bridgeScript}".`
      );
    }

    const payload = {
      command,
      args,
      pythonPackages: config.harmonyPythonPackages
    };

    return new Promise((resolve, reject) => {
      const child = spawn(pythonBin, [bridgeScript], {
        env: {
          ...process.env,
          // Пробрасываем путь установки Harmony
          HARMONY_INSTALL: config.harmonyInstall
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Таймаут для подпроцесса
      const timeout = setTimeout(() => {
        child.kill();
        reject(
          new HarmonyError(
            'SCRIPT_TIMEOUT',
            `Выполнение моста Python превысило таймаут в ${config.scriptTimeoutMs}мс`
          )
        );
      }, config.scriptTimeoutMs);

      child.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0 && !stdout) {
          return reject(
            new HarmonyError(
              'PYTHON_API_UNAVAILABLE',
              `Процесс Python завершился с кодом ошибки ${code}. Stderr: ${stderr.trim()}`
            )
          );
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed.error) {
            return reject(
              new HarmonyError(
                (parsed.code as HarmonyErrorCode) || 'PYTHON_API_UNAVAILABLE',
                parsed.message || 'Произошла ошибка в работе моста Python.',
                parsed.details
              )
            );
          }
          resolve(parsed);
        } catch (e) {
          reject(
            new HarmonyError(
              'PYTHON_API_UNAVAILABLE',
              `Не удалось разобрать вывод от моста Python: ${stdout.trim() || stderr.trim()}`
            )
          );
        }
      });
    });
  }
}
