import type { QaThresholds } from '../../schemas/showBible.js';
import type { PerformancePIR } from '../../schemas/performancePir.js';
import type { QaReport, QaFinding, QaSeverity } from '../../schemas/qaReport.js';

/**
 * RetakeEngine — checks a rendered shot against the QaThresholds from the
 * ShowBible family and produces a QaReport.
 *
 * Roadmap contract (ROADMAP §"QA и Retake Engine"):
 *   Each shot is automatically checked for rig errors, sliding, intersections,
 *   lipsync drift, continuity, and style compliance. Errors are turned into a
 *   RetakePatch and the shot is re-assembled.
 *
 * Inputs are deliberately minimal: the engine consumes a PerformancePIR and a
 * bag of measured render metrics. The real measurements (silhouette quality,
 * lipsync drift, palette delta, ...) are produced by downstream ML services;
 * here we only apply the thresholds deterministically. This keeps the engine
 * testable without a live Harmony render.
 */

export interface ShotMetrics {
  silhouetteQuality?: number;       // 0..1, higher is better
  lipsyncDriftMs?: number;          // milliseconds, lower is better
  continuityDeltaFrames?: number;   // frames, lower is better
  lineThicknessDeltaPt?: number;    // points, lower is better
  paletteDelta?: number;            // 0..1, lower is better
  poseLibraryMatch?: number;        // 0..1, higher is better
}

export class RetakeEngine {
  evaluate(
    shotId: string,
    performance: PerformancePIR,
    metrics: ShotMetrics,
    thresholds: QaThresholds
  ): QaReport {
    const findings: QaFinding[] = [];
    let counter = 1;
    const addFinding = (
      check: string,
      severity: QaSeverity,
      measured: number,
      threshold: number,
      message: string,
      autoFixable: boolean
    ) => {
      findings.push({
        findingId: `f_${counter.toString().padStart(3, '0')}`,
        check,
        severity,
        measured,
        threshold,
        message,
        autoFixable
      });
      counter += 1;
    };

    // 1. Silhouette quality (higher is better).
    if (metrics.silhouetteQuality !== undefined) {
      if (metrics.silhouetteQuality < thresholds.silhouetteQualityMin) {
        addFinding(
          'silhouette_quality',
          metrics.silhouetteQuality < thresholds.silhouetteQualityMin * 0.7 ? 'high' : 'medium',
          metrics.silhouetteQuality,
          thresholds.silhouetteQualityMin,
          `Silhouette quality ${metrics.silhouetteQuality.toFixed(3)} below threshold ${thresholds.silhouetteQualityMin}`,
          metrics.silhouetteQuality >= thresholds.silhouetteQualityMin * 0.7
        );
      }
    }

    // 2. Lipsync drift (lower is better).
    if (metrics.lipsyncDriftMs !== undefined) {
      if (metrics.lipsyncDriftMs > thresholds.lipsyncDriftMaxMs) {
        addFinding(
          'lipsync_drift',
          metrics.lipsyncDriftMs > thresholds.lipsyncDriftMaxMs * 2 ? 'high' : 'medium',
          metrics.lipsyncDriftMs,
          thresholds.lipsyncDriftMaxMs,
          `Lipsync drift ${metrics.lipsyncDriftMs}ms above threshold ${thresholds.lipsyncDriftMaxMs}ms`,
          metrics.lipsyncDriftMs <= thresholds.lipsyncDriftMaxMs * 1.5
        );
      }
    }

    // 3. Continuity delta (lower is better).
    if (metrics.continuityDeltaFrames !== undefined) {
      if (metrics.continuityDeltaFrames > thresholds.continuityMaxDeltaFrames) {
        addFinding(
          'continuity_delta',
          'medium',
          metrics.continuityDeltaFrames,
          thresholds.continuityMaxDeltaFrames,
          `Continuity delta ${metrics.continuityDeltaFrames}f above threshold ${thresholds.continuityMaxDeltaFrames}f`,
          true
        );
      }
    }

    // 4. Line thickness delta (lower is better).
    if (metrics.lineThicknessDeltaPt !== undefined) {
      if (metrics.lineThicknessDeltaPt > thresholds.lineThicknessTolerancePt) {
        addFinding(
          'line_thickness_delta',
          'low',
          metrics.lineThicknessDeltaPt,
          thresholds.lineThicknessTolerancePt,
          `Line thickness delta ${metrics.lineThicknessDeltaPt}pt above tolerance ${thresholds.lineThicknessTolerancePt}pt`,
          true
        );
      }
    }

    // 5. Palette delta (lower is better).
    if (metrics.paletteDelta !== undefined) {
      if (metrics.paletteDelta > thresholds.paletteDeltaMax) {
        addFinding(
          'palette_delta',
          metrics.paletteDelta > thresholds.paletteDeltaMax * 2 ? 'high' : 'medium',
          metrics.paletteDelta,
          thresholds.paletteDeltaMax,
          `Palette delta ${metrics.paletteDelta.toFixed(4)} above threshold ${thresholds.paletteDeltaMax}`,
          metrics.paletteDelta <= thresholds.paletteDeltaMax * 1.5
        );
      }
    }

    // 6. Pose library match (higher is better).
    if (metrics.poseLibraryMatch !== undefined) {
      if (metrics.poseLibraryMatch < thresholds.poseLibraryMatchMin) {
        addFinding(
          'pose_library_match',
          'high',
          metrics.poseLibraryMatch,
          thresholds.poseLibraryMatchMin,
          `Pose library match ${metrics.poseLibraryMatch.toFixed(3)} below threshold ${thresholds.poseLibraryMatchMin}`,
          false
        );
      }
    }

    // Determine overall status.
    const maxSeverityRank = (s: QaSeverity): number => ({ low: 0, medium: 1, high: 2, critical: 3 })[s];
    const autoFixableMaxRank = maxSeverityRank(thresholds.autoFixableSeverityMax);

    const blocking = findings.filter(f => maxSeverityRank(f.severity) > autoFixableMaxRank || !f.autoFixable);
    const requiresHumanApproval = blocking.length > 0 ||
      thresholds.requireHumanApprovalFor.some(kind => findings.some(f => f.check.includes(kind)));

    const humanApprovalReasons: string[] = [];
    if (blocking.length > 0) {
      humanApprovalReasons.push(`${blocking.length} finding(s) exceed autoFixableSeverityMax or are not autoFixable`);
    }
    for (const kind of thresholds.requireHumanApprovalFor) {
      if (findings.some(f => f.check.includes(kind))) {
        humanApprovalReasons.push(`check "${kind}" requires human approval per qa_thresholds`);
      }
    }

    const overallStatus: QaReport['overallStatus'] =
      blocking.length > 0 ? 'blocked' :
      findings.length > 0 ? 'needs_retake' :
      'approved';

    return {
      schemaVersion: '1.0',
      shotId,
      performanceId: performance.performanceId,
      overallStatus,
      findings,
      requiresHumanApproval,
      humanApprovalReasons,
      checkedAt: new Date().toISOString()
    };
  }
}