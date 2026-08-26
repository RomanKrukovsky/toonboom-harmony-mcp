import { type JointFlexionCorrection } from '../../schemas/mohoProductionRig.js';
import { type SynthesizedSmartAction } from '../mohoSmartActionSynthesizer/index.js';

export interface MohoBoneNode {
  name: string;
  parent: string | null;
  x: number;
  y: number;
  length: number;
  angle: number;
  isHelper?: boolean;
  isShy?: boolean;
  color?: number;
  angleLimitMin?: number;
  angleLimitMax?: number;
}

export interface MirroredLimbResult {
  mirroredBones: MohoBoneNode[];
  mirroredJointCorrections: JointFlexionCorrection[];
  mirroredActions: SynthesizedSmartAction[];
}

/**
 * MohoLimbMirrorService — Mirrors limb chains from Left to Right (or vice versa)
 * based on Evgeny Borsch Lesson 10 (Transform Rig Tool / Mirroring pipeline).
 *
 * Automatically:
 *   - Flips X positions (x -> -x)
 *   - Flips angles (180 - angle or -angle)
 *   - Replaces _L with _R in bone and parent names
 *   - Reverses angle limit constraints
 *   - Duplicates and mirrors joint flexion actions and cuff deformers
 */
export class MohoLimbMirrorService {
  public static mirrorLimbChain(params: {
    sourceBones: MohoBoneNode[];
    sourceJointCorrections?: JointFlexionCorrection[];
    sourceActions?: SynthesizedSmartAction[];
    fromSuffix?: string;
    toSuffix?: string;
  }): MirroredLimbResult {
    const fromSuffix = params.fromSuffix ?? '_L';
    const toSuffix = params.toSuffix ?? '_R';

    const swapName = (name: string): string => {
      if (name.endsWith(fromSuffix)) {
        return name.slice(0, -fromSuffix.length) + toSuffix;
      }
      return name.replace(new RegExp(fromSuffix, 'g'), toSuffix);
    };

    // 1. Mirror bones
    const mirroredBones: MohoBoneNode[] = params.sourceBones.map(b => {
      const mirroredName = swapName(b.name);
      const mirroredParent = b.parent ? (b.parent.includes(fromSuffix) ? swapName(b.parent) : b.parent) : null;

      // Invert X coordinate
      const mirroredX = -b.x;
      // Mirror angle across vertical Y axis
      let mirroredAngle = (180 - b.angle) % 360;
      if (mirroredAngle < 0) mirroredAngle += 360;

      // Mirror angle limits if present
      let mirroredMin = b.angleLimitMin;
      let mirroredMax = b.angleLimitMax;
      if (b.angleLimitMin !== undefined && b.angleLimitMax !== undefined) {
        mirroredMin = -b.angleLimitMax;
        mirroredMax = -b.angleLimitMin;
      }

      return {
        ...b,
        name: mirroredName,
        parent: mirroredParent,
        x: mirroredX,
        y: b.y,
        angle: mirroredAngle,
        angleLimitMin: mirroredMin,
        angleLimitMax: mirroredMax
      };
    });

    // 2. Mirror joint corrections
    const mirroredJointCorrections: JointFlexionCorrection[] = (params.sourceJointCorrections ?? []).map(jc => ({
      jointName: swapName(jc.jointName),
      boneName: swapName(jc.boneName),
      flexionAnglesDeg: jc.flexionAnglesDeg.map((a: number) => -a),
      bulgeBicepScale: jc.bulgeBicepScale,
      cuffDeformers: jc.cuffDeformers.map((c: { name: string; angleOffsetDeg: number; lengthPx: number }) => ({
        name: swapName(c.name),
        angleOffsetDeg: -c.angleOffsetDeg,
        lengthPx: c.lengthPx
      }))
    }));

    // 3. Mirror actions
    const mirroredActions: SynthesizedSmartAction[] = (params.sourceActions ?? []).map(act => ({
      actionName: swapName(act.actionName),
      targetBone: swapName(act.targetBone),
      keyframes: act.keyframes.map(kf => ({
        frame: kf.frame,
        angleDeg: kf.angleDeg !== undefined ? -kf.angleDeg : undefined,
        scale: kf.scale ? { x: kf.scale.x, y: kf.scale.y } : undefined,
        pos: kf.pos ? { x: -kf.pos.x, y: kf.pos.y } : undefined,
        pointOffsets: kf.pointOffsets?.map(po => ({
          pointId: po.pointId,
          dx: -po.dx,
          dy: po.dy
        }))
      }))
    }));

    return {
      mirroredBones,
      mirroredJointCorrections,
      mirroredActions
    };
  }
}
