import { z } from 'zod';

export const MOHO_SCENE_PLAN_SCHEMA_VERSION = '1.0';

export const mohoScenePlanAssetSchema = z.object({
  assetId: z.string(),
  kind: z.enum(['image', 'audio', 'video', 'rig_template', 'switch_layer', 'mesh', 'font']),
  path: z.string(),
  mohoImportMethod: z.enum(['file_menu', 'drag_drop', 'lua_import', 'scripting']).default('file_menu')
}).strict();

export const mohoScenePlanCharacterSchema = z.object({
  characterId: z.string(),
  positionPreset: z.enum(['left', 'center', 'right', 'background', 'foreground']).default('left'),
  startFrame: z.number().int().min(1),
  endFrame: z.number().int().min(1),
  actions: z.array(z.object({
    type: z.enum(['idle', 'talk', 'gesture', 'look_at', 'walk', 'react']),
    frames: z.tuple([z.number().int(), z.number().int()]),
    audio: z.string().optional(),
    mouthChart: z.string().optional(),
    gestureName: z.string().optional()
  }).strict())
}).strict();

export const mohoScenePlanSchema = z.object({
  schemaVersion: z.literal(MOHO_SCENE_PLAN_SCHEMA_VERSION),
  planId: z.string(),
  production: z.string(),
  episode: z.string(),
  sceneName: z.string(),
  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }).strict(),
  fps: z.number().int().positive().default(24),
  durationFrames: z.number().int().positive(),
  mohoProjectTemplate: z.string().describe('Path to .moho template to start from').optional(),
  background: z.object({
    file: z.string(),
    layerName: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }).strict().optional(),
    scale: z.number().positive().default(1)
  }).strict().optional(),
  assets: z.array(mohoScenePlanAssetSchema).default([]),
  characters: z.array(mohoScenePlanCharacterSchema).default([]),
  camera: z.object({
    preset: z.string(),
    startFrame: z.number().int().min(1),
    endFrame: z.number().int().min(1),
    mohoCameraRigType: z.enum(['perspective', 'orthographic']).default('perspective')
  }).strict().optional(),
  effects: z.array(z.object({
    type: z.string(),
    target: z.string(),
    startFrame: z.number().int().min(1),
    endFrame: z.number().int().min(1)
  }).strict()).default([]),
  render: z.object({
    preview: z.boolean().default(true),
    format: z.enum(['png', 'mp4', 'mov', 'gif']).default('mp4'),
    quality: z.enum(['draft', 'standard', 'broadcast']).default('standard')
  }).strict().default({})
}).strict();

export type MohoScenePlan = z.infer<typeof mohoScenePlanSchema>;