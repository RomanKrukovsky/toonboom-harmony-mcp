import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import type { QaFinding } from '../../schemas/qaReport.js';
import type { MohoQaThresholds } from '../../schemas/mohoQaThresholds.js';
import type { MohoPerformancePir } from '../../schemas/mohoPerformancePir.js';

export interface MohoRenderRunnerResult {
  jobId: string;
  status: 'rendered' | 'requires_real_moho' | 'requires_moho_pro' | 'dry_run' | 'failed';
  detectedMohoPath: string | null;
  commandLine: string;
  outputDir: string;
  builtDocumentPath?: string | null;
  renderedFiles: string[];
  totalFrames: number;
  durationMs: number;
  fps: number;
  resolution: { width: number; height: number };
  codec: string | null;
  qaFindings: unknown[];
  exitCode: number;
  errorMessage?: string;
}

export interface MohoVisualDiffResult {
  shotId: string;
  silhouetteQuality?: number;
  paletteDelta?: number;
  poseLibraryMatch?: number;
  perFrameDelta?: number[];
  mse?: number;
  referencePath: string;
  candidatePath: string;
}

export interface MohoCharacterBoneRef {
  boneId: number;
  boneName: string;
}

export interface MohoCharacterBibleRef {
  characterId: string;
  bones: MohoCharacterBoneRef[];
}

export interface MohoQaGateInput {
  shotId: string;
  renderResult: MohoRenderRunnerResult;
  visualDiff?: MohoVisualDiffResult;
  pir: MohoPerformancePir;
  thresholds: MohoQaThresholds;
  characterBible?: MohoCharacterBibleRef;
}

export interface MohoQaGateResult {
  shotId: string;
  overallStatus: 'pass' | 'warn' | 'fail';
  findings: QaFinding[];
  autoFixableFindings: number;
  criticalFindings: number;
  requiresHumanApproval: boolean;
  humanApprovalReasons: string[];
  fingerprint: string;
}

export interface MohoQaCheckDescriptor {
  name: string;
  description: string;
  defaultSeverity: 'low' | 'medium' | 'high' | 'critical';
}

const CHECK_REGISTRY: MohoQaCheckDescriptor[] = [
  { name: 'render_failed', description: 'Moho render exited with non-zero code.', defaultSeverity: 'critical' },
  { name: 'render_dry', description: 'Moho executable not detected; render skipped.', defaultSeverity: 'high' },
  { name: 'silhouette_quality', description: 'Visual silhouette quality below threshold.', defaultSeverity: 'medium' },
  { name: 'palette_delta', description: 'Palette delta vs reference above threshold.', defaultSeverity: 'medium' },
  { name: 'pose_library_match', description: 'Pose library match below threshold.', defaultSeverity: 'high' },
  { name: 'switch_layer_rate', description: 'Switch layer changes per second above threshold.', defaultSeverity: 'medium' },
  { name: 'switch_layer_sub2f', description: 'Switch layer changed with sub-2-frame hold.', defaultSeverity: 'medium' },
  { name: 'bone_angle_tolerance', description: 'Bone rotation delta exceeds tolerance.', defaultSeverity: 'low' },
  { name: 'continuity_gap', description: 'Bone or camera track gap exceeds continuity limit.', defaultSeverity: 'medium' },
  { name: 'orphan_bone_key', description: 'Bone key references unknown boneId from characterBible.', defaultSeverity: 'high' },
  { name: 'orphan_bones_check_skipped', description: 'Orphan check could not run (no characterBible).', defaultSeverity: 'low' },
  { name: 'mesh_warp_points_moved', description: 'Smart bone action moves more points than allowed.', defaultSeverity: 'high' },
  { name: 'lipsync_drift', description: 'Mouth switch gap exceeds lipsync drift threshold.', defaultSeverity: 'medium' },
  { name: 'key_pose', description: 'Key pose change requires human approval.', defaultSeverity: 'high' },
  { name: 'camera_move', description: 'Camera move requires human approval.', defaultSeverity: 'high' },
  { name: 'dialogue_timing', description: 'Dialogue timing change requires human approval.', defaultSeverity: 'high' }
];

export class MohoQaGate {
  private counter = 0;

  public listChecks(): MohoQaCheckDescriptor[] {
    return CHECK_REGISTRY.map(c => ({ ...c }));
  }

  public evaluate(input: MohoQaGateInput): MohoQaGateResult {
    this.counter = 0;
    const findings: QaFinding[] = [];

    findings.push(...this.checkRenderStatus(input));
    findings.push(...this.checkVisualDiff(input.visualDiff, input.thresholds));
    findings.push(...this.checkSwitchRate(input.pir, input.thresholds));
    findings.push(...this.checkAngleTolerance(input.pir, input.thresholds));
    findings.push(...this.checkContinuity(input.pir, input.thresholds));
    findings.push(...this.checkOrphanBones(input.pir, input.characterBible, input.thresholds));
    findings.push(...this.checkMeshWarp(input.pir, input.thresholds));
    findings.push(...this.checkLipsyncDrift(input.pir, input.thresholds));

    const autoFixableFindings = findings.filter(f => f.autoFixable).length;
    const criticalFindings = findings.filter(f => f.severity === 'critical' || f.severity === 'high').length;
    const mediumCount = findings.filter(f => f.severity === 'medium').length;

    let overallStatus: MohoQaGateResult['overallStatus'];
    if (findings.length === 0) {
      overallStatus = 'pass';
    } else if (criticalFindings === 0 && mediumCount < 3) {
      overallStatus = 'warn';
    } else {
      overallStatus = 'fail';
    }

    const humanApprovalReasons: string[] = [];
    for (const kind of input.thresholds.requireHumanApprovalFor) {
      const match = findings.find(f => f.check === kind || f.check.includes(kind));
      if (match) {
        humanApprovalReasons.push(`check "${kind}" requires human approval per qa_thresholds`);
      }
    }
    if (criticalFindings > 0 && humanApprovalReasons.length === 0) {
      humanApprovalReasons.push(`${criticalFindings} high/critical finding(s) require human approval`);
    }
    const requiresHumanApproval = humanApprovalReasons.length > 0;

    const fingerprint = this.computeFingerprint(findings);

    return {
      shotId: input.shotId,
      overallStatus,
      findings,
      autoFixableFindings,
      criticalFindings,
      requiresHumanApproval,
      humanApprovalReasons,
      fingerprint
    };
  }

  private nextId(): string {
    this.counter += 1;
    return `f_${this.counter.toString().padStart(3, '0')}`;
  }

  private checkRenderStatus(input: MohoQaGateInput): QaFinding[] {
    if (input.renderResult.status === 'failed') {
      return [{
        findingId: this.nextId(),
        check: 'render_failed',
        severity: 'critical',
        measured: input.renderResult.exitCode,
        threshold: 0,
        message: `Render failed (exit ${input.renderResult.exitCode}): ${input.renderResult.errorMessage ?? 'no error message'}`,
        autoFixable: false
      }];
    }
    if (
      input.renderResult.status === 'requires_real_moho'
      || input.renderResult.status === 'requires_moho_pro'
    ) {
      const message = input.renderResult.status === 'requires_moho_pro'
        ? 'Document was built, but command-line rendering requires Moho Pro.'
        : 'Moho executable not detected; render was skipped (requires_real_moho).';
      return [{
        findingId: this.nextId(),
        check: 'render_dry',
        severity: 'high',
        measured: 1,
        threshold: 0,
        message,
        autoFixable: false
      }];
    }
    return [];
  }

  private checkSwitchRate(pir: MohoPerformancePir, thresholds: MohoQaThresholds): QaFinding[] {
    const findings: QaFinding[] = [];
    if (pir.switchKeys.length === 0) return findings;

    const frames = pir.switchKeys.map(k => k.frame);
    const minFrame = Math.min(...frames);
    const maxFrame = Math.max(...frames);
    const fps = 24;
    const durationSec = Math.max(0.001, (maxFrame - minFrame + 1) / fps);
    const changesPerSecond = (pir.switchKeys.length - 1) / Math.max(0.001, durationSec);

    if (changesPerSecond > thresholds.switchLayerMaxChangesPerSecond) {
      const ratio = changesPerSecond / thresholds.switchLayerMaxChangesPerSecond;
      findings.push({
        findingId: this.nextId(),
        check: 'switch_layer_rate',
        severity: ratio > 2 ? 'high' : 'medium',
        measured: changesPerSecond,
        threshold: thresholds.switchLayerMaxChangesPerSecond,
        message: `Switch layer change rate ${changesPerSecond.toFixed(2)}/s exceeds threshold ${thresholds.switchLayerMaxChangesPerSecond}/s (frames ${minFrame}-${maxFrame}, fps~${fps}).`,
        autoFixable: true
      });
    }

    const byLayer = new Map<string, number[]>();
    for (const key of pir.switchKeys) {
      const arr = byLayer.get(key.switchLayerName) ?? [];
      arr.push(key.frame);
      byLayer.set(key.switchLayerName, arr);
    }
    for (const [layerName, layerFrames] of byLayer) {
      if (layerFrames.length < 2) continue;
      layerFrames.sort((a, b) => a - b);
      let prev = layerFrames[0];
      for (let i = 1; i < layerFrames.length; i++) {
        const gap = layerFrames[i] - prev;
        if (gap < 2) {
          findings.push({
            findingId: this.nextId(),
            check: 'switch_layer_sub2f',
            severity: 'medium',
            measured: gap,
            threshold: 2,
            message: `Switch layer "${layerName}" changed in ${gap} frame(s) at frame ${layerFrames[i]} — below the 2f hold minimum.`,
            autoFixable: true
          });
        }
        prev = layerFrames[i];
      }
    }
    return findings;
  }

  private checkAngleTolerance(pir: MohoPerformancePir, thresholds: MohoQaThresholds): QaFinding[] {
    const findings: QaFinding[] = [];
    const tol = thresholds.boneAngleToleranceDeg;
    const byBone = new Map<number, MohoPerformancePir['boneKeys'][number][]>();
    for (const key of pir.boneKeys) {
      if (key.channel !== 'rotation') continue;
      const arr = byBone.get(key.boneId) ?? [];
      arr.push(key);
      byBone.set(key.boneId, arr);
    }
    for (const [boneId, keys] of byBone) {
      keys.sort((a, b) => a.frame - b.frame);
      for (let i = 1; i < keys.length; i++) {
        const delta = Math.abs(keys[i].value - keys[i - 1].value);
        if (delta > tol) {
          findings.push({
            findingId: this.nextId(),
            check: 'bone_angle_tolerance',
            severity: delta > tol * 3 ? 'high' : 'low',
            measured: delta,
            threshold: tol,
            message: `Bone #${boneId} ("${keys[i].boneName}") rotated ${delta.toFixed(2)}° between frames ${keys[i - 1].frame}-${keys[i].frame}, above tolerance ${tol}°.`,
            autoFixable: true
          });
        }
      }
    }
    return findings;
  }

  private checkOrphanBones(
    pir: MohoPerformancePir,
    characterBible: MohoCharacterBibleRef | undefined,
    thresholds: MohoQaThresholds
  ): QaFinding[] {
    if (!thresholds.forbidOrphanBones) return [];
    const findings: QaFinding[] = [];
    const known = new Set<number>();
    if (characterBible) {
      for (const bone of characterBible.bones) known.add(bone.boneId);
    }
    if (known.size === 0) {
      findings.push({
        findingId: this.nextId(),
        check: 'orphan_bones_check_skipped',
        severity: 'low',
        measured: 0,
        threshold: 0,
        message: 'forbidOrphanBones=true but no characterBible provided — orphan check skipped.',
        autoFixable: false
      });
      return findings;
    }
    for (const key of pir.boneKeys) {
      if (!known.has(key.boneId)) {
        findings.push({
          findingId: this.nextId(),
          check: 'orphan_bone_key',
          severity: 'high',
          measured: key.boneId,
          threshold: 0,
          message: `Bone key references unknown boneId ${key.boneId} ("${key.boneName}") at frame ${key.frame} — orphan reference.`,
          autoFixable: false
        });
      }
    }
    return findings;
  }

  private checkVisualDiff(visualDiff: MohoVisualDiffResult | undefined, thresholds: MohoQaThresholds): QaFinding[] {
    const findings: QaFinding[] = [];
    if (!visualDiff) return findings;

    if (visualDiff.silhouetteQuality !== undefined && visualDiff.silhouetteQuality < thresholds.silhouetteQualityMin) {
      const ratio = visualDiff.silhouetteQuality / Math.max(0.0001, thresholds.silhouetteQualityMin);
      findings.push({
        findingId: this.nextId(),
        check: 'silhouette_quality',
        severity: ratio < 0.7 ? 'high' : 'medium',
        measured: visualDiff.silhouetteQuality,
        threshold: thresholds.silhouetteQualityMin,
        message: `Silhouette quality ${visualDiff.silhouetteQuality.toFixed(3)} below threshold ${thresholds.silhouetteQualityMin}.`,
        autoFixable: ratio >= 0.7
      });
    }

    const palette = visualDiff.paletteDelta ?? visualDiff.mse;
    if (palette !== undefined && palette > thresholds.paletteDeltaMax) {
      const ratio = palette / Math.max(0.0001, thresholds.paletteDeltaMax);
      findings.push({
        findingId: this.nextId(),
        check: 'palette_delta',
        severity: ratio > 2 ? 'high' : 'medium',
        measured: palette,
        threshold: thresholds.paletteDeltaMax,
        message: `Palette delta ${palette.toFixed(4)} above threshold ${thresholds.paletteDeltaMax}.`,
        autoFixable: ratio <= 1.5
      });
    }

    if (visualDiff.poseLibraryMatch !== undefined && visualDiff.poseLibraryMatch < thresholds.poseLibraryMatchMin) {
      findings.push({
        findingId: this.nextId(),
        check: 'pose_library_match',
        severity: 'high',
        measured: visualDiff.poseLibraryMatch,
        threshold: thresholds.poseLibraryMatchMin,
        message: `Pose library match ${visualDiff.poseLibraryMatch.toFixed(3)} below threshold ${thresholds.poseLibraryMatchMin}.`,
        autoFixable: false
      });
    }

    return findings;
  }

