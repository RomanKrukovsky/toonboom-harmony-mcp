/**
 * Harmony Action Recorder v1 — offline end-to-end demo.
 *
 * Runs the full workflow against the offline fixtures and leaves a real, inspectable
 * evidence directory under artifacts/harmony-captures/.
 *
 * No Harmony process is involved. Every artifact is labelled source="fixture".
 *
 *   npm run build && npm run demo:capture
 */

import path from 'path';
import { HarmonyActionRecorder } from '../dist/services/harmonyActionRecorder/index.js';
import { loadRecorderConfig } from '../dist/services/harmonyActionRecorder/config.js';
import { FixtureSceneStateProvider } from '../dist/services/sceneStateCapture/fixtureProvider.js';

const root = process.cwd();
const scenePath = path.join(root, 'fixtures/harmony-captures/offline_scene.xstage');
const before = path.join(root, 'fixtures/harmony-captures/scene-before.json');
const after = path.join(root, 'fixtures/harmony-captures/scene-after.json');

const INSTRUCTION = 'Смягчить замах правой руки и перенести акцент с 12-го на 18-й кадр.';

function heading(text) {
  console.log(`\n=== ${text} ===`);
}

async function main() {
  const recorder = new HarmonyActionRecorder(loadRecorderConfig({ debounceMs: 100 }));
  const sessionId = `demo-${Date.now().toString(36)}`;

  heading('1. start');
  const started = await recorder.start({
    scenePath,
    sceneId: 'ep01_sc012_arm_swing',
    sessionId,
    provider: new FixtureSceneStateProvider({ statePaths: [before, after] })
  });
  console.log(`sessionId          : ${started.session.sessionId}`);
  console.log(`execution mode     : ${started.observedExecutionMode}`);
  console.log(`state provider     : ${started.session.source}`);
  console.log(`before state hash  : ${started.beforeStateHash}`);
  console.log(`evidence directory : ${started.evidenceDir}`);
  console.log(`notifier status    : ${started.notifierStatus}`);
  console.log(`not captured in v1 : ${started.session.notCaptured.join(', ')}`);

  heading('2. record_instruction');
  recorder.recordInstruction({ sessionId, text: INSTRUCTION, language: 'ru', author: 'demo-animator' });
  console.log(INSTRUCTION);

  heading('3. notifier signals (hints only — they mark entities dirty)');
  const ingest = recorder.ingestNotifierEvents(sessionId, [
    { signal: 'selectionChanged', targets: [] },
    { signal: 'nodeChanged', targets: ['Top/RIG/Arm_R-P'] },
    { signal: 'columnValuesChanged', targets: ['Arm_R-P_ROTATION'] },
    { signal: 'currentFrameChanged', targets: [] },
    { signal: 'nodeChanged', targets: ['Top/RIG/Hand_R'] }
  ]);
  console.log(`accepted ${ingest.accepted} signals -> ${ingest.dirtyNodes} dirty nodes, ${ingest.dirtyColumns} dirty columns`);

  heading('4. snapshot (debounced)');
  const snapshot = await recorder.snapshot(sessionId);
  console.log(`mode ${snapshot.captureMode}, state hash ${snapshot.stateHash.slice(0, 16)}…`);

  heading('5. stop -> semantic scene patch');
  const stopped = await recorder.stop(sessionId);
  for (const operation of stopped.patch.operations) {
    const target = operation.target.nodePath ?? operation.target.columnName ?? operation.target.kind;
    const at = operation.frame !== undefined ? ` @${operation.frame}` : '';
    console.log(
      `  ${operation.type.padEnd(24)} ${String(operation.origin).padEnd(15)} ${target}${at}` +
        `  ${JSON.stringify(operation.before)} -> ${JSON.stringify(operation.after)}` +
        `  (confidence ${operation.confidence})`
    );
  }
  console.log(`\noperations       : ${stopped.summary.operationCount}`);
  console.log(`origins          : ${JSON.stringify(stopped.summary.originCounts)}`);
  console.log(`nodes changed    : ${stopped.summary.nodesChanged.join(', ')}`);
  console.log(`columns changed  : ${stopped.summary.columnsChanged.join(', ')}`);
  console.log(`frames touched   : ${stopped.summary.framesTouched.join(', ')}`);
  console.log(`patch hash       : ${stopped.patch.deterministicHash}`);
  console.log(`fully reversible : ${stopped.patch.fullyReversible}`);
  console.log(`render status    : ${stopped.executionReport.renderStatus}`);
  console.log(`real Harmony     : ${stopped.executionReport.realHarmonyStatus}`);

  heading('6. approve (immutable, bound to the patch hash)');
  const { approval } = recorder.decide({
    sessionId,
    decision: 'approved',
    reviewer: 'demo-supervisor',
    note: 'Accent now lands on 18 and the swing reads softer.',
    qualityTags: ['timing', 'on_model']
  });
  console.log(`${approval.decision} at ${approval.decidedAt}, patchHash ${approval.patchHash.slice(0, 16)}…`);

  heading('7. export_dataset_entry');
  const entry = recorder.exportDatasetEntry(sessionId);
  console.log(`entryId    : ${entry.entryId}`);
  console.log(`entry hash : ${entry.deterministicHash}`);
  console.log(`operations : ${entry.operations.length} (inverse: ${entry.inverseOperations.length})`);
  console.log('interpretation limits:');
  for (const limit of entry.usageRestrictions.interpretationLimits) console.log(`  - ${limit}`);

  heading('artifacts');
  console.log(started.evidenceDir);
}

main().catch(error => {
  console.error(`\nFAILED: ${error.code ?? 'ERROR'} ${error.message}`);
  process.exit(1);
});
