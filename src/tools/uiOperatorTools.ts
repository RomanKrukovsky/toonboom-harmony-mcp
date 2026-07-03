import { z } from 'zod';
import { uiAutomation } from '../adapters/uiAutomation/index.js';
import { ScreenshotAdapter } from '../adapters/screenshot/index.js';
import { VisualStateEngine } from '../adapters/visualState/index.js';
import { executeWithDryRun } from '../security.js';

export const uiOperatorTools = [
  {
    name: 'harmony.ui.screenshot',
    description: 'Сделать снимок экрана и получить base64 изображение.',
    inputSchema: z.object({
      outputPath: z.string().optional().describe('Путь для сохранения файла скриншота.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('ui.screenshot', args, args.dryRun, async () => {
        return ScreenshotAdapter.capture({ outputPath: args.outputPath });
      });
    }
  },
  {
    name: 'harmony.ui.detect_state',
    description: 'Анализ состояния интерфейса Toon Boom Harmony (активные панели, диалоговые окна).',
    inputSchema: z.object({}),
    handler: async () => {
      const state = await VisualStateEngine.detectState();
      return { status: 'success', state };
    }
  },
  {
    name: 'harmony.ui.locate_element',
    description: 'Найти координаты элемента интерфейса по текстовому или семантическому описанию.',
    inputSchema: z.object({
      query: z.string().describe('Семантическое имя элемента (например: "File menu", "Timeline").')
    }),
    handler: async (args: { query: string }) => {
      return uiAutomation.locateElement(args.query);
    }
  },
  {
    name: 'harmony.ui.click',
    description: 'Эмуляция клика мыши по указанным координатам.',
    inputSchema: z.object({
      x: z.number().describe('Координата X.'),
      y: z.number().describe('Координата Y.'),
      doubleClick: z.boolean().optional().describe('Флаг двойного клика.'),
      rightClick: z.boolean().optional().describe('Флаг правого клика.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('ui.click', args, args.dryRun, async () => {
        if (args.doubleClick) return uiAutomation.doubleClick(args.x, args.y);
        if (args.rightClick) return uiAutomation.rightClick(args.x, args.y);
        return uiAutomation.click(args.x, args.y);
      });
    }
  },
  {
    name: 'harmony.ui.hotkey',
    description: 'Отправка сочетания клавиш (хоткея) в Harmony.',
    inputSchema: z.object({
      keys: z.array(z.string()).describe('Список клавиш в комбинации (например: ["ctrl", "s"]).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('ui.hotkey', args, args.dryRun, async () => {
        return uiAutomation.hotkey(args.keys);
      });
    }
  },
  {
    name: 'harmony.ui.type_text',
    description: 'Ввод текста с клавиатуры в активное текстовое поле.',
    inputSchema: z.object({
      text: z.string().describe('Текст для ввода.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('ui.type_text', args, args.dryRun, async () => {
        return uiAutomation.typeText(args.text);
      });
    }
  },
  {
    name: 'harmony.ui.open_menu',
    description: 'Открыть пункт меню Harmony (например: "File > Import > Images").',
    inputSchema: z.object({
      menuPath: z.string().describe('Путь к пункту меню, разделенный ">".'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('ui.open_menu', args, args.dryRun, async () => {
        const parts = args.menuPath.split('>').map((s: string) => s.trim());
        // Находим и кликаем последовательно по пунктам меню
        for (const part of parts) {
          const loc = await uiAutomation.locateElement(part);
          if (loc.status === 'success') {
            await uiAutomation.click(loc.x, loc.y);
            await uiAutomation.wait(200);
          }
        }
        return { status: 'success', message: `Меню "${args.menuPath}" успешно открыто.` };
      });
    }
  },
  {
    name: 'harmony.ui.select_file_in_dialog',
    description: 'Выбор пути к файлу в открытом диалоговом окне импорта/сохранения.',
    inputSchema: z.object({
      filePath: z.string().describe('Абсолютный путь к выбираемому файлу.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('ui.select_file_in_dialog', args, args.dryRun, async () => {
        // Симулируем ввод пути и нажатие Enter в диалоговом окне выбора файла
        const typeRes = await uiAutomation.typeText(args.filePath);
        await uiAutomation.wait(500);
        const enterRes = await uiAutomation.hotkey(['enter']);
        return {
          status: 'success',
          message: `В диалоге выбран файл: ${args.filePath}`,
          typeRes,
          enterRes
        };
      });
    }
  },
  {
    name: 'harmony.ui.wait_for_dialog',
    description: 'Ожидание появления диалогового окна на экране.',
    inputSchema: z.object({
      dialogTitle: z.string().describe('Заголовок или ключевое слово в названии окна.'),
      timeoutMs: z.number().optional().default(5000).describe('Таймаут ожидания в миллисекундах.')
    }),
    handler: async (args: { dialogTitle: string; timeoutMs: number }) => {
      return uiAutomation.waitForImageOrText(args.dialogTitle, args.timeoutMs);
    }
  },
  {
    name: 'harmony.ui.verify_workspace',
    description: 'Проверка правильности раскладки окон и панелей в Harmony для корректной работы автоматизации.',
    inputSchema: z.object({}),
    handler: async () => {
      return VisualStateEngine.verifyWorkspaceLayout();
    }
  },
  {
    name: 'harmony.ui.reset_workspace_instruction',
    description: 'Инструкция или хоткей сброса окон Harmony к стандартному виду по умолчанию.',
    inputSchema: z.object({
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('ui.reset_workspace', args, args.dryRun, async () => {
        const keys = ['ctrl', 'alt', 'r'];
        await uiAutomation.hotkey(keys);
        return {
          status: 'success',
          message: `Отправлен хоткей сброса раскладки окон: ${keys.join('+')}`
        };
      });
    }
  }
];
