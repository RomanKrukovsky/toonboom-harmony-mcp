import {
  BONE_COLOR_PALETTE,
  type BoneColor,
  type AnimatorContractSpec
} from '../../schemas/mohoProductionRig.js';

/**
 * MohoAnimatorContractGate — validates and prepares rigs for production animators:
 *   1. Hides non-controller/deformer bones (sets shy=true).
 *   2. Applies standardized color-coding (Left=Blue/Green, Right=Orange/Red, Root=Yellow, Dials=Purple).
 *   3. Enforces Frame 0 clean state (no stray animation keys on Mainline).
 */

export interface RigBoneAuditEntry {
  boneName: string;
  isController: boolean;
  isShy: boolean;
  color: BoneColor;
  hasStrayKeysOnFrameZero: boolean;
}

export interface AnimatorContractAuditResult {
  passed: boolean;
  totalBones: number;
  controllerBonesCount: number;
  shyBonesCount: number;
  violations: string[];
  auditedBones: RigBoneAuditEntry[];
}

export class MohoAnimatorContractGate {
  public static auditAndApplyContract(
    bones: Array<{
      name: string;
      parent: string | null;
      isSmartDial?: boolean;
      isHelperOrDeformer?: boolean;
      keyframesCountFrameZero?: number;
    }>,
    spec: AnimatorContractSpec = {
      hideHelperBonesShy: true,
      colorCodeBones: true,
      lockNonControllerChannels: true,
      frameZeroCleanAudit: true
    }
  ): AnimatorContractAuditResult {
    const violations: string[] = [];
    const auditedBones: RigBoneAuditEntry[] = [];

    for (const b of bones) {
      const isDial = b.isSmartDial || b.name.includes('switch') || b.name.includes('s/s') || b.name.includes('order');
      const isHelper = b.isHelperOrDeformer || b.name.startsWith('B') || b.name.includes('start') || b.name.includes('end') || b.name.includes('UP') || b.name.includes('DOWN');
      const isController = !isHelper || isDial;

      // 1. Color assignment
      let color: BoneColor = BONE_COLOR_PALETTE.PLAIN;
      if (spec.colorCodeBones) {
        if (isDial) {
          color = BONE_COLOR_PALETTE.PURPLE_DIALS;
        } else if (b.name === 'Master' || b.name === 'Root' || b.name === 'Pelvis' || b.name === 'Torso') {
          color = BONE_COLOR_PALETTE.YELLOW_ROOT;
        } else if (b.name.endsWith('_L') || b.name.includes(' L')) {
          color = BONE_COLOR_PALETTE.BLUE_LEFT;
        } else if (b.name.endsWith('_R') || b.name.includes(' R')) {
          color = BONE_COLOR_PALETTE.ORANGE_RIGHT;
        }
      }

      // 2. Shy assignment
      const isShy = spec.hideHelperBonesShy && isHelper && !isDial;

      // 3. Frame 0 stray key check
      const hasStrayKeysOnFrameZero = (b.keyframesCountFrameZero ?? 0) > 1;
      if (spec.frameZeroCleanAudit && hasStrayKeysOnFrameZero) {
        violations.push(`Bone ${b.name} has stray multiple keyframes on Frame 0`);
      }

      auditedBones.push({
        boneName: b.name,
        isController,
        isShy,
        color,
        hasStrayKeysOnFrameZero
      });
    }

    const shyBonesCount = auditedBones.filter(b => b.isShy).length;
    const controllerBonesCount = auditedBones.filter(b => b.isController).length;

    return {
      passed: violations.length === 0,
      totalBones: bones.length,
      controllerBonesCount,
      shyBonesCount,
      violations,
      auditedBones
    };
  }
}
