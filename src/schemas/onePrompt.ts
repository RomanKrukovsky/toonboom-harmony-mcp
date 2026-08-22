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

/**
 * Output type: what `onePromptSchema.parse()` returns. `fps` and `resolution`
 * are required here because the schema fills in defaults.
 */
export type OnePromptParsed = z.output<typeof onePromptSchema>;

/**
 * Input type: what a caller may supply. `fps` and `resolution` are optional.
 *
 * Planner adapters take this looser shape because individual tool schemas expose
 * only a subset of these fields (some omit fps/resolution entirely) and every
 * consumer already defaults defensively (`input.fps ?? 24`). Using the output
 * type here would force ~20 call sites to invent values they never received.
 */
export type OnePromptInput = z.input<typeof onePromptSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type HonestyOrigin = z.infer<typeof honestyOriginSchema>;