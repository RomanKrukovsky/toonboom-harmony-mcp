import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../../config.js';
import { verifyPathAccess } from '../../security.js';

export interface ScreenshotOptions {
  outputPath?: string;
  simulate?: boolean;
}

export class ScreenshotAdapter {
  static async capture(options: ScreenshotOptions = {}): Promise<{ status: 'success' | 'error'; imagePath: string; base64: string }> {
    const simulate = options.simulate ?? (process.env.HARMONY_UI_SIMULATE !== 'false');
    const rawOutPath = options.outputPath || path.join(config.logDir, `screenshot_${Date.now()}.png`);

    // Verify path access to prevent path traversal / arbitrary write
    const verifiedPath = verifyPathAccess(rawOutPath);

    const logDirResolved = path.resolve(config.logDir);
    if (!fs.existsSync(logDirResolved)) {
      fs.mkdirSync(logDirResolved, { recursive: true });
    }

    if (simulate) {
      const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(mockBase64, 'base64');
      fs.writeFileSync(verifiedPath, buffer);
      
      return {
        status: 'success',
        imagePath: verifiedPath,
        base64: mockBase64
      };
    }

    const platform = process.platform;
    let file = '';
    let args: string[] = [];

    if (platform === 'darwin') {
      file = 'screencapture';
      args = ['-x', verifiedPath];
    } else if (platform === 'win32') {
      file = 'powershell';
      const psScript = `$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp = New-Object Drawing.Bitmap $bounds.Width, $bounds.Height; $graphics = [Drawing.Graphics]::FromImage($bmp); $graphics.CopyFromScreen($bounds.Location, [Drawing.Point]::Empty, $bounds.Size); $bmp.Save($args[0]); $graphics.Dispose(); $bmp.Dispose();`;
      args = ['-NoProfile', '-NonInteractive', '-Command', psScript, verifiedPath];
    } else if (platform === 'linux') {
      file = 'import';
      args = ['-window', 'root', verifiedPath];
    } else {
      throw new Error(`Платформа ${platform} не поддерживается для снятия скриншотов без симуляции.`);
    }

    return new Promise((resolve, reject) => {
      execFile(file, args, (error) => {
        if (error) {
          if (platform === 'linux') {
            return execFile('scrot', [verifiedPath], (scrotErr) => {
              if (scrotErr) {
                return reject(new Error(`Ошибка создания скриншота: ${scrotErr.message}`));
              }
              tryRead();
            });
          }
          return reject(new Error(`Ошибка создания скриншота: ${error.message}`));
        }
        tryRead();
      });

      function tryRead() {
        try {
          const imgBuffer = fs.readFileSync(verifiedPath);
          resolve({
            status: 'success',
            imagePath: verifiedPath,
            base64: imgBuffer.toString('base64')
          });
        } catch (err: any) {
          reject(new Error(`Не удалось прочитать созданный скриншот: ${err.message}`));
        }
      }
    });
  }
}