  private checkContinuity(pir: MohoPerformancePir, thresholds: MohoQaThresholds): QaFinding[] {
    const findings: QaFinding[] = [];
    if (pir.boneKeys.length === 0) return findings;

    const byBoneChannel = new Map<string, MohoPerformancePir['boneKeys'][number][]>();
    for (const key of pir.boneKeys) {
      const k = `${key.boneId}:${key.channel}`;
      const arr = byBoneChannel.get(k) ?? [];
      arr.push(key);
      byBoneChannel.set(k, arr);
    }

    for (const [track, keys] of byBoneChannel) {
      keys.sort((a, b) => a.frame - b.frame);
      let prev = keys[0];
      for (let i = 1; i < keys.length; i++) {
        const cur = keys[i];
        const frameGap = cur.frame - prev.frame;
        const valueDelta = Math.abs(cur.value - prev.value);
        if (frameGap > thresholds.continuityMaxDeltaFrames * 4 && valueDelta > 1) {
          findings.push({
            findingId: this.nextId(),
            check: 'continuity_gap',
            severity: 'medium',
            measured: frameGap,
            threshold: thresholds.continuityMaxDeltaFrames,
            message: `Track ${track} has a ${frameGap}f gap between frames ${prev.frame}-${cur.frame} (delta ${valueDelta.toFixed(2)}) — likely continuity break.`,
            autoFixable: true
          });
        }
        prev = cur;
      }
    }

    if (pir.cameraKeys.length > 1) {
      const sorted = [...pir.cameraKeys].sort((a, b) => a.frame - b.frame);
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i].frame - sorted[i - 1].frame;
        if (gap > thresholds.continuityMaxDeltaFrames * 2) {
          findings.push({
            findingId: this.nextId(),
            check: 'continuity_gap',
            severity: 'medium',
            measured: gap,
            threshold: thresholds.continuityMaxDeltaFrames,
            message: `Camera track has a ${gap}f gap between frames ${sorted[i - 1].frame}-${sorted[i].frame}.`,
            autoFixable: true
          });
        }
      }
    }
    return findings;
  }

  private checkMeshWarp(pir: MohoPerformancePir, thresholds: MohoQaThresholds): QaFinding[] {
    const findings: QaFinding[] = [];
    const grouped = new Map<string, MohoPerformancePir['smartBoneActions'][number][]>();
    for (const action of pir.smartBoneActions) {
      const arr = grouped.get(action.actionName) ?? [];
      arr.push(action);
      grouped.set(action.actionName, arr);
    }
    for (const [actionName, actions] of grouped) {
      if (actions.length > thresholds.meshWarpMaxPointsMoved) {
        findings.push({
          findingId: this.nextId(),
          check: 'mesh_warp_points_moved',
          severity: 'high',
          measured: actions.length,
          threshold: thresholds.meshWarpMaxPointsMoved,
          message: `Smart bone action "${actionName}" moves ${actions.length} points — above meshWarpMaxPointsMoved=${thresholds.meshWarpMaxPointsMoved}.`,
          autoFixable: false
        });
      }
    }
    return findings;
  }

  private checkLipsyncDrift(pir: MohoPerformancePir, thresholds: MohoQaThresholds): QaFinding[] {
    const findings: QaFinding[] = [];
    if (pir.switchKeys.length < 2) return findings;
    const sorted = [...pir.switchKeys].sort((a, b) => a.frame - b.frame);
    const driftThreshold = thresholds.lipsyncDriftMaxMs / 1000 * 24;
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].frame - sorted[i - 1].frame;
      if (gap > driftThreshold) {
        findings.push({
          findingId: this.nextId(),
          check: 'lipsync_drift',
          severity: 'medium',
          measured: gap,
          threshold: driftThreshold,
          message: `Mouth switch "${sorted[i - 1].switchLayerName}" has a ${gap}f gap (${(gap / 24 * 1000).toFixed(0)}ms) at frame ${sorted[i].frame} — above lipsyncDriftMaxMs=${thresholds.lipsyncDriftMaxMs}ms.`,
          autoFixable: true
        });
      }
    }
    return findings;
  }

  private computeFingerprint(findings: QaFinding[]): string {
    const canonical = stringify(findings.map(f => ({
      check: f.check,
      severity: f.severity,
      measured: f.measured,
      threshold: f.threshold,
      autoFixable: f.autoFixable,
      message: f.message
    })));
    return crypto.createHash('sha256').update(canonical ?? '').digest('hex');
  }
}
