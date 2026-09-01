import { z } from 'zod';

export const mohoCharacterViewV1Schema = z.enum(['front', 'three_quarter', 'side', 'back']);
export const mohoCharacterLayerKindV1Schema = z.enum([
  'body',
  'head',
  'limb',
  'mouth',
  'eye',
  'hand',
  'accessory'
]);

const assetPathSchema = z.string().min(1).refine(
  value => /\.(?:png|svg)$/i.test(value),
  'Character assets must be transparent PNG or SVG files.'
);

export const mohoCharacterAssetLayerV1Schema = z.object({
  layerId: z.string().regex(/^[A-Za-z0-9_.-]+$/),
  kind: mohoCharacterLayerKindV1Schema,
  choiceName: z.string().min(1).nullable(),
  sourcePath: assetPathSchema,
  parentLayerId: z.string().regex(/^[A-Za-z0-9_.-]+$/).nullable(),
  jointOverlapPx: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/)
}).strict();

export const mohoCharacterAssetPackV1Schema = z.object({
  schemaVersion: z.literal('1.0'),
  characterId: z.string().regex(/^[A-Za-z0-9_.-]+$/),
  canvas: z.object({
    width: z.number().int().positive().max(16384),
    height: z.number().int().positive().max(16384)
  }).strict(),
  views: z.array(mohoCharacterViewV1Schema).min(3),
  layers: z.array(mohoCharacterAssetLayerV1Schema).min(1)
}).strict().superRefine((pack, context) => {
  const requiredViews = ['front', 'three_quarter', 'side'] as const;
  for (const view of requiredViews) {
    if (!pack.views.includes(view)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['views'],
        message: `Required view is missing: ${view}.`
      });
    }
  }

  const layerIds = new Set<string>();
  for (const [index, layer] of pack.layers.entries()) {
    if (layerIds.has(layer.layerId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layers', index, 'layerId'],
        message: 'layerId must be unique.'
      });
    }
    layerIds.add(layer.layerId);
    if (layer.kind === 'limb' && layer.jointOverlapPx === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layers', index, 'jointOverlapPx'],
        message: 'jointOverlapPx must be greater than zero for limb layers.'
      });
    }
    if (['mouth', 'eye', 'hand'].includes(layer.kind) && layer.choiceName === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layers', index, 'choiceName'],
        message: `choiceName is required for ${layer.kind} layers.`
      });
    }
  }

  for (const [index, layer] of pack.layers.entries()) {
    if (layer.parentLayerId !== null && !layerIds.has(layer.parentLayerId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layers', index, 'parentLayerId'],
        message: 'parentLayerId must reference a known layer.'
      });
    }
    if (layer.parentLayerId === layer.layerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layers', index, 'parentLayerId'],
        message: 'A layer cannot be its own parent.'
      });
    }
  }

  const minimumChoices: Record<'mouth' | 'eye' | 'hand', number> = { mouth: 8, eye: 2, hand: 3 };
  for (const kind of ['mouth', 'eye', 'hand'] as const) {
    const choices = new Set(
      pack.layers
        .filter(layer => layer.kind === kind && layer.choiceName !== null)
        .map(layer => layer.choiceName)
    );
    if (choices.size < minimumChoices[kind]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layers'],
        message: `${kind} requires at least ${minimumChoices[kind]} unique choices; found ${choices.size}.`
      });
    }
  }
});

export type MohoCharacterAssetPackV1 = z.infer<typeof mohoCharacterAssetPackV1Schema>;
export type MohoCharacterAssetLayerV1 = z.infer<typeof mohoCharacterAssetLayerV1Schema>;
