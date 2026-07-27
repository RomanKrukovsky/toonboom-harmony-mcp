import { z } from 'zod';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';

export const point2DSchema = z.object({
  x: z.number(),
  y: z.number()
});
export type Point2D = z.infer<typeof point2DSchema>;

export const bezierSegmentSchema = z.object({
  startPoint: point2DSchema,
  endPoint: point2DSchema,
  controlPoint1: point2DSchema,
  controlPoint2: point2DSchema,
  isCorner: z.boolean().default(false)
});
export type BezierSegmentPIR = z.infer<typeof bezierSegmentSchema>;

export const widthPointSchema = z.object({
  position: z.number().min(0).max(1), // Normalized 0..1 along stroke curve
  thickness: z.number().min(0)        // Thickness in drawing units
});
export type WidthPointPIR = z.infer<typeof widthPointSchema>;

export const drawingStrokePIRSchema = z.object({
  strokeId: z.string(),
  resultType: z.enum(['pencil', 'brush']),
  artLayer: z.enum(['underlay', 'line', 'color', 'overlay']).default('line'),
  semanticGroup: z.enum([
    'outline',
    'face',
    'hair',
    'eyes',
    'brows',
    'mouth',
    'torso',
    'left_arm',
    'right_arm',
    'left_hand',
    'right_hand',
    'clothing',
    'accessory',
    'unassigned'
  ]).default('unassigned'),
  sourceRegion: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }).optional(),
  openOrClosed: z.enum(['open', 'closed']).default('open'),
  segments: z.array(bezierSegmentSchema),
  anchors: z.array(point2DSchema),
  controlHandles: z.array(point2DSchema),
  cornerFlags: z.array(z.boolean()),
  baseThickness: z.number().positive().default(2.0),
  widthProfile: z.array(widthPointSchema).default([]),
  lineCap: z.enum(['butt', 'round', 'square']).default('round'),
  lineJoin: z.enum(['miter', 'round', 'bevel']).default('round'),
  colourId: z.string(),
  paletteId: z.string().default('default_palette'),
  confidence: z.number().min(0).max(1).default(1.0),
  sourceProvider: z.string().default('classical_fallback'),
  assumptions: z.array(z.string()).default([]),
  requiresHumanReview: z.boolean().default(false),
  provenance: z.record(z.unknown()).default({})
});
export type DrawingStrokePIR = z.infer<typeof drawingStrokePIRSchema>;

export const fillRegionPIRSchema = z.object({
  regionId: z.string(),
  colourId: z.string(),
  paletteId: z.string().default('default_palette'),
  artLayer: z.enum(['underlay', 'line', 'color', 'overlay']).default('color'),
  semanticGroup: z.string().default('unassigned'),
  boundaryStrokes: z.array(z.string()).default([]), // Links to strokeIds bounding this region
  boundarySegments: z.array(bezierSegmentSchema),
  allowedGaps: z.number().min(0).default(0.0), // Gap tolerance in pixels
  confidence: z.number().min(0).max(1).default(1.0),
  requiresHumanReview: z.boolean().default(false)
});
export type FillRegionPIR = z.infer<typeof fillRegionPIRSchema>;

export const coordinateTransformationSchema = z.object({
  sourceWidth: z.number().positive(),
  sourceHeight: z.number().positive(),
  coordinateSystem: z.enum(['normalized', 'harmony_ogl']).default('normalized'),
  transformMatrix: z.array(z.number()).length(9).default([1, 0, 0, 0, 1, 0, 0, 0, 1]), // 3x3 matrix
  scale: z.number().default(1.0),
  axisOrientation: z.object({
    x: z.enum(['right']),
    y: z.enum(['up', 'down'])
  }).default({ x: 'right', y: 'up' })
});
export type CoordinateTransformation = z.infer<typeof coordinateTransformationSchema>;

export const drawingLayerPIRSchema = z.object({
  layerId: z.string(),
  name: z.string(),
  semanticGroup: z.string(),
  artLayer: z.enum(['underlay', 'line', 'color', 'overlay']),
  strokes: z.array(drawingStrokePIRSchema),
  fillRegions: z.array(fillRegionPIRSchema)
});
export type DrawingLayerPIR = z.infer<typeof drawingLayerPIRSchema>;

export const characterDrawingPIRSchema = z.object({
  pirVersion: z.literal('1.0.0').default('1.0.0'),
  characterId: z.string(),
  drawingName: z.string(),
  frame: z.number().int().positive().default(1),
  coordinateTransform: coordinateTransformationSchema,
  layers: z.array(drawingLayerPIRSchema),
  unassignedStrokes: z.array(drawingStrokePIRSchema).default([]),
  unassignedFills: z.array(fillRegionPIRSchema).default([]),
  palette: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.object({
      r: z.number().int().min(0).max(255),
      g: z.number().int().min(0).max(255),
      b: z.number().int().min(0).max(255),
      a: z.number().int().min(0).max(255).default(255)
    })
  })),
  qualityMetrics: z.object({
    totalStrokes: z.number().int(),
    totalFills: z.number().int(),
    averageControlPointsPerStroke: z.number(),
    rmsGeometricError: z.number(),
    firstPassAcceptanceRate: z.number(),
    requiresHumanReviewCount: z.number()
  }),
  deterministicHash: z.string().optional()
});
export type CharacterDrawingPIR = z.infer<typeof characterDrawingPIRSchema>;

/**
 * Computes deterministic canonical hash for a CharacterDrawingPIR object
 */
export function computePIRHash(pir: Omit<CharacterDrawingPIR, 'deterministicHash'>): string {
  const normalized = stringify(pir);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
