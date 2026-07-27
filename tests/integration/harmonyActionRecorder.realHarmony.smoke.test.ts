/**
 * Real Harmony smoke test for the Harmony Action Recorder.
 *
 * This test never runs by accident. It executes only when BOTH are set:
 *   HARMONY_ACTION_RECORDER_REAL_SMOKE=1
 *   HARMONY_ACTION_RECORDER_REAL_SCENE=<absolute path to a disposable test scene>
 *
 * Behaviour when explicitly requested:
 *   - Harmony reachable  -> capture a real before-state, assert it came from the real bridge.
 *   - Harmony unreachable -> write the runtime's verbatim blocking reason to
 *     docs/evidence/harmony-action-recorder-real-smoke/blocked.json and FAIL. A blocked run
 *     must never be reported as a passing verification.
 *
 * The evidence lives under docs/ so that a blocked or verified result is reviewable in the
 * repository rather than hidden in a gitignored output/ directory. Absolute scene paths are
 * reduced to repo-relative ones before being written.
 *
 * The recorder is read-only, so this test does not modify the scene. Applying a change is a
 * separate, explicitly confirmed step documented in docs/HARMONY_ACTION_RECORDER.md.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { HarmonyActionRecorder } from '../../src/services/harmonyActionRecorder/index.js';
import { loadRecorderConfig } from '../../src/services/harmonyActionRecorder/config.js';
import { HarmonyBridgeSceneStateProvider } from '../../src/services/sceneStateCapture/harmonyBridgeProvider.js';

const REQUESTED = process.env.HARMONY_ACTION_RECORDER_REAL_SMOKE === '1';
const REAL_SCENE = process.env.HARMONY_ACTION_RECORDER_REAL_SCENE;
const EVIDENCE_DIR = path.resolve(process.cwd(), 'docs/evidence/harmony-action-recorder-real-smoke');

/** Keep absolute machine paths out of committed evidence. */
function repoRelative(target?: string): string | undefined {
  if (!target) return target;
  const relative = path.relative(process.cwd(), target);
  return relative.startsWith('..') ? path.basename(target) : relative;
}

function writeEvidence(name: string, payload: unknown): string {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const target = path.join(EVIDENCE_DIR, name);
  fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf-8');
  return target;
}

describe('Harmony Action Recorder — real Harmony smoke test', () => {
  if (!REQUESTED) {
    it.skip('not requested (set HARMONY_ACTION_RECORDER_REAL_SMOKE=1 to run against a real Harmony)', () => {
      /* intentionally skipped: absence of a real run is reported as skipped, never as verified */
    });
    return;
  }

  it('captures a real before-state, or records an exact blocking reason and fails', async () => {
    expect(REAL_SCENE).toBeDefined();
    expect(fs.existsSync(REAL_SCENE!)).toBe(true);

    // Probe with the actual scene, so the reported reason is the one that blocks a real read.
    const provider = new HarmonyBridgeSceneStateProvider(120000, REAL_SCENE!);
    const availability = await provider.describe();

    if (!availability.available) {
      const target = writeEvidence('blocked.json', {
        checkedAt: new Date().toISOString(),
        realHarmonyStatus: 'blocked',
        stateProvider: provider.source,
        scenePath: repoRelative(REAL_SCENE),
        blockingReason: availability.blockingReason,
        platform: `${os.platform()}-${os.arch()}`
      });
      throw new Error(
        `Real Harmony capture is BLOCKED, not verified. Reason: ${availability.blockingReason}. Evidence: ${target}`
      );
    }

    const artifactRoot = path.join(EVIDENCE_DIR, 'captures');
    const recorder = new HarmonyActionRecorder(loadRecorderConfig({ artifactRoot, debounceMs: 250 }));

    let started;
    try {
      started = await recorder.start({
        scenePath: REAL_SCENE!,
        provider,
        sessionId: `real-${Date.now().toString(36)}`
      });
    } catch (error: any) {
      const target = writeEvidence('blocked.json', {
        checkedAt: new Date().toISOString(),
        realHarmonyStatus: 'blocked',
        stateProvider: provider.source,
        scenePath: repoRelative(REAL_SCENE),
        blockingReason: `${error.code ?? 'UNKNOWN'}: ${error.message}`,
        details: error.details
      });
      throw new Error(`Real Harmony capture is BLOCKED, not verified. Evidence: ${target}. ${error.message}`);
    }

    const sessionId = started.session.sessionId;
    recorder.recordInstruction({
      sessionId,
      text: 'Real-runtime smoke capture: read the scene state without modifying it.',
      language: 'en'
    });

    // A real read must be labelled as such, and must actually contain scene structure.
    expect(started.session.source).toBe('harmony_python_bridge');
    expect(started.observedExecutionMode).toBe('real_harmony_bridge');
    expect(started.beforeStateHash).toHaveLength(64);

    const stopped = await recorder.stop(sessionId);
    expect(stopped.executionReport.stateProvider).toBe('harmony_python_bridge');

    writeEvidence('verified.json', {
      checkedAt: new Date().toISOString(),
      realHarmonyStatus: stopped.executionReport.realHarmonyStatus,
      sessionId,
      evidenceDir: repoRelative(started.evidenceDir),
      beforeStateHash: stopped.patch.beforeStateHash,
      afterStateHash: stopped.patch.afterStateHash,
      operationCount: stopped.summary.operationCount,
      warnings: stopped.patch.warnings
    });
  }, 300000);
});
