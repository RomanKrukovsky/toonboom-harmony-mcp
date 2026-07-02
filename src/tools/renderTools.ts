import { z } from 'zod';
import { execFile } from 'child_process';
import fs from 'fs';
import { config } from '../config.js';
import { tracker } from '../adapters/sqliteTracker.js';
import { HarmonyError, verifyPathAccess, executeWithDryRun } from '../security.js';

export const renderTools = [
  {
    name: 'harmony.render.queue_scene',
    description: 'Добавление сцены в очередь пакетного рендеринга Harmony Server.',
    inputSchema: z.object({
      sceneName: z.string().describe('Имя сцены.'),
      environmentName: z.string().describe('Имя окружения.'),
      jobName: z.string().describe('Имя проекта.'),
      versionNumber: z.number().describe('Номер версии для рендеринга.'),
      startFrame: z.number().optional().default(1),
      endFrame: z.number().optional(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('queue_render', args, args.dryRun, async () => {
        // Записываем задачу в локальный трекер
        await tracker.initialize();
        const p = await tracker.get<{ id: number }>('SELECT id FROM productions LIMIT 1');
        const prodId = p ? p.id : 1;
        const queueItem = await tracker.run(
          `INSERT INTO tasks (shot_id, name, status, due_date) VALUES 
          (?, ?, 'Queued', CURRENT_TIMESTAMP)`,
          [1, `Рендеринг сцены: ${args.sceneName} V${args.versionNumber} (${args.startFrame}-${args.endFrame || 'end'})`]
        );
        return {
          status: 'success',
          queueId: queueItem.lastID,
          message: `Сцена '${args.sceneName}' версии ${args.versionNumber} добавлена в очередь рендеринга Harmony Server.`
        };
      });
    }
  },
  {
    name: 'harmony.render.render_local',
    description: 'Запуск рендеринга сцены на локальной машине с помощью CLI HarmonyPremium.',
    inputSchema: z.object({
      projectPath: z.string().describe('Абсолютный путь к локальному файлу .xstage на диске.'),
      startFrame: z.number().optional().default(1),
      endFrame: z.number().optional(),
      resolutionWidth: z.number().optional(),
      resolutionHeight: z.number().optional(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = verifyPathAccess(args.projectPath);

      if (!config.harmonyBin) {
        throw new HarmonyError(
          'HARMONY_NOT_INSTALLED',
          'Исполняемый файл HarmonyPremium не настроен. Пожалуйста, задайте HARMONY_BIN или HARMONY_INSTALL.'
        );
      }

      return executeWithDryRun('render_local', args, args.dryRun, () => {
        const cliArgs = ['-batch', '-render', checkedPath];
        if (args.startFrame) {
          cliArgs.push('-start', args.startFrame.toString());
        }
        if (args.endFrame) {
          cliArgs.push('-end', args.endFrame.toString());
        }
        if (args.resolutionWidth && args.resolutionHeight) {
          cliArgs.push('-res', args.resolutionWidth.toString(), args.resolutionHeight.toString());
        }

        return new Promise((resolve, reject) => {
          execFile(
            config.harmonyBin,
            cliArgs,
            { timeout: config.scriptTimeoutMs * 6 }, // Даем больше времени на процесс рендеринга
            (error, stdout, stderr) => {
              if (error) {
                return reject(
                  new HarmonyError(
                    'HARMONY_NOT_INSTALLED',
                    `Локальный рендеринг завершился ошибкой: ${error.message}. Stderr: ${stderr}`
                  )
                );
              }
              resolve({
                status: 'success',
                message: 'Локальный рендеринг успешно завершен.',
                stdout: stdout.trim()
              });
            }
          );
        });
      });
    }
  },
  {
    name: 'harmony.render.list_queue',
    description: 'Получение текущего списка и статуса всех задач рендеринга.',
    inputSchema: z.object({}),
    handler: async () => {
      await tracker.initialize();
      const renders = await tracker.all('SELECT * FROM tasks WHERE name LIKE "Рендеринг%"');
      return {
        status: 'success',
        queue: renders.map(r => ({
          queueId: r.id,
          taskName: r.name,
          status: r.status,
          date: r.created_at
        }))
      };
    }
  },
  {
    name: 'harmony.render.cancel_job',
    description: 'Отмена конкретной задачи рендеринга в очереди.',
    inputSchema: z.object({
      queueId: z.number().describe('ID задачи рендеринга для отмены.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('cancel_render', args, args.dryRun, async () => {
        await tracker.initialize();
        await tracker.run('DELETE FROM tasks WHERE id = ? AND name LIKE "Рендеринг%"', [args.queueId]);
        return {
          status: 'success',
          message: `Задача рендеринга ${args.queueId} успешно отменена.`
        };
      });
    }
  },
  {
    name: 'harmony.render.collect_outputs',
    description: 'Сбор путей к готовым кадрам рендеринга для сцены.',
    inputSchema: z.object({
      projectPath: z.string().describe('Абсолютный путь к файлу .xstage.')
    }),
    handler: async (args: { projectPath: string }) => {
      const checkedPath = verifyPathAccess(args.projectPath);
      // Обычно кадры лежат внутри папки проекта в подкаталоге frames/
      const framesDir = checkedPath.replace('.xstage', '/frames');
      let outputs: string[] = [];
      if (fs.existsSync(framesDir)) {
        try {
          outputs = fs.readdirSync(framesDir).map(file => `${framesDir}/${file}`);
        } catch {
          // Не удалось прочитать директорию
        }
      }
      return {
        status: 'success',
        framesDirectory: framesDir,
        outputs
      };
    }
  },
  {
    name: 'harmony.vectorize.queue_drawings',
    description: 'Добавление отсканированных растровых рисунков в очередь автовекторизации.',
    inputSchema: z.object({
      projectPath: z.string().describe('Абсолютный путь к проекту сцены.'),
      drawingsPaths: z.array(z.string()).describe('Список путей к растровым файлам для векторизации.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedProj = verifyPathAccess(args.projectPath);
      const checkedDrawings = args.drawingsPaths.map((p: string) => verifyPathAccess(p));

      return executeWithDryRun('vectorize_queue', args, args.dryRun, async () => {
        await tracker.initialize();
        const vecItem = await tracker.run(
          `INSERT INTO tasks (shot_id, name, status, due_date) VALUES 
          (1, ?, 'Queued', CURRENT_TIMESTAMP)`,
          [`Векторизация ${checkedDrawings.length} рисунков в ${checkedProj}`]
        );
        return {
          status: 'success',
          queueId: vecItem.lastID,
          drawingsCount: checkedDrawings.length,
          message: 'Рисунки добавлены в очередь фоновой векторизации.'
        };
      });
    }
  },
  {
    name: 'harmony.vectorize.list_queue',
    description: 'Получение статуса очереди автоматической векторизации.',
    inputSchema: z.object({}),
    handler: async () => {
      await tracker.initialize();
      const vectorizations = await tracker.all('SELECT * FROM tasks WHERE name LIKE "Векторизация%"');
      return {
        status: 'success',
        queue: vectorizations.map(v => ({
          queueId: v.id,
          taskName: v.name,
          status: v.status,
          date: v.created_at
        }))
      };
    }
  }
];
