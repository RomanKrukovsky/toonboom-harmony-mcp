import { describe, it, expect } from '@jest/globals';
import {
  characterDrawingPIRSchema,
  computePIRHash,
  CharacterDrawingPIR
} from '../src/schemas/vectorizationPIR.js';
import {
  NativeDrawingCompiler,
  normalizedToHarmonyOGL
} from '../src/adapters/nativeDrawingCompiler.js';

describe('Vectorization PIR Schemas & Compiler Tests', () => {
  const samplePIR: CharacterDrawingPIR = {
    pirVersion: '1.0.0',
    characterId: 'hero_character',
    drawingName: 'head_v1',
    frame: 1,
    coordinateTransform: {
      sourceWidth: 1024,
      sourceHeight: 1024,
      coordinateSystem: 'normalized',
      transformMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      scale: 1.0,
      axisOrientation: { x: 'right', y: 'up' }
    },
    layers: [
      {
        layerId: 'layer_outline',
        name: 'Outline',
        semanticGroup: 'outline',
        artLayer: 'line',
        strokes: [
          {
            strokeId: 'stroke_001',
            resultType: 'pencil',
            artLayer: 'line',
            semanticGroup: 'outline',
            openOrClosed: 'open',
            segments: [
              {
                startPoint: { x: 0.0, y: 0.0 },
                endPoint: { x: 1.0, y: 1.0 },
                controlPoint1: { x: 0.25, y: 0.25 },
                controlPoint2: { x: 0.75, y: 0.75 },
                isCorner: false
              }
            ],
            anchors: [{ x: 0.0, y: 0.0 }, { x: 1.0, y: 1.0 }],
            controlHandles: [{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }],
            cornerFlags: [false],
            baseThickness: 2.0,
            widthProfile: [
              { position: 0.0, thickness: 1.5 },
              { position: 1.0, thickness: 2.5 }
            ],
            lineCap: 'round',
            lineJoin: 'round',
            colourId: 'color_black',
            paletteId: 'default_palette',
            confidence: 0.98,
            sourceProvider: 'classical_fallback',
            assumptions: [],
            requiresHumanReview: false,
            provenance: {}
          }
        ],
        fillRegions: []
      }
    ],
    unassignedStrokes: [],
    unassignedFills: [],
    palette: [
      {
        id: 'color_black',
        name: 'Black',
        color: { r: 0, g: 0, b: 0, a: 255 }
      }
    ],
    qualityMetrics: {
      totalStrokes: 1,
      totalFills: 0,
      averageControlPointsPerStroke: 2,
      rmsGeometricError: 0.002,
      firstPassAcceptanceRate: 1.0,
      requiresHumanReviewCount: 0
    }
  };

  it('validates CharacterDrawingPIR schema correctly', () => {
    const parsed = characterDrawingPIRSchema.parse(samplePIR);
    expect(parsed.characterId).toBe('hero_character');
    expect(parsed.layers[0].strokes.length).toBe(1);
  });

  it('calculates deterministic hash for PIR', () => {
    const hash1 = computePIRHash(samplePIR);
    const hash2 = computePIRHash(samplePIR);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string
  });

  it('converts normalized 0..1 coordinates to Harmony OGL range (-1000..1000)', () => {
    const center = normalizedToHarmonyOGL({ x: 0.5, y: 0.5 });
    expect(center).toEqual({ x: 0, y: 0 });

    const topLeft = normalizedToHarmonyOGL({ x: 0.0, y: 0.0 });
    expect(topLeft).toEqual({ x: -1000, y: 1000 });

    const bottomRight = normalizedToHarmonyOGL({ x: 1.0, y: 1.0 });
    expect(bottomRight).toEqual({ x: 1000, y: -1000 });
  });

  it('compiles PIR to HarmonyNativeCommandPlan in AUTO mode', () => {
    const plan = NativeDrawingCompiler.compile(samplePIR, 'Head_Drawing', 'head_drawing_v1', 1, 'AUTO');
    expect(plan.targetNode).toBe('Head_Drawing');
    expect(plan.compileMode).toBe('AUTO');
    expect(plan.commands.length).toBeGreaterThanOrEqual(4);
    expect(plan.planHash).toBeDefined();

    const pencilCmd = plan.commands.find((c) => c.type === 'apply_pencil_strokes');
    expect(pencilCmd).toBeDefined();
    expect(pencilCmd?.params.strokes.length).toBe(1);
  });

  it('compiles PIR to HarmonyNativeCommandPlan in PENCIL_NATIVE mode', () => {
    const plan = NativeDrawingCompiler.compile(samplePIR, 'Head_Drawing', 'head_drawing_v1', 1, 'PENCIL_NATIVE');
    expect(plan.compileMode).toBe('PENCIL_NATIVE');
    const pencilCmd = plan.commands.find((c) => c.type === 'apply_pencil_strokes');
    expect(pencilCmd).toBeDefined();
  });
});
