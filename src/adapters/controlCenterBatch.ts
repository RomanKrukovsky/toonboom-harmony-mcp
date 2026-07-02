import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';
import { HarmonyError } from '../security.js';
import { TelnetResponse } from './controlCenterTelnet.js';

export class ControlCenterBatch {
  static async runScript(script: string): Promise<TelnetResponse> {
    if (!config.harmonyCcBin) {
      throw new HarmonyError(
        'CONTROL_CENTER_NOT_FOUND',
        'Исполняемый файл Harmony Control Center не найден. Задайте HARMONY_CC_BIN или HARMONY_INSTALL.'
      );
    }

    if (!fs.existsSync(config.harmonyCcBin)) {
      throw new HarmonyError(
        'CONTROL_CENTER_NOT_FOUND',
        `Исполняемый файл Harmony Control Center отсутствует по пути "${config.harmonyCcBin}".`
      );
    }

    // Записываем скрипт во временный файл
    const tempDir = config.allowedRoots[0] || '/tmp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFileName = `harmony_cc_${crypto.randomBytes(6).toString('hex')}.js`;
    const tempFilePath = path.join(tempDir, tempFileName);

    fs.writeFileSync(tempFilePath, script, 'utf-8');

    return new Promise((resolve, reject) => {
      const args = ['-runScript', tempFilePath, '-user', config.harmonyCcUser];

      execFile(
        config.harmonyCcBin,
        args,
        { timeout: config.scriptTimeoutMs },
        (error, stdout, stderr) => {
          // Очистка временного файла
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          } catch (err) {
            console.error('Не удалось удалить временный файл скрипта:', err);
          }

          if (error) {
            const isTimeout = (error as any).signal === 'SIGTERM';
            if (isTimeout) {
              return reject(
                new HarmonyError(
                  'SCRIPT_TIMEOUT',
                  `Пакетная операция Control Center превысила таймаут в ${config.scriptTimeoutMs}мс`
                )
              );
            }
            return reject(
              new HarmonyError(
                'CONTROL_CENTER_UNREACHABLE',
                `Пакетное выполнение скрипта Control Center завершилось с ошибкой: ${error.message}. Stderr: ${stderr}`
              )
            );
          }

          const output = stdout + '\n' + stderr;
          const resultMatch = output.match(/\[RESULT\]([^\r\n]+)/);
          const logMatch = output.match(/\[LOG\]([\s\S]*)/);

          let parsedResult: any = null;
          if (resultMatch) {
            try {
              parsedResult = JSON.parse(resultMatch[1]);
            } catch (e) {
              return reject(
                new HarmonyError(
                  'CONTROL_CENTER_UNREACHABLE',
                  `Некорректный JSON-ответ от пакетного скрипта Control Center: ${resultMatch[1]}`
                )
              );
            }
          }

          const logs = logMatch ? logMatch[1].trim() : '';

          if (!parsedResult) {
            if (output.toLowerCase().includes('error')) {
              return resolve({
                status: 'error',
                message: `Пакетное выполнение завершилось с ошибками: ${output.trim()}`,
                logs
              });
            }
            return resolve({
              status: 'success',
              message: 'Скрипт выполнен, но структурированный статус не возвращен.',
              logs,
              data: output.trim()
            });
          }

          resolve({
            status: parsedResult.status || 'success',
            data: parsedResult.data,
            message: parsedResult.message,
            logs
          });
        }
      );
    });
  }
}
