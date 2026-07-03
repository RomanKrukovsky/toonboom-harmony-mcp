import { z } from 'zod';
import { projectPathSchema } from './common.js';

export const getTimelineSchema = z.object({
  projectPath: projectPathSchema
});

export const setFrameRangeSchema = z.object({
  projectPath: projectPathSchema,
  startFrame: z.number().describe('Начальный кадр.'),
  endFrame: z.number().describe('Конечный кадр.'),
  dryRun: z.boolean().optional()
});

export const setExposureSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде рисунка (Read-ноде).'),
  startFrame: z.number().describe('Кадр начала экспозиции.'),
  duration: z.number().describe('Длительность экспозиции.'),
  drawingName: z.string().describe('Имя рисунка подстановки.'),
  dryRun: z.boolean().optional()
});

export const clearExposureSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде.'),
  startFrame: z.number(),
  duration: z.number(),
  dryRun: z.boolean().optional()
});

export const createKeyframeSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде.'),
  attributeName: z.string().describe('Имя атрибута (например, position.x, scale.x).'),
  frame: z.number().describe('Кадр для ключа.'),
  value: z.number().describe('Числовое значение.'),
  dryRun: z.boolean().optional()
});

export const moveKeyframeSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде.'),
  attributeName: z.string().describe('Имя атрибута.'),
  sourceFrame: z.number(),
  targetFrame: z.number(),
  dryRun: z.boolean().optional()
});

export const copyKeyframesSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string(),
  attributeName: z.string(),
  startFrame: z.number(),
  endFrame: z.number(),
  targetFrame: z.number(),
  dryRun: z.boolean().optional()
});

export const deleteKeyframesSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string(),
  attributeName: z.string(),
  startFrame: z.number(),
  endFrame: z.number(),
  dryRun: z.boolean().optional()
});

export const createHoldSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде рисунка.'),
  startFrame: z.number(),
  holdFrames: z.number().describe('Количество кадров удержания.'),
  dryRun: z.boolean().optional()
});

export const createBlinkSchema = z.object({
  projectPath: projectPathSchema,
  eyeNodePath: z.string().describe('Путь к ноде глаза (или группы).'),
  blinkFrame: z.number().describe('Кадр моргания.'),
  duration: z.number().optional().default(3).describe('Продолжительность моргания (обычно 2-4 кадра).'),
  dryRun: z.boolean().optional()
});

export const createCameraMoveSchema = z.object({
  projectPath: projectPathSchema,
  cameraNodePath: z.string().optional().default('Top/Camera').describe('Путь к камере.'),
  startFrame: z.number(),
  endFrame: z.number(),
  startPos: z.array(z.number()).length(3).describe('Начальные [x, y, z].'),
  endPos: z.array(z.number()).length(3).describe('Конечные [x, y, z].'),
  dryRun: z.boolean().optional()
});
