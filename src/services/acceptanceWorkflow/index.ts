import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { MlError } from '../../errors/mlErrorRegistry.js';
import { QualityDirector, type QualityInput, type QualityReport } from '../qualityDirector/index.js';
import { RetakeLoop, type RetakeResult, type PatchAction, type PatchApplier, type PatchSynthesiser } from '../retakeLoop/index.js';
import { HarmonyActionRecorderV2 } from '../harmonyActionRecorderV2/index.js';

/**
 * Acceptance Workflow Orchestrator.
 *
 * Runs the documented end-to-end acceptance slice:
 *
 *   1. Build a QualityInput from a *real* scene capture (real Harmony) or from a
 *      simulator snapshot (offline deterministic).
 *   2. Run the deterministic QualityDirector over it.
 *   3. If findings exist, run the RetakeLoop with a simple structural patch synthesiser
 *      that re-runs the director after each patch.
 *   4. Persist the result as a HarmonyActionDatasetV2 entry.
 *   5. Emit a `QualityReport` + the recorded entry as the acceptance evidence.
 *
 * No step here pretends to render or to open Harmony: the orchestrator never calls the
 * V5 plan executor. The "real" path uses the structural capture that the existing python
 * bridge produced; the "offline" path uses the simulator snapshot.
 */

export interface AcceptanceConfig {
  shotId: string;
  projectId: string;
  sessionId: string;
  qualityInput: QualityInput;
  instruction: string;
  /** Whether the scene capture was actually read from Harmony (`real`) or built by the
   *  simulator (`offline`). The recorder writes this into the entry so the evidence is honest. */
  captureSource: 'harmony_qtscript_notifier' | 'harmony_python_bridge' | 'simulator_snapshot';
  maxIterations: number;
  /** Scene path or simulator snapshot path. */
  scenePath: string;
}

export interface AcceptanceResult {
  shotId: string;
  initialReport: QualityReport;
  retakeResult: RetakeResult;
  recordedEntryId: string;
  recordedEntryPath: string;
  durationMs: number;
  outcome: 'fixed' | 'partially_fixed' | 'requires_human' | 'budget_exhausted';
}

/**
 * The default `PatchSynthesiser` is structural-only. For every fixable finding it generates
 * a no-op inverse-tracked patch whose `code` reports the finding code; the actual structural
 * remediation (when it exists) is provided by real implementations of `PatchApplier` wired to
 * the Harmony command compiler. This keeps the loop testable without ever executing a
 * destructive command.
 */
export function structuralPatchSynthesiser(): PatchSynthesiser {
  return {
    synthesise(finding, iteration) {
      const id = crypto.randomUUID();
      return {
        patchId: id,
        inversePatchId: `${id}_inv`,
        code: `STRUCTURAL_${finding.code}`,
        description: `proposed structural fix for finding ${finding.code} severity=${finding.severity}`,
        affectedFrameRange: finding.frameRange,
        predictedRisk: 0.05 * iteration
      };
    }
  };
}

export function buildQualityReport(input: QualityInput): QualityReport {
  return new QualityDirector().evaluate(input);
}

export class AcceptanceOrchestrator {
  private readonly recorder = new HarmonyActionRecorderV2();

  async run(config: AcceptanceConfig, applier: PatchApplier): Promise<AcceptanceResult> {
    const startedAt = Date.now();
    const initialReport = buildQualityReport(config.qualityInput);
    const loop = new RetakeLoop();
    const retakeResult = await loop.run({
      shotId: config.shotId,
      initialReport,
      maxIterations: config.maxIterations,
      stopWhenPassed: true,
      minimumQuality: 0.7,
      patchSynthesiser: structuralPatchSynthesiser(),
      patchApplier: applier
    });
    const entryId = `acc_${crypto.randomUUID()}`;
    const sceneBefore = { scenePath: config.scenePath, captureSource: config.captureSource };
    const sceneAfter = { scenePath: config.scenePath, captureSource: config.captureSource, iterations: retakeResult.iterations.length };
    const entry = this.recorder.record({
      entryId,
      sessionId: config.sessionId,
      projectId: config.projectId,
      instruction: config.instruction,
      sceneBefore,
      sceneAfter,
      semanticDiff: {
        affectedNodes: retakeResult.finalReport.findings.flatMap(f => f.code === 'BROKEN_NODE_LINK' ? [f.message] : []),
        affectedFrames: [],
        palettes: [],
        deformerChains: [],
        masterControllerChanges: [],
        soundColumns: [],
        cameraStates: [],
        writeNodes: [],
        functionCurves: []
      },
      forwardPatch: retakeResult.iterations.filter(it => it.applied).map(it => ({ opId: it.proposedPatch.patchId, opcode: it.proposedPatch.code, inverseOpId: it.proposedPatch.inversePatchId })),
      inversePatch: retakeResult.iterations.filter(it => it.applied).map(it => ({ opId: it.proposedPatch.inversePatchId, opcode: `INV_${it.proposedPatch.code}` })),
      approvalDecision: retakeResult.outcome === 'fixed' ? 'approved' : retakeResult.outcome === 'partially_fixed' ? 'approved' : 'pending',
      rejectionReason: retakeResult.outcome === 'requires_human' ? retakeResult.reason : null,
      operatorType: 'system',
      episodeId: null,
      sequenceId: null,
      shotId: config.shotId,
      assetId: null,
      characterId: null,
      rigVersion: null,
      harmonyVersion: { product: 'unknown', version: 'simulator', buildId: null }
    });
    return {
      shotId: config.shotId,
      initialReport,
      retakeResult,
      recordedEntryId: entry.entryId,
      recordedEntryPath: path.join(this.recorder.getRoot(), `${entry.entryId}.json`),
      durationMs: Date.now() - startedAt,
      outcome: retakeResult.outcome
    };
  }
}
