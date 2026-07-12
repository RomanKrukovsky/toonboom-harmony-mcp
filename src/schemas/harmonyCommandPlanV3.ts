import { z } from 'zod';

export const HARMONY_COMMAND_PLAN_V3_SCHEMA_VERSION = '3.0';

// Whitelist operation types (Master Prompt §19)
export const WHITELIST_OPERATIONS = [
  'create_group',
  'create_drawing_element',
  'create_drawing',
  'write_path',
  'create_palette',
  'add_palette_swatch',
  'create_peg',
  'attach_drawing_to_peg',
  'set_pivot',
  'set_transform_keyframe',
  'set_transform_interpolation',
  'create_deformer',
  'configure_deformer',
  'set_deformer_key',
  'set_exposure',
  'set_substitution',
  'create_camera',
  'set_camera_key',
  'create_composite',
  'connect_nodes',
  'set_node_attribute',
  'lock_element',
  'save_version',
  'render_preview'
] as const;

export const commandOperationSchema = z.object({
  operation: z.enum(WHITELIST_OPERATIONS),
  target: z.string().optional(),
  parameters: z.record(z.any()),
  order: z.number().int().min(0),
  description: z.string().optional(),
  rollbackStrategy: z.enum(['none', 'delete_created', 'restore_snapshot']).default('none')
}).strict();

export const commandPlanV3Schema = z.object({
  schemaVersion: z.literal('3.0').default(HARMONY_COMMAND_PLAN_V3_SCHEMA_VERSION),
  planId: z.string(),
  manifestId: z.string(),
  createdAt: z.string(),
  operations: z.array(commandOperationSchema),
  totalOperations: z.number().int().min(0),
  estimatedExecutionTimeMs: z.number().int().min(0).optional(),
  requiresHarmony: z.boolean().default(true),
  whitelistOnly: z.literal(true).default(true),
  // Security and validation
  provenance: z.object({
    compiler: z.string(),
    version: z.string(),
    manifestSchemaVersion: z.string()
  }).strict(),
  // Rollback plan
  rollbackPlan: z.object({
    supported: z.boolean(),
    strategy: z.string().optional()
  }).strict()
}).strict();

export type CommandPlanV3 = z.infer<typeof commandPlanV3Schema>;
export type CommandOperation = z.infer<typeof commandOperationSchema>;
