import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import type { QaFinding } from '../../schemas/qaReport.js';
import type { MohoQaThresholds } from '../../schemas/mohoQaThresholds.js';
import type { MohoPerformancePir } from '../../schemas/mohoPerformancePir.js';
import type { MohoCharacterBible } from '../../schemas/mohoCharacterBible.js';
import type { MohoRetakePatch } from '../../schemas/mohoRetakeManifest.js';
import type { MohoQaGateResult } from '../mohoQaGate/index.js';

export const MOHO_RETAKE_ENGINE_VERSION = 'moho-retake-engine-v1';

export type MohoRetakeEngineInput = {
  pir: MohoPerformancePir;
  characterBible: MohoCharacterBible;
  qaResult: MohoQaGateResult;
  thresholds: MohoQaThresholds;
};

export type MohoRetakeEngineResult = {
  retakeId: string;
  patches: MohoRetakePatch[];
  severity: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
  requiresHumanApproval: boolean;
  fingerprint: string;
};

const DETERMINISTIC_TIMESTAMP = new Date(0).toISOString();

const SEVERITY_RANK: Record<'low' | 'medium' | 'high', number> = {
  low: 0,
  medium: 1,
  high: 2
};

const CHECK_CATEGORY: Record<string, 'lipsyncDrift' | 'boneAngleTolerance' | 'meshWarp' | 'continuity' | null> = {
  lipsync_drift: 'lipsyncDrift',
  switch_layer_sub2f: 'lipsyncDrift',
  switch_layer_rate: 'lipsyncDrift',
  bone_angle_tolerance: 'boneAngleTolerance',
  continuity_gap: 'continuity',
  mesh_warp_points_moved: 'meshWarp'
};

function rankOf(severity: 'low' | 'medium' | 'high' | 'critical'): number {
  if (severity === 'critical') return 3;
  return SEVERITY_RANK[severity as 'low' | 'medium' | 'high'];
}

function categoryFor(check: string): 'lipsyncDrift' | 'boneAngleTolerance' | 'meshWarp' | 'continuity' | null {
  if (CHECK_CATEGORY[check] !== undefined) return CHECK_CATEGORY[check];
  for (const key of Object.keys(CHECK_CATEGORY)) {
    if (check.includes(key)) return CHECK_CATEGORY[key];
  }
  return null;
}

function findController(characterBible: MohoCharacterBible, boneId: number, boneName?: string) {
  return characterBible.controllers.find(c =>
    c.boneId === boneId || (boneName !== undefined && c.boneName === boneName)
  );
}

export class MohoRetakeEngine {
  generatePatches(input: MohoRetakeEngineInput): MohoRetakeEngineResult {
    const { pir, characterBible, qaResult, thresholds } = input;
    const patches: MohoRetakePatch[] = [];
    let counter = 0;

    const nextPatchId = (): string => {
      counter += 1;
      return `rtp_${counter.toString().padStart(4, '0')}`;
    };

    for (const finding of qaResult.findings) {
      if (!finding.autoFixable) continue;
      const category = categoryFor(finding.check);
      if (category === null) continue;
      if (rankOf(finding.severity) > rankOf(thresholds.autoFixableSeverityMax)) continue;

      if (category === 'lipsyncDrift') {
        patches.push(...this.lipsyncDriftPatch(finding, pir, nextPatchId));
      } else if (category === 'boneAngleTolerance') {
        patches.push(...this.boneAngleTolerancePatch(finding, pir, characterBible, thresholds, nextPatchId));
      } else if (category === 'meshWarp') {
        patches.push(...this.meshWarpPatch(finding, pir, characterBible, thresholds, nextPatchId));
      } else if (category === 'continuity') {
        patches.push(...this.continuityPatch(finding, pir, characterBible, nextPatchId));
      }
    }

    const severity = MohoRetakeEngine.classifySeverity(qaResult.findings);

    const autoDecision = MohoRetakeEngine.canAutoApply(
      {
        retakeId: '',
        patches,
        severity,
        autoApplicable: false,
        requiresHumanApproval: qaResult.requiresHumanApproval,
        fingerprint: ''
      },
      thresholds
    );

    const autoApplicable = autoDecision.canAutoApply;
    const requiresHumanApproval = qaResult.requiresHumanApproval || !autoApplicable;

    const retakeId = `rtk_${pir.performanceId}_${patches.length.toString().padStart(4, '0')}`;

    const fingerprint = this.computeFingerprint({
      retakeId,
      patches,
      severity,
      autoApplicable,
      requiresHumanApproval,
      pir,
      qaResult
    });

    return {
      retakeId,
      patches,
      severity,
      autoApplicable,
      requiresHumanApproval,
      fingerprint
    };
  }

