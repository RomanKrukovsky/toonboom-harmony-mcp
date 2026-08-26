import {
  type JointFlexionCorrection,
  type SquashStretchSpec,
  type SmartBoneDialSpec
} from '../../schemas/mohoProductionRig.js';

/**
 * MohoSmartActionSynthesizer — synthesizes procedural Smart Actions for:
 *   1. Elbow & knee joint angle corrections (volume preservation at 90° & 135°)
 *   2. Cuff deformer fan bones (ankle and wrist sleeve roundings)
 *   3. Squash & Stretch volume preservation for Head and Torso
 *   4. Eyelid coordinate compensation during squash/stretch
 */

export interface SynthesizedSmartAction {
  actionName: string;
  targetBone: string;
  keyframes: Array<{
    frame: number;
    angleDeg?: number;
    scale?: { x: number; y: number };
    pos?: { x: number; y: number };
    pointOffsets?: Array<{ pointId: number; dx: number; dy: number }>;
  }>;
}

export class MohoSmartActionSynthesizer {
  /**
   * Synthesize joint flexion corrections for arms and legs.
   */
  public static synthesizeJointCorrections(
    joints: JointFlexionCorrection[]
  ): SynthesizedSmartAction[] {
    const results: SynthesizedSmartAction[] = [];

    for (const joint of joints) {
      // 1. Primary bone angle action (e.g. "Forearm_L 2" or "Shin_R")
      const actionName = `${joint.boneName}`;
      results.push({
        actionName,
        targetBone: joint.boneName,
        keyframes: [
          { frame: 0, angleDeg: 0, scale: { x: 1.0, y: 1.0 } },
          { frame: 1, angleDeg: 90, scale: { x: 1.0, y: joint.bulgeBicepScale } },
          { frame: 2, angleDeg: 135, scale: { x: 0.95, y: joint.bulgeBicepScale * 1.1 } }
        ]
      });

      // 2. Cuff / fan deformer bones
      for (const cuff of joint.cuffDeformers) {
        results.push({
          actionName: `${cuff.name}_Action`,
          targetBone: cuff.name,
          keyframes: [
            { frame: 0, angleDeg: 0 },
            { frame: 1, angleDeg: cuff.angleOffsetDeg * 0.5 },
            { frame: 2, angleDeg: cuff.angleOffsetDeg }
          ]
        });
      }
    }

    return results;
  }

  /**
   * Synthesize squash & stretch actions with volume compensation.
   * Head s/s and Body s/s dials rotate from -90 deg (extreme squash) to +90 deg (extreme stretch).
   */
  public static synthesizeSquashStretch(
    specs: SquashStretchSpec[]
  ): {
    smartDials: SmartBoneDialSpec[];
    actions: SynthesizedSmartAction[];
  } {
    const smartDials: SmartBoneDialSpec[] = [];
    const actions: SynthesizedSmartAction[] = [];

    for (const spec of specs) {
      const dialName = `${spec.targetPart} s/s`;
      const actionName = dialName;

      // Smart Bone Dial definition
      smartDials.push({
        dialName,
        boneName: dialName,
        minAngleDeg: -90,
        maxAngleDeg: 90,
        neutralAngleDeg: 0,
        controlledTarget: spec.controlBoneName,
        poses: [
          { frame: 1, angleDeg: -90, scale: { x: 1.35, y: 0.65 } }, // Squash: wide & short
          { frame: 2, angleDeg: 0, scale: { x: 1.0, y: 1.0 } },     // Neutral
          { frame: 3, angleDeg: 90, scale: { x: 0.75, y: 1.35 } }   // Stretch: thin & tall
        ]
      });

      // Master bone vertical stretch
      actions.push({
        actionName,
        targetBone: spec.controlBoneName,
        keyframes: [
          { frame: 1, scale: { x: 1.0, y: 0.65 }, pos: { x: 0, y: -15 } },
          { frame: 2, scale: { x: 1.0, y: 1.0 }, pos: { x: 0, y: 0 } },
          { frame: 3, scale: { x: 1.0, y: 1.35 }, pos: { x: 0, y: 20 } }
        ]
      });

      // Horizontal spreader bones for volume conservation
      for (const spreader of spec.horizontalSpreaderBones) {
        actions.push({
          actionName,
          targetBone: spreader,
          keyframes: [
            { frame: 1, scale: { x: 1.4, y: 1.0 } },
            { frame: 2, scale: { x: 1.0, y: 1.0 } },
            { frame: 3, scale: { x: 0.7, y: 1.0 } }
          ]
        });
      }

      // Eyelid coordinate compensation during head squash
      if (spec.targetPart === 'Head' && spec.eyelidCompensationEnabled) {
        actions.push({
          actionName,
          targetBone: 'eye_lid_up',
          keyframes: [
            { frame: 1, pos: { x: 0, y: -8 } },
            { frame: 2, pos: { x: 0, y: 0 } },
            { frame: 3, pos: { x: 0, y: 12 } }
          ]
        });
        actions.push({
          actionName,
          targetBone: 'eye_lid_down',
          keyframes: [
            { frame: 1, pos: { x: 0, y: -5 } },
            { frame: 2, pos: { x: 0, y: 0 } },
            { frame: 3, pos: { x: 0, y: 8 } }
          ]
        });
      }
    }

    return { smartDials, actions };
  }

