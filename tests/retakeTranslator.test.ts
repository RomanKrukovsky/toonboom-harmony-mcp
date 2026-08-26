import { RetakeTranslator, type CheckNodeMapping } from '../src/services/retakeTranslator/index.js';
import { qaReportSchema } from '../src/schemas/qaReport.js';
import {
  sceneSnapshotPirSchema,
  type SceneSnapshotPIR
} from '../src/schemas/sceneSnapshotPir.js';

const snapshot: SceneSnapshotPIR = sceneSnapshotPirSchema.parse({
  format: 'SceneSnapshotPIR',
  version: '1.0.0',
  sceneId: 'S01',
  timestamp: '2026-08-23T12:00:00Z',
  nodes: [
    { id: 'NODE_MOUTH_D', type: 'READ', name: 'Mouth' },
    { id: 'NODE_HEAD_PEG', type: 'PEG', name: 'Head_P' }
  ],
  connections: [],
  nodeData: [
    {
      nodeId: 'NODE_MOUTH_D',
      exposures: [
        { frame: 1, drawing: 'MB_A' },
        { frame: 12, drawing: 'MB_C' }
      ]
    },
    {
      nodeId: 'NODE_HEAD_PEG',
      transformKeys: [
        { frame: 1, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        { frame: 24, x: 5, y: 0, rotation: 8, scaleX: 1, scaleY: 1 }
      ]
    }
  ]
});

function report(overrides: Record<string, unknown> = {}) {
  return qaReportSchema.parse({
    schemaVersion: '1.0',
    shotId: 'shot_001',
    performanceId: 'PERF-TEST0000000001',
    overallStatus: 'needs_retake',
    findings: [],
    requiresHumanApproval: false,
    humanApprovalReasons: [],
    checkedAt: '2026-08-23T12:00:01Z',
    ...overrides
  });
}

const baseOptions = {
  sceneId: 'S01',
  beforeSnapshotId: 'snap_v1',
  afterSnapshotId: 'snap_v2',
  currentSnapshot: snapshot,
  checkNodeMap: {
    lipsync_drift: 'NODE_MOUTH_D',
    continuity: 'NODE_HEAD_PEG'
  } as CheckNodeMapping,
  autoFixableSeverityMax: 'medium' as const
};

describe('RetakeTranslator — QA checker -> retake patch bridge', () => {
  it('translates an auto-fixable lipsync drift into exposure deltas', () => {
    const r = new RetakeTranslator().translate(
      report({
        findings: [{
          findingId: 'f1', check: 'lipsync_drift', severity: 'medium',
          measured: 141, threshold: 80, message: 'drift 61ms over threshold', autoFixable: true
        }]
      }),
      baseOptions
    );
    expect(r.status).toBe('translated');
    expect(r.manifest!.nodeDataChanges[0].nodeId).toBe('NODE_MOUTH_D');
    // drift delta 61ms @24fps -> ~1 frame shift applied to every exposure.
    const mods = r.manifest!.nodeDataChanges[0].exposures!.modified;
    expect(mods.length).toBe(2);
    expect(mods[0].updated.frame).toBe(2);
  });

  it('translates continuity breaks into keyframe nudges', () => {
    const r = new RetakeTranslator().translate(
      report({
        findings: [{
          findingId: 'f2', check: 'continuity', severity: 'low',
          measured: 3, threshold: 2, message: 'delta frames exceeded', autoFixable: true
        }]
      }),
      baseOptions
    );
    const keys = r.manifest!.nodeDataChanges[0].transformKeys!;
    expect(keys.modified[0].updated.frame).toBe(keys.modified[0].original.frame + 1);
  });

  it('routes non-autoFixable and unmapped findings to the human queue', () => {
    const r = new RetakeTranslator().translate(
      report({
        findings: [
          { findingId: 'f3', check: 'silhouette_quality', severity: 'high', measured: 0.4, threshold: 0.7, message: 'silhouette off', autoFixable: false },
          { findingId: 'f4', check: 'palette_delta', severity: 'medium', measured: 0.9, threshold: 0.02, message: 'colour drift', autoFixable: true }
        ]
      }),
      baseOptions
    );
    expect(r.status).toBe('human_queue');
    expect(r.manifest).toBeNull();
    expect(r.humanQueue.map(h => h.findingId)).toEqual(['f3', 'f4']);
  });

  it('respects the autoFixableSeverityMax ceiling', () => {
    const r = new RetakeTranslator().translate(
      report({
        findings: [{
          findingId: 'f5', check: 'lipsync_drift', severity: 'critical',
          measured: 500, threshold: 80, message: 'way off', autoFixable: true
        }]
      }),
      baseOptions
    );
    expect(r.status).toBe('human_queue');
    expect(r.humanQueue[0].reason).toContain('ceiling');
  });

  it('returns approved without a manifest when QA passed', () => {
    const r = new RetakeTranslator().translate(report({ overallStatus: 'approved' }), baseOptions);
    expect(r.status).toBe('approved');
    expect(r.manifest).toBeNull();
  });
});