  private lipsyncDriftPatch(
    finding: QaFinding,
    pir: MohoPerformancePir,
    nextPatchId: () => string
  ): MohoRetakePatch[] {
    const shiftFrames = Math.max(1, Math.round(finding.measured - finding.threshold));
    const sorted = [...pir.switchKeys].sort((a, b) => a.frame - b.frame);
    const driftThreshold = finding.threshold;

    const patches: MohoRetakePatch[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].frame - sorted[i - 1].frame;
      if (gap <= driftThreshold) continue;
      const target = sorted[i];
      patches.push({
        patchId: nextPatchId(),
        targetRigType: 'humanoid_2leg',
        channel: 'opacity',
        frame: target.frame,
        newValue: shiftFrames,
        interpolation: 'step',
        note: `lipsyncDrift fix (finding ${finding.findingId}): shift switch "${target.switchLayerName}" by ${shiftFrames}f to close ${gap}f drift gap on "${target.choice}".`,
        recordedBy: MOHO_RETAKE_ENGINE_VERSION,
        recordedAt: DETERMINISTIC_TIMESTAMP
      });
    }
    return patches;
  }

  private boneAngleTolerancePatch(
    finding: QaFinding,
    pir: MohoPerformancePir,
    characterBible: MohoCharacterBible,
    thresholds: MohoQaThresholds,
    nextPatchId: () => string
  ): MohoRetakePatch[] {
    const tol = thresholds.boneAngleToleranceDeg;
    const rotationKeys = pir.boneKeys
      .filter(k => k.channel === 'rotation')
      .sort((a, b) => a.frame - b.frame);

    const byBone = new Map<number, typeof rotationKeys>();
    for (const k of rotationKeys) {
      const arr = byBone.get(k.boneId) ?? [];
      arr.push(k);
      byBone.set(k.boneId, arr);
    }

    const patches: MohoRetakePatch[] = [];
    for (const [boneId, keys] of byBone) {
      for (let i = 1; i < keys.length; i++) {
        const delta = Math.abs(keys[i].value - keys[i - 1].value);
        if (delta <= tol) continue;
        const clamped = keys[i - 1].value + Math.sign(keys[i].value - keys[i - 1].value) * tol;
        const controller = findController(characterBible, boneId, keys[i].boneName);
        patches.push({
          patchId: nextPatchId(),
          targetRigType: characterBible.rigType,
          boneId,
          boneName: controller?.boneName ?? keys[i].boneName,
          channel: 'rotation',
          frame: keys[i].frame,
          newValue: Number(clamped.toFixed(4)),
          interpolation: keys[i].interpolation,
          note: `boneAngleTolerance fix (finding ${finding.findingId}): clamp bone "${keys[i].boneName}" rotation delta ${delta.toFixed(2)}° -> ${tol}° at frame ${keys[i].frame}.`,
          recordedBy: MOHO_RETAKE_ENGINE_VERSION,
          recordedAt: DETERMINISTIC_TIMESTAMP
        });
      }
    }
    return patches;
  }

  private meshWarpPatch(
    finding: QaFinding,
    pir: MohoPerformancePir,
    characterBible: MohoCharacterBible,
    thresholds: MohoQaThresholds,
    nextPatchId: () => string
  ): MohoRetakePatch[] {
    const maxPoints = thresholds.meshWarpMaxPointsMoved;
    const grouped = new Map<string, typeof pir.smartBoneActions>();
    for (const action of pir.smartBoneActions) {
      const arr = grouped.get(action.actionName) ?? [];
      arr.push(action);
      grouped.set(action.actionName, arr);
    }

    const patches: MohoRetakePatch[] = [];
    for (const [actionName, actions] of grouped) {
      if (actions.length <= maxPoints) continue;
      const targetBone = actions[0].targetBone;
      const controller = findController(characterBible, 0, targetBone);
      const overshoot = actions.length - maxPoints;
      const scaleFactor = Number((maxPoints / actions.length).toFixed(4));
      for (const action of actions) {
        patches.push({
          patchId: nextPatchId(),
          targetRigType: characterBible.rigType,
          boneName: controller?.boneName ?? targetBone,
          channel: 'scale',
          frame: action.frame,
          newValue: Number((action.scaleX * scaleFactor).toFixed(4)),
          interpolation: 'ease_in_out',
          note: `meshWarp fix (finding ${finding.findingId}): reduce smart-bone action "${actionName}" point movement from ${actions.length} -> ${maxPoints} (drop ${overshoot} points, scaleX factor ${scaleFactor}) at frame ${action.frame}.`,
          recordedBy: MOHO_RETAKE_ENGINE_VERSION,
          recordedAt: DETERMINISTIC_TIMESTAMP
        });
      }
    }
    return patches;
  }

  private continuityPatch(
    finding: QaFinding,
    pir: MohoPerformancePir,
    characterBible: MohoCharacterBible,
    nextPatchId: () => string
  ): MohoRetakePatch[] {
    const midpoint = Math.floor(finding.measured / 2);
    const sortedBoneKeys = [...pir.boneKeys].sort((a, b) => a.frame - b.frame);
    const byTrack = new Map<string, typeof sortedBoneKeys>();
    for (const k of sortedBoneKeys) {
      const t = `${k.boneId}:${k.channel}`;
      const arr = byTrack.get(t) ?? [];
      arr.push(k);
      byTrack.set(t, arr);
    }

    const patches: MohoRetakePatch[] = [];
    for (const [, keys] of byTrack) {
      for (let i = 1; i < keys.length; i++) {
        const frameGap = keys[i].frame - keys[i - 1].frame;
        const valueDelta = Math.abs(keys[i].value - keys[i - 1].value);
        if (frameGap <= finding.threshold * 4 || valueDelta <= 1) continue;
        const insertFrame = keys[i - 1].frame + midpoint;
        const insertValue = Number(((keys[i - 1].value + keys[i].value) / 2).toFixed(4));
        const controller = findController(characterBible, keys[i].boneId, keys[i].boneName);
        patches.push({
          patchId: nextPatchId(),
          targetRigType: characterBible.rigType,
          boneId: keys[i].boneId,
          boneName: controller?.boneName ?? keys[i].boneName,
          channel: keys[i].channel,
          frame: insertFrame,
          newValue: insertValue,
          interpolation: keys[i].interpolation,
          note: `continuity fix (finding ${finding.findingId}): insert intermediate keyframe on bone "${keys[i].boneName}" channel ${keys[i].channel} at frame ${insertFrame} (gap ${frameGap}f, mid value ${insertValue}).`,
          recordedBy: MOHO_RETAKE_ENGINE_VERSION,
          recordedAt: DETERMINISTIC_TIMESTAMP
        });
        break;
      }
    }
    return patches;
  }

  static classifySeverity(findings: QaFinding[]): 'low' | 'medium' | 'high' {
    let worst: 'low' | 'medium' | 'high' = 'low';
    for (const f of findings) {
      if (f.severity === 'critical' || f.severity === 'high') {
        worst = 'high';
        break;
      }
      if (f.severity === 'medium' && worst === 'low') worst = 'medium';
    }
    return worst;
  }

  static canAutoApply(
    retake: MohoRetakeEngineResult,
    thresholds: MohoQaThresholds
  ): { canAutoApply: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (retake.severity === 'high') {
      reasons.push('severity is high; human approval required');
    }
    if (retake.patches.length === 0) {
      reasons.push('no patches were generated');
    }
    for (const patch of retake.patches) {
      if (Math.abs(patch.newValue) > 180 && patch.channel === 'rotation') {
        reasons.push(`patch ${patch.patchId} rotates bone "${patch.boneName ?? patch.boneId}" beyond 180°`);
        break;
      }
    }
    if (retake.severity === 'high') {
      reasons.push(`thresholds.autoFixableSeverityMax=${thresholds.autoFixableSeverityMax} excludes high-severity retakes`);
    }
    return { canAutoApply: reasons.length === 0, reasons: Array.from(new Set(reasons)) };
  }

  private computeFingerprint(payload: {
    retakeId: string;
    patches: MohoRetakePatch[];
    severity: 'low' | 'medium' | 'high';
    autoApplicable: boolean;
    requiresHumanApproval: boolean;
    pir: MohoPerformancePir;
    qaResult: MohoQaGateResult;
  }): string {
    const canonicalPayload = {
      retakeId: payload.retakeId,
      performanceId: payload.pir.performanceId,
      qaFingerprint: payload.qaResult.fingerprint,
      severity: payload.severity,
      autoApplicable: payload.autoApplicable,
      requiresHumanApproval: payload.requiresHumanApproval,
      patches: payload.patches.map(p => ({
        patchId: p.patchId,
        targetRigType: p.targetRigType,
        boneId: p.boneId,
        boneName: p.boneName,
        channel: p.channel,
        frame: p.frame,
        newValue: p.newValue,
        interpolation: p.interpolation
      }))
    };
    const canonical = stringify(canonicalPayload);
    return crypto.createHash('sha256').update(canonical ?? '').digest('hex');
  }
}
