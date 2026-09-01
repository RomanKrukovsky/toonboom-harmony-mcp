import {
  mohoRetakeManifestSchema,
  type MohoRetakeManifest,
  type MohoRetakePatch
} from '../../schemas/mohoRetakeManifest.js';
import {
  type MohoBoneKey,
  type MohoPerformancePir,
  type MohoSmartBoneActionKey,
  type MohoSwitchKey
} from '../../schemas/mohoPerformancePir.js';

export interface MohoRetakeTranslatorInput {
  shotId: string;
  beforePerformanceId: string;
  afterPerformanceId: string;
  beforePir: MohoPerformancePir;
  afterPir: MohoPerformancePir;
  rigType: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';
  recordedBy: string;
  notes?: string;
}

export interface MohoRetakeTranslatorResult {
  retakeId: string;
  retake: MohoRetakeManifest;
  warnings: string[];
  appliedAutomatically: boolean;
  requiresHumanApproval: boolean;
}

type MohoRetakeChannel = MohoRetakePatch['channel'];
type MohoRetakeInterpolation = MohoRetakePatch['interpolation'];

const PATCH_ID_PREFIX = 'mrtp';
const SEVERITY_LOW_MAX = 5;
const SEVERITY_MEDIUM_MAX = 20;

function patchIdFor(afterPerformanceId: string, sequence: number): string {
  return `${PATCH_ID_PREFIX}_${afterPerformanceId}_${sequence.toString().padStart(4, '0')}`;
}

function deterministicTimestamp(): string {
  return new Date(0).toISOString();
}

function sortPatchesByFrame(patches: MohoRetakePatch[]): MohoRetakePatch[] {
  return [...patches].sort((a, b) => {
    if (a.frame !== b.frame) return a.frame - b.frame;
    if (a.boneId !== undefined && b.boneId !== undefined && a.boneId !== b.boneId) {
      return a.boneId - b.boneId;
    }
    if (a.boneName !== undefined && b.boneName !== undefined) {
      return a.boneName.localeCompare(b.boneName);
    }
    if (a.boneName !== undefined) return -1;
    if (b.boneName !== undefined) return 1;
    return a.patchId.localeCompare(b.patchId);
  });
}

function interpolationFor(value: MohoBoneKey['interpolation']): MohoRetakeInterpolation {
  return value;
}

function findMatchingBone<T extends { boneId: number; channel: MohoBoneKey['channel']; frame: number }>(
  list: T[],
  key: T
): T | undefined {
  return list.find(
    item => item.boneId === key.boneId && item.channel === key.channel && item.frame === key.frame
  );
}

function findMatchingSwitch<T extends { switchLayerName: string; frame: number }>(
  list: T[],
  key: T
): T | undefined {
  return list.find(item => item.switchLayerName === key.switchLayerName && item.frame === key.frame);
}

function findMatchingSmartBoneAction<T extends { actionName: string; frame: number }>(
  list: T[],
  key: T
): T | undefined {
  return list.find(item => item.actionName === key.actionName && item.frame === key.frame);
}

export class MohoRetakeTranslator {
  translate(input: MohoRetakeTranslatorInput): MohoRetakeTranslatorResult {
    const warnings: string[] = [];

    if (input.beforePir.rigType !== input.afterPir.rigType) {
      warnings.push(
        `rig type mismatch: before="${input.beforePir.rigType}" after="${input.afterPir.rigType}"; ` +
          `using input.rigType="${input.rigType}"`
      );
    }
    if (input.beforePir.shotManifestRef !== input.afterPir.shotManifestRef) {
      warnings.push(
        `shot manifest ref differs: before="${input.beforePir.shotManifestRef}" after="${input.afterPir.shotManifestRef}"`
      );
    }
    if (input.afterPir.performanceId !== input.afterPerformanceId) {
      warnings.push(
        `afterPerformanceId "${input.afterPerformanceId}" does not match afterPir.performanceId "${input.afterPir.performanceId}"`
      );
    }
    if (input.beforePir.performanceId !== input.beforePerformanceId) {
      warnings.push(
        `beforePerformanceId "${input.beforePerformanceId}" does not match beforePir.performanceId "${input.beforePir.performanceId}"`
      );
    }

    const counter = { value: 0 };
    const nextPatchId = (): string => {
      counter.value += 1;
      return patchIdFor(input.afterPerformanceId, counter.value);
    };

    const recordedAt = deterministicTimestamp();
    const baseNote = input.notes ? `retake note: ${input.notes}` : undefined;

    const bonePatches = MohoRetakeTranslator.diffBoneKeys(
      input.beforePir.boneKeys,
      input.afterPir.boneKeys
    ).map(patch => this.toBonePatch(patch, input, nextPatchId, recordedAt, baseNote));

    const switchPatches = MohoRetakeTranslator.diffSwitchKeys(
      input.beforePir.switchKeys,
      input.afterPir.switchKeys
    ).map(patch => this.toSwitchPatch(patch, input, nextPatchId, recordedAt, baseNote));

    const smartBonePatches = MohoRetakeTranslator.diffSmartBoneActions(
      input.beforePir.smartBoneActions,
      input.afterPir.smartBoneActions
    ).map(patch => this.toSmartBoneActionPatch(patch, input, nextPatchId, recordedAt, baseNote));

    if (bonePatches.length === 0 && switchPatches.length === 0 && smartBonePatches.length === 0) {
      warnings.push('no bone, switch, or smart-bone differences detected between before and after PIRs');
    }

    const allPatches = sortPatchesByFrame([...bonePatches, ...switchPatches, ...smartBonePatches]);
    const severity = MohoRetakeTranslator.classifySeverity(allPatches);
    const autoApplicable = severity !== 'high' && allPatches.length > 0;
    const requiresHumanApproval = !autoApplicable;

    const retakeId = `rtk_${input.beforePerformanceId}_${input.afterPerformanceId}`;
    const sourceMohoCommandPlanId = `mcp_${input.afterPerformanceId}`;

    const draft = {
      schemaVersion: '1.0' as const,
      retakeId,
      sourcePerformanceId: input.afterPerformanceId,
      sourceMohoCommandPlanId,
      rigType: input.rigType,
      patches: allPatches,
      severity,
      autoApplicable,
      provenance: {
        recordedBy: input.recordedBy,
        recordedAt
      }
    };

    const parsed = mohoRetakeManifestSchema.safeParse(draft);
    if (!parsed.success) {
      throw new Error(`moho retake manifest failed schema validation: ${parsed.error.message}`);
    }

    return {
      retakeId,
      retake: parsed.data,
      warnings,
      appliedAutomatically: autoApplicable,
      requiresHumanApproval
    };
  }

  static diffBoneKeys(
    before: MohoBoneKey[],
    after: MohoBoneKey[]
  ): Array<{
    op: 'added' | 'removed' | 'modified';
    beforeKey?: MohoBoneKey;
    afterKey: MohoBoneKey;
    delta?: number;
  }> {
    const result: Array<{
      op: 'added' | 'removed' | 'modified';
      beforeKey?: MohoBoneKey;
      afterKey: MohoBoneKey;
      delta?: number;
    }> = [];

    const beforeByKey = new Map<string, MohoBoneKey>();
    for (const key of before) {
      beforeByKey.set(`${key.boneId}|${key.channel}|${key.frame}`, key);
    }
    const afterByKey = new Map<string, MohoBoneKey>();
    for (const key of after) {
      afterByKey.set(`${key.boneId}|${key.channel}|${key.frame}`, key);
    }

    for (const [compositeKey, beforeKey] of beforeByKey) {
      const afterKey = afterByKey.get(compositeKey);
      if (!afterKey) {
        result.push({ op: 'removed', beforeKey, afterKey: beforeKey });
      } else if (afterKey.value !== beforeKey.value) {
        result.push({ op: 'modified', beforeKey, afterKey, delta: afterKey.value - beforeKey.value });
      }
    }

    for (const [compositeKey, afterKey] of afterByKey) {
      if (!beforeByKey.has(compositeKey)) {
        result.push({ op: 'added', afterKey, delta: afterKey.value });
      }
    }

    return result;
  }

  static diffSwitchKeys(
    before: MohoSwitchKey[],
    after: MohoSwitchKey[]
  ): Array<{
    op: 'added' | 'removed' | 'modified';
    beforeKey?: MohoSwitchKey;
    afterKey: MohoSwitchKey;
  }> {
    const result: Array<{
      op: 'added' | 'removed' | 'modified';
      beforeKey?: MohoSwitchKey;
      afterKey: MohoSwitchKey;
    }> = [];

    const beforeByKey = new Map<string, MohoSwitchKey>();
    for (const key of before) {
      beforeByKey.set(`${key.switchLayerName}|${key.frame}`, key);
    }
    const afterByKey = new Map<string, MohoSwitchKey>();
    for (const key of after) {
      afterByKey.set(`${key.switchLayerName}|${key.frame}`, key);
    }

    for (const [compositeKey, beforeKey] of beforeByKey) {
      const afterKey = afterByKey.get(compositeKey);
      if (!afterKey) {
        result.push({ op: 'removed', beforeKey, afterKey: beforeKey });
      } else if (afterKey.choice !== beforeKey.choice) {
        result.push({ op: 'modified', beforeKey, afterKey });
      }
    }

    for (const [compositeKey, afterKey] of afterByKey) {
      if (!beforeByKey.has(compositeKey)) {
        result.push({ op: 'added', afterKey });
      }
    }

    return result;
  }

  static diffSmartBoneActions(
    before: MohoSmartBoneActionKey[],
    after: MohoSmartBoneActionKey[]
  ): Array<{
    op: 'added' | 'removed' | 'modified';
    beforeKey?: MohoSmartBoneActionKey;
    afterKey: MohoSmartBoneActionKey;
  }> {
    const result: Array<{
      op: 'added' | 'removed' | 'modified';
      beforeKey?: MohoSmartBoneActionKey;
      afterKey: MohoSmartBoneActionKey;
    }> = [];

    const beforeByKey = new Map<string, MohoSmartBoneActionKey>();
    for (const key of before) {
      beforeByKey.set(`${key.actionName}|${key.frame}`, key);
    }
    const afterByKey = new Map<string, MohoSmartBoneActionKey>();
    for (const key of after) {
      afterByKey.set(`${key.actionName}|${key.frame}`, key);
    }

    for (const [compositeKey, beforeKey] of beforeByKey) {
      const afterKey = afterByKey.get(compositeKey);
      if (!afterKey) {
        result.push({ op: 'removed', beforeKey, afterKey: beforeKey });
      } else if (
        afterKey.angleDeg !== beforeKey.angleDeg ||
        afterKey.scaleX !== beforeKey.scaleX ||
        afterKey.scaleY !== beforeKey.scaleY ||
        afterKey.targetBone !== beforeKey.targetBone
      ) {
        result.push({ op: 'modified', beforeKey, afterKey });
      }
    }

    for (const [compositeKey, afterKey] of afterByKey) {
      if (!beforeByKey.has(compositeKey)) {
        result.push({ op: 'added', afterKey });
      }
    }

    return result;
  }

  static classifySeverity(patches: MohoRetakePatch[]): 'low' | 'medium' | 'high' {
    if (patches.length === 0) return 'low';
    if (patches.length <= SEVERITY_LOW_MAX) return 'low';
    if (patches.length <= SEVERITY_MEDIUM_MAX) return 'medium';
    return 'high';
  }

  private toBonePatch(
    diff: ReturnType<typeof MohoRetakeTranslator.diffBoneKeys>[number],
    input: MohoRetakeTranslatorInput,
    nextPatchId: () => string,
    recordedAt: string,
    baseNote: string | undefined
  ): MohoRetakePatch {
    const afterKey = diff.afterKey;
    const channel: MohoRetakeChannel = afterKey.channel;
    const interpolation: MohoRetakeInterpolation =
      diff.op === 'added' ? interpolationFor(afterKey.interpolation) : interpolationFor(afterKey.interpolation);
    const noteParts: string[] = [];
    if (diff.op === 'added') {
      noteParts.push(`boneKey added: boneId=${afterKey.boneId} bone="${afterKey.boneName}" channel=${channel} frame=${afterKey.frame} value=${afterKey.value}`);
    } else if (diff.op === 'removed') {
      noteParts.push(`boneKey removed: boneId=${afterKey.boneId} bone="${afterKey.boneName}" channel=${channel} frame=${afterKey.frame}`);
    } else {
      const before = diff.beforeKey;
      noteParts.push(
        `boneKey modified: boneId=${afterKey.boneId} bone="${afterKey.boneName}" channel=${channel} frame=${afterKey.frame} ${before?.value} -> ${afterKey.value} (delta=${diff.delta})`
      );
    }
    if (baseNote) noteParts.push(baseNote);

    return {
      patchId: nextPatchId(),
      targetRigType: input.rigType,
      boneId: afterKey.boneId,
      boneName: afterKey.boneName,
      channel,
      frame: afterKey.frame,
      newValue: afterKey.value,
      interpolation,
      note: noteParts.join(' | '),
      recordedBy: input.recordedBy,
      recordedAt
    };
  }

  private toSwitchPatch(
    diff: ReturnType<typeof MohoRetakeTranslator.diffSwitchKeys>[number],
    input: MohoRetakeTranslatorInput,
    nextPatchId: () => string,
    recordedAt: string,
    baseNote: string | undefined
  ): MohoRetakePatch {
    const afterKey = diff.afterKey;
    const noteParts: string[] = [];
    if (diff.op === 'added') {
      noteParts.push(`switchKey added: layer="${afterKey.switchLayerName}" frame=${afterKey.frame} choice="${afterKey.choice}"`);
    } else if (diff.op === 'removed') {
      noteParts.push(`switchKey removed: layer="${afterKey.switchLayerName}" frame=${afterKey.frame}`);
    } else {
      const before = diff.beforeKey;
      noteParts.push(
        `switchKey modified: layer="${afterKey.switchLayerName}" frame=${afterKey.frame} choice "${before?.choice}" -> "${afterKey.choice}"`
      );
    }
    if (baseNote) noteParts.push(baseNote);

    return {
      patchId: nextPatchId(),
      targetRigType: input.rigType,
      channel: 'opacity',
      frame: afterKey.frame,
      newValue: 1,
      interpolation: 'step',
      note: noteParts.join(' | '),
      recordedBy: input.recordedBy,
      recordedAt
    };
  }

  private toSmartBoneActionPatch(
    diff: ReturnType<typeof MohoRetakeTranslator.diffSmartBoneActions>[number],
    input: MohoRetakeTranslatorInput,
    nextPatchId: () => string,
    recordedAt: string,
    baseNote: string | undefined
  ): MohoRetakePatch {
    const afterKey = diff.afterKey;
    const noteParts: string[] = [];
    if (diff.op === 'added') {
      noteParts.push(
        `smartBoneAction added: action="${afterKey.actionName}" target="${afterKey.targetBone}" frame=${afterKey.frame} angle=${afterKey.angleDeg} scale=(${afterKey.scaleX},${afterKey.scaleY})`
      );
    } else if (diff.op === 'removed') {
      noteParts.push(
        `smartBoneAction removed: action="${afterKey.actionName}" target="${afterKey.targetBone}" frame=${afterKey.frame}`
      );
    } else {
      const before = diff.beforeKey;
      noteParts.push(
        `smartBoneAction modified: action="${afterKey.actionName}" target="${before?.targetBone}"->"${afterKey.targetBone}" frame=${afterKey.frame} angle ${before?.angleDeg}->${afterKey.angleDeg} scale (${before?.scaleX},${before?.scaleY})->(${afterKey.scaleX},${afterKey.scaleY})`
      );
    }
    if (baseNote) noteParts.push(baseNote);

    return {
      patchId: nextPatchId(),
      targetRigType: input.rigType,
      boneName: afterKey.targetBone,
      channel: 'rotation',
      frame: afterKey.frame,
      newValue: afterKey.angleDeg,
      interpolation: 'ease_in_out',
      note: noteParts.join(' | '),
      recordedBy: input.recordedBy,
      recordedAt
    };
  }
}
