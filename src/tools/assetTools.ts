import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { verifyPathAccess, executeWithDryRun, HarmonyError } from '../security.js';

export const assetTools = [
  {
    name: 'harmony.assets.list_templates',
    description: 'Сканирование папки (например, библиотеки шаблонов) и получение списка шаблонов Harmony (.tpl).',
    inputSchema: z.object({
      libraryPath: z.string().describe('Абсолютный путь к папке библиотеки.')
    }),
    handler: async (args: { libraryPath: string }) => {
      const checkedPath = verifyPathAccess(args.libraryPath);
      if (!fs.existsSync(checkedPath)) {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', `Путь библиотеки отсутствует по указанному адресу: "${args.libraryPath}"`);
      }

      const files = fs.readdirSync(checkedPath);
      const templates = files
        .filter(f => f.endsWith('.tpl'))
        .map(name => {
          const tplPath = path.join(checkedPath, name);
          const stats = fs.statSync(tplPath);
          return {
            name,
            path: tplPath,
            isDirectory: stats.isDirectory(),
            created: stats.birthtime
          };
        });

      return {
        status: 'success',
        libraryPath: checkedPath,
        templates
      };
    }
  },
  {
    name: 'harmony.assets.import_template',
    description: 'Импорт/копирование шаблона (.tpl) в целевую сцену или каталог библиотеки.',
    inputSchema: z.object({
      templatePath: z.string().describe('Абсолютный путь к исходному каталогу .tpl.'),
      targetDirectory: z.string().describe('Абсолютный путь к целевой папке назначения.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedSrc = verifyPathAccess(args.templatePath);
      const checkedDest = verifyPathAccess(args.targetDirectory);

      if (!fs.existsSync(checkedSrc)) {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', `Исходная папка шаблона не найдена: "${args.templatePath}"`);
      }

      return executeWithDryRun('import_template', args, args.dryRun, () => {
        const destPath = path.join(checkedDest, path.basename(checkedSrc));
        fs.mkdirSync(destPath, { recursive: true });
        try {
          copyFolderRecursiveSync(checkedSrc, destPath);
        } catch (err: any) {
          throw new HarmonyError('PATH_NOT_ALLOWED', `Не удалось скопировать шаблон: ${err.message}`);
        }
        return {
          status: 'success',
          message: `Шаблон успешно импортирован в ${destPath}`
        };
      });
    }
  },
  {
    name: 'harmony.assets.export_template',
    description: 'Экспорт элементов/директории из сцены во внешний шаблон Harmony (.tpl).',
    inputSchema: z.object({
      sourcePath: z.string().describe('Абсолютный путь к экспортируемой папке элементов сцены.'),
      templateDestinationPath: z.string().describe('Абсолютный путь к сохраняемому шаблону .tpl.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedSrc = verifyPathAccess(args.sourcePath);
      const checkedDest = verifyPathAccess(args.templateDestinationPath);

      if (!fs.existsSync(checkedSrc)) {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', `Исходный путь отсутствует по указанному адресу: "${args.sourcePath}"`);
      }

      if (!checkedDest.endsWith('.tpl')) {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', 'Путь назначения шаблона должен заканчиваться на расширение ".tpl".');
      }

      return executeWithDryRun('export_template', args, args.dryRun, () => {
        fs.mkdirSync(checkedDest, { recursive: true });
        try {
          copyFolderRecursiveSync(checkedSrc, checkedDest);
        } catch (err: any) {
          throw new HarmonyError('PATH_NOT_ALLOWED', `Не удалось экспортировать шаблон: ${err.message}`);
        }
        return {
          status: 'success',
          message: `Шаблон успешно экспортирован в ${checkedDest}`
        };
      });
    }
  },
  {
    name: 'harmony.assets.list_palettes',
    description: 'Получение списка файлов палитр (.plt) в папке palette-library сцены.',
    inputSchema: z.object({
      paletteLibraryPath: z.string().describe('Абсолютный путь к библиотеке палитр.')
    }),
    handler: async (args: { paletteLibraryPath: string }) => {
      const checkedPath = verifyPathAccess(args.paletteLibraryPath);
      if (!fs.existsSync(checkedPath)) {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', `Путь к библиотеке палитр не найден: "${args.paletteLibraryPath}"`);
      }

      const files = fs.readdirSync(checkedPath);
      const palettes = files
        .filter(f => f.endsWith('.plt'))
        .map(name => {
          const pltPath = path.join(checkedPath, name);
          const stats = fs.statSync(pltPath);
          return {
            name,
            path: pltPath,
            sizeBytes: stats.size,
            modified: stats.mtime
          };
        });

      return {
        status: 'success',
        paletteLibraryPath: checkedPath,
        palettes
      };
    }
  },
  {
    name: 'harmony.assets.backup_palette',
    description: 'Резервное копирование файла палитры (.plt) в указанную папку.',
    inputSchema: z.object({
      paletteFilePath: z.string().describe('Абсолютный путь к копируемому файлу .plt.'),
      backupDirectoryPath: z.string().describe('Абсолютный путь к папке сохранения резервной копии.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPlt = verifyPathAccess(args.paletteFilePath);
      const checkedBackup = verifyPathAccess(args.backupDirectoryPath);

      if (!fs.existsSync(checkedPlt) || !checkedPlt.endsWith('.plt')) {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', `Файл палитры отсутствует или некорректен: "${args.paletteFilePath}"`);
      }

      return executeWithDryRun('backup_palette', args, args.dryRun, () => {
        fs.mkdirSync(checkedBackup, { recursive: true });
        const dest = path.join(checkedBackup, path.basename(checkedPlt));
        fs.copyFileSync(checkedPlt, dest);
        return {
          status: 'success',
          backupPath: dest,
          message: `Резервная копия палитры успешно создана по пути: "${dest}"`
        };
      });
    }
  },
  {
    name: 'harmony.assets.import_palette',
    description: 'Импорт/Восстановление файла палитры (.plt) в папку сцены.',
    inputSchema: z.object({
      sourcePaletteFilePath: z.string().describe('Абсолютный путь к исходному файлу палитры .plt.'),
      targetPaletteLibraryPath: z.string().describe('Абсолютный путь к папке палитр сцены назначения.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedSrc = verifyPathAccess(args.sourcePaletteFilePath);
      const checkedTarget = verifyPathAccess(args.targetPaletteLibraryPath);

      if (!fs.existsSync(checkedSrc) || !checkedSrc.endsWith('.plt')) {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', `Исходный файл палитры некорректен или отсутствует: "${args.sourcePaletteFilePath}"`);
      }

      return executeWithDryRun('import_palette', args, args.dryRun, () => {
        fs.mkdirSync(checkedTarget, { recursive: true });
        const dest = path.join(checkedTarget, path.basename(checkedSrc));
        fs.copyFileSync(checkedSrc, dest);
        return {
          status: 'success',
          importedPath: dest,
          message: `Палитра успешно импортирована/восстановлена в: "${dest}"`
        };
      });
    }
  },
  {
    name: 'harmony.assets.collect_scene_assets',
    description: 'Поиск всех рисунков, аудиозаписей и ссылок на палитры в папке проекта сцены.',
    inputSchema: z.object({
      projectPath: z.string().describe('Абсолютный путь к каталогу проекта сцены.')
    }),
    handler: async (args: { projectPath: string }) => {
      const checkedPath = verifyPathAccess(args.projectPath);
      const projectDir = checkedPath.endsWith('.xstage') ? path.dirname(checkedPath) : checkedPath;

      const assets: { drawings: string[]; audio: string[]; palettes: string[] } = {
        drawings: [],
        audio: [],
        palettes: []
      };

      const scanFolder = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanFolder(fullPath);
          } else {
            if (file.endsWith('.plt')) {
              assets.palettes.push(fullPath);
            } else if (file.endsWith('.tvg') || file.endsWith('.png') || file.endsWith('.tga')) {
              assets.drawings.push(fullPath);
            } else if (file.endsWith('.wav') || file.endsWith('.aiff') || file.endsWith('.mp3')) {
              assets.audio.push(fullPath);
            }
          }
        }
      };

      scanFolder(projectDir);

      return {
        status: 'success',
        projectDirectory: projectDir,
        assets
      };
    }
  }
];

function copyFolderRecursiveSync(src: string, dest: string) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach(childItem => {
      copyFolderRecursiveSync(path.join(src, childItem), path.join(dest, childItem));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}
