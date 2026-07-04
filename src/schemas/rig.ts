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
  pivotMatchingPreset: z.boolean().optional().describe('Пресет Pivot Matching: автоматическая привязка точек вращения Pegs к центрам суставов.'),
  jointCenterMarkers: z.array(z.object({
    nodePath: z.string(),
    pivotX: z.number(),
    pivotY: z.number()
  })).optional().describe('Список точных координат пивотов суставов для точного совпадения.'),
  useSeparateCoordinates: z.boolean().optional().default(true).describe('Использовать раздельные координаты (Separate) вместо 3D Path для предотвращения багов с интерполяцией.'),
  dryRun: z.boolean().optional().describe('Симуляция создания пегов и установки пивотов.')
});

export const zeroOutPegSchema = z.object({
  projectPath: projectPathSchema,
  pegNodePath: z.string().describe('Путь к ноде Peg для сброса пивота.'),
  dryRun: z.boolean().optional()
});


export const createDeformersSchema = z.object({
  projectPath: projectPathSchema,
  nodePath: z.string().describe('Путь к ноде рисунка для добавления деформатора.'),
  type: z.enum(['Curve', 'Bone', 'Envelope']).describe('Тип деформатора (Curve для гибких рук/волос, Bone для костей, Envelope для замыканий).'),
  kinematicIsolation: z.boolean().optional().default(true).describe('Пресет Kinematic Isolation: автоматически добавить ноду Kinematic Output для дочерних веток.'),
  dryRun: z.boolean().optional().describe('Симуляция создания деформатора без изменения сцены.')
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
  eyeCutterPreset: z.boolean().optional().default(true).describe('Пресет Eye Cutter Mask: инвертированная маска зрачка под белок глаза.'),
  eyelidCount: z.number().optional().default(4).describe('Количество веков для мимики глаза (по умолчанию 4 века из Урока #17).'),
  dryRun: z.boolean().optional().describe('Симуляция создания глазной системы.')
});

export const createConstraintSchema = z.object({
  projectPath: projectPathSchema,
  targetNodePath: z.string().describe('Узел назначения для наложения ограничения.'),
  constraintType: z.enum(['TwoPointConstraint', 'PositionConstraint', 'RotationConstraint']).optional().default('TwoPointConstraint').describe('Тип ограничения (TwoPointConstraint для сохранения объемов при растяжении конечностей из Уроков #19, #21).'),
  dryRun: z.boolean().optional().describe('Симуляция создания констрейнта.')
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
  createNewDeformationChains: z.boolean().optional().default(true).describe('Автоматическое создание уникальных деформация-групп (Create New Deformation Chain) под каждый ракурс (Урок #12).'),
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

export const createAutopatchJointSchema = z.object({
  projectPath: projectPathSchema,
  upperLimbNodePath: z.string().describe('Путь к родительскому слою конечности (например, Top/Bicep_D).'),
  lowerLimbNodePath: z.string().describe('Путь к дочернему слою конечности (например, Top/Forearm_D).'),
  jointName: z.string().optional().default('Elbow_Joint').describe('Имя создаваемого сустава.'),
  roundJointAlignment: z.boolean().optional().default(true).describe('Правило выравнивания круглых контуров (Perfect Circle Joint Rule).'),
  colorArtPaletteMatch: z.boolean().optional().default(true).describe('Проверка совпадения палитровых цветов для Line Art и Color Art.'),
  dryRun: z.boolean().optional()
});

export const attachKinematicAccessorySchema = z.object({
  projectPath: projectPathSchema,
  deformedNodePath: z.string().describe('Путь к ноде деформируемого слоя (например, Top/Arm_D).'),
  accessoryPegPath: z.string().describe('Путь к Peg ноде прикрепляемого аксессуара (например, Top/Bracelet_P).'),
  accessoryName: z.string().optional().default('Accessory').describe('Имя аксессуара.'),
  dryRun: z.boolean().optional()
});
