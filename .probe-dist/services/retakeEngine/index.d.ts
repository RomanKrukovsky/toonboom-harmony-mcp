import type { QaThresholds } from '../../schemas/showBible.js';
import type { PerformancePIR } from '../../schemas/performancePir.js';
import type { QaReport } from '../../schemas/qaReport.js';
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
    silhouetteQuality?: number;
    lipsyncDriftMs?: number;
    continuityDeltaFrames?: number;
    lineThicknessDeltaPt?: number;
    paletteDelta?: number;
    poseLibraryMatch?: number;
}
export declare class RetakeEngine {
    evaluate(shotId: string, performance: PerformancePIR, metrics: ShotMetrics, thresholds: QaThresholds): QaReport;
}
