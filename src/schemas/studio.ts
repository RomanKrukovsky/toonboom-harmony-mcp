import { z } from 'zod';

/**
 * studio.ts — Схемы для AI Production System
 *
 * Эти схемы описывают структуры данных, которые генерирует агент
 * при разборе промпта сцены и которые потребляет Autopilot.
 *
 * Поток данных:
 *   Промпт → ParsedScene → [characterSpecs, cameraPlan, lipsyncPlan, assetRequirements]
 *              → scene_plan.json → Autopilot → Harmony project
 */

// ─────────────────────────────────────────────
// Character Spec — спецификация персонажа
// ─────────────────────────────────────────────

export const bodyPartSchema = z.object({
  name: z.string().describe('Имя части тела (head, torso, left_arm, right_arm, left_leg, right_leg, etc.)'),
  drawingLayers: z.array(z.string()).describe('Список слоёв рисования для этой части'),
  hasSubs: z.boolean().optional().describe('Есть ли дочерние части (пальцы, волосы и т.д.)')
});

export const characterViewSchema = z.object({
  angle: z.enum(['front', 'front_3q_left', 'side_left', 'back_3q_left', 'back', 'back_3q_right', 'side_right', 'front_3q_right']),
  label: z.string().describe('Человекочитаемое название ракурса'),
  priority: z.enum(['required', 'optional']).default('required')
});

export const characterSpecSchema = z.object({
  name: z.string().describe('Имя персонажа'),
  description: z.string().optional().describe('Краткое описание персонажа'),
  style: z.enum(['cutout', 'traditional', 'hybrid']).default('cutout').describe('Стиль анимации'),

  bodyParts: z.array(bodyPartSchema).describe('Список частей тела для рига'),

  views360: z.array(characterViewSchema).optional().describe('Ракурсы для 360° рига'),

  dialogues: z.array(z.string()).optional().describe('Строки диалогов персонажа в этой сцене'),

  actions: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    startFrame: z.number().optional(),
    endFrame: z.number().optional(),
    positionPreset: z.enum(['center', 'left', 'right', 'bg_left', 'bg_right', 'close_up']).optional()
  })).optional().describe('Действия персонажа в сцене'),

  rigPlaceholderPath: z.string().optional().describe('Путь к rig-файлу (если уже есть)'),
  needsNewRig: z.boolean().default(true).describe('Нужно ли создать новый риг')
});

export type CharacterSpec = z.infer<typeof characterSpecSchema>;

// ─────────────────────────────────────────────
// Camera Plan — план камеры
// ─────────────────────────────────────────────

export const cameraShotSchema = z.object({
  shotId: z.string(),
  type: z.enum(['static', 'pan', 'tilt', 'zoom_in', 'zoom_out', 'truck', 'dolly', 'shake']),
  startFrame: z.number(),
  endFrame: z.number(),
  description: z.string().optional(),
  easing: z.enum(['linear', 'ease_in', 'ease_out', 'ease_in_out']).default('ease_in_out')
});

export const cameraPlanSchema = z.object({
  totalFrames: z.number(),
  fps: z.number().default(24),
  shots: z.array(cameraShotSchema),
  preset: z.string().optional().describe('Имя camera preset в Harmony (если есть)'),
  notes: z.string().optional()
});

export type CameraPlan = z.infer<typeof cameraPlanSchema>;

// ─────────────────────────────────────────────
// Lipsync Plan — план липсинка
// ─────────────────────────────────────────────

export const phonemeKeyframeSchema = z.object({
  frame: z.number(),
  shape: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'X']).describe('A=ah/aw, B=p/b/m, C=ee, D=r/th, E=oh, F=f/v, G=l/n/d, X=rest/silence'),
  character: z.string().describe('Имя персонажа')
});

export const dialogueLineSchema = z.object({
  character: z.string(),
  text: z.string(),
  startFrame: z.number(),
  endFrame: z.number(),
  audioFile: z.string().optional().describe('Путь к аудиофайлу строки'),
  phonemes: z.array(phonemeKeyframeSchema).optional().describe('Тайминги фонем (заполняется движком)')
});

export const lipsyncPlanSchema = z.object({
  totalFrames: z.number(),
  fps: z.number().default(24),
  engine: z.enum(['rhubarb', 'gentle', 'papagayo', 'manual', 'placeholder']).default('placeholder'),
  dialogues: z.array(dialogueLineSchema),
  mouthLayerPattern: z.string().default('{character}/mouth').describe('Шаблон пути к слою рта')
});

export type LipsyncPlan = z.infer<typeof lipsyncPlanSchema>;

// ─────────────────────────────────────────────
// Asset Requirements — список требуемых ассетов
// ─────────────────────────────────────────────

