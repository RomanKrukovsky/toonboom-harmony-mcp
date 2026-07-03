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
  effects: z.array(z.string()).describe('Список эффектов (Glow, Blur, Shadow, Colour Override, Composite, Peg, Display, Write).'),
  dryRun: z.boolean().optional()
});
