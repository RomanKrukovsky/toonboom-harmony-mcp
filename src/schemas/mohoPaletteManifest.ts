import { z } from 'zod';

export const MOHO_PALETTE_MANIFEST_SCHEMA_VERSION = '1.0';

export const mohoPaletteColourSchema = z.object({
  colourId: z.string().min(1).describe('Stable ID used by rigs and drawings, e.g. "char_skin_base".'),
  name: z.string().min(1),
  rgba: z.string().regex(/^#?[0-9a-fA-F]{8}$/).describe('8-digit hex RGBA, e.g. "#FF8C6BFF".'),
  usage: z.string().describe('Where this colour may be used: "skin", "hair", "line", "shadow", ...'),
  locked: z.boolean().default(true).describe('Locked colours cannot be swapped by the LLM.'),
  mohoColourIndex: z.number().int().min(0).max(65535).describe('Moho palette slot index (0–65535).'),
  gradientRef: z.string().optional().describe('Optional gradient reference.')
}).strict();

export const mohoPaletteManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  paletteId: z.string().min(1),
  name: z.string().min(1),
  colours: z.array(mohoPaletteColourSchema).min(1),
  paletteType: z.enum(['rgb', 'indexed', 'gradient']).default('rgb'),
  maxColours: z.number().int().positive().default(256).describe('Moho palette slot limit.'),
  provenance: z.object({
    approver: z.string(),
    approvedAt: z.string().datetime(),
    notes: z.string().optional()
  })
}).strict();

export type MohoPaletteManifest = z.infer<typeof mohoPaletteManifestSchema>;
export type MohoPaletteColour = z.infer<typeof mohoPaletteColourSchema>;

export function assertMohoPaletteManifestVersion(doc: unknown): asserts doc is MohoPaletteManifest {
  const parsed = mohoPaletteManifestSchema.parse(doc);
  if (parsed.schemaVersion !== MOHO_PALETTE_MANIFEST_SCHEMA_VERSION) {
    throw new Error(`Unsupported Moho palette manifest schemaVersion: ${parsed.schemaVersion}`);
  }
}