export const assetItemSchema = z.object({
  id: z.string(),
  type: z.enum(['character_rig', 'background', 'audio', 'sfx', 'overlay', 'effect', 'palette', 'template']),
  name: z.string(),
  status: z.enum(['exists', 'placeholder', 'needs_creation', 'needs_import']).default('needs_creation'),
  filePath: z.string().optional().describe('Путь к файлу (если уже есть)'),
  description: z.string().optional(),
  priority: z.enum(['critical', 'important', 'optional']).default('critical')
});

export const assetRequirementsSchema = z.object({
  sceneName: z.string(),
  assets: z.array(assetItemSchema),
  totalCount: z.number(),
  readyCount: z.number().default(0),
  generatedAt: z.string().optional()
});

export type AssetRequirements = z.infer<typeof assetRequirementsSchema>;

// ─────────────────────────────────────────────
// Animation Blocking Plan
// ─────────────────────────────────────────────

export const keyframeSchema = z.object({
  frame: z.number(),
  character: z.string(),
  bodyPart: z.string().optional().describe('Часть тела (all = вся поза)'),
  pose: z.string().describe('Название позы или описание'),
  interpolation: z.enum(['linear', 'ease', 'hold', 'spline']).default('ease')
});

export const blockingPlanSchema = z.object({
  totalFrames: z.number(),
  fps: z.number().default(24),
  keyframes: z.array(keyframeSchema),
  thumbnailPoses: z.array(z.object({
    frame: z.number(),
    description: z.string()
  })).optional().describe('Ключевые позы для художника')
});

export type BlockingPlan = z.infer<typeof blockingPlanSchema>;

// ─────────────────────────────────────────────
// Parsed Scene — результат разбора промпта
// ─────────────────────────────────────────────

export const parsedSceneSchema = z.object({
  // Метаданные
  sourcePrompt: z.string().describe('Оригинальный промпт'),
  language: z.enum(['ru', 'en', 'auto']).default('auto'),

  // Производство
  production: z.string().default('Untitled'),
  episode: z.string().default('E01'),
  sceneName: z.string(),
  durationSeconds: z.number().default(8),
  fps: z.number().default(24),
  resolution: z.object({ width: z.number(), height: z.number() }).default({ width: 1920, height: 1080 }),

  // Контент
  setting: z.string().describe('Описание места действия / фона'),
  mood: z.string().optional().describe('Настроение / стиль сцены'),
  timeOfDay: z.enum(['day', 'night', 'sunset', 'dawn', 'indoor', 'unspecified']).default('unspecified'),

  // Персонажи
  characters: z.array(characterSpecSchema),

  // Планы
  cameraPlan: cameraPlanSchema,
  lipsyncPlan: lipsyncPlanSchema.optional(),
  blockingPlan: blockingPlanSchema.optional(),
  assetRequirements: assetRequirementsSchema,

  // Выходной scene_plan.json
  scenePlan: z.any().describe('Сгенерированный scene_plan.json готовый к валидации'),

  // Мета
  confidence: z.number().min(0).max(1).optional().describe('Уверенность разбора (0–1)'),
  warnings: z.array(z.string()).optional().describe('Предупреждения при разборе'),
  generatedAt: z.string().optional()
});

export type ParsedScene = z.infer<typeof parsedSceneSchema>;

// ─────────────────────────────────────────────
// Production Package — итоговый пакет
// ─────────────────────────────────────────────

export const auditIssueSchema = z.object({
  id: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  category: z.enum(['missing_asset', 'broken_connection', 'empty_layer', 'missing_keyframe', 'lipsync', 'render', 'structure']),
  message: z.string(),
  autoFixable: z.boolean().default(false),
  fixDescription: z.string().optional(),
  nodePath: z.string().optional()
});

export const fixPlanSchema = z.object({
  autoFixed: z.array(z.object({
    issueId: z.string(),
    action: z.string(),
    result: z.enum(['success', 'partial', 'failed'])
  })),
  humanFixRequired: z.array(z.object({
    issueId: z.string(),
    instructions: z.string(),
    estimatedMinutes: z.number().optional()
  }))
});

export const productionPackageSchema = z.object({
  sceneName: z.string(),
  production: z.string(),
  episode: z.string(),
  exportedAt: z.string(),

  files: z.object({
    harmonyProject: z.string().optional().describe('Путь к .xstage'),
    scenePlanJson: z.string().optional(),
    previewVideo: z.string().optional(),
    characterSpecs: z.string().optional(),
    cameraPlan: z.string().optional(),
    lipsyncPlan: z.string().optional(),
    blockingPlan: z.string().optional(),
    auditReport: z.string().optional(),
    fixPlan: z.string().optional(),
    readme: z.string().optional()
  }),

  summary: z.object({
    totalIssues: z.number(),
    autoFixed: z.number(),
    humanFixRequired: z.number(),
    previewRendered: z.boolean(),
    productionReady: z.boolean()
  })
});

export type ProductionPackage = z.infer<typeof productionPackageSchema>;
export type AuditIssue = z.infer<typeof auditIssueSchema>;
export type FixPlan = z.infer<typeof fixPlanSchema>;
