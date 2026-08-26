import { z } from 'zod';
import { RetakeTranslator } from '../retakeTranslator/index.js';
import { qaReportSchema, type QaReport } from '../../schemas/qaReport.js';
import { type SceneSnapshotPIR } from '../../schemas/sceneSnapshotPir.js';
import { type RetakeManifest } from '../../schemas/retakeManifest.js';

/**
 * RetakeLoopService — closes the autonomous QA -> patch -> re-QA loop.
 *
 *   evaluate(snapshot)  ->  QaReport
 *     approved?         ->  done
 *     else              ->  RetakeTranslator.translate(report)
 *                             'translated'  -> applyPatch(manifest) -> next iteration
 *                             'human_queue' -> escalate immediately
 *   after maxIterations ->  final evaluate: approved | exhausted
 *
 * Deterministic: iteration ids are derived from the loop counter
 * (`snap_iter<i>`), never from Date or RNG.
 */

export const retakeLoopIterationSchema = z.object({
  iteration: z.number().int(),
  reportStatus: z.string(),
  autoFixedFindings: z.array(z.string()),
  humanFindings: z.array(z.string())
}).strict();

export const retakeLoopResultSchema = z.object({
  status: z.enum(['approved', 'escalated', 'exhausted']),
  iterations: z.array(retakeLoopIterationSchema),
  finalReport: qaReportSchema.nullable(),
  warnings: z.array(z.string())
}).strict();

export type RetakeLoopIteration = z.infer<typeof retakeLoopIterationSchema>;
export type RetakeLoopResult = z.infer<typeof retakeLoopResultSchema>;

export interface RetakeLoopOptions {
  /** Hard cap on patch/re-evaluate cycles before declaring exhaustion. */
  maxIterations?: number;
  /** Max severity still auto-fixable; forwarded to the translator. */
  autoFixableSeverityMax?: 'low' | 'medium' | 'high' | 'critical';
  /** QA check name -> nodeId whose data the fix adjusts. */
  checkNodeMap: Record<string, string>;
}

export interface RetakeLoopInput {
  shotId: string;
  initialSnapshot: SceneSnapshotPIR;
  evaluate: (snapshot: SceneSnapshotPIR) => QaReport;
  applyPatch: (manifest: RetakeManifest) => SceneSnapshotPIR;
  options?: RetakeLoopOptions;
}

export class RetakeLoopService {
  runLoop(input: RetakeLoopInput): RetakeLoopResult {
    const options: RetakeLoopOptions = input.options ?? { checkNodeMap: {} };
    const maxIterations = options.maxIterations ?? 2;
    const warnings: string[] = [];
    const iterations: RetakeLoopIteration[] = [];
    const translator = new RetakeTranslator();

    let current: SceneSnapshotPIR = input.initialSnapshot;

    const record = (
      iteration: number,
      report: QaReport,
      autoFixedFindings: string[],
      humanFindings: string[]
    ): void => {
      iterations.push(
        retakeLoopIterationSchema.parse({ iteration, reportStatus: report.overallStatus, autoFixedFindings, humanFindings })
      );
    };

    const finish = (status: RetakeLoopResult['status'], finalReport: QaReport | null): RetakeLoopResult =>
      retakeLoopResultSchema.parse({ status, iterations, finalReport, warnings });

    for (let i = 1; i <= maxIterations; i++) {
      const report = input.evaluate(current);

      if (report.overallStatus === 'approved') {
        record(i, report, [], []);
        return finish('approved', report);
      }

      const translated = translator.translate(report, {
        sceneId: current.sceneId,
        beforeSnapshotId: `snap_iter${i - 1}`,
        afterSnapshotId: `snap_iter${i}`,
        currentSnapshot: current,
        checkNodeMap: options.checkNodeMap,
        ...(options.autoFixableSeverityMax !== undefined ? { autoFixableSeverityMax: options.autoFixableSeverityMax } : {})
      });
      warnings.push(...translated.warnings);

      const humanFindings = translated.humanQueue.map(h => h.findingId);
      const autoFixedFindings =
        translated.status === 'translated' && translated.manifest
          ? report.findings
              .filter(f => !translated.humanQueue.some(h => h.findingId === f.findingId))
              .map(f => f.findingId)
          : [];

      if (translated.status !== 'translated' || !translated.manifest) {
        record(i, report, [], humanFindings);
        return finish('escalated', report);
      }

      record(i, report, autoFixedFindings, humanFindings);
      current = input.applyPatch(translated.manifest);
    }

    const finalReport = input.evaluate(current);
    return finish(finalReport.overallStatus === 'approved' ? 'approved' : 'exhausted', finalReport);
  }
}
