import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  CharacterDrawingPIR,
  DrawingStrokePIR,
  characterDrawingPIRSchema,
  Point2D
} from '../schemas/vectorizationPIR.js';

export type NativeCompileMode = 'PENCIL_NATIVE' | 'BRUSH_NATIVE' | 'AUTO';

export interface NativeDrawingCommand {
  commandId: string;
  idempotencyKey: string;
  type:
    | 'create_drawing_node'
    | 'ensure_palette_colors'
    | 'apply_pencil_strokes'
    | 'apply_brush_contours'
    | 'set_exposure_range';
  targetNode: string;
  drawingName: string;
  artLayer: 'underlay' | 'line' | 'color' | 'overlay';
  params: Record<string, any>;
  expectedPreconditions: Record<string, any>;
  inverseOperation: Record<string, any>;
  rollbackStrategy: string;
}

export interface HarmonyNativeCommandPlan {
  planId: string;
  characterId: string;
  targetNode: string;
  targetDrawing: string;
  targetFrame: number;
  compileMode: NativeCompileMode;
  commands: NativeDrawingCommand[];
  qualityMetrics: Record<string, any>;
  planHash: string;
  createdAt: string;
}

/**
 * Transforms normalized 0..1 point to Harmony OGL coordinates (-1000..1000).
 */
export function normalizedToHarmonyOGL(point: Point2D): { x: number; y: number } {
  // Harmony origin (0, 0) is center. X range -1000..1000, Y range -1000..1000 (Y inverted)
  const oglX = (point.x - 0.5) * 2000.0;
  const oglY = (0.5 - point.y) * 2000.0;
  return { x: oglX, y: oglY };
}

export class NativeDrawingCompiler {
  static compile(
    pirInput: CharacterDrawingPIR,
    targetNode: string,
    targetDrawing: string,
    targetFrame: number = 1,
    mode: NativeCompileMode = 'AUTO'
  ): HarmonyNativeCommandPlan {
    const pir = characterDrawingPIRSchema.parse(pirInput);
    const planId = `plan_${pir.characterId}_${targetDrawing}_${Date.now()}`;
    const commands: NativeDrawingCommand[] = [];

    // 1. Ensure Palette & Colors
    const paletteParams = {
      paletteId: 'default_palette',
      colors: pir.palette.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color
      }))
    };
    commands.push({
      commandId: `${planId}_cmd_001`,
      idempotencyKey: crypto.createHash('sha256').update(stringify(paletteParams)).digest('hex'),
      type: 'ensure_palette_colors',
      targetNode,
      drawingName: targetDrawing,
      artLayer: 'line',
      params: paletteParams,
      expectedPreconditions: { sceneExists: true },
      inverseOperation: { type: 'noop' },
      rollbackStrategy: 'ignore'
    });

    // 2. Ensure Target Node
    const nodeParams = {
      nodeName: targetNode,
      drawingName: targetDrawing
    };
    commands.push({
      commandId: `${planId}_cmd_002`,
      idempotencyKey: crypto.createHash('sha256').update(stringify(nodeParams)).digest('hex'),
      type: 'create_drawing_node',
      targetNode,
      drawingName: targetDrawing,
      artLayer: 'line',
      params: nodeParams,
      expectedPreconditions: { parentCompositeExists: true },
      inverseOperation: { type: 'delete_node', nodeName: targetNode },
      rollbackStrategy: 'delete_node'
    });

    // 3. Process Strokes & Compile to Pencil / Brush Operations
    const allStrokes: DrawingStrokePIR[] = [
      ...pir.layers.flatMap((l) => l.strokes),
      ...pir.unassignedStrokes
    ];

    const pencilStrokes: any[] = [];
    const brushContours: any[] = [];

    for (const stroke of allStrokes) {
      const selectedType =
        mode === 'PENCIL_NATIVE'
          ? 'pencil'
          : mode === 'BRUSH_NATIVE'
          ? 'brush'
          : stroke.resultType;

      const convertedSegments = stroke.segments.map((seg) => ({
        start: normalizedToHarmonyOGL(seg.startPoint),
        end: normalizedToHarmonyOGL(seg.endPoint),
        c1: normalizedToHarmonyOGL(seg.controlPoint1),
        c2: normalizedToHarmonyOGL(seg.controlPoint2),
        isCorner: seg.isCorner
      }));

      const convertedWidthProfile = stroke.widthProfile.map((w) => ({
        position: w.position,
        thickness: w.thickness
      }));

      const strokeData = {
        strokeId: stroke.strokeId,
        artLayer: stroke.artLayer,
        semanticGroup: stroke.semanticGroup,
        colourId: stroke.colourId,
        baseThickness: stroke.baseThickness,
        widthProfile: convertedWidthProfile,
        lineCap: stroke.lineCap,
        lineJoin: stroke.lineJoin,
        segments: convertedSegments
      };

      if (selectedType === 'pencil') {
        pencilStrokes.push(strokeData);
      } else {
        brushContours.push(strokeData);
      }
    }

    if (pencilStrokes.length > 0) {
      const pencilParams = { strokes: pencilStrokes };
      commands.push({
        commandId: `${planId}_cmd_003_pencil`,
        idempotencyKey: crypto.createHash('sha256').update(stringify(pencilParams)).digest('hex'),
        type: 'apply_pencil_strokes',
        targetNode,
        drawingName: targetDrawing,
        artLayer: 'line',
        params: pencilParams,
        expectedPreconditions: { targetDrawingInitialized: true },
        inverseOperation: { type: 'clear_art_layer', artLayer: 'line' },
        rollbackStrategy: 'clear_drawing'
      });
    }

    if (brushContours.length > 0) {
      const brushParams = { contours: brushContours };
      commands.push({
        commandId: `${planId}_cmd_004_brush`,
        idempotencyKey: crypto.createHash('sha256').update(stringify(brushParams)).digest('hex'),
        type: 'apply_brush_contours',
        targetNode,
        drawingName: targetDrawing,
        artLayer: 'line',
        params: brushParams,
        expectedPreconditions: { targetDrawingInitialized: true },
        inverseOperation: { type: 'clear_art_layer', artLayer: 'line' },
        rollbackStrategy: 'clear_drawing'
      });
    }

    // 4. Set Exposure Range
    const exposureParams = {
      startFrame: targetFrame,
      duration: 1,
      drawingName: targetDrawing
    };
    commands.push({
      commandId: `${planId}_cmd_005_exp`,
      idempotencyKey: crypto.createHash('sha256').update(stringify(exposureParams)).digest('hex'),
      type: 'set_exposure_range',
      targetNode,
      drawingName: targetDrawing,
      artLayer: 'line',
      params: exposureParams,
      expectedPreconditions: { nodeExists: true },
      inverseOperation: { type: 'clear_exposure', startFrame: targetFrame },
      rollbackStrategy: 'clear_exposure'
    });

    const planCore = {
      planId,
      characterId: pir.characterId,
      targetNode,
      targetDrawing,
      targetFrame,
      compileMode: mode,
      commands,
      qualityMetrics: pir.qualityMetrics
    };

    const planHash = crypto.createHash('sha256').update(stringify(planCore)).digest('hex');

    return {
      ...planCore,
      planHash,
      createdAt: new Date().toISOString()
    };
  }
}
