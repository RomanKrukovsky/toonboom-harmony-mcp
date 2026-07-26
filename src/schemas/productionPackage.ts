import { z } from 'zod';

export interface ProductionPackagePaths {
  root: string;
  manifestPath: string;
  productionRunPath: string;
  seriesBibleDir: string;
  styleBibleDir: string;
  scriptsDir: string;
  storyboardsDir: string;
  animaticsDir: string;
  charactersDir: string;
  rigsDir: string;
  backgroundsDir: string;
  propsDir: string;
  audioDir: string;
  musicDir: string;
  scenePlansDir: string;
  animationPlansDir: string;
  cameraPlansDir: string;
  fxPlansDir: string;
  harmonyProjectsDir: string;
  templatesDir: string;
  previewsDir: string;
  rendersDir: string;
  reviewReportsDir: string;
  fixPlansDir: string;
  approvalRecordsDir: string;
  diagnosticsDir: string;
  logsDir: string;
  deliveryDir: string;
  provenanceDir: string;
}

export const productionRunOptionsSchema = z.object({
  prompt: z.string().min(1),
  projectName: z.string().default('AutonomousSeries'),
  outputRoot: z.string().optional(),
  engineMode: z.enum(['simulation', 'dry_run', 'real', 'hybrid', 'moonshot']).optional(),
  durationSeconds: z.number().default(45),
  episodeCount: z.number().default(1),
  targetAudience: z.string().default('general'),
  genre: z.string().default('comedy'),
  visualStyle: z.string().default('2d_cutout'),
  animationStyle: z.string().default('limited_tv'),
  referenceFiles: z.array(z.string()).optional(),
  referenceImages: z.array(z.string()).optional(),
  characterReferences: z.array(z.string()).optional(),
  resolution: z.object({ width: z.number(), height: z.number() }).default({ width: 1920, height: 1080 }),
  fps: z.number().default(24),
  aspectRatio: z.string().default('16:9'),
  language: z.string().default('ru'),
  voicePreferences: z.record(z.string()).optional(),
  musicPreferences: z.record(z.string()).optional(),
  qualityPreset: z.enum(['draft', 'standard', 'broadcast', 'cinematic']).default('broadcast'),
  budgetPreset: z.enum(['indie', 'tv_series', 'commercial', 'feature']).default('tv_series'),
  deadlinePreset: z.enum(['fast', 'balanced', 'thorough']).default('balanced'),
  allowGeneratedAssets: z.boolean().default(true),
  allowPlaceholderAssets: z.boolean().default(true),
  allowUiAutomation: z.boolean().default(false),
  allowExperimentalOperations: z.boolean().default(false),
  maximumIterations: z.number().default(3),
  humanApprovalPolicy: z.enum(['fully_autonomous', 'approve_critical', 'approve_each_department', 'manual_supervision']).default('approve_critical')
});

export type ProductionRunOptions = z.infer<typeof productionRunOptionsSchema>;
