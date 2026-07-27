import { RetakeEngine } from '../src/services/retakeEngine/index.js';
import { qaReportSchema } from '../src/schemas/qaReport.js';
import type { PerformancePIR } from '../src/schemas/performancePir.js';
import type { QaThresholds } from '../src/schemas/showBible.js';

describe('RetakeEngine', () => {
  const engine = new RetakeEngine();

  const thresholds: QaThresholds = {
    schemaVersion: '1.0',
    thresholdsId: 'qa_main_v1',
    silhouetteQualityMin: 0.7,
    lipsyncDriftMaxMs: 80,
    continuityMaxDeltaFrames: 2,
    lineThicknessTolerancePt: 0.5,
    paletteDeltaMax: 0.02,
    poseLibraryMatchMin: 0.85,
    autoFixableSeverityMax: 'medium',
    requireHumanApprovalFor: ['key_pose', 'camera_move', 'dialogue_timing'],
    provenance: { approver: 'td_lead', approvedAt: '2026-07-27T12:00:00Z' }
  };

  const perf: PerformancePIR = {
    schema: 'toon-boom-mcp/performance-pir-v1',
    performanceId: 'PERF-test-01',
    characterId: 'char_main_v1',
    durationFrames: 48,
    fps: 24,
    tracks: [],
    holds: []
  };

  it('approves a shot whose metrics are all within thresholds', () => {
    const report = engine.evaluate('shot_ok', perf, {
      silhouetteQuality: 0.9,
      lipsyncDriftMs: 30,
      continuityDeltaFrames: 1,
      lineThicknessDeltaPt: 0.2,
      paletteDelta: 0.01,
      poseLibraryMatch: 0.95
    }, thresholds);
    expect(qaReportSchema.safeParse(report).success).toBe(true);
    expect(report.overallStatus).toBe('approved');
    expect(report.findings).toEqual([]);
    expect(report.requiresHumanApproval).toBe(false);
  });

  it('flags lipsync drift as needs_retake when slightly above threshold (autoFixable)', () => {
    const report = engine.evaluate('shot_lipsync', perf, {
      lipsyncDriftMs: 100,
      silhouetteQuality: 0.9
    }, thresholds);
    // 100ms <= 80*1.5=120 → autoFixable, severity medium <= autoFixableSeverityMax → needs_retake, not blocked.
    expect(report.overallStatus).toBe('needs_retake');
    const drift = report.findings.find(f => f.check === 'lipsync_drift');
    expect(drift).toBeDefined();
    expect(drift?.severity).toBe('medium');
    expect(drift?.autoFixable).toBe(true);
    // AutoFixable finding does not force human approval on its own.
    expect(report.requiresHumanApproval).toBe(false);
  });

  it('blocks approval when pose library match is below threshold (not autoFixable)', () => {
    const report = engine.evaluate('shot_pose', perf, {
      poseLibraryMatch: 0.6
    }, thresholds);
    const pose = report.findings.find(f => f.check === 'pose_library_match');
    expect(pose).toBeDefined();
    expect(pose?.severity).toBe('high');
    expect(pose?.autoFixable).toBe(false);
    expect(report.overallStatus).toBe('blocked');
    // Not autoFixable → blocking → requires human approval with a blocking reason.
    expect(report.requiresHumanApproval).toBe(true);
    expect(report.humanApprovalReasons.some(r => r.includes('autoFixable'))).toBe(true);
  });

  it('escalates silhouette quality to high when far below threshold', () => {
    const report = engine.evaluate('shot_sil', perf, {
      silhouetteQuality: 0.4
    }, thresholds);
    const sil = report.findings.find(f => f.check === 'silhouette_quality');
    expect(sil?.severity).toBe('high');
    expect(report.overallStatus).toBe('blocked');
  });

  it('produces a schema-valid report even when multiple findings fire', () => {
    const report = engine.evaluate('shot_multi', perf, {
      silhouetteQuality: 0.5,
      lipsyncDriftMs: 200,
      continuityDeltaFrames: 5,
      lineThicknessDeltaPt: 1.0,
      paletteDelta: 0.05,
      poseLibraryMatch: 0.5
    }, thresholds);
    expect(qaReportSchema.safeParse(report).success).toBe(true);
    expect(report.findings.length).toBe(6);
    expect(report.overallStatus).toBe('blocked');
  });
});