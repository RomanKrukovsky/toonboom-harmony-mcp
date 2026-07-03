import { z } from 'zod';

/**
 * onePrompt.ts — the input envelope for the One-Prompt Pipeline.
 *
 * One free-form creative prompt is unpacked into a structured
 * AnalysisResult that downstream planners consume. Honesty labels follow
 * §12 of ACTOR.MD: every field carries an `origin` of
 * "generated" | "assembled" | "simulated" | "planned" | "placeholder" |
 * "requires_human" | "requires_external_model" | "requires_real_harmony".
 */

export const honestyOriginSchema = z.enum([
  'generated',
  'assembled',
  'simulated',
  'planned',
  'placeholder',
  'requires_human',
  'requires_external_model',
  'requires_real_harmony'
]);

export const onePromptSchema = z.object({
  prompt: z.string().min(1).describe('Один большой творческий промпт серии/эпизода.'),
  targetDurationMinutes: z.number().optional().describe('Целевая длительность серии в минутах.'),
  fps: z.number().optional().default(24),
  resolution: z.object({ width: z.number(), height: z.number() }).optional().default({ width: 1920, height: 1080 }),
  mode: z.enum(['real', 'simulation', 'hybrid', 'moonshot']).optional()
});

export const analysisResultSchema = z.object({
  logLine: z.string(),
  genre: z.string(),
  tone: z.string(),
  setting: z.string(),
  targetAudience: z.string().optional(),
  durationMinutes: z.number(),
  estimatedSceneCount: z.number(),
  estimatedShotCount: z.number(),
  candidateCharacters: z.array(z.object({
    name: z.string(),
    role: z.string(),
    oneLine: z.string()
  })),
  themes: z.array(z.string()),
  origin: honestyOriginSchema
});

export type OnePromptInput = z.infer<typeof onePromptSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type HonestyOrigin = z.infer<typeof honestyOriginSchema>;