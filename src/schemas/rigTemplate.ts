import { z } from 'zod';

export const rigTemplateCoordinateSpaceSchema = z.object({
  system: z.literal('NORMALIZED_CHARACTER'),
  origin: z.string(),
  x_axis: z.string(),
  y_axis: z.string(),
  unit: z.literal('CHARACTER_HEIGHT_RATIO')
});

export const rigTemplateNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['READ', 'PEG', 'COMPOSITE', 'DEFORMATION_CURVE', 'DEFORMATION_BONE', 'KINEMATIC_OUTPUT']),
  name: z.string()
});

export const rigTemplateConnectionSchema = z.object({
  from_node: z.string(),
  from_port: z.number().default(0),
  to_node: z.string(),
  to_port: z.number().default(0)
});

export const rigTemplateSchema = z.object({
  schema: z.literal('toon-boom-mcp/rig-template-v1'),
  template_id: z.string(),
  version: z.string(),
  display_name: z.string(),
  pir_compatibility: z.array(z.string()),
  harmony_compatibility: z.object({
    minimum_version: z.string(),
    maximum_tested_version: z.string()
  }),
  coordinate_space: rigTemplateCoordinateSpaceSchema,
  required_landmarks: z.array(z.string()),
  optional_landmarks: z.array(z.string()).optional().default([]),
  nodes: z.array(rigTemplateNodeSchema),
  connections: z.array(rigTemplateConnectionSchema),
  bindings: z.array(z.record(z.any())).optional().default([]),
  constraints: z.array(z.record(z.any())).optional().default([])
});

export type RigTemplate = z.infer<typeof rigTemplateSchema>;
