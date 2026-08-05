import { FactoryShotSessionStore, type RetakeNote } from '../src/services/factoryShotSessionStore/index.js';
import type { ShotManifest } from '../src/schemas/shotManifest.js';
import type { PerformancePIR } from '../src/schemas/performancePir.js';
import type { QaReport } from '../src/schemas/qaReport.js';

describe('FactoryShotSessionStore', () => {
  let store: FactoryShotSessionStore;

  const shotManifest: ShotManifest = {
    schemaVersion: '1.0',
    shotId: 'shot_session_001',
    showBibleRef: 'show/show_bible.json',
    production: 'polygon_show',
    episode: 'E01',
    sceneName: 'S01',
    description: 'Mira looks up.',
    staging: {
      positions: [{ characterId: 'char_main_v1', preset: 'center' }],
      shotSize: 'close_up',
      cameraMove: 'static',
      backgroundRef: 'bg/room_v1.png'
    },
    timing: { totalFrames: 48, fps: 24, minBeatFrames: 2, maxBeatFrames: 96, anticipationFrames: 4, followThroughFrames: 6, pauseBeforeBeats: {} },
    beats: [
      { beatId: 'b1', startFrame: 1, endFrame: 48, characterId: 'char_main_v1', intent: 'look_up', emotion: 'neutral' }
    ],
    fx: [],
    render: { preview: true, format: 'mp4', quality: 'standard' },
    provenance: { director: 'llm_director_v1', createdAt: '2026-07-27T12:00:00Z', sourceScriptRef: 'scripts/E01/S01.txt' }
  };

  const performancePIR: PerformancePIR = {
    schema: 'toon-boom-mcp/performance-pir-v1',
    performanceId: 'PERF-session-01',
    characterId: 'char_main_v1',
    durationFrames: 48,
    fps: 24,
    tracks: [],
    holds: []
  };

  const qaReport: QaReport = {
    schemaVersion: '1.0',
    shotId: 'shot_session_001',
    performanceId: 'PERF-session-01',
    overallStatus: 'approved',
    findings: [],
    requiresHumanApproval: false,
    humanApprovalReasons: [],
    checkedAt: '2026-07-27T12:00:00Z'
  };

  beforeEach(() => {
    store = new FactoryShotSessionStore();
  });

  it('starts a content-addressed session and returns it', () => {
    const session = store.start({ shotManifest, performancePIR, qaReport });
    expect(session.sessionId).toMatch(/^fss_/);
    expect(session.shotId).toBe('shot_session_001');
    expect(session.status).toBe('pending');
    expect(session.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is idempotent: same artifacts produce the same sessionId', () => {
    const a = store.start({ shotManifest, performancePIR, qaReport });
    const b = store.start({ shotManifest, performancePIR, qaReport });
    expect(a.sessionId).toBe(b.sessionId);
  });

  it('accepts retake notes while pending', () => {
    const session = store.start({ shotManifest, performancePIR, qaReport });
    const note: RetakeNote = {
      author: 'animator_a',
      at: '2026-07-27T13:00:00Z',
      body: 'Head turn too fast at frame 24.',
      severity: 'medium'
    };
    const updated = store.addRetakeNote(session.sessionId, note);
    expect(updated.retakeNotes).toHaveLength(1);
    expect(updated.retakeNotes[0].body).toContain('Head turn');
  });

  it('approves a pending session and freezes it', () => {
    const session = store.start({ shotManifest, performancePIR, qaReport });
    const approved = store.approve(session.sessionId, 'director_a');
    expect(approved.status).toBe('approved');
    expect(approved.decidedBy).toBe('director_a');
    expect(approved.decidedAt).toBeDefined();
    expect(() => store.addRetakeNote(session.sessionId, {
      author: 'x', at: '2026-07-27T14:00:00Z', body: 'late', severity: 'low'
    })).toThrow(/frozen/);
  });

  it('rejects a pending session and freezes it', () => {
    const session = store.start({ shotManifest, performancePIR, qaReport });
    const rejected = store.reject(session.sessionId, 'director_a');
    expect(rejected.status).toBe('rejected');
    expect(() => store.approve(session.sessionId, 'director_a')).toThrow(/frozen/);
  });

  it('listByShot returns all sessions for a shotId', () => {
    store.start({ shotManifest, performancePIR, qaReport });
    // Different QA report -> different content hash -> new session for same shot.
    const otherQa: QaReport = { ...qaReport, overallStatus: 'needs_retake', checkedAt: '2026-07-27T15:00:00Z' };
    store.start({ shotManifest, performancePIR: { ...performancePIR, performanceId: 'PERF-session-02' }, qaReport: otherQa });
    const list = store.listByShot('shot_session_001');
    expect(list).toHaveLength(2);
  });

  it('approvedLibrary returns only approved sessions', () => {
    const s1 = store.start({ shotManifest, performancePIR, qaReport });
    store.approve(s1.sessionId, 'director_a');
    const otherQa: QaReport = { ...qaReport, checkedAt: '2026-07-27T15:00:00Z' };
    const s2 = store.start({ shotManifest, performancePIR: { ...performancePIR, performanceId: 'PERF-session-02' }, qaReport: otherQa });
    store.reject(s2.sessionId, 'director_a');
    const library = store.approvedLibrary();
    expect(library).toHaveLength(1);
    expect(library[0].sessionId).toBe(s1.sessionId);
  });
});