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

export class VisemeMapper {
    /**
     * Maps LipSyncPIR visemes to Harmony exposure data based on a mapping config.
     * Any unmapped phoneme will use the defaultDrawing.
     */
    public static mapToExposures(pir: LipSyncPIR, config: LipSyncMappingConfig): ExposureCommandData[] {
        const exposures: ExposureCommandData[] = [];
        
        for (const viseme of pir.visemes) {
            const drawingName = config.phonemeToDrawingMap[viseme.phoneme] || config.defaultDrawing;
            exposures.push({
                nodeId: config.mouthNodeId,
                startFrame: viseme.startFrame,
                endFrame: viseme.endFrame,
                drawingName
            });
        }
        
        return exposures;
    }
}
