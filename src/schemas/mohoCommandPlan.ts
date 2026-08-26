import { z } from 'zod';

/**
 * mohoCommandPlan.ts — the Moho Pro dialect of the rig command plan.
 *
 * Same discipline as HarmonyCommandPlanV4: whitelist-only operations,
 * per-command preconditions/verification/rollback, fail-closed execution.
 *
 * Moho mapping of the neutral rig model:
 *   peg            -> bone (skeleton layer hierarchy)
 *   hinge pivot    -> bone joint position (start at circle center)
 *   deformer       -> bone-driven deformation (Curve/Envelope -> helper bones
 *                     or flexi binding, recorded as bone ops)
 *   master ctrl    -> Smart Bone dial wired to controlled bones
 *   mouth drawings -> switch layer choices (+ lip-sync keys later)
 *
 * Execution: Moho automates via in-app Lua; the emitter turns this plan into
 * one deterministic Lua file that builds the rig inside Moho and prints
 * per-step verification. There is no headless Moho daemon — honest by design.
 */

export const MOHO_COMMAND_PLAN_SCHEMA = 'toon-boom-mcp/moho-command-plan-v1';

export const mohoOperationSchema = z.enum([
  'save_document',
  'add_bone',
  'set_bone_parent',
  'bind_layer_to_bone',
  'create_switch_layer',
  'add_switch_choice',
  'create_vector_layer',
  'rename_layer',
  'create_smart_bone',
  'wire_smart_bone_channel',
  'set_bone_constraints',
  'create_vitruvian_group',
  'add_vitruvian_bone',
  'create_smart_action',
  'set_action_channel_key',
  'create_mesh_layer',
  'bind_smart_warp_mesh',
  'set_bone_shy',
  'set_bone_color',
  'create_projected_shadow',
  'verify_rig'
]);

export const mohoCommandSchema = z.object({
  commandId: z.string().regex(/^mcmd_\d+$/),
  type: mohoOperationSchema,
  params: z.record(z.any()),
  preconditions: z.array(z.string()).min(1),
  destructiveLevel: z.enum(['none', 'reversible', 'destructive']),
  idempotencyKey: z.string().min(12),
  rollback: z.object({
    strategy: z.enum(['none', 'delete_created']),
    snapshotRequired: z.boolean()
  }),
  expectedArtifact: z.object({
    kind: z.string(),
    path: z.string().nullable(),
    nonempty: z.boolean()
  }),
  verification: z.object({
    method: z.string(),
    required: z.boolean(),
    acceptance: z.array(z.string())
  })
}).strict();

export const mohoCommandPlanSchema = z.object({
  schemaVersion: z.literal(MOHO_COMMAND_PLAN_SCHEMA),
  planId: z.string().min(12),
  documentPath: z.string().nullable(),
  createdAt: z.string().datetime(),
  status: z.literal('implemented_unverified'),
  requiresRealMoho: z.literal(true),
  sourceManifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  operations: z.array(mohoCommandSchema).min(1),
  acceptanceGates: z.array(z.string()).min(6),
  provenance: z.object({
    compiler: z.literal('MohoRigPlanCompiler v1'),
    source: z.string()
  })
}).strict();

export type MohoCommand = z.infer<typeof mohoCommandSchema>;
export type MohoCommandPlan = z.infer<typeof mohoCommandPlanSchema>;
