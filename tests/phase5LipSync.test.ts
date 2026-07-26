import { LipSyncPIR } from '../src/schemas/lipSyncPir.js';
import { VisemeMapper, LipSyncMappingConfig } from '../src/services/visemeMapper/index.js';
import { HarmonyCommandBuilder } from '../src/services/harmonyCommandBuilder/index.js';
import { harmonyCommandPlanV4Schema } from '../src/schemas/harmonyCommandPlanV4.js';

describe('Phase 5: LipSync Mapping Pipeline', () => {
  it('should map LipSyncPIR to HarmonyCommandPlanV4 deterministic exposures', () => {
    // 1. Create LipSyncPIR
    const pir: LipSyncPIR = {
      format: 'LipSyncPIR',
      version: '1.0.0',
      sourceAudioHash: 'AUDIO_SHA256_HASH_MOCK',
      frameRate: 24,
      visemes: [
        { startFrame: 1, endFrame: 5, phoneme: 'X' },
        { startFrame: 6, endFrame: 12, phoneme: 'A' },
        { startFrame: 13, endFrame: 20, phoneme: 'B' },
        { startFrame: 21, endFrame: 25, phoneme: 'UNKNOWN_PHONEME' },
        { startFrame: 26, endFrame: 30, phoneme: 'X' }
      ]
    };

    // 2. Define Mapping Config
    const mappingConfig: LipSyncMappingConfig = {
      mouthNodeId: 'NODE_MOUTH_DRAWING',
      phonemeToDrawingMap: {
        'A': 'Mouth_A',
        'B': 'Mouth_B',
        'C': 'Mouth_C',
        'D': 'Mouth_D',
        'E': 'Mouth_E',
        'F': 'Mouth_F',
        'G': 'Mouth_G',
        'H': 'Mouth_H',
        'X': 'Mouth_X' // Rest/closed
      },
      defaultDrawing: 'Mouth_X' // Fallback
    };

    // 3. Map to Exposures
    const exposures = VisemeMapper.mapToExposures(pir, mappingConfig);
    expect(exposures).toHaveLength(5);
    expect(exposures[0].drawingName).toBe('Mouth_X');
    expect(exposures[1].drawingName).toBe('Mouth_A');
    expect(exposures[2].drawingName).toBe('Mouth_B');
    // UNKNOWN_PHONEME should fall back to defaultDrawing
    expect(exposures[3].drawingName).toBe('Mouth_X');

    // 4. Build Command Plan
    const builder = new HarmonyCommandBuilder();
    const plan = builder.buildLipSyncPlan(exposures, pir.sourceAudioHash);

    // 5. Validate output against V4 schema
    const validation = harmonyCommandPlanV4Schema.safeParse(plan);
    expect(validation.success).toBe(true);
    
    if (validation.success) {
        expect(validation.data.commands.length).toBeGreaterThanOrEqual(10);
        
        // Ensure commands include set_exposure
        const exposureCommands = validation.data.commands.filter(c => c.type === 'set_exposure');
        expect(exposureCommands.length).toBe(5);
        expect(exposureCommands[0].params.drawing).toBe('Mouth_X');
        expect(exposureCommands[1].params.drawing).toBe('Mouth_A');
        expect(exposureCommands[3].params.drawing).toBe('Mouth_X'); // The fallback one
    }
  });
});
