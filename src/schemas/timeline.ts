import { z } from 'zod';
import { projectPathSchema } from './common.js';

export const getTimelineSchema = z.object({
  projectPath: projectPathSchema
});

export const setFrameRangeSchema = z.object({
  projectPath: projectPathSchema,
  startFrame: z.number().gte(1).describe('Начальный кадр.'),
  endFrame: z.number().gte(1).describe('Конечный кадр.'),
  dryRun: z.boolean().optional()
});

export const setExposureSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде рисунка (Read-ноде).'),
  startFrame: z.number().gte(1).optional().describe('Кадр начала экспозиции (при одиночной установке).'),
  duration: z.number().gte(1).optional().describe('Длительность экспозиции (при одиночной установке).'),
  drawingName: z.string().optional().describe('Имя рисунка подстановки (при одиночной установке).'),
  exposures: z.array(z.object({
    startFrame: z.number().gte(1),
    duration: z.number().gte(1),
    drawingName: z.string()
  })).optional().describe('Пакет экспозиций для установки за один раз.'),
  dryRun: z.boolean().optional()
});

export const clearExposureSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде.'),
  startFrame: z.number().gte(1),
  duration: z.number().gte(1),
  dryRun: z.boolean().optional()
});

export const createKeyframeSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде.'),
  attributeName: z.string().describe('Имя атрибута (например, position.x, scale.x).'),
  frame: z.number().gte(1).describe('Кадр для ключа.'),
  value: z.number().describe('Числовое значение.'),
  dryRun: z.boolean().optional()
});

export const moveKeyframeSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде.'),
  attributeName: z.string().describe('Имя атрибута.'),
  sourceFrame: z.number().gte(1),
  targetFrame: z.number().gte(1),
  dryRun: z.boolean().optional()
});

export const copyKeyframesSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string(),
  attributeName: z.string(),
  startFrame: z.number().gte(1),
  endFrame: z.number().gte(1),
  targetFrame: z.number().gte(1),
  dryRun: z.boolean().optional()
});

export const deleteKeyframesSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string(),
  attributeName: z.string(),
  startFrame: z.number().gte(1),
  endFrame: z.number().gte(1),
  dryRun: z.boolean().optional()
});

export const createHoldSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде рисунка.'),
  startFrame: z.number().gte(1),
  holdFrames: z.number().gte(1).describe('Количество кадров удержания.'),
  dryRun: z.boolean().optional()
});

export const createBlinkSchema = z.object({
  projectPath: projectPathSchema,
  eyeNodePath: z.string().describe('Путь к ноде глаза (или группы).'),
  blinkFrame: z.number().gte(1).describe('Кадр моргания.'),
  duration: z.number().gte(1).optional().default(3).describe('Продолжительность моргания (обычно 2-4 кадра).'),
  dryRun: z.boolean().optional()
});

export const createCameraMoveSchema = z.object({
  projectPath: projectPathSchema,
  cameraNodePath: z.string().optional().default('Top/Camera').describe('Путь к камере.'),
  startFrame: z.number().gte(1),
  endFrame: z.number().gte(1),
  startPos: z.array(z.number()).length(3).describe('Начальные [x, y, z].'),
  endPos: z.array(z.number()).length(3).describe('Конечные [x, y, z].'),
  dryRun: z.boolean().optional()
});

export const exportOtioSchema = z.object({
  projectPath: projectPathSchema,
  outputPath: z.string().optional().describe('Путь экспорта файла .otio'),
  dryRun: z.boolean().optional()
});

export const importOtioSchema = z.object({
  projectPath: projectPathSchema,
  otioFilePath: z.string().describe('Путь к импортируемому файлу .otio'),
  dryRun: z.boolean().optional()
});
