export class VisemeMapper {
    /**
     * Maps LipSyncPIR visemes to Harmony exposure data based on a mapping config.
     * Any unmapped phoneme will use the defaultDrawing.
     */
    static mapToExposures(pir, config) {
        const exposures = [];
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
