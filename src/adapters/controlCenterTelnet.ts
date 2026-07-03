import net from 'net';
import { config } from '../config.js';
import { HarmonyError } from '../security.js';

export interface TelnetResponse {
  status: 'success' | 'error';
  data?: any;
  message?: string;
  logs?: string;
}

export class ControlCenterTelnet {
  static async runScript(script: string): Promise<TelnetResponse> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      let buffer = '';
      let timer: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timer);
        client.destroy();
      };

      timer = setTimeout(() => {
        cleanup();
        reject(new HarmonyError('SCRIPT_TIMEOUT', `Операция Control Center Telnet превысила таймаут в ${config.scriptTimeoutMs}мс`));
      }, config.scriptTimeoutMs);

      client.connect(config.harmonyCcPort, config.harmonyCcHost, () => {
        // Оборачиваем скрипт в TB_BeginScript / TB_EndScript
        const wrapped = `TB_BeginScript\n${script}\nTB_EndScript\n`;
        client.write(wrapped);
      });

      client.on('data', (data) => {
        buffer += data.toString();

        // Проверяем, получен ли структурированный результат [RESULT]
        if (buffer.includes('[RESULT]')) {
          // Продолжаем чтение, но планируем завершение в ближайшее время
          setTimeout(() => {
            cleanup();
            try {
              const result = this.parseBuffer(buffer);
              resolve(result);
            } catch (err) {
              reject(err);
            }
          }, 150); // Короткая пауза для вывода оставшихся логов
        }
      });

      client.on('error', (err) => {
        cleanup();
        reject(new HarmonyError('CONTROL_CENTER_UNREACHABLE', `Не удалось подключиться к серверу скриптов Control Center: ${err.message}`));
      });

      client.on('end', () => {
        cleanup();
        try {
          const result = this.parseBuffer(buffer);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  static async runTransaction(transaction: { compile: () => string }): Promise<TelnetResponse> {
    return this.runScript(transaction.compile());
  }

  private static parseBuffer(buffer: string): TelnetResponse {
    const resultMatch = buffer.match(/\[RESULT\]([^\r\n]+)/);
    const logMatch = buffer.match(/\[LOG\]([\s\S]*)/);

    let parsedResult: any = null;
    if (resultMatch) {
      try {
        parsedResult = JSON.parse(resultMatch[1]);
      } catch (e) {
        throw new HarmonyError('CONTROL_CENTER_UNREACHABLE', `Некорректный JSON-ответ от сервера скриптов: ${resultMatch[1]}`);
      }
    }

    const logs = logMatch ? logMatch[1].trim() : '';

    if (!parsedResult) {
      // Резервный разбор, если скрипт завершился ошибкой без структуры RESULT
      if (buffer.toLowerCase().includes('error')) {
        return {
          status: 'error',
          message: `Сервер скриптов завершился с ошибкой. Буфер: ${buffer.trim()}`,
          logs
        };
      }
      return {
        status: 'success',
        message: 'Скрипт выполнен, но структурированный статус не возвращен.',
        logs,
        data: buffer.trim()
      };
    }

    return {
      status: parsedResult.status || 'success',
      data: parsedResult.data,
      message: parsedResult.message,
      logs
    };
  }
}