  /**
   * Synthesize Mouth Scale Dials (X and Y) per Borsch Lesson 2.
   * Dials span [-45°, 45°] over 144 frames with scale range [0.8 .. 1.2], neutral at frame 72.
   */
  public static synthesizeMouthScaleDials(mouthLayerName = 'mouth'): {
    smartDials: SmartBoneDialSpec[];
    actions: SynthesizedSmartAction[];
  } {
    const smartDials: SmartBoneDialSpec[] = [
      {
        dialName: 'Mouth scale X',
        boneName: 'Mouth scale X',
        minAngleDeg: -45,
        maxAngleDeg: 45,
        neutralAngleDeg: 0,
        controlledTarget: mouthLayerName,
        poses: [
          { frame: 1, angleDeg: -45, scale: { x: 0.8, y: 1.0 } },
          { frame: 72, angleDeg: 0, scale: { x: 1.0, y: 1.0 } },
          { frame: 144, angleDeg: 45, scale: { x: 1.2, y: 1.0 } }
        ]
      },
      {
        dialName: 'Mouth scale Y',
        boneName: 'Mouth scale Y',
        minAngleDeg: -45,
        maxAngleDeg: 45,
        neutralAngleDeg: 0,
        controlledTarget: mouthLayerName,
        poses: [
          { frame: 1, angleDeg: -45, scale: { x: 1.0, y: 0.8 } },
          { frame: 72, angleDeg: 0, scale: { x: 1.0, y: 1.0 } },
          { frame: 144, angleDeg: 45, scale: { x: 1.0, y: 1.2 } }
        ]
      }
    ];

    const actions: SynthesizedSmartAction[] = [
      {
        actionName: 'Mouth scale X',
        targetBone: 'Mouth scale X',
        keyframes: [
          { frame: 1, scale: { x: 0.8, y: 1.0 } },
          { frame: 72, scale: { x: 1.0, y: 1.0 } },
          { frame: 144, scale: { x: 1.2, y: 1.0 } }
        ]
      },
      {
        actionName: 'Mouth scale Y',
        targetBone: 'Mouth scale Y',
        keyframes: [
          { frame: 1, scale: { x: 1.0, y: 0.8 } },
          { frame: 72, scale: { x: 1.0, y: 1.0 } },
          { frame: 144, scale: { x: 1.0, y: 1.2 } }
        ]
      }
    ];

    return { smartDials, actions };
  }

  /**
   * Synthesize Torso-Pelvis Soft Bending Joint per Borsch Lesson 9.
   * Pin bone takes 0.5 angle from Torso, horizontal helper takes 0.5 angle from Pelvis.
   */
  public static synthesizeWaistSoftBend(): {
    pinBone: { name: string; parent: string; angleControlRatio: number; targetBone: string; isShy: boolean };
    helperBone: { name: string; parent: string; angleControlRatio: number; targetBone: string; isShy: boolean };
  } {
    return {
      pinBone: {
        name: 'Waist_Pin',
        parent: 'Master',
        angleControlRatio: 0.5,
        targetBone: 'Torso',
        isShy: true
      },
      helperBone: {
        name: 'Waist_Helper',
        parent: 'Waist_Pin',
        angleControlRatio: 0.5,
        targetBone: 'Pelvis',
        isShy: true
      }
    };
  }
}
