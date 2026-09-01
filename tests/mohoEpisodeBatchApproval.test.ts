/**
 * Moho episode batch compiler + approval checkpoints — unit tests.
 *
 * Exercises two adjacent seams of the Moho production pipeline:
 *
 *   1. MohoEpisodeBatchCompiler — pure, deterministic compile of an episode
 *      shot batch into a MohoEpisodeBatch envelope. No I/O.
 *
 *   2. MohoApprovalCheckpoints — JSONL-backed approval gate. Writes to a
 *      tmpdir, cleans up between tests.
 *
 * Both modules must be deterministic so the test file can assert exact
 * fingerprint equality without freezing timestamps.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MohoEpisodeBatchCompiler,
  type MohoEpisodeBatch,
} from '../src/services/mohoEpisodeBatchCompiler/index.js';
import {
  MohoApprovalCheckpoints,
  type MohoApprovalRequest,
  type MohoApprovalRequestOptions,
} from '../src/services/mohoApprovalCheckpoints/index.js';
import { type ShotManifest } from '../src/schemas/shotManifest.js';

// ─────────────────────────────────────────────────────────────────────────────
// ShotManifest fixture builder
// ─────────────────────────────────────────────────────────────────────────────

function makeShotManifest(shotId: string, opts: {
  production: string;
  episode: string;
  showBibleRef: string;
  sceneName?: string;
}): ShotManifest {
  return {
    schemaVersion: '1.0',
    shotId,
    showBibleRef: opts.showBibleRef,
    production: opts.production,
    episode: opts.episode,
    sceneName: opts.sceneName ?? `scene_${shotId}`,
    description: `Test shot ${shotId} — single beat neutral pose.`,
    staging: {
      positions: [
        { characterId: 'char_alpha', preset: 'center' }
      ],
      shotSize: 'medium_shot',
      cameraMove: 'static',
      backgroundRef: 'bg/studio_neutral.png'
    },
    timing: {
      totalFrames: 24,
      fps: 24,
      minBeatFrames: 2,
      maxBeatFrames: 96,
      anticipationFrames: 4,
      followThroughFrames: 6,
      pauseBeforeBeats: {}
    },
    beats: [
      {
        beatId: 'b1',
        startFrame: 1,
        endFrame: 24,
        characterId: 'char_alpha',
        intent: 'idle',
        emotion: 'neutral'
      }
    ],
    fx: [],
    render: {
      preview: true,
      format: 'mp4',
      quality: 'standard'
    },
    provenance: {
      director: 'test_director',
      createdAt: '2025-01-01T00:00:00.000Z',
      sourceScriptRef: 'scripts/test.ep1.scene1.json'
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Episode batch tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MohoEpisodeBatchCompiler', () => {
  const SHOW_BIBLE = '/tmp/show_bible/test_show.json';

  test('compiles a single-shot batch into a valid envelope', () => {
    const compiler = new MohoEpisodeBatchCompiler();
    const shot = makeShotManifest('ep1_sh010', {
      production: 'mira',
      episode: 'ep01',
      showBibleRef: SHOW_BIBLE
    });

    const batch: MohoEpisodeBatch = compiler.compile({
      production: 'mira',
      episode: 'ep01',
      shotManifests: [shot],
      showBiblePath: SHOW_BIBLE
    });

    expect(batch.schemaVersion).toBe('1.0');
    expect(batch.production).toBe('mira');
    expect(batch.episode).toBe('ep01');
    expect(batch.showBiblePath).toBe(SHOW_BIBLE);
    expect(batch.shotManifests).toHaveLength(1);
    expect(batch.shotManifests[0].shotId).toBe('ep1_sh010');
    expect(batch.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(batch.batchId).toMatch(/^moho_batch_mira_ep01_/);
    expect(batch.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test('preserves every shot in a 3-shot batch', () => {
    const compiler = new MohoEpisodeBatchCompiler();
    const shots = ['ep1_sh010', 'ep1_sh020', 'ep1_sh030'].map((id) =>
      makeShotManifest(id, { production: 'mira', episode: 'ep01', showBibleRef: SHOW_BIBLE })
    );

    const batch = compiler.compile({
      production: 'mira',
      episode: 'ep01',
      shotManifests: shots,
      showBiblePath: SHOW_BIBLE
    });

    expect(batch.shotManifests).toHaveLength(3);
    expect(batch.shotManifests.map((m) => m.shotId)).toEqual([
      'ep1_sh010',
      'ep1_sh020',
      'ep1_sh030'
    ]);
  });

  test('rejects an empty batch (0 shots)', () => {
    const compiler = new MohoEpisodeBatchCompiler();
    expect(() =>
      compiler.compile({
        production: 'mira',
        episode: 'ep01',
        shotManifests: [],
        showBiblePath: SHOW_BIBLE
      })
    ).toThrow(/at least one shot/);
  });

  test('rejects a batch containing a duplicate shotId', () => {
    const compiler = new MohoEpisodeBatchCompiler();
    const a = makeShotManifest('ep1_sh010', {
      production: 'mira',
      episode: 'ep01',
      showBibleRef: SHOW_BIBLE
    });
    const b = makeShotManifest('ep1_sh010', {
      production: 'mira',
      episode: 'ep01',
      showBibleRef: SHOW_BIBLE,
      sceneName: 'scene_ep1_sh010_alt'
    });

    expect(() =>
      compiler.compile({
        production: 'mira',
        episode: 'ep01',
        shotManifests: [a, b],
        showBiblePath: SHOW_BIBLE
      })
    ).toThrow(/duplicate shotId "ep1_sh010"/);
  });

  test('produces a deterministic batchId for the same production+episode', () => {
    const id1 = MohoEpisodeBatchCompiler.defaultBatchId('mira', 'ep01');
    const id2 = MohoEpisodeBatchCompiler.defaultBatchId('mira', 'ep01');
    expect(id1).toBe(id2);
    expect(id1).toBe('moho_batch_mira_ep01_0');
  });

  test('produces identical fingerprints across separate compiles of the same shots', () => {
    const compiler = new MohoEpisodeBatchCompiler();
    const shots = ['ep1_sh010', 'ep1_sh020'].map((id) =>
      makeShotManifest(id, { production: 'mira', episode: 'ep01', showBibleRef: SHOW_BIBLE })
    );

    const batchA = compiler.compile({
      production: 'mira',
      episode: 'ep01',
      shotManifests: shots,
      showBiblePath: SHOW_BIBLE
    });
    const batchB = compiler.compile({
      production: 'mira',
      episode: 'ep01',
      shotManifests: [...shots].reverse(),
      showBiblePath: SHOW_BIBLE
    });

    // Fingerprint sorts shotIds internally, so order in the input must not matter.
    expect(batchA.fingerprint).toBe(batchB.fingerprint);
    expect(batchA.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  // save/load roundtrip: the current MohoEpisodeBatchCompiler exposes no
  // persistence surface (compile() returns the in-memory envelope only).
  // The sibling EpisodeBatchCompiler in the Harmony pipeline owns
  // serialization; if that seam is later ported here, this is where the
  // roundtrip test belongs. Skipped intentionally — no API to exercise.
  test.skip('save/load roundtrip — not implemented in current MohoEpisodeBatchCompiler', () => {
    /* placeholder */
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Approval checkpoint tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MohoApprovalCheckpoints', () => {
  let workDir: string;
  let checkpoints: MohoApprovalCheckpoints;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'moho-approvals-'));
    checkpoints = new MohoApprovalCheckpoints(workDir);
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  function makeRequestOpts(overrides: Partial<MohoApprovalRequestOptions> = {}): MohoApprovalRequestOptions {
    return {
      runId: overrides.runId ?? 'run_001',
      stage: overrides.stage ?? 'rendered',
      shotId: overrides.shotId ?? 'ep1_sh010',
      summary: overrides.summary ?? 'shot rendered to draft mp4',
      artifacts: overrides.artifacts ?? ['out/ep1_sh010.mp4'],
      qaStatus: overrides.qaStatus,
      retakePatchCount: overrides.retakePatchCount,
      issuedAt: overrides.issuedAt ?? '2025-01-01T00:00:00.000Z'
    };
  }

  test('creates a checkpoint store and accepts a request → returns pending record', async () => {
    const request: MohoApprovalRequest = await checkpoints.request(makeRequestOpts());

    expect(request.approvalId).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.runId).toBe('run_001');
    expect(request.stage).toBe('rendered');
    expect(request.shotId).toBe('ep1_sh010');
    expect(request.issuedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(request.fingerprint).toMatch(/^[0-9a-f]{8}$/);

    const pending = await checkpoints.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].approvalId).toBe(request.approvalId);
    expect(pending[0].decision).toBe('pending');
    expect(pending[0].approver).toBeUndefined();
  });

  test('approve() moves a pending record to decision="approved"', async () => {
    const request = await checkpoints.request(makeRequestOpts());
    const record = await checkpoints.approve(request.approvalId, 'director_jane', 'looks good');

    expect(record.decision).toBe('approved');
    expect(record.approver).toBe('director_jane');
    expect(record.notes).toBe('looks good');
    expect(record.approvedAt).toBe('1970-01-01T00:00:00.000Z');

    expect(await checkpoints.listPending()).toHaveLength(0);
    const approved = await checkpoints.listApproved();
    expect(approved).toHaveLength(1);
    expect(approved[0].approvalId).toBe(request.approvalId);
  });

  test('reject() moves a pending record to decision="rejected"', async () => {
    const request = await checkpoints.request(makeRequestOpts());
    const record = await checkpoints.reject(request.approvalId, 'qa_kim', 'wrong framerate');

    expect(record.decision).toBe('rejected');
    expect(record.approver).toBe('qa_kim');
    expect(record.notes).toBe('wrong framerate');

    expect(await checkpoints.listPending()).toHaveLength(0);
    const rejected = await checkpoints.listRejected();
    expect(rejected).toHaveLength(1);
    expect(rejected[0].approvalId).toBe(request.approvalId);
  });

  test('listPending() returns only records still in the pending queue', async () => {
    const a = await checkpoints.request(makeRequestOpts({ shotId: 'ep1_sh010' }));
    const b = await checkpoints.request(makeRequestOpts({ shotId: 'ep1_sh020' }));
    await checkpoints.request(makeRequestOpts({ shotId: 'ep1_sh030' }));

    await checkpoints.approve(a.approvalId, 'director_jane');

    const pending = await checkpoints.listPending();
    expect(pending).toHaveLength(2);
    expect(pending.map((r) => r.shotId).sort()).toEqual(['ep1_sh020', 'ep1_sh030']);
    expect(pending.find((r) => r.approvalId === b.approvalId)).toBeDefined();
  });

  test('listApproved() returns only approved records', async () => {
    const a = await checkpoints.request(makeRequestOpts({ shotId: 'ep1_sh010' }));
    const b = await checkpoints.request(makeRequestOpts({ shotId: 'ep1_sh020' }));
    const c = await checkpoints.request(makeRequestOpts({ shotId: 'ep1_sh030' }));

    await checkpoints.approve(a.approvalId, 'director_jane');
    await checkpoints.reject(b.approvalId, 'qa_kim', 'cropped wrong');
    await checkpoints.approve(c.approvalId, 'director_jane');

    const approved = await checkpoints.listApproved();
    expect(approved).toHaveLength(2);
    expect(approved.every((r) => r.decision === 'approved')).toBe(true);
    expect(approved.map((r) => r.shotId).sort()).toEqual(['ep1_sh010', 'ep1_sh030']);
  });

  test('queryByRun() returns every record matching the runId across all queues', async () => {
    const runA1 = await checkpoints.request(makeRequestOpts({ runId: 'run_alpha' }));
    await checkpoints.request(makeRequestOpts({ runId: 'run_beta', shotId: 'ep1_sh020' }));
    const runA2 = await checkpoints.request(makeRequestOpts({ runId: 'run_alpha', shotId: 'ep1_sh030' }));

    await checkpoints.approve(runA1.approvalId, 'director_jane');

    const byRun = await checkpoints.queryByRun('run_alpha');
    expect(byRun).toHaveLength(2);
    expect(byRun.every((r) => r.runId === 'run_alpha')).toBe(true);
    expect(byRun.map((r) => r.shotId).sort()).toEqual(['ep1_sh010', 'ep1_sh030']);
    expect(byRun.find((r) => r.approvalId === runA2.approvalId)).toBeDefined();
    expect(byRun.find((r) => r.approvalId === runA1.approvalId)?.decision).toBe('approved');
  });

  test('queryByShot() returns every record matching the shotId across all queues', async () => {
    const s10a = await checkpoints.request(makeRequestOpts({ shotId: 'ep1_sh010' }));
    const s10b = await checkpoints.request(makeRequestOpts({ shotId: 'ep1_sh010', runId: 'run_002' }));
    await checkpoints.request(makeRequestOpts({ shotId: 'ep1_sh020' }));

    await checkpoints.approve(s10a.approvalId, 'director_jane');
    await checkpoints.reject(s10b.approvalId, 'qa_kim', 'rewake');

    const byShot = await checkpoints.queryByShot('ep1_sh010');
    expect(byShot).toHaveLength(2);
    expect(byShot.every((r) => r.shotId === 'ep1_sh010')).toBe(true);
    expect(byShot.map((r) => r.decision).sort()).toEqual(['approved', 'rejected']);
  });

  test('deterministic fingerprint for identical request inputs', async () => {
    const opts = makeRequestOpts({
      runId: 'run_det',
      shotId: 'ep1_sh010',
      summary: 'same summary',
      artifacts: ['out/a.mp4', 'out/b.png'],
      qaStatus: 'warn',
      retakePatchCount: 1,
      issuedAt: '2025-06-15T12:34:56.000Z'
    });

    const a = await checkpoints.request(opts);
    const b = await checkpoints.request(opts);

    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.fingerprint).toMatch(/^[0-9a-f]{8}$/);
  });
});