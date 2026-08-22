import { LipSyncPIR } from '../../schemas/lipSyncPir.js';
export interface LipSyncMappingConfig {
    mouthNodeId: string;
    phonemeToDrawingMap: Record<string, string>;
    defaultDrawing: string;
}
export interface ExposureCommandData {
    nodeId: string;
    startFrame: number;
    endFrame: number;
    drawingName: string;
}
export declare class VisemeMapper {
    /**
     * Maps LipSyncPIR visemes to Harmony exposure data based on a mapping config.
     * Any unmapped phoneme will use the defaultDrawing.
     */
    static mapToExposures(pir: LipSyncPIR, config: LipSyncMappingConfig): ExposureCommandData[];
}
