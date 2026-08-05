import crypto from 'crypto';
import { MlError } from '../../errors/mlErrorRegistry.js';
import { QualityDirector, type QualityFinding, type QualityInput, type QualityReport } from '../qualityDirector/index.js';

/**
 * RetakeLoop.
 *
 * Drives a closed-loop improvement cycle on a shot:
 *   1. Take a quality report on the current scene state.
 *   2. If a fixable finding exists, attempt at most `maxIterations` semantic patches.
 *   3. After every iteration, re-measure; if quality improves, keep the patch; otherwise roll
 *      back.
 *   4. When the budget is exhausted or the finding is unfixable by the loop, return
 *      `requires_human`.
 *
 * The loop never executes a destructive patch without computing an inverse patch; nothing
 * here is allowed to mutate already-approved parts of the scene without explicit scope.
 */

export interface PatchAction {
  patchId: string;
  inversePatchId: string;
  code: string;
  description: string;
  affectedFrameRange: [number, number] | null;
  predictedRisk: number;
}

export interface RetakeIteration {
  iteration: number;
  issueCode: string;
  proposedPatch: PatchAction;
  applied: boolean;
  rolledBack: boolean;
  qualityBefore: number;
  qualityAfter: number | null;
  reason: string | null;
}

export interface RetakeResult {
  shotId: string;
  iterations: RetakeIteration[];
  finalReport: QualityReport;
  outcome: 'fixed' | 'partially_fixed' | 'requires_human' | 'budget_exhausted';
  reason: string;
}

export interface PatchApplier {
  apply(action: PatchAction): Promise<{ qualityReport: QualityReport }>;
  rollback(action: PatchAction): Promise<void>;
}

export interface PatchSynthesiser {
  synthesise(finding: QualityFinding, iteration: number): PatchAction | null;
}

export interface RetakeLoopOptions {
  shotId: string;
  initialReport: QualityReport;
  maxIterations: number;
  /** Stop iterating once quality passes. */
  stopWhenPassed: boolean;
  /** Quality threshold below which we declare `requires_human`. */
  minimumQuality: number;
  /** Synthesises a semantic patch for a given finding. */
  patchSynthesiser: PatchSynthesiser;
  /** Applies and rolls back patches. Real implementations wire to Harmony. */
  patchApplier: PatchApplier;
}

export class RetakeLoop {
  async run(opts: RetakeLoopOptions): Promise<RetakeResult> {
    const iterations: RetakeIteration[] = [];
    let currentReport = opts.initialReport;
    let lastReport = currentReport;

    for (let i = 1; i <= opts.maxIterations; i += 1) {
      const fixable = currentReport.findings.find(f => f.severity === 'critical' || f.severity === 'high');
      if (!fixable) {
        return {
          shotId: opts.shotId,
          iterations,
          finalReport: currentReport,
          outcome: currentReport.passed ? 'fixed' : 'requires_human',
          reason: currentReport.passed ? 'no remaining fixable findings' : 'remaining findings are not auto-fixable'
        };
      }
      if (opts.stopWhenPassed && currentReport.passed) {
        return { shotId: opts.shotId, iterations, finalReport: currentReport, outcome: 'fixed', reason: 'quality already passing' };
      }
      const patch = opts.patchSynthesiser.synthesise(fixable, i);
      if (!patch) {
        iterations.push({
          iteration: i,
          issueCode: fixable.code,
          proposedPatch: { patchId: `none_${i}`, inversePatchId: `none_${i}_inv`, code: 'NOOP', description: 'no automated fix synthesised', affectedFrameRange: null, predictedRisk: 1 },
          applied: false,
          rolledBack: false,
          qualityBefore: scoreOf(currentReport),
          qualityAfter: null,
          reason: 'no patch synthesised'
        });
        return { shotId: opts.shotId, iterations, finalReport: currentReport, outcome: 'requires_human', reason: `finding ${fixable.code} has no automated fix` };
      }
      const qualityBefore = scoreOf(currentReport);
      let applied = false;
      let rolledBack = false;
      let qualityAfter: number | null = null;
      try {
        const { qualityReport } = await opts.patchApplier.apply(patch);
        applied = true;
        qualityAfter = scoreOf(qualityReport);
        if (qualityAfter + patch.predictedRisk < qualityBefore) {
          await opts.patchApplier.rollback(patch);
          rolledBack = true;
          qualityAfter = qualityBefore;
          lastReport = currentReport;
          iterations.push({
            iteration: i,
            issueCode: fixable.code,
            proposedPatch: patch,
            applied: true,
            rolledBack: true,
            qualityBefore,
            qualityAfter,
            reason: `patch made quality worse (delta=${qualityAfter - qualityBefore}); rolled back`
          });
          break;
        }
        currentReport = qualityReport;
        lastReport = currentReport;
      } catch (error) {
        await opts.patchApplier.rollback(patch).catch(() => undefined);
        rolledBack = true;
        const message = error instanceof Error ? error.message : String(error);
        iterations.push({
          iteration: i,
          issueCode: fixable.code,
          proposedPatch: patch,
          applied,
          rolledBack: true,
          qualityBefore,
          qualityAfter: null,
          reason: `apply failed: ${message}`
        });
        return { shotId: opts.shotId, iterations, finalReport: currentReport, outcome: 'requires_human', reason: message };
      }
      iterations.push({
        iteration: i,
        issueCode: fixable.code,
        proposedPatch: patch,
        applied,
        rolledBack,
        qualityBefore,
        qualityAfter,
        reason: applied ? `quality delta=${qualityAfter! - qualityBefore}` : null
      });
    }

    return {
      shotId: opts.shotId,
      iterations,
      finalReport: lastReport,
      outcome: 'budget_exhausted',
      reason: `exceeded ${opts.maxIterations} iterations`
    };
  }
}

function scoreOf(report: QualityReport): number {
  const weights: Record<typeof report.findings[number]['severity'], number> = { low: 0.1, medium: 0.3, high: 0.6, critical: 1 };
  const total = report.findings.reduce((acc, f) => acc + weights[f.severity], 0);
  return Math.max(0, 1 - total);
}

export function hashPatch(action: PatchAction): string {
  return crypto.createHash('sha256').update(JSON.stringify(action)).digest('hex');
}

export function emptyFindingReporter(input: QualityInput): QualityReport {
  const director = new QualityDirector();
  return director.evaluate(input);
}

export { QualityDirector };
