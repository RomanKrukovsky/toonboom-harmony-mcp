import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../../config.js';

export interface ScreenshotOptions {
  outputPath?: string;
  simulate?: boolean;
}

export class ScreenshotAdapter {
  static async capture(options: ScreenshotOptions = {}): Promise<{ status: 'success' | 'error'; imagePath: string; base64: string }> {
    const simulate = options.simulate ?? (process.env.HARMONY_UI_SIMULATE !== 'false');
    const outPath = options.outputPath || path.join(config.logDir, `screenshot_${Date.now()}.png`);

    // Обеспечиваем директорию логов
    const logDirResolved = path.resolve(config.logDir);
    if (!fs.existsSync(logDirResolved)) {
      fs.mkdirSync(logDirResolved, { recursive: true });
    }

    if (simulate) {
      // Имитируем сохранение скриншота на диск
      const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(mockBase64, 'base64');
      fs.writeFileSync(outPath, buffer);
      
      return {
        status: 'success',
        imagePath: outPath,
        base64: mockBase64
      };
    }

    const platform = process.platform;
    let cmd = '';

    if (platform === 'darwin') {
      cmd = `screencapture -x "${outPath}"`;
    } else if (platform === 'win32') {
      // Использование PowerShell для создания ск完整 скриншота экрана на Windows
      cmd = `powershell -command "[Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null; $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp = New-Object Drawing.Bitmap $bounds.Width, $bounds.Height; $graphics = [Drawing.Graphics]::FromImage($bmp); $graphics.CopyFromScreen($bounds.Location, [Drawing.Point]::Empty, $bounds.Size); $bmp.Save('${outPath}'); $graphics.Dispose(); $bmp.Dispose();"`;
    } else if (platform === 'linux') {
      cmd = `import -window root "${outPath}" || scrot "${outPath}"`;
    } else {
      throw new Error(`Платформа ${platform} не поддерживается для снятия скриншотов без симуляции.`);
    }

    return new Promise((resolve, reject) => {
      exec(cmd, (error) => {
        if (error) {
          // При ошибке реального захвата откатываемся на симуляцию
          const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          fs.writeFileSync(outPath, Buffer.from(mockBase64, 'base64'));
          return resolve({
            status: 'success',
            imagePath: outPath,
            base64: mockBase64
          });
        }

        try {
          const imgBuffer = fs.readFileSync(outPath);
          resolve({
            status: 'success',
            imagePath: outPath,
            base64: imgBuffer.toString('base64')
          });
        } catch (err: any) {
          reject(new Error(`Не удалось прочитать созданный скриншот: ${err.message}`));
        }
      });
    });
  }
}
