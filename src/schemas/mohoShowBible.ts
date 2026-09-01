import { z } from 'zod';

export const MOHO_SHOW_BIBLE_SCHEMA_VERSION = '1.0';

export const mohoShowBibleSchema = z.object({
  schemaVersion: z.literal(MOHO_SHOW_BIBLE_SCHEMA_VERSION),
  showId: z.string().min(1).describe('Stable show identifier, e.g. "polygon_show_v1".'),
  title: z.string().min(1),
  logLine: z.string().min(1),
  fps: z.number().int().positive().default(24),
  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }),
  visualStyle: z.string().min(1).describe('Short human-readable style description.'),
  lineRules: z.object({
    defaultThicknessPt: z.number().positive(),
    lineColourId: z.string().min(1).describe('palette colourId for outlines.'),
    fillColourId: z.string().min(1).describe('palette colourId for fills.')
  }),
  lighting: z.object({
    type: z.string().min(1).describe('e.g. "flat", "soft_top_left", "rim".'),
    shadowColourId: z.string().min(1)
  }),
  allowedDeformations: z.array(
    z.enum([
      'peg_transform',
      'curve_deformer',
      'envelope_deformer',
      'bone_deformer',
      'drawing_substitution',
      'frame_by_frame_vector',
      'smart_bone_dial',
      'mesh_warp',
      'vitruvian_group'
    ])
  ).min(1),
  allowedRigTypes: z.array(
    z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical'])
  ).min(1),
  characterBibles: z.array(z.object({
    characterId: z.string().min(1),
    ref: z.string().min(1).describe('Path or URI to character_bible.json.')
  })).min(1),
  paletteManifestRef: z.string().min(1).describe('Path or URI to palette_manifest.json.'),
  cameraRulesRef: z.string().min(1).describe('Path or URI to camera_rules.json.'),
  motionGrammarRef: z.string().min(1).describe('Path or URI to motion_grammar.json.'),
  qaThresholdsRef: z.string().min(1).describe('Path or URI to qa_thresholds.json.'),
  forbiddenSources: z.array(z.string()).default([]).describe('Licences/styles that must NOT be used (e.g. "NC", "third_party_series").'),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime(),
    notes: z.string().optional()
  })
}).strict();

export type MohoShowBible = z.infer<typeof mohoShowBibleSchema>;

export function assertMohoShowBibleVersion(doc: unknown): { major: number; minor: number } {
  if (!doc || typeof (doc as any).schemaVersion !== 'string') {
    throw new Error('moho_show_bible.json missing required "schemaVersion" field');
  }
  const [maj, min] = (doc as any).schemaVersion.split('.').map((n: string) => parseInt(n, 10));
  if (!Number.isFinite(maj) || maj !== 1) {
    throw new Error(`Unsupported moho_show_bible schemaVersion major ${maj}. This server supports major 1.`);
  }
  return { major: maj, minor: Number.isFinite(min) ? min : 0 };
}