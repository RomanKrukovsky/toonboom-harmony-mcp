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
  private static daemonProcess: any = null;
  private static pendingPromises: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private static stdoutBuffer: string = '';
  private static daemonStderr: string = '';

  private static getPythonExecutable(): string {
    const configured = process.env.PYTHON_BIN;
    if (configured) return configured;

    return process.platform === 'win32' ? 'python' : 'python3';
  }

  private static initDaemon(pythonBin: string, bridgeScript: string) {
    if (this.daemonProcess && !this.daemonProcess.killed) {
      return;
    }

    this.daemonProcess = spawn(pythonBin, [bridgeScript], {
      env: {
        ...process.env,
        HARMONY_INSTALL: config.harmonyInstall,
        HARMONY_PERSISTENT_MODE: 'true'
      }
    });

    this.daemonProcess.stdout.on('data', (data: Buffer) => {
      this.stdoutBuffer += data.toString();
      
      let newlineIdx;
      while ((newlineIdx = this.stdoutBuffer.indexOf('\n')) !== -1) {
        const line = this.stdoutBuffer.substring(0, newlineIdx).trim();
        this.stdoutBuffer = this.stdoutBuffer.substring(newlineIdx + 1);
        
        if (line) {
          try {
            const parsed = JSON.parse(line);
            const reqId = parsed.requestId;
            
            if (reqId && this.pendingPromises.has(reqId)) {
              const { resolve, reject } = this.pendingPromises.get(reqId)!;
              this.pendingPromises.delete(reqId);
              
              if (parsed.error) {
                reject(
                  new HarmonyError(
                    (parsed.code as HarmonyErrorCode) || 'PYTHON_API_UNAVAILABLE',
                    parsed.message || 'Произошла ошибка в работе моста Python.',
                    parsed.details
                  )
                );
              } else {
                resolve(parsed);
              }
            }
          } catch (e) {
            console.error("Ошибка парсинга JSON из строки демона Python:", line, e);
          }
        }
      }
    });

    this.daemonProcess.stderr.on('data', (data: Buffer) => {
      this.daemonStderr += data.toString();
    });

    this.daemonProcess.on('close', (code: number) => {
      if (code !== 0 && this.daemonStderr.trim()) {
        console.error(`Фоновый демон Python завершился с кодом ${code}. Stderr: ${this.daemonStderr.trim()}`);
      }
      
      for (const [_, { reject }] of this.pendingPromises.entries()) {
        reject(new HarmonyError('PYTHON_API_UNAVAILABLE', 'Сбой фонового демона Python. Процесс был неожиданно завершен.'));
      }
      this.pendingPromises.clear();
      this.daemonProcess = null;
      this.stdoutBuffer = '';
      this.daemonStderr = '';
    });
  }

  static async runCommand(command: string, args: any = {}): Promise<PythonBridgeResponse> {
    const pythonBin = this.getPythonExecutable();
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const bridgeScript = path.resolve(
      path.join(__dirname, '../../scripts/python/harmony_bridge.py')
    );

    if (!fs.existsSync(bridgeScript)) {
      throw new HarmonyError(
        'PYTHON_API_UNAVAILABLE',
        `Скрипт-мост Python не найден по пути "${bridgeScript}".`
      );
    }

    const persistent = process.env.HARMONY_PERSISTENT_MODE !== 'false';
    if (!persistent) {
      return this.runSingleCommand(pythonBin, bridgeScript, command, args);
    }

    this.initDaemon(pythonBin, bridgeScript);

    const requestId = Math.random().toString(36).substring(7);
    const payload = {
      requestId,
      command,
      args,
      pythonPackages: config.harmonyPythonPackages
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingPromises.delete(requestId);
        reject(
          new HarmonyError(
            'SCRIPT_TIMEOUT',
            `Запрос к демону Python превысил таймаут в ${config.scriptTimeoutMs}мс`
          )
        );
      }, config.scriptTimeoutMs);

      this.pendingPromises.set(requestId, {
        resolve: (val) => {
          clearTimeout(timeout);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      });

      this.daemonProcess.stdin.write(JSON.stringify(payload) + '\n');
    });
  }

  private static async runSingleCommand(pythonBin: string, bridgeScript: string, command: string, args: any = {}): Promise<PythonBridgeResponse> {
    const payload = {
      command,
      args,
      pythonPackages: config.harmonyPythonPackages
    };

    return new Promise((resolve, reject) => {
      const child = spawn(pythonBin, [bridgeScript], {
        env: {
          ...process.env,
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
