import {
  type QaReport,
  type QaFinding
} from '../../schemas/qaReport.js';
import {
  retakeManifestSchema,
  type RetakeManifest,
  type NodeDataDelta
} from '../../schemas/retakeManifest.js';
import { type SceneSnapshotPIR } from '../../schemas/sceneSnapshotPir.js';

/**
 * RetakeTranslator — the missing bridge between the QA checker and the retake
 * patch compiler.
 *
 *   QaReport (RetakeEngine)  ->  RetakeManifest (SceneDiffEngine shape)
 *                                ->  HarmonyCommandBuilder.buildRetakePatchPlan
 *
 * Strategy table (deterministic, no invention):
 *   - `lipsync_drift`      -> shift mouth-node exposures by the drift delta
 *                             (frames, rounded, sign = direction of drift)
 *   - `continuity`         -> shift node keyframes by continuityMaxDeltaFrames
 *   - anything else        -> NOT auto-fixed; routed to the human queue
 *
 * Honesty contract: a finding is only translated when (a) it is marked
 * autoFixable, (b) a check->node mapping is provided, and (c) the current
 * snapshot contains that node. Otherwise the finding lands in the human queue
 * with a warning. The manifest references real snapshot ids and validates.
 */

export interface CheckNodeMapping {
  /** QA check name -> nodeId whose data the fix adjusts. */
  [checkName: string]: string;
}

export interface TranslateOptions {
  sceneId: string;
  beforeSnapshotId: string;
  afterSnapshotId: string;
  currentSnapshot: SceneSnapshotPIR;
  checkNodeMap: CheckNodeMapping;
  /** Max severity still auto-fixable; mirrors qaThresholds.autoFixableSeverityMax. */
  autoFixableSeverityMax?: 'low' | 'medium' | 'high' | 'critical';
}

export interface TranslateResult {
  status: 'translated' | 'human_queue' | 'approved';
  manifest: RetakeManifest | null;
  humanQueue: Array<{ findingId: string; check: string; reason: string }>;
  warnings: string[];
}

const SEVERITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export class RetakeTranslator {
  translate(report: QaReport, options: TranslateOptions): TranslateResult {
    const warnings: string[] = [];
    const humanQueue: TranslateResult['humanQueue'] = [];

    if (report.overallStatus === 'approved') {
      return { status: 'approved', manifest: null, humanQueue, warnings };
    }

    const maxRank = SEVERITY_RANK[options.autoFixableSeverityMax ?? 'medium'];
    const nodeDataChanges: NodeDataDelta[] = [];

    for (const finding of report.findings) {
      const autoOk =
        finding.autoFixable &&
        SEVERITY_RANK[finding.severity] <= maxRank &&
        !report.humanApprovalReasons.includes(finding.check);
      if (!autoOk) {
        humanQueue.push({
          findingId: finding.findingId,
          check: finding.check,
          reason: finding.autoFixable ? 'severity above auto-fix ceiling or human approval required' : 'not marked autoFixable'
        });
        continue;
      }

      const nodeId = options.checkNodeMap[finding.check];
      if (!nodeId) {
        humanQueue.push({ findingId: finding.findingId, check: finding.check, reason: `no check->node mapping for "${finding.check}"` });
        warnings.push(`finding "${finding.findingId}": no node mapping — routed to human queue`);
        continue;
      }
      const nodeData = options.currentSnapshot.nodeData?.find(n => n.nodeId === nodeId);
      if (!nodeData) {
        humanQueue.push({ findingId: finding.findingId, check: finding.check, reason: `node "${nodeId}" absent from current snapshot` });
        warnings.push(`finding "${finding.findingId}": snapshot has no "${nodeId}" — routed to human queue`);
        continue;
      }

      const strategy = this.strategyFor(finding);
      if (!strategy) {
        humanQueue.push({ findingId: finding.findingId, check: finding.check, reason: `no deterministic fix strategy for "${finding.check}"` });
        continue;
      }
      nodeDataChanges.push(strategy(finding, nodeData));
    }

    if (nodeDataChanges.length === 0) {
      warnings.push('no findings were translatable; manifest not produced');
      return { status: 'human_queue', manifest: null, humanQueue, warnings };
    }

    const draft: Omit<RetakeManifest, never> = {
      format: 'RetakeManifest',
      version: '1.0.0',
      sceneId: options.sceneId,
      snapshotV1Id: options.beforeSnapshotId,
      snapshotV2Id: options.afterSnapshotId,
      nodes: { added: [], removed: [] },
      connections: { added: [], removed: [] },
      nodeDataChanges
    };
    const parsed = retakeManifestSchema.safeParse(draft);
    if (!parsed.success) {
      throw new Error(`translated manifest failed schema validation: ${parsed.error.message}`);
    }
    return { status: 'translated', manifest: parsed.data, humanQueue, warnings };
  }

  private strategyFor(
    finding: QaFinding
  ): ((f: QaFinding, nodeData: NonNullable<SceneSnapshotPIR['nodeData']>[number]) => NodeDataDelta) | null {
    switch (finding.check) {
      case 'lipsync_drift':
        // Drift measured in ms at 24fps -> whole frames; shift exposures only.
        return (f, nd) => {
          const shiftFrames = Math.round((f.measured - f.threshold) / (1000 / 24));
          const clamp = (v: number) => Math.max(1, v + shiftFrames);
          return {
            nodeId: nd.nodeId,
            exposures: {
              added: [],
              modified: [],
              removed: [],
              ...(nd.exposures && shiftFrames !== 0
                ? {
                    modified: nd.exposures.map(e => ({ original: e, updated: { ...e, frame: clamp(e.frame) } }))
                  }
                : {})
            }
          };
        };
      case 'continuity':
        // Continuity break -> nudge keyframe positions by the measured delta.
        return (f, nd) => {
          const shiftFrames = Math.max(1, Math.round(Math.abs(f.measured - f.threshold)));
          return {
            nodeId: nd.nodeId,
            transformKeys: {
              added: [],
              modified: [],
              removed: [],
              ...(nd.transformKeys
                ? {
                    modified: nd.transformKeys.map(k => ({ original: k, updated: { ...k, frame: k.frame + shiftFrames } }))
                  }
                : {})
            }
          };
        };
      default:
        return null;
    }
  }
}
