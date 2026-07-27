/**
 * Offline end-to-end vertical slice for Harmony Action Recorder v1.
 *
 * Loads the two scene-state fixtures for the task "soften the right-arm anticipation and
 * move the accent from frame 12 to frame 18", runs the whole recorder pipeline and asserts
 * the exact semantic patch and the exported dataset entry.
 *
 * No Harmony process is involved, and every artifact produced here is labelled source=fixture.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { HarmonyActionRecorder } from '../../src/services/harmonyActionRecorder/index.js';
import { loadRecorderConfig } from '../../src/services/harmonyActionRecorder/config.js';
import { CaptureSessionStore, SESSION_ARTIFACTS } from '../../src/services/harmonyActionRecorder/store.js';
import { FixtureSceneStateProvider } from '../../src/services/sceneStateCapture/fixtureProvider.js';
import { verifySceneState } from '../../src/services/sceneStateCapture/index.js';
import { HarmonySemanticOperation } from '../../src/schemas/harmonyActionDataset.js';

const SCENE_PATH = path.resolve(process.cwd(), 'fixtures/harmony-captures/offline_scene.xstage');
const BEFORE_FIXTURE = path.resolve(process.cwd(), 'fixtures/harmony-captures/scene-before.json');
const AFTER_FIXTURE = path.resolve(process.cwd(), 'fixtures/harmony-captures/scene-after.json');

const INSTRUCTION = 'Смягчить замах правой руки и перенести акцент с 12-го на 18-й кадр.';

/** Compact, human-readable shape of an operation used for exact expectations. */
function describeOperation(operation: HarmonySemanticOperation) {
  return {
    type: operation.type,
    origin: operation.origin,
    target: operation.target.nodePath ?? operation.target.columnName ?? operation.target.kind,
    property: operation.property ?? null,
    frame: operation.frame ?? null,
    before: operation.before ?? null,
    after: operation.after ?? null
  };
}

describe('Harmony Action Recorder v1 — offline vertical slice', () => {
  let artifactRoot: string;
  let recorder: HarmonyActionRecorder;
  let sessionId: string;

  beforeAll(async () => {
    artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-capture-e2e-'));
    recorder = new HarmonyActionRecorder(loadRecorderConfig({ artifactRoot, debounceMs: 0 }));

    const started = await recorder.start({
      scenePath: SCENE_PATH,
      sceneId: 'ep01_sc012_arm_swing',
      provider: new FixtureSceneStateProvider({ statePaths: [BEFORE_FIXTURE, AFTER_FIXTURE] })
    });
    sessionId = started.session.sessionId;

    recorder.recordInstruction({ sessionId, text: INSTRUCTION, language: 'ru', author: 'animator-01' });

    // Signals an animator's work would produce. They only mark entities dirty.
    recorder.ingestNotifierEvents(sessionId, [
      { signal: 'selectionChanged', targets: [] },
      { signal: 'nodeChanged', targets: ['Top/RIG/Arm_R-P'] },
      { signal: 'columnValuesChanged', targets: ['Arm_R-P_ROTATION'] },
      { signal: 'currentFrameChanged', targets: [] },
      { signal: 'nodeChanged', targets: ['Top/RIG/Hand_R'] }
    ]);
  });

  afterAll(() => {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  });

  it('produces the expected semantic patch for the fixture pair', async () => {
    const stopped = await recorder.stop(sessionId);

    expect(stopped.patch.operations.map(describeOperation)).toEqual([
      {
        type: 'change_camera_property',
        origin: 'harmony_manual',
        target: 'Top/Camera',
        property: 'fov',
        frame: null,
        before: 41.11,
        after: 38
      },
      {
        type: 'change_curve_segment',
        origin: 'harmony_manual',
        target: 'Arm_R-P_ROTATION',
        property: 'interpolation',
        frame: 1,
        before: { interpolation: 'BEZIER', easeIn: 0, easeOut: 0, constSeg: null },
        after: { interpolation: 'BEZIER', easeIn: 6, easeOut: 6, constSeg: null }
      },
      {
        type: 'change_keyframe_value',
        origin: 'harmony_manual',
        target: 'Arm_R-P_ROTATION',
        property: 'value',
        frame: 24,
        before: 15,
        after: 22
      },
      {
        type: 'change_peg_transform',
        origin: 'harmony_manual',
        target: 'Top/RIG/Arm_R-P',
        property: 'OFFSET.X',
        frame: null,
        before: 0,
        after: 0.05
      },
      {
        type: 'move_keyframe',
        origin: 'inferred',
        target: 'Arm_R-P_ROTATION',
        property: 'frame',
        frame: null,
        before: { frame: 12, value: -35 },
        after: { frame: 18, value: -35 }
      },
      {
        type: 'shift_exposure',
        origin: 'inferred',
        target: 'Top/RIG/Hand_R',
        property: 'exposure',
        frame: null,
        before: { delta: 0 },
        after: { delta: 2 }
      }
    ]);

    expect(stopped.summary.nodesChanged).toEqual(['Top/Camera', 'Top/RIG/Arm_R-P', 'Top/RIG/Hand_R']);
    expect(stopped.summary.columnsChanged).toEqual(['Arm_R-P_ROTATION']);
    expect(stopped.summary.originCounts).toEqual({ harmony_manual: 4, inferred: 2 });
    expect(stopped.patch.fullyReversible).toBe(true);
    // Scrubbing the playhead from frame 12 to 18 is not an edit and must not appear.
    expect(stopped.patch.operations.some(o => o.property === 'sceneSettings.currentFrame')).toBe(false);
  });

  it('writes every declared artifact into the immutable evidence directory', () => {
    const store = new CaptureSessionStore(artifactRoot, sessionId);
    for (const artifact of [
      SESSION_ARTIFACTS.session,
      SESSION_ARTIFACTS.instruction,
      SESSION_ARTIFACTS.sceneBefore,
      SESSION_ARTIFACTS.events,
      SESSION_ARTIFACTS.sceneAfter,
      SESSION_ARTIFACTS.scenePatch,
      SESSION_ARTIFACTS.inversePatch,
      SESSION_ARTIFACTS.environment,
      SESSION_ARTIFACTS.executionReport,
      SESSION_ARTIFACTS.hashes
    ]) {
      expect(fs.existsSync(store.artifactPath(artifact))).toBe(true);
    }

    // Both states validate and their stored hashes still match their content.
    expect(() => verifySceneState(store.readJson(SESSION_ARTIFACTS.sceneBefore))).not.toThrow();
    expect(() => verifySceneState(store.readJson(SESSION_ARTIFACTS.sceneAfter))).not.toThrow();

    // No render was executed and none is claimed.
    const report = store.readJson<any>(SESSION_ARTIFACTS.executionReport);
    expect(report.renderStatus).toBe('not_executed');
    expect(report.realHarmonyStatus).toBe('not_attempted');
    expect(fs.readdirSync(store.sessionDir).filter(f => /\.(png|jpg|mp4|mov)$/i.test(f))).toEqual([]);
  });

  it('carries an invertible patch as data', () => {
    const store = new CaptureSessionStore(artifactRoot, sessionId);
    const inverse = store.readJson<any>(SESSION_ARTIFACTS.inversePatch);

    expect(inverse.operations).toHaveLength(6);
    const inverseShift = inverse.operations.find((o: any) => o.type === 'shift_exposure');
    expect(inverseShift.after).toEqual({ delta: -2 });
    const inverseMove = inverse.operations.find((o: any) => o.type === 'move_keyframe');
    expect(inverseMove.before).toEqual({ frame: 18, value: -35 });
    expect(inverseMove.after).toEqual({ frame: 12, value: -35 });
  });

  it('exports a dataset entry usable as a training example', () => {
    recorder.decide({
      sessionId,
      decision: 'approved',
      reviewer: 'supervisor-01',
      note: 'Accent now lands on 18 and the swing reads softer.',
      qualityTags: ['timing', 'on_model']
    });

    const entry = recorder.exportDatasetEntry(sessionId);

    expect(entry.kind).toBe('HarmonyActionDatasetEntry');
    expect(entry.instruction.text).toBe(INSTRUCTION);
    expect(entry.instruction.language).toBe('ru');
    expect(entry.beforeState.file).toBe(SESSION_ARTIFACTS.sceneBefore);
    expect(entry.afterState.file).toBe(SESSION_ARTIFACTS.sceneAfter);
    expect(entry.operations).toHaveLength(6);
    expect(entry.inverseOperations).toHaveLength(6);
    expect(entry.approval.decision).toBe('approved');
    expect(entry.approval.reviewer).toBe('supervisor-01');
    expect(entry.provenance.originCounts).toEqual({ harmony_manual: 4, inferred: 2 });
    expect(entry.provenance.recorderVersion).toBe('harmony-action-recorder/1.0.0');

    // Honesty guarantees a consumer can rely on.
    expect(entry.provenance.originCounts.mcp_tool).toBeUndefined();
    expect(entry.usageRestrictions.interpretationLimits.join(' ')).toContain('artistic goal');
    expect(entry.usageRestrictions.interpretationLimits.join(' ')).toContain('offline fixture provider');
    expect(entry.renderStatus).toBe('not_executed');
    expect(entry.notCaptured).toContain('palettes');
    expect(entry.notCaptured).toContain('deformer_chains');

    // The raw scene path never leaves the machine.
    expect(JSON.stringify(entry)).not.toContain(SCENE_PATH);

    // The entry is reproducible on disk.
    const store = new CaptureSessionStore(artifactRoot, sessionId);
    expect(store.readJson<any>(SESSION_ARTIFACTS.datasetEntry).deterministicHash).toBe(entry.deterministicHash);
  });

  it('re-running the same fixture pair yields a byte-identical patch hash', async () => {
    const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-capture-e2e2-'));
    try {
      const second = new HarmonyActionRecorder(loadRecorderConfig({ artifactRoot: secondRoot, debounceMs: 0 }));
      const started = await second.start({
        scenePath: SCENE_PATH,
        sceneId: 'ep01_sc012_arm_swing',
        provider: new FixtureSceneStateProvider({ statePaths: [BEFORE_FIXTURE, AFTER_FIXTURE] })
      });
      const stopped = await second.stop(started.session.sessionId);

      const first = new CaptureSessionStore(artifactRoot, sessionId).readJson<any>(SESSION_ARTIFACTS.scenePatch);
      expect(stopped.patch.deterministicHash).toBe(first.deterministicHash);
    } finally {
      fs.rmSync(secondRoot, { recursive: true, force: true });
    }
  });
});
