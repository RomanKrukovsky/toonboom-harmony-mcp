import { z } from 'zod';
import { projectPathSchema } from './common.js';

export const localRenderSchema = z.object({
  projectPath: z.string().describe('Абсолютный путь к локальному файлу .xstage на диске.'),
  startFrame: z.number().optional().default(1),
  endFrame: z.number().optional(),
  resolutionWidth: z.number().optional(),
  resolutionHeight: z.number().optional(),
  dryRun: z.boolean().optional()
});

export const queueSceneSchema = z.object({
  sceneName: z.string().describe('Имя сцены.'),
  environmentName: z.string().describe('Имя окружения.'),
  jobName: z.string().describe('Имя проекта.'),
  versionNumber: z.number().describe('Номер версии для рендеринга.'),
  startFrame: z.number().optional().default(1),
  endFrame: z.number().optional(),
  dryRun: z.boolean().optional()
});

export const listQueueSchema = z.object({});

export const cancelJobSchema = z.object({
  queueId: z.number().describe('ID задачи рендеринга для отмены.'),
  dryRun: z.boolean().optional()
});

export const retryFailedRendersSchema = z.object({
  dryRun: z.boolean().optional()
});

export const collectOutputsSchema = z.object({
  projectPath: projectPathSchema
});

export const validateFramesSchema = z.object({
  projectPath: projectPathSchema,
  framesDirectory: z.string().optional().describe('Путь к папке с отрендеренными кадрами.')
});

export const makeMp4PreviewSchema = z.object({
  projectPath: projectPathSchema,
  framesDirectory: z.string().optional().describe('Каталог с кадрами.'),
  outputPath: z.string().describe('Абсолютный путь к получаемому файлу .mp4.'),
  fps: z.number().optional().default(24),
  dryRun: z.boolean().optional()
});

export const queueDrawingsSchema = z.object({
  projectPath: z.string().describe('Абсолютный путь к проекту сцены.'),
  drawingsPaths: z.array(z.string()).describe('Список путей к растровым файлам для векторизации.'),
  dryRun: z.boolean().optional()
});

export const listVectorizeQueueSchema = z.object({});

export const retryFailedVectorizationsSchema = z.object({
  dryRun: z.boolean().optional()
});
