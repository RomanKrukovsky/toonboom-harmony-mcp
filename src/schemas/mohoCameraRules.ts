import { z } from 'zod';

export const MOHO_CAMERA_RULES_SCHEMA_VERSION = '1.0';

export const mohoCameraRulesSchema = z.object({
  schemaVersion: z.literal(MOHO_CAMERA_RULES_SCHEMA_VERSION),
  rulesId: z.string().min(1).describe('Stable rules identifier, e.g. "polygon_show_v1_camera_rules".'),
  allowedShotSizes: z.array(
    z.enum(['extreme_close_up', 'close_up', 'medium_close_up', 'medium_shot', 'medium_full_shot', 'full_shot', 'long_shot', 'extreme_long_shot'])
  ).min(1),
  allowedCameraMoves: z.array(
    z.enum(['static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'dolly_in', 'dolly_out', 'truck_left', 'truck_right', 'pedestal_up', 'pedestal_down', 'zoom_in', 'zoom_out', 'arc_left', 'arc_right', 'crane_up', 'crane_down'])
  ).min(1),
  defaultShotSize: z.enum(['extreme_close_up', 'close_up', 'medium_close_up', 'medium_shot', 'medium_full_shot', 'full_shot', 'long_shot', 'extreme_long_shot']),
  safeMargins: z.object({
    top: z.number().min(0).max(1),
    bottom: z.number().min(0).max(1),
    left: z.number().min(0).max(1),
    right: z.number().min(0).max(1)
  }),
  forbiddenMoves: z.array(z.string()).default([]).describe('Human-readable list of moves that are out of style.'),
  mohoCameraRigType: z.enum(['perspective', 'orthographic']).default('perspective').describe('Moho Pro camera rig: perspective supports depth, orthographic is flat 2D-friendly.'),
  maxFieldOfViewDeg: z.number().min(1).max(179).default(45).describe('Maximum camera field of view in degrees (1-179).'),
  allowCameraShake: z.boolean().default(false).describe('Whether Moho Pro camera shake (point layer driven) is permitted.'),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime()
  })
}).strict();

export type MohoCameraRules = z.infer<typeof mohoCameraRulesSchema>;

export function assertMohoCameraRulesVersion(doc: unknown): { major: number; minor: number } {
  if (!doc || typeof (doc as any).schemaVersion !== 'string') {
    throw new Error('moho_camera_rules.json missing required "schemaVersion" field');
  }
  const [maj, min] = (doc as any).schemaVersion.split('.').map((n: string) => parseInt(n, 10));
  if (!Number.isFinite(maj) || maj !== 1) {
    throw new Error(`Unsupported moho_camera_rules schemaVersion major ${maj}. This server supports major 1.`);
  }
  return { major: maj, minor: Number.isFinite(min) ? min : 0 };
}