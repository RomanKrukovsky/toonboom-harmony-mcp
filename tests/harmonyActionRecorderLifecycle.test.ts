import fs from 'fs';
import os from 'os';
import path from 'path';

import { HarmonyActionRecorder } from '../src/services/harmonyActionRecorder/index.js';
import { loadRecorderConfig } from '../src/services/harmonyActionRecorder/config.js';
import { CaptureSessionStore, SESSION_ARTIFACTS } from '../src/services/harmonyActionRecorder/store.js';
import { FixtureSceneStateProvider } from '../src/services/sceneStateCapture/fixtureProvider.js';
import { HarmonyRawEvent, HarmonyScenePatch } from '../src/schemas/harmonyActionDataset.js';

const SCENE_PATH = path.resolve(process.cwd(), 'fixtures/harmony-captures/offline_scene.xstage');
const BEFORE_FIXTURE = path.resolve(process.cwd(), 'fixtures/harmony-captures/scene-before.json');
const AFTER_FIXTURE = path.resolve(process.cwd(), 'fixtures/harmony-captures/scene-after.json');

function makeRecorder(artifactRoot: string) {
  return new HarmonyActionRecorder(loadRecorderConfig({ artifactRoot, debounceMs: 0 }));
}

function makeProvider(paths: string[] = [BEFORE_FIXTURE, AFTER_FIXTURE]) {
  return new FixtureSceneStateProvider({ statePaths: paths });
}

describe('Harmony Action Recorder session lifecycle', () => {
  let artifactRoot: string;

  beforeEach(() => {
    artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-capture-test-'));
  });

  afterEach(() => {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  });

  it('runs start -> instruction -> snapshot -> stop -> approve -> export', async () => {
    const recorder = makeRecorder(artifactRoot);

    const started = await recorder.start({ scenePath: SCENE_PATH, provider: makeProvider() });
    expect(started.session.status).toBe('recording');
    expect(started.observedExecutionMode).toBe('offline_fixture');
    expect(started.beforeStateHash).toHaveLength(64);
    expect(fs.existsSync(path.join(started.evidenceDir, SESSION_ARTIFACTS.sceneBefore))).toBe(true);

    const sessionId = started.session.sessionId;

    recorder.recordInstruction({
      sessionId,
      text: 'Soften the right-arm anticipation and move the accent from frame 12 to frame 18.',
      language: 'en',
      author: 'test-animator'
    });

    recorder.ingestNotifierEvents(sessionId, [
      { signal: 'nodeChanged', targets: ['Top/RIG/Arm_R-P'] },
      { signal: 'columnValuesChanged', targets: ['Arm_R-P_ROTATION'] }
    ]);

    const snapshot = await recorder.snapshot(sessionId);
    expect(snapshot.dirtyNodes).toEqual(['Top/RIG/Arm_R-P']);
    expect(snapshot.dirtyColumns).toEqual(['Arm_R-P_ROTATION']);

    const stopped = await recorder.stop(sessionId);
    expect(stopped.session.status).toBe('stopped');
    expect(stopped.summary.operationCount).toBeGreaterThan(0);
    expect(stopped.executionReport.renderStatus).toBe('not_executed');
    expect(stopped.executionReport.realHarmonyStatus).toBe('not_attempted');

    const decision = recorder.decide({ sessionId, decision: 'approved', reviewer: 'lead', qualityTags: ['on_model'] });
    expect(decision.approval.patchHash).toBe(stopped.patch.deterministicHash);
    expect(decision.session.status).toBe('approved');

    const entry = recorder.exportDatasetEntry(sessionId);
    expect(entry.instruction.text).toContain('frame 18');
    expect(entry.approval.decision).toBe('approved');
    expect(entry.operations.length).toBe(stopped.summary.operationCount);
    expect(entry.beforeState.hash).toBe(stopped.patch.beforeStateHash);
    expect(entry.afterState.hash).toBe(stopped.patch.afterStateHash);
    expect(entry.renderStatus).toBe('not_executed');
  });

  it('writes events append-only with monotonic sequence numbers', async () => {
    const recorder = makeRecorder(artifactRoot);
    const started = await recorder.start({ scenePath: SCENE_PATH, provider: makeProvider() });
    const sessionId = started.session.sessionId;

    recorder.recordInstruction({ sessionId, text: 'test instruction' });
    recorder.ingestNotifierEvents(sessionId, [
      { signal: 'nodeChanged', targets: ['Top/A'] },
      { signal: 'currentFrameChanged', targets: [] }
    ]);
    await recorder.stop(sessionId);

    const store = new CaptureSessionStore(artifactRoot, sessionId);
    const { events } = store.readEvents();

    expect(events.length).toBeGreaterThanOrEqual(5);
    expect(events.map(e => e.sequence)).toEqual(events.map((_, index) => index));
    expect(events[0].signal).toBe('recorder.sessionStarted');
    expect(events[events.length - 1].signal).toBe('recorder.sessionStopped');
    // Notifier signals are recorded as observations, never as operations.
    const notifierEvents = events.filter((e: HarmonyRawEvent) => e.origin === 'harmony_notifier');
    expect(notifierEvents).toHaveLength(2);
  });

  it('recovers a session whose owning process died as interrupted, never as approved', async () => {
    const recorderA = makeRecorder(artifactRoot);
    const started = await recorderA.start({ scenePath: SCENE_PATH, provider: makeProvider() });
    const sessionId = started.session.sessionId;
    recorderA.recordInstruction({ sessionId, text: 'work in progress' });

    // A fresh recorder over the same artifact root stands in for a restarted process.
    const recorderB = makeRecorder(artifactRoot);
    const status = recorderB.status(sessionId);

    expect(status.session.status).toBe('interrupted');
    expect(status.live).toBe(false);
    expect(status.session.requiresHumanReview).toBe(true);
    expect(status.session.warnings.some(w => w.includes('recovered as interrupted'))).toBe(true);

    // The status is persisted, not just reported.
    const onDisk = new CaptureSessionStore(artifactRoot, sessionId).readJson<any>(SESSION_ARTIFACTS.session);
    expect(onDisk.status).toBe('interrupted');

    expect(() => recorderB.decide({ sessionId, decision: 'approved' })).toThrow(/interrupted/i);
    await expect(recorderB.stop(sessionId)).rejects.toThrow(/interrupted/i);
  });

  it('tolerates a truncated final event line without losing the log', async () => {
    const recorder = makeRecorder(artifactRoot);
    const started = await recorder.start({ scenePath: SCENE_PATH, provider: makeProvider() });
    const sessionId = started.session.sessionId;
    recorder.ingestNotifierEvents(sessionId, [{ signal: 'nodeChanged', targets: ['Top/A'] }]);

    const store = new CaptureSessionStore(artifactRoot, sessionId);
    fs.appendFileSync(store.artifactPath(SESSION_ARTIFACTS.events), '{"sessionId":"trunc', 'utf-8');

    const { events, truncatedTailBytes } = store.readEvents();
    expect(events).toHaveLength(2);
    expect(truncatedTailBytes).toBeGreaterThan(0);
  });

  it('never reuses or overwrites an existing session directory', async () => {
    const recorder = makeRecorder(artifactRoot);
    await recorder.start({ scenePath: SCENE_PATH, sessionId: 'fixed-id', provider: makeProvider() });

    await expect(
      makeRecorder(artifactRoot).start({ scenePath: SCENE_PATH, sessionId: 'fixed-id', provider: makeProvider() })
    ).rejects.toThrow(/already exists/i);
  });

  it('keeps approval immutable and leaves the patch untouched', async () => {
    const recorder = makeRecorder(artifactRoot);
    const started = await recorder.start({ scenePath: SCENE_PATH, provider: makeProvider() });
    const sessionId = started.session.sessionId;
    recorder.recordInstruction({ sessionId, text: 'test' });
    const stopped = await recorder.stop(sessionId);

    const store = new CaptureSessionStore(artifactRoot, sessionId);
    const patchBefore = JSON.stringify(store.readJson<HarmonyScenePatch>(SESSION_ARTIFACTS.scenePatch));

    recorder.decide({ sessionId, decision: 'approved', note: 'good' });

    expect(() => recorder.decide({ sessionId, decision: 'rejected', note: 'changed my mind' })).toThrow(
      /immutable/i
    );

    const patchAfter = JSON.stringify(store.readJson<HarmonyScenePatch>(SESSION_ARTIFACTS.scenePatch));
    expect(patchAfter).toBe(patchBefore);
    expect(store.readJson<any>(SESSION_ARTIFACTS.approval).decision).toBe('approved');
    expect(store.readJson<any>(SESSION_ARTIFACTS.approval).patchHash).toBe(stopped.patch.deterministicHash);
  });

  it('refuses a dataset entry without a decision, and gates rejected sessions', async () => {
    const recorder = makeRecorder(artifactRoot);
    const started = await recorder.start({ scenePath: SCENE_PATH, provider: makeProvider() });
    const sessionId = started.session.sessionId;
    recorder.recordInstruction({ sessionId, text: 'test' });
    await recorder.stop(sessionId);

    expect(() => recorder.exportDatasetEntry(sessionId)).toThrow(/requires a recorded decision/i);

    recorder.decide({ sessionId, decision: 'rejected', note: 'pose broke the silhouette' });
    expect(() => recorder.exportDatasetEntry(sessionId)).toThrow(/includeRejected/i);

    const entry = recorder.exportDatasetEntry(sessionId, { includeRejected: true });
    expect(entry.approval.decision).toBe('rejected');
  });

  it('refuses a dataset entry with no instruction', async () => {
    const recorder = makeRecorder(artifactRoot);
    const started = await recorder.start({ scenePath: SCENE_PATH, provider: makeProvider() });
    const sessionId = started.session.sessionId;
    await recorder.stop(sessionId);
    recorder.decide({ sessionId, decision: 'approved' });

    expect(() => recorder.exportDatasetEntry(sessionId)).toThrow(/no instruction/i);
  });

  it('produces an empty patch when nothing changed during the session', async () => {
    const recorder = makeRecorder(artifactRoot);
    const started = await recorder.start({
      scenePath: SCENE_PATH,
      provider: makeProvider([BEFORE_FIXTURE, BEFORE_FIXTURE])
    });
    const sessionId = started.session.sessionId;

    const stopped = await recorder.stop(sessionId);
    expect(stopped.summary.operationCount).toBe(0);
    expect(stopped.patch.beforeStateHash).toBe(stopped.patch.afterStateHash);
  });

  it('rejects a scene path outside the allowed roots', async () => {
    const recorder = makeRecorder(artifactRoot);
    await expect(
      recorder.start({ scenePath: '/etc/hosts', provider: makeProvider() })
    ).rejects.toThrow(/allowed capture root/i);
  });

  it('enforces the configured node limit instead of silently truncating', async () => {
    const recorder = new HarmonyActionRecorder(loadRecorderConfig({ artifactRoot, debounceMs: 0, maxNodes: 2 }));
    await expect(recorder.start({ scenePath: SCENE_PATH, provider: makeProvider() })).rejects.toThrow(
      /capture limit for nodes/i
    );
  });

  it('compares two sessions over the same scene', async () => {
    const recorder = makeRecorder(artifactRoot);

    const a = await recorder.start({ scenePath: SCENE_PATH, sessionId: 'sess-a', provider: makeProvider() });
    recorder.recordInstruction({ sessionId: a.session.sessionId, text: 'take one' });
    await recorder.stop('sess-a');

    const b = await recorder.start({ scenePath: SCENE_PATH, sessionId: 'sess-b', provider: makeProvider() });
    recorder.recordInstruction({ sessionId: b.session.sessionId, text: 'take two' });
    await recorder.stop('sess-b');

    const comparison = recorder.compareSessions('sess-a', 'sess-b');
    expect(comparison.sameScene).toBe(true);
    expect(comparison.identicalPatch).toBe(true);
    expect(comparison.onlyInA).toEqual([]);
    expect(comparison.onlyInB).toEqual([]);
    expect(comparison.shared.length).toBeGreaterThan(0);
  });

  it('lists sessions from the artifact store', async () => {
    const recorder = makeRecorder(artifactRoot);
    await recorder.start({ scenePath: SCENE_PATH, sessionId: 'sess-list', provider: makeProvider() });
    await recorder.stop('sess-list');

    const sessions = recorder.listSessions();
    expect(sessions.map(s => s.sessionId)).toContain('sess-list');
    expect(sessions.find(s => s.sessionId === 'sess-list')?.status).toBe('stopped');
  });
});
