import { z } from 'zod';

export const STUDIO_PROFILE_SCHEMA_VERSION = '1.0';

export const editabilityPrioritySchema = z.object({
  priority: z.number().min(0).max(1),
  maxDeformersPerPart: z.number().int().positive().optional(),
  preferredRepresentation: z.enum([
    'peg_transform', 'curve_deformer', 'envelope_deformer', 
    'bone_deformer', 'drawing_substitution', 'frame_by_frame_vector', 
    'raster_texture_layer', 'reference_only'
  ]).optional(),
  frameByFrameAllowed: z.boolean().default(true)
}).strict();

export const studioProfileSchema = z.object({
  profileId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  editability: editabilityPrioritySchema,
  namingConventions: z.object({
    drawingPrefix: z.string().default('drw_'),
    pegPrefix: z.string().default('peg_'),
    groupPrefix: z.string().default('grp_'),
    compositePrefix: z.string().default('cmp_'),
    cameraPrefix: z.string().default('cam_'),
    deformerPrefix: z.string().default('def_')
  }).strict().optional(),
  colorManagement: z.object({
    defaultColorSpace: z.enum(['sRGB', 'linear', 'ACES']).default('sRGB'),
    paletteNamingStandard: z.string().optional()
  }).strict().optional(),
  qualityThresholds: z.object({
    minSilhouetteQuality: z.number().min(0).max(1).default(0.7),
    maxKeyframeReductionError: z.number().min(0).default(0.05),
    requireVectorTypeTVG: z.boolean().default(true),
    requireEditableGeometry: z.boolean().default(true)
  }).strict().optional(),
  pipelineDefaults: z.object({
    defaultFps: z.number().positive().default(24),
    defaultResolution: z.object({ width: z.number().positive(), height: z.number().positive() }).default({ width: 1920, height: 1080 }),
    defaultDurationSeconds: z.number().positive().default(6)
  }).strict().optional()
}).strict();

export const actingProfileSchema = z.object({
  profileId: z.string(),
  characterId: z.string(),
  name: z.string(),
  style: z.enum(['restrained', 'energetic', 'sarcastic', 'anxious', 'aggressive', 'comedic', 'custom']),
  styleDescription: z.string(),
  parameters: z.object({
    anticipationStrength: z.number().min(0).max(1).default(0.5),
    overshootAmount: z.number().min(0).max(1).default(0.3),
    settleFrames: z.number().int().positive().default(3),
    gestureFrequency: z.number().min(0).max(1).default(0.5),
    blinkRate: z.number().min(0).default(0.3),
    gazeLeadFrames: z.number().int().nonnegative().default(2),
    weightShiftIntensity: z.number().min(0).max(1).default(0.4),
    facialExpressiveness: z.number().min(0).max(1).default(0.6),
    reactionSpeed: z.number().min(0).max(1).default(0.5),
    holdDurationMultiplier: z.number().positive().default(1.0)
  }).strict(),
  poseLibraryRefs: z.array(z.string()).default([]),
  gestureLibraryRefs: z.array(z.string()).default([])
}).strict();

export const tasteModelConfigSchema = z.object({
  modelId: z.string(),
  version: z.string(),
  type: z.enum(['pairwise_ranker', 'absolute_scorer', 'critic_aligned', 'custom']),
  trainingData: z.object({
    sampleCount: z.number().int().nonnegative(),
    preferenceCount: z.number().int().nonnegative(),
    correctionCount: z.number().int().nonnegative(),
    privacyLevel: z.enum(['public', 'studio_only', 'private']).default('studio_only')
  }).strict(),
  features: z.object({
    useTechnicalScores: z.boolean().default(true),
    useArtisticScores: z.boolean().default(true),
    useCriticReports: z.boolean().default(true),
    useCorrectionHistory: z.boolean().default(true),
    useRepresentationChoices: z.boolean().default(true)
  }).strict(),
  weights: z.object({
    technicalWeight: z.number().default(0.6),
    artisticWeight: z.number().default(0.4),
    criticAlignmentWeight: z.number().default(0.3),
    correctionAlignmentWeight: z.number().default(0.3),
    representationQualityWeight: z.number().default(0.2)
  }).strict(),
  status: z.enum(['untrained', 'training', 'ready', 'deprecated']).default('untrained')
}).strict();

export const tasteModelPredictionSchema = z.object({
  variantId: z.string(),
  sceneId: z.string(),
  predictedScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.array(z.string()).default([]),
  conflictWithTechnical: z.boolean().default(false),
  modelId: z.string(),
  timestamp: z.string()
}).strict();

export const episodeCompilerConfigSchema = z.object({
  compilerId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  seriesBibleRef: z.string().optional(),
  episodeTemplate: z.object({
    structure: z.array(z.object({
      sceneType: z.enum(['opening', 'dialogue', 'action', 'climax', 'resolution', 'closing']),
      typicalDurationSeconds: z.number().positive(),
      typicalShotCount: z.number().int().positive(),
      requiredCharacters: z.array(z.string()).default([])
    })).default([]),
    hooks: z.array(z.string()).default([]),
    cliffhangers: z.array(z.string()).default([])
  }).strict(),
  reusePolicy: z.object({
    allowBackgroundReuse: z.boolean().default(true),
    allowPropReuse: z.boolean().default(true),
    allowCharacterPoseReuse: z.boolean().default(true),
    maxReuseDistanceEpisodes: z.number().int().positive().default(5)
  }).strict(),
  qualityGates: z.object({
    minCriticScore: z.number().min(0).max(1).default(0.7),
    requireTasteModelApproval: z.boolean().default(false),
    maxHumanReviewTimeMinutes: z.number().int().positive().default(60)
  }).strict()
}).strict();

export const compiledEpisodeSchema = z.object({
  episodeId: z.string(),
  seriesId: z.string(),
  episodeNumber: z.number().int().positive(),
  scenes: z.array(z.object({
    sceneId: z.string(),
    sceneType: z.string(),
    durationSeconds: z.number().positive(),
    shotCount: z.number().int().positive(),
    characters: z.array(z.string()),
    status: z.enum(['planned', 'in_progress', 'review', 'approved', 'rejected']),
    manifestRef: z.string().optional(),
    criticReportRef: z.string().optional(),
    tasteScoreRef: z.string().optional()
  })),
  totalDurationSeconds: z.number().positive(),
  totalScenes: z.number().int().positive(),
  compilationTimestamp: z.string(),
  compilerConfig: episodeCompilerConfigSchema
}).strict();

export type StudioProfile = z.infer<typeof studioProfileSchema>;
export type ActingProfile = z.infer<typeof actingProfileSchema>;
export type TasteModelConfig = z.infer<typeof tasteModelConfigSchema>;
export type TasteModelPrediction = z.infer<typeof tasteModelPredictionSchema>;
export type EpisodeCompilerConfig = z.infer<typeof episodeCompilerConfigSchema>;
export type CompiledEpisode = z.infer<typeof compiledEpisodeSchema>;