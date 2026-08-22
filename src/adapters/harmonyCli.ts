import { execFile } from 'child_process';
import { config } from '../config.js';
import { HarmonyError } from '../security.js';

export interface CliRenderOptions {
  projectPath: string;
  startFrame?: number;
  endFrame?: number;
  resolutionWidth?: number;
  resolutionHeight?: number;
}

export class HarmonyCli {
  static async render(options: CliRenderOptions): Promise<string> {
    if (!config.harmonyBin) {
      throw new HarmonyError(
        'HARMONY_NOT_INSTALLED',
        'Исполняемый файл Harmony Premium не настроен. Задайте HARMONY_BIN.'
      );
    }

    const args = ['-batch', '-render', options.projectPath];
    if (options.startFrame) {
      args.push('-start', options.startFrame.toString());
    }
    if (options.endFrame) {
      args.push('-end', options.endFrame.toString());
    }
    if (options.resolutionWidth && options.resolutionHeight) {
      args.push('-res', options.resolutionWidth.toString(), options.resolutionHeight.toString());
    }

    return new Promise((resolve, reject) => {
      execFile(
        config.harmonyBin,
        args,
        { timeout: config.scriptTimeoutMs * 6 },
        (error, stdout, stderr) => {
          if (error) {
            return reject(
              new HarmonyError(
                'HARMONY_NOT_INSTALLED',
                `Сбой CLI рендеринга Harmony: ${error.message}. Stderr: ${stderr}`
              )
            );
          }
          resolve(stdout);
        }
      );
    });
  }

  static async vectorize(projectPath: string, drawingPaths: string[]): Promise<string> {
    if (!config.harmonyBin) {
      throw new HarmonyError(
        'HARMONY_NOT_INSTALLED',
        'Исполняемый файл Harmony Premium не настроен. Задайте HARMONY_BIN.'
      );
    }

    // Векторизация через CLI утилиту Harmony (обычно command line векторизатор)
    // В Standalone режиме это запускается как: Controlcenter -vectorize или через отдельную утилиту Harmony
    // Мы можем симулировать вызов утилиты фонового импорта/векторизации
    const args = ['-batch', '-vectorize', projectPath, ...drawingPaths];
    return new Promise((resolve, reject) => {
      execFile(
        config.harmonyBin,
        args,
        { timeout: config.scriptTimeoutMs * 4 },
        (error, stdout, stderr) => {
          if (error) {
            // An unsupported CLI flag is a real failure, not a success. This used
            // to `resolve("Симуляция векторизации завершена")`, so an unusable
            // Harmony build reported vectorised drawings that never existed.
            if (error.message.includes('invalid option') || error.message.includes('unknown option')) {
              return reject(
                new HarmonyError(
                  'UNSUPPORTED_BY_VERSION',
                  `Установленная Harmony не поддерживает пакетную векторизацию через CLI ` +
                  `(-batch -vectorize отклонён). Векторизация возможна через ` +
                  `reconstruction-core или интерфейс Harmony. Детали: ${error.message}`
                )
              );
            }
            return reject(
              new HarmonyError(
                'VECTORIZE_FAILED',
                `Сбой CLI векторизации Harmony: ${error.message}`
              )
            );
          }
          resolve(stdout);
        }
      );
    });
  }
}
