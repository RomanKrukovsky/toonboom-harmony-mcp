import { z } from 'zod';
import { projectPathSchema } from './common.js';

export const createCharacterStructureSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string().describe('Имя персонажа.'),
  parts: z.array(z.string()).describe('Список частей тела.'),
  dryRun: z.boolean().optional()
});

export const importLayeredCharacterSchema = z.object({
  projectPath: projectPathSchema,
  psdPath: z.string().describe('Путь к PSD-файлу персонажа.'),
  characterName: z.string().describe('Имя персонажа.'),
  dryRun: z.boolean().optional()
});

export const createCutoutHierarchySchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string(),
  dryRun: z.boolean().optional()
});

export const createPegsSchema = z.object({
  projectPath: projectPathSchema,
  nodePaths: z.array(z.string()).describe('Ноды, для которых нужно создать управляющие Pegs.'),
  dryRun: z.boolean().optional()
});

export const createDeformersSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде рисунка для добавления деформатора.'),
  type: z.enum(['Curve', 'Bone', 'Envelope']).describe('Тип деформатора.'),
  dryRun: z.boolean().optional()
});

export const createMasterControllerPlanSchema = z.object({
  projectPath: projectPathSchema,
  controllerName: z.string(),
  controlledNodePaths: z.array(z.string()),
  gridWidth: z.number().optional().default(3),
  gridHeight: z.number().optional().default(3)
});

export const createHeadTurnPlanSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string()
});

export const createBodyTurnPlanSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string()
});

export const createMouthChartSchema = z.object({
  projectPath: projectPathSchema,
  mouthNodePath: z.string().describe('Путь к ноде рта.')
});

export const createEyeSystemSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string(),
  dryRun: z.boolean().optional()
});

export const createBrowSystemSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string(),
  dryRun: z.boolean().optional()
});

export const createHandSwapsSchema = z.object({
  projectPath: projectPathSchema,
  handNodePath: z.string(),
  handDrawingsCount: z.number().optional().default(5),
  dryRun: z.boolean().optional()
});

export const createPoseLibrarySchema = z.object({
  projectPath: projectPathSchema,
  libraryPath: z.string().describe('Путь к папке шаблонов-поз персонажа.')
});

export const applyPoseSchema = z.object({
  projectPath: projectPathSchema,
  poseTemplatePath: z.string().describe('Путь к файлу позы (.tpl).'),
  targetNodePath: z.string().describe('Узел назначения (корневой пег персонажа).'),
  dryRun: z.boolean().optional()
});

export const validateRigSchema = z.object({
  projectPath: projectPathSchema
});

export const validateDeformersSchema = z.object({
  projectPath: projectPathSchema
});

export const validateNamingSchema = z.object({
  projectPath: projectPathSchema
});

export const exportTemplateSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Корневой узел экспортируемой структуры/рига.'),
  templateDestinationPath: z.string().describe('Куда сохранить шаблон .tpl.'),
  dryRun: z.boolean().optional()
});

export const createTestAnimationSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string(),
  dryRun: z.boolean().optional()
});
export const analyzeCharacterTurnaroundSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string()
});

export const createHead360StructureSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string(),
  dryRun: z.boolean().optional()
});

export const createBody360StructureSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string(),
  dryRun: z.boolean().optional()
});

export const mapDrawingsToAnglesSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string(),
  angleMappings: z.array(z.object({
    angle: z.enum(['front', 'front_3q_left', 'side_left', 'back_3q_left', 'back', 'back_3q_right', 'side_right', 'front_3q_right']),
    drawingName: z.string()
  })),
  dryRun: z.boolean().optional()
});

export const createAngleControlsSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string(),
  dryRun: z.boolean().optional()
});

export const createFaceControlsSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string(),
  dryRun: z.boolean().optional()
});

export const createSmoothTurnPlanSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string()
});

export const validateAngleCoverageSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string()
});

export const createTurnTestSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string(),
  dryRun: z.boolean().optional()
});

export const export360RigTemplateSchema = z.object({
  projectPath: projectPathSchema,
  characterName: z.string(),
  templateDestinationPath: z.string(),
  dryRun: z.boolean().optional()
});
