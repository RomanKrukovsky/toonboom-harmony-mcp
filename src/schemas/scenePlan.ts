import { z } from 'zod';

export const scenePlanSchema = z.object({
  production: z.string().describe('Название производства (проекта/сезона)'),
  episode: z.string().describe('Код/Название эпизода'),
  sceneName: z.string().describe('Код/Название сцены'),
  resolution: z.object({
    width: z.number(),
    height: z.number()
  }).optional(),
  fps: z.number().optional(),
  durationFrames: z.number().optional(),
  workspaceTemplate: z.string().optional(),
  background: z.object({
    file: z.string(),
    layerName: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number()
    }).optional(),
    scale: z.number().optional()
  }).optional(),
  characters: z.array(z.object({
    name: z.string(),
    rig: z.string(),
    positionPreset: z.string().optional(),
    startFrame: z.number().optional(),
    endFrame: z.number().optional(),
    actions: z.array(z.object({
      type: z.string(),
      name: z.string().optional(),
      frames: z.array(z.number()),
      audio: z.string().optional(),
      mouthChart: z.string().optional()
    })).optional()
  })).optional(),
  camera: z.object({
    preset: z.string(),
    startFrame: z.number().optional(),
    endFrame: z.number().optional()
  }).optional(),
  effects: z.array(z.object({
    type: z.string(),
    target: z.string(),
    frames: z.array(z.number())
  })).optional(),
  render: z.object({
    preview: z.boolean().optional(),
    format: z.string().optional(),
    quality: z.string().optional()
  }).optional()
});
