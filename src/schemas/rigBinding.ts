import { z } from 'zod';

export const rigBindingEntrySchema = z.object({
  template_slot: z.string(),
  pir_landmark: z.string().optional(),
  derived_from: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  resolution: z.enum(['DIRECT', 'DERIVED_MIDPOINT', 'FALLBACK', 'MANUAL'])
});

export const rigBindingPlanV1Schema = z.object({
  schema: z.literal('toon-boom-mcp/rig-binding-plan-v1'),
  character_id: z.string(),
  template: z.object({
    template_id: z.string(),
    version: z.string(),
    content_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/)
  }),
  source: z.object({
    pir_id: z.string(),
    pir_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/)
  }),
  bindings: z.array(rigBindingEntrySchema),
  unresolved: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export type RigBindingPlanV1 = z.infer<typeof rigBindingPlanV1Schema>;
export type RigBindingEntry = z.infer<typeof rigBindingEntrySchema>;
