import { z } from 'zod';
import { projectPathSchema } from './common.js';

export const openProjectSchema = z.object({
  projectPath: z.string().describe('Абсолютный путь к файлу .xstage на диске.')
});

export const closeProjectSchema = z.object({
  projectPath: projectPathSchema
});

export const inspectSceneSchema = z.object({
  projectPath: projectPathSchema
});

export const saveSceneSchema = z.object({
  projectPath: projectPathSchema,
  dryRun: z.boolean().optional()
});

export const saveSceneAsSchema = z.object({
  projectPath: projectPathSchema,
  newPath: z.string().describe('Новый путь сохранения проекта сцены.'),
  dryRun: z.boolean().optional()
});

export const auditSceneSchema = z.object({
  projectPath: projectPathSchema
});

export const fixCommonErrorsSchema = z.object({
  projectPath: projectPathSchema,
  dryRun: z.boolean().optional()
});

export const setResolutionSchema = z.object({
  projectPath: projectPathSchema,
  width: z.number().describe('Ширина в пикселях.'),
  height: z.number().describe('Высота в пикселях.'),
  dryRun: z.boolean().optional()
});

export const setFpsSchema = z.object({
  projectPath: projectPathSchema,
  fps: z.number().describe('Кадры в секунду (FPS).'),
  dryRun: z.boolean().optional()
});

export const setLengthSchema = z.object({
  projectPath: projectPathSchema,
  frames: z.number().describe('Количество кадров в сцене.'),
  dryRun: z.boolean().optional()
});

export const createCameraSchema = z.object({
  projectPath: projectPathSchema,
  name: z.string().describe('Имя новой камеры.'),
  dryRun: z.boolean().optional()
});

export const createDisplaySchema = z.object({
  projectPath: projectPathSchema,
  name: z.string().describe('Имя нового дисплея.'),
  parentGroup: z.string().optional().default('Top').describe('Родительская группа.'),
  dryRun: z.boolean().optional()
});

export const createCompositeSchema = z.object({
  projectPath: projectPathSchema,
  name: z.string().describe('Имя нового композита.'),
  parentGroup: z.string().optional().default('Top'),
  dryRun: z.boolean().optional()
});

export const exportPreviewSchema = z.object({
  projectPath: projectPathSchema,
  frame: z.number().optional().default(1).describe('Номер кадра для экспорта.'),
  outputPath: z.string().describe('Путь для рендереного изображения.'),
  dryRun: z.boolean().optional()
});
