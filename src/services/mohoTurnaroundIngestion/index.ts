import { TURNAROUND_ANGLES, type TurnaroundAngle } from '../../schemas/mohoProductionRig.js';
import { PRESTON_BLAIR_MOUTH_SHAPES } from '../mohoLipsyncSynthesizer/index.js';

export interface CharacterPartAsset {
  partName: string;
  angle: TurnaroundAngle;
  filePath?: string;
  vectorPointsCount?: number;
}

export interface IngestedTurnaroundHierarchy {
  characterName: string;
  rootLayerName: string;
  switchLayers: Array<{
    name: string;
    type: 'SwitchLayer';
    controlledByDial?: string;
    sublayers: Array<{
      name: string;
      type: 'VectorLayer' | 'ImageLayer';
      filePath?: string;
    }>;
  }>;
  totalSublayersCount: number;
}

/**
 * MohoTurnaroundIngestion — Ingests multi-angle character assets and builds
 * standard production switch layer hierarchies for Moho (Borsch Lessons 3, 4, 5, 8).
 */
export class MohoTurnaroundIngestion {
  public static buildHierarchy(params: {
    characterName: string;
    assets?: CharacterPartAsset[];
    handPoses?: string[];
    includeEyelids?: boolean;
  }): IngestedTurnaroundHierarchy {
    const characterName = params.characterName;
    const handPoses = params.handPoses ?? ['Open', 'Fist', 'Point', 'Relaxed'];
    const includeEyelids = params.includeEyelids ?? true;

    const switchLayers: IngestedTurnaroundHierarchy['switchLayers'] = [];

    // 1. Head Switch Layer (8 turnaround camera angles)
    switchLayers.push({
      name: 'Head switch',
      type: 'SwitchLayer',
      controlledByDial: 'Head switch',
      sublayers: TURNAROUND_ANGLES.map(ang => ({
        name: `Head_${ang.replace(/[\s/]/g, '_')}`,
        type: 'VectorLayer'
      }))
    });

    // 2. Body Switch Layer (8 turnaround camera angles)
    switchLayers.push({
      name: 'Body switch',
      type: 'SwitchLayer',
      controlledByDial: 'Body switch',
      sublayers: TURNAROUND_ANGLES.map(ang => ({
        name: `Torso_${ang.replace(/[\s/]/g, '_')}`,
        type: 'VectorLayer'
      }))
    });

    // 3. Mouth Switch Layer (12 Preston Blair shapes)
    switchLayers.push({
      name: 'Mouth switch',
      type: 'SwitchLayer',
      controlledByDial: 'Mouth Dial',
      sublayers: PRESTON_BLAIR_MOUTH_SHAPES.map(shape => ({
        name: `Mouth_${shape}`,
        type: 'VectorLayer'
      }))
    });

    // 4. Eyes & Eyelids Switch Layers
    for (const side of ['L', 'R']) {
      const eyeSublayers: Array<{ name: string; type: 'VectorLayer' | 'ImageLayer' }> = [
        { name: `Eye_${side}_Open`, type: 'VectorLayer' },
        { name: `Eye_${side}_Blink`, type: 'VectorLayer' },
        { name: `Eye_${side}_Wide`, type: 'VectorLayer' },
        { name: `Eye_${side}_Squint`, type: 'VectorLayer' }
      ];
      if (includeEyelids) {
        eyeSublayers.push(
          { name: `Eye_${side}_Lid_Up`, type: 'VectorLayer' },
          { name: `Eye_${side}_Lid_Down`, type: 'VectorLayer' }
        );
      }

      switchLayers.push({
        name: `Eyes_${side} switch`,
        type: 'SwitchLayer',
        sublayers: eyeSublayers
      });
    }

    // 5. Hands L/R Switch Layers
    for (const side of ['L', 'R']) {
      switchLayers.push({
        name: `Hand_${side} switch`,
        type: 'SwitchLayer',
        sublayers: handPoses.map(pose => ({
          name: `Hand_${side}_${pose}`,
          type: 'VectorLayer'
        }))
      });
    }

    // 6. Feet L/R Switch Layers
    for (const side of ['L', 'R']) {
      switchLayers.push({
        name: `Foot_${side} switch`,
        type: 'SwitchLayer',
        sublayers: ['Front', '34', 'Side'].map(view => ({
          name: `Foot_${side}_${view}`,
          type: 'VectorLayer'
        }))
      });
    }

    const totalSublayersCount = switchLayers.reduce((sum, sl) => sum + sl.sublayers.length, 0);

    return {
      characterName,
      rootLayerName: characterName,
      switchLayers,
      totalSublayersCount
    };
  }
}
