import { type SmartBoneDialSpec } from '../../schemas/mohoProductionRig.js';
import { type SynthesizedSmartAction } from '../mohoSmartActionSynthesizer/index.js';

export interface PhonemeCue {
  frame: number;
  phoneme: string; // e.g. 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'O', 'Rest', 'Smile', 'Frown', 'X'
}

export const PRESTON_BLAIR_MOUTH_SHAPES = [
  'Rest',   // 0. Neutral closed
  'A',      // 1. Wide open (Ah, I)
  'B',      // 2. Closed lips (M, B, P)
  'C',      // 3. Clenched teeth (C, D, G, K, N, R, S, Th, Y, Z)
  'D',      // 4. Tongue to teeth (L)
  'E',      // 5. Wide grin (Ee)
  'F',      // 6. Teeth on lower lip (F, V)
  'G',      // 7. Rounded puckered (W, Q, OO)
  'L',      // 8. Tongue up (L, D, T)
  'O',      // 9. Round open (Oh)
  'Smile',  // 10. Happy closed/open
  'Frown'   // 11. Sad closed/open
] as const;

export type PrestonBlairShape = typeof PRESTON_BLAIR_MOUTH_SHAPES[number];

export interface MohoLipsyncResult {
  switchKeys: Array<{ frame: number; shape: string; interpolation: 'step' }>;
  mouthDial: SmartBoneDialSpec;
  mouthAction: SynthesizedSmartAction;
  totalCues: number;
}

/**
 * MohoLipsyncSynthesizer — Synthesizes automated lipsync data for Moho Switch Layers
 * and Smart Bone Mouth Dials using Step interpolation (Borsch Lessons 2, 9).
 */
export class MohoLipsyncSynthesizer {
  public static synthesizeLipsync(params: {
    cues: PhonemeCue[];
    switchLayerName?: string;
    dialName?: string;
  }): MohoLipsyncResult {
    const switchLayerName = params.switchLayerName ?? 'Mouth switch';
    const dialName = params.dialName ?? 'Mouth Dial';

    // 1. Sort cues chronologically
    const sortedCues = [...params.cues].sort((a, b) => a.frame - b.frame);

    // 2. Build switch keys with step interpolation
    const switchKeys = sortedCues.map(c => {
      const normalizedShape = this.normalizeShape(c.phoneme);
      return {
        frame: c.frame,
        shape: normalizedShape,
        interpolation: 'step' as const
      };
    });

    // 3. Build Smart Bone Dial for mouth shapes
    // Angles evenly spaced across 180 degrees (-90° to +90°)
    const angleStep = 180 / (PRESTON_BLAIR_MOUTH_SHAPES.length - 1);
    const dialPoses = PRESTON_BLAIR_MOUTH_SHAPES.map((shape, idx) => {
      const angleDeg = Math.round(-90 + idx * angleStep);
      return {
        frame: idx + 1,
        angleDeg,
        name: shape
      };
    });

    const mouthDial: SmartBoneDialSpec = {
      dialName,
      boneName: dialName,
      minAngleDeg: -90,
      maxAngleDeg: 90,
      neutralAngleDeg: -90, // Rest pose at -90 deg
      controlledTarget: switchLayerName,
      poses: dialPoses.map(p => ({
        frame: p.frame,
        angleDeg: p.angleDeg
      }))
    };

    const mouthAction: SynthesizedSmartAction = {
      actionName: dialName,
      targetBone: dialName,
      keyframes: dialPoses.map(p => ({
        frame: p.frame,
        angleDeg: p.angleDeg
      }))
    };

    return {
      switchKeys,
      mouthDial,
      mouthAction,
      totalCues: switchKeys.length
    };
  }

  /**
   * Normalizes arbitrary phoneme/viseme strings to standard Preston Blair names.
   */
  public static normalizeShape(input: string): string {
    const s = input.trim().toUpperCase();
    if (s === 'X' || s === 'REST' || s === 'NEUTRAL' || s === 'CLOSED') return 'Rest';
    if (s === 'A' || s === 'AI' || s === 'AH' || s === 'AA') return 'A';
    if (s === 'B' || s === 'M' || s === 'P' || s === 'MBP') return 'B';
    if (s === 'C' || s === 'D' || s === 'G' || s === 'K' || s === 'N' || s === 'S' || s === 'Z') return 'C';
    if (s === 'E' || s === 'EE') return 'E';
    if (s === 'F' || s === 'V' || s === 'FV') return 'F';
    if (s === 'G' || s === 'W' || s === 'Q' || s === 'WQ') return 'G';
    if (s === 'L') return 'L';
    if (s === 'O' || s === 'OH' || s === 'OO') return 'O';
    if (s === 'SMILE') return 'Smile';
    if (s === 'FROWN') return 'Frown';
    return 'Rest';
  }
}
