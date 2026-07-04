import { z } from 'zod';
import { projectPathSchema } from './common.js';

export const listNodesSchema = z.object({
  projectPath: projectPathSchema
});

export const searchNodesSchema = z.object({
  projectPath: projectPathSchema,
  query: z.string().describe('Строка/маска для поиска в именах нод.')
});

export const getNodeSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Полный путь к ноде (например: Top/Peg1).')
});

export const createNodeSchema = z.object({
  projectPath: projectPathSchema,
  parentGroup: z.string().optional().default('Top').describe('Родительская группа.'),
  nodeType: z.string().describe('Тип создаваемого узла (Peg, Composite, Write, Read, Glow, Blur, etc).'),
  nodeName: z.string().describe('Имя нового узла.'),
  separatePosition: z.boolean().optional().default(true).describe('Установить режим координат Separate (X, Y, Z) для Peg ноды (Рекомендация из Уроков риггинга).'),
  lockDrawingMode: z.boolean().optional().default(true).describe('Установить запрет на прямое создание ключей на Drawing-слое (Can Never Enter Drawing Mode).'),
  dryRun: z.boolean().optional()
});

export const deleteNodeSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде для удаления.'),
  confirm: z.boolean().optional(),
  confirmationText: z.string().optional(),
  dryRun: z.boolean().optional()
});

export const renameNodeSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Текущий путь к ноде.'),
  newName: z.string().describe('Новое имя ноды.'),
  dryRun: z.boolean().optional()
});

export const connectNodesSchema = z.object({
  projectPath: projectPathSchema,
  srcNodePath: z.string().describe('Путь к исходному узлу.'),
  destNodePath: z.string().describe('Путь к узлу-приемнику.'),
  srcPort: z.number().optional().default(0),
  destPort: z.number().optional().default(0),
  semanticPort: z.enum(['default', 'matte', 'image', 'cutter_matte', 'cutter_image', 'pass_through', 'line_art', 'color_art']).optional().describe('Смысловая роль порта для умного подсоединения (например, matte/cutter_matte -> левый порт Cutter, image/cutter_image -> правый порт Cutter).'),
  dryRun: z.boolean().optional()
});

export const disconnectNodesSchema = z.object({
  projectPath: projectPathSchema,
  destNodePath: z.string().describe('Путь к узлу-приемнику.'),
  destPort: z.number().optional().default(0),
  dryRun: z.boolean().optional()
});

export const getNodeAttrSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде.'),
  attributeName: z.string().describe('Имя атрибута.')
});

export const setNodeAttrSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде.'),
  attributeName: z.string().describe('Имя атрибута.'),
  value: z.any().describe('Новое значение атрибута.'),
  dryRun: z.boolean().optional()
});

export const groupNodesSchema = z.object({
  projectPath: projectPathSchema,
  nodePaths: z.array(z.string()).describe('Список путей нод для группировки.'),
  groupName: z.string().describe('Имя новой группы.'),
  dryRun: z.boolean().optional()
});

export const ungroupNodesSchema = z.object({
  projectPath: projectPathSchema,
  groupPath: z.string().describe('Путь группы для разгруппировки.'),
  dryRun: z.boolean().optional()
});

export const findBrokenConnectionsSchema = z.object({
  projectPath: projectPathSchema
});

export const cleanUnusedNodesSchema = z.object({
  projectPath: projectPathSchema,
  dryRun: z.boolean().optional()
});

export const createEffectChainSchema = z.object({
  projectPath: projectPathSchema,
  targetNodePath: z.string().describe('Путь к ноде, перед которой вставляется цепочка эффектов.'),
  effects: z.array(z.string()).optional().default([]).describe('Список эффектов (Glow, Blur, Shadow, Colour Override, Composite, Peg, Display, Write, AutoPatch, LayerSelector, Cutter, KinematicOutput).'),
  preset: z.enum(['seamless_autopatch_arm', 'seamless_limb', 'simple_overlay_arm', 'eye_cutter_mask', 'kinematic_isolation', 'multi_angle_deformation', 'light_shading']).optional().describe('Пресет цепочки эффектов из Базы Знаний плейлиста Harmony (Seamless Limb AutoPatch, Overlay, Eye Mask, Kinematic Isolation, Multi-Angle, Light Shading).'),
  dryRun: z.boolean().optional().describe('Симуляция без фактического изменения сцены.')
});

export const resetToRestPoseSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().optional().describe('Опционально: путь к конкретной ноде деформера для сброса. Если не указан, сбрасываются все деформеры сцены.'),
  dryRun: z.boolean().optional()
});

export const resolveCyclesSchema = z.object({
  projectPath: projectPathSchema,
  dryRun: z.boolean().optional()
});

export const releaseLockSchema = z.object({
  projectPath: projectPathSchema
});

export const setWriteRgbaSchema = z.object({
  projectPath: projectPathSchema,
  writeNodePath: z.string().describe('Путь к ноде Write для переключения в RGBA/PNG.'),
  dryRun: z.boolean().optional()
});

export const setCompositePassthroughSchema = z.object({
  projectPath: projectPathSchema,
  compositeNodePath: z.string().describe('Путь к ноде Composite для переключения режима.'),
  mode: z.enum(['Pass Through', 'As Bitmap', 'As Vector']).optional().default('Pass Through').describe('Режим композита.'),
  dryRun: z.boolean().optional()
});



