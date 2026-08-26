import {
  TURNAROUND_ANGLES,
  type TurnaroundAngle,
  type SmartBoneDialSpec
} from '../../schemas/mohoProductionRig.js';

/**
 * MohoTurnaroundBuilder — generates the complete 360° Turnaround Matrix
 * across 8 standard camera views:
 *   Front -> 3/4 R -> Side R -> 1/4 R -> Back -> 1/4 L -> Side L -> 3/4 L
 *
 * Implements the exact angle dial layout found in Girl.moho, Dad body.moho,
 * and Evgeny Borsch Lesson 3:
 *   Dial span: -45 deg to +270 deg (315 deg total rotation, 45 deg per pose).
 */

export interface TurnaroundSwitchSetup {
  switchLayerName: string;
  smartDialName: string;
  angles: TurnaroundAngle[];
  sublayerTemplate: string[];
  angleMapping: Array<{
    angleName: TurnaroundAngle;
    dialAngleDeg: number;
    frameIndex: number;
  }>;
}

export interface TurnaroundMatrixResult {
  headTurn: TurnaroundSwitchSetup;
  bodyTurn: TurnaroundSwitchSetup;
  smartDials: SmartBoneDialSpec[];
}

export class MohoTurnaroundBuilder {
  /**
   * Standard angle-to-dial map (Girl.moho & Evgeny Borsch Lesson 3).
   * Frame 1 = 0 deg (Front), Frame 2 = 45 deg (3/4 R), ... Frame 8 = 315 deg (3/4 L).
   */
  public static readonly STANDARD_ANGLE_OFFSETS: Array<{ angle: TurnaroundAngle; deg: number }> = [
    { angle: 'Front', deg: 0 },
    { angle: '3/4 R', deg: 45 },
    { angle: 'Side R', deg: 90 },
    { angle: '1/4 R', deg: 135 },
    { angle: 'Back', deg: 180 },
    { angle: '1/4 L', deg: 225 },
    { angle: 'Side L', deg: 270 },
    { angle: '3/4 L', deg: 315 }
  ];

  public static buildTurnaroundMatrix(opts: {
    characterName: string;
    includeHead?: boolean;
    includeBody?: boolean;
  }): TurnaroundMatrixResult {
    const includeHead = opts.includeHead ?? true;
    const includeBody = opts.includeBody ?? true;

    const angleMapping = this.STANDARD_ANGLE_OFFSETS.map((item, idx) => ({
      angleName: item.angle,
      dialAngleDeg: item.deg,
      frameIndex: idx + 1
    }));

    const headSublayers = [
      'hair_back',
      'ears_L',
      'ears_R',
      'head_base',
      'mouth',
      'nose',
      'eyes_L',
      'eyes_R',
      'brows_L',
      'brows_R',
      'hair_front'
    ];

    const bodySublayers = [
      'arm_back_far',
      'leg_back_far',
      'torso_base',
      'belt_hips',
      'leg_front_near',
      'neck',
      'arm_front_near'
    ];

    const headTurn: TurnaroundSwitchSetup = {
      switchLayerName: 'Head switch',
      smartDialName: 'Head switch',
      angles: [...TURNAROUND_ANGLES],
      sublayerTemplate: headSublayers,
      angleMapping
    };

    const bodyTurn: TurnaroundSwitchSetup = {
      switchLayerName: 'Body switch',
      smartDialName: 'Body switch',
      angles: [...TURNAROUND_ANGLES],
      sublayerTemplate: bodySublayers,
      angleMapping
    };

    const smartDials: SmartBoneDialSpec[] = [];

    if (includeHead) {
      smartDials.push({
        dialName: 'Head switch',
        boneName: 'Head switch',
        minAngleDeg: -45,
        maxAngleDeg: 315,
        neutralAngleDeg: 0,
        controlledTarget: 'Head switch',
        poses: angleMapping.map(m => ({
          frame: m.frameIndex,
          angleDeg: m.dialAngleDeg,
          switchChoice: `Head_${m.angleName.replace(/[\s/]/g, '_')}`
        }))
      });
    }

    if (includeBody) {
      smartDials.push({
        dialName: 'Body switch',
        boneName: 'Body switch',
        minAngleDeg: -45,
        maxAngleDeg: 315,
        neutralAngleDeg: 0,
        controlledTarget: 'Body switch',
        poses: angleMapping.map(m => ({
          frame: m.frameIndex,
          angleDeg: m.dialAngleDeg,
          switchChoice: `Body_${m.angleName.replace(/[\s/]/g, '_')}`
        }))
      });
    }

    return {
      headTurn,
      bodyTurn,
      smartDials
    };
  }
}
