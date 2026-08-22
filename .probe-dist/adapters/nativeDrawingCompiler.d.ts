import { CharacterDrawingPIR, Point2D } from '../schemas/vectorizationPIR.js';
export type NativeCompileMode = 'PENCIL_NATIVE' | 'BRUSH_NATIVE' | 'AUTO';
export interface NativeDrawingCommand {
    commandId: string;
    idempotencyKey: string;
    type: 'create_drawing_node' | 'ensure_palette_colors' | 'apply_pencil_strokes' | 'apply_brush_contours' | 'set_exposure_range';
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
export declare function normalizedToHarmonyOGL(point: Point2D): {
    x: number;
    y: number;
};
export declare class NativeDrawingCompiler {
    static compile(pirInput: CharacterDrawingPIR, targetNode: string, targetDrawing: string, targetFrame?: number, mode?: NativeCompileMode): HarmonyNativeCommandPlan;
}
