import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  validMohoCharacterBible,
  validMohoQaThresholds
} from '../fixtures/mohoShowBible.valid';
// @ts-ignore — pre-existing TS errors in mohoRetakeDataset source (see repo convention).
import { MohoRetakeDatasetStore } from '../../src/services/mohoRetakeDataset/index.js';
import { MohoActionRecorder } from '../../src/services/mohoActionRecorder/index.js';
import { MohoRetakeTranslator } from '../../src/services/mohoRetakeTranslator/index.js';
import { MohoQaGate } from '../../src/services/mohoQaGate/index.js';
import { MohoRetakeEngine } from '../../src/services/mohoRetakeEngine/index.js';
import {
  mohoDatasetEntrySchema,
  type MohoDatasetEntry
} from '../../src/schemas/mohoRetakeDataset.js';
import {
  mohoRetakeManifestSchema,
  type MohoRetakeManifest
} from '../../src/schemas/mohoRetakeManifest.js';
import { mohoPerformancePirSchema, type MohoPerformancePir } from '../../src/schemas/mohoPerformancePir.js';
import type { MohoCharacterBible } from '../../src/schemas/mohoCharacterBible.js';
import type { MohoQaThresholds } from '../../src/schemas/mohoQaThresholds.js';

const VALID_DATE = '2026-01-01T00:00:00.000Z';

function makePir(overrides: Partial<MohoPerformancePir> = {}): MohoPerformancePir {
  return mohoPerformancePirSchema.parse({
    schemaVersion: '1.0',
    performanceId: 'perf_test_001',
    rigType: 'humanoid_2leg',
    shotManifestRef: 'shot_test_001',
    mohoShowBibleRef: 'show_test_001',
    boneKeys: [],
    switchKeys: [],
    smartBoneActions: [],
    cameraKeys: [],
    fxKeys: [],
    deterministicFingerprint: 'a'.repeat(64),
    provenance: { compiledAt: VALID_DATE, compilerVersion: 'test/1.0' },
    ...overrides
  });
}

function makeManifest(overrides: Partial<MohoRetakeManifest> = {}): MohoRetakeManifest {
  return mohoRetakeManifestSchema.parse({
    schemaVersion: '1.0',
    retakeId: 'rtk_perf_before_perf_after',
    sourcePerformanceId: 'perf_after',
    sourceMohoCommandPlanId: 'mcp_perf_after',
    rigType: 'humanoid_2leg',
    patches: [
      {
        patchId: 'rtp_0001',
        targetRigType: 'humanoid_2leg',
        boneId: 0,
        boneName: 'head_root',
        channel: 'rotation',
        frame: 12,
        newValue: 1.5,
        interpolation: 'ease_in_out',
        note: 'test patch',
        recordedBy: 'test/1.0',
        recordedAt: VALID_DATE
      }
    ],
    severity: 'low',
    autoApplicable: true,
    provenance: {
      recordedBy: 'test/1.0',
      recordedAt: VALID_DATE
    },
    ...overrides
  });
}

function makeEntry(overrides: Partial<MohoDatasetEntry> = {}): MohoDatasetEntry {
  return mohoDatasetEntrySchema.parse({
    entryId: 'entry_001',
    sessionId: 'session_001',
    shotId: 'shot_001',
    rigType: 'humanoid_2leg',
    intent: 'manual_fix',
    retakeManifest: makeManifest(),
    notes: '',
    recordedAt: VALID_DATE,
    recordedBy: 'test-artist',
    provenance: {
      beforePerformanceId: 'perf_before',
      afterPerformanceId: 'perf_after'
    },
    ...overrides
  });
}

function makeBadBonePir(characterBible: MohoCharacterBible): MohoPerformancePir {
  const now = VALID_DATE;
  return mohoPerformancePirSchema.parse({
    schemaVersion: '1.0',
    performanceId: 'MOHO-BADBONE01234567',
    rigType: characterBible.rigType,
    shotManifestRef: 'shot_recorder_loop',
    mohoShowBibleRef: characterBible.characterId,
    boneKeys: [
      { boneId: 999, boneName: 'orphan_unknown_bone', channel: 'rotation', frame: 1, value: 0, interpolation: 'ease_in_out' },
      { boneId: 999, boneName: 'orphan_unknown_bone', channel: 'rotation', frame: 2, value: 5, interpolation: 'ease_in_out' }
    ],
    switchKeys: [],
    smartBoneActions: [],
    cameraKeys: [],
    fxKeys: [],
    deterministicFingerprint: 'c'.repeat(64),
    provenance: { compiledAt: now, compilerVersion: 'moho-pir-compiler-v1' }
  });
}

function makeOkRender(): Parameters<MohoQaGate['evaluate']>[0]['renderResult'] {
  return {
    jobId: 'render_recorder_loop',
    status: 'dry_run',
    detectedMohoPath: null,
    commandLine: '<dry-run>',
    outputDir: '/tmp/dryrun',
    renderedFiles: [],
    totalFrames: 24,
    durationMs: 0,
    fps: 24,
    resolution: { width: 1920, height: 1080 },
    codec: null,
    qaFindings: [],
    exitCode: 0
  };
}

describe('MohoRecorderLoop integration (SPRINT 5)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-recorder-loop-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('1. Recorder -> Translator loop: derived patches match translator patches for same diff', () => {
    const characterBible = validMohoCharacterBible();
    const beforePir = mohoPerformancePirSchema.parse({
      schemaVersion: '1.0',
      performanceId: 'MOHO-BEFORE01234567',
      rigType: 'humanoid_2leg',
      shotManifestRef: 'shot_rec_translator',
      mohoShowBibleRef: characterBible.characterId,
      boneKeys: [
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 1, value: 0, interpolation: 'ease_in_out' },
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 12, value: 1.0, interpolation: 'ease_in_out' },
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 24, value: 2.0, interpolation: 'ease_in_out' }
      ],
      switchKeys: [],
      smartBoneActions: [],
      cameraKeys: [],
      fxKeys: [],
      deterministicFingerprint: 'd'.repeat(64),
      provenance: { compiledAt: VALID_DATE, compilerVersion: 'moho-pir-compiler-v1' }
    });

    const afterPir = mohoPerformancePirSchema.parse({
      schemaVersion: '1.0',
      performanceId: 'MOHO-AFTER0123456789',
      rigType: 'humanoid_2leg',
      shotManifestRef: 'shot_rec_translator',
      mohoShowBibleRef: characterBible.characterId,
      boneKeys: [
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 1, value: 0, interpolation: 'ease_in_out' },
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 12, value: 4.5, interpolation: 'ease_in_out' },
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 24, value: 2.0, interpolation: 'ease_in_out' }
      ],
      switchKeys: [],
      smartBoneActions: [],
      cameraKeys: [],
      fxKeys: [],
      deterministicFingerprint: 'e'.repeat(64),
      provenance: { compiledAt: VALID_DATE, compilerVersion: 'moho-pir-compiler-v1' }
    });

    const recorder = new MohoActionRecorder({
      evidenceDir: tmpDir,
      sessionId: 'sess_rec_translator',
      shotId: 'shot_rec_translator',
      rigType: 'humanoid_2leg',
      operatorId: 'integration-op-1'
    });
    recorder.start();
    recorder.recordInstruction({ type: 'snapshot_before', frame: 1, note: 'before capture' });
    recorder.captureFrameState(1);
    recorder.recordInstruction({ type: 'snapshot_after', frame: 12, note: 'after capture' });
    recorder.captureFrameState(12);

    const sessionId = recorder.getSession().sessionId;
    const derived = MohoActionRecorder.derivePatchFromBeforeAfter(
      beforePir,
      afterPir,
      sessionId,
      'integration-op-1'
    );

    const translatorResult = new MohoRetakeTranslator().translate({
      shotId: 'shot_rec_translator',
      beforePerformanceId: beforePir.performanceId,
      afterPerformanceId: afterPir.performanceId,
      beforePir,
      afterPir,
      rigType: 'humanoid_2leg',
      recordedBy: 'integration-op-1',
      notes: 'integration-translator-loop'
    });

    const derivedPatchFrames = derived.patches
      .map(p => `${p.boneId}:${p.channel}:${p.frame}:${p.newValue}`)
      .sort();
    const translatorPatchFrames = translatorResult.retake.patches
      .map(p => `${p.boneId}:${p.channel}:${p.frame}:${p.newValue}`)
      .sort();

    expect(derived.patches.length).toBeGreaterThan(0);
    expect(translatorResult.retake.patches.length).toBeGreaterThan(0);
    expect(derivedPatchFrames).toEqual(translatorPatchFrames);
    expect(derived.patches[0].boneName).toBe('head_root');
    expect(translatorResult.retake.patches[0].boneName).toBe('head_root');

    recorder.addRetakePatch(derived, 'integration-recorder-loop');
    recorder.stop();
    recorder.commit();

    const stored = recorder.listPatches();
    expect(stored.length).toBe(1);
    expect(stored[0].retakeManifest.patches.length).toBe(derived.patches.length);
    expect(fs.existsSync(path.join(tmpDir, sessionId, 'patches.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, sessionId, 'session.json'))).toBe(true);
  });

  it('2. 5 retake-patches determinism: roundtrip preserves all entries + fingerprints', () => {
    const storePath = path.join(tmpDir, 'retakes-5.json');
    const store = new MohoRetakeDatasetStore(storePath);

    const sessionId = 'sess_det_5';
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry({
        entryId: `entry_det_${(i + 1).toString().padStart(2, '0')}`,
        sessionId,
        shotId: `shot_det_${(i + 1).toString().padStart(2, '0')}`,
        rigType: 'humanoid_2leg',
        intent: 'manual_fix',
        recordedAt: VALID_DATE,
        notes: `determinism entry #${i + 1}`
      })
    );

    let dataset = MohoRetakeDatasetStore.createEmpty('prod_det_5', 'humanoid_2leg', 'integration-curator');
    store.save(dataset);
    for (const entry of entries) dataset = store.addEntry(entry);

    expect(dataset.entries.length).toBe(5);
    const originalFingerprint = dataset.fingerprint;

    const reloaded = new MohoRetakeDatasetStore(storePath).load();
    expect(reloaded.entries.length).toBe(5);
    expect(reloaded.fingerprint).toBe(originalFingerprint);

    const originalIds = entries.map(e => e.entryId).sort();
    const reloadedIds = reloaded.entries.map(e => e.entryId).sort();
    expect(reloadedIds).toEqual(originalIds);

    for (const originalEntry of entries) {
      const match = reloaded.entries.find(e => e.entryId === originalEntry.entryId);
      expect(match).toBeDefined();
      expect(match!.shotId).toBe(originalEntry.shotId);
      expect(match!.retakeManifest.retakeId).toBe(originalEntry.retakeManifest.retakeId);
      expect(match!.retakeManifest.patches[0].patchId).toBe(originalEntry.retakeManifest.patches[0].patchId);
      expect(match!.notes).toBe(originalEntry.notes);
    }

    expect(store.count()).toBe(5);
  });

  it('3. Auto-apply loop: 3 low-severity patches auto-apply, persist and survive reload', () => {
    const thresholds: MohoQaThresholds = validMohoQaThresholds();
    const characterBible = validMohoCharacterBible();

    const rec = new MohoActionRecorder({
      evidenceDir: tmpDir,
      sessionId: 'sess_auto_apply',
      shotId: 'shot_auto_apply',
      rigType: 'humanoid_2leg',
      operatorId: 'integration-auto-op'
    });
    rec.start();

    const lowManifests: MohoRetakeManifest[] = [];
    for (let i = 0; i < 3; i += 1) {
      const manifest = makeManifest({
        retakeId: `rtk_auto_apply_${i + 1}`,
        sourcePerformanceId: `perf_auto_${i + 1}`,
        sourceMohoCommandPlanId: `mcp_auto_${i + 1}`,
        severity: 'low',
        autoApplicable: true,
        patches: [
          {
            patchId: `rtp_auto_${(i + 1).toString().padStart(4, '0')}`,
            targetRigType: 'humanoid_2leg',
            boneId: 0,
            boneName: 'head_root',
            channel: 'rotation',
            frame: 5 * (i + 1),
            newValue: 0.5 * (i + 1),
            interpolation: 'ease_in_out',
            note: `auto-apply patch #${i + 1}`,
            recordedBy: 'integration-auto-op',
            recordedAt: VALID_DATE
          }
        ],
        provenance: { recordedBy: 'integration-auto-op', recordedAt: VALID_DATE }
      });
      lowManifests.push(manifest);

      const retakeForCheck: Parameters<typeof MohoRetakeEngine.canAutoApply>[0] = {
        retakeId: manifest.retakeId,
        patches: manifest.patches,
        severity: 'low',
        autoApplicable: false,
        requiresHumanApproval: false,
        fingerprint: 'placeholder'
      };
      const decision = MohoRetakeEngine.canAutoApply(retakeForCheck, thresholds);
      expect(decision.canAutoApply).toBe(true);
      expect(decision.reasons).toEqual([]);

      rec.addRetakePatch(manifest, `auto-apply retake #${i + 1}`);
    }

    rec.stop();
    rec.commit();

    const storePath = path.join(tmpDir, 'retakes-auto.json');
    const store = new MohoRetakeDatasetStore(storePath);
    let dataset = MohoRetakeDatasetStore.createEmpty('prod_auto_apply', 'humanoid_2leg', 'integration-curator');
    store.save(dataset);
    for (let i = 0; i < lowManifests.length; i += 1) {
      const entry = makeEntry({
        entryId: `entry_auto_${(i + 1).toString().padStart(2, '0')}`,
        sessionId: rec.getSession().sessionId,
        shotId: 'shot_auto_apply',
        rigType: 'humanoid_2leg',
        intent: 'auto_retake',
        retakeManifest: lowManifests[i],
        notes: `persisted auto-apply retake #${i + 1}`,
        recordedAt: VALID_DATE,
        provenance: {
          beforePerformanceId: `perf_auto_${i + 1}_before`,
          afterPerformanceId: `perf_auto_${i + 1}_after`
        }
      });
      dataset = store.addEntry(entry);
    }

    expect(dataset.entries.length).toBe(3);
    const reloaded = new MohoRetakeDatasetStore(storePath).load();
    expect(reloaded.entries.length).toBe(3);

    for (let i = 0; i < reloaded.entries.length; i += 1) {
      const entry = reloaded.entries[i];
      const retakeForCheck: Parameters<typeof MohoRetakeEngine.canAutoApply>[0] = {
        retakeId: entry.retakeManifest.retakeId,
        patches: entry.retakeManifest.patches,
        severity: entry.retakeManifest.severity,
        autoApplicable: false,
        requiresHumanApproval: false,
        fingerprint: 'placeholder'
      };
      const decision = MohoRetakeEngine.canAutoApply(retakeForCheck, thresholds);
      expect(decision.canAutoApply).toBe(true);
      expect(entry.retakeManifest.severity).toBe('low');
      expect(entry.intent).toBe('auto_retake');
    }

    expect(characterBible.controllers.length).toBeGreaterThan(0);
  });

  it('4. QA -> retake translation: gate finds bad bone and translator produces patches for the same finding', () => {
    const characterBible = validMohoCharacterBible();
    const pir = makeBadBonePir(characterBible);
    const thresholds = validMohoQaThresholds();

    const qaResult = new MohoQaGate().evaluate({
      shotId: 'shot_qa_retake_xlate',
      renderResult: makeOkRender(),
      pir,
      thresholds,
      characterBible: {
        characterId: characterBible.characterId,
        bones: characterBible.controllers.map(c => ({
          boneId: c.boneId,
          boneName: c.boneName
        }))
      }
    });

    const orphanFindings = qaResult.findings.filter(f => f.check === 'orphan_bone_key');
    expect(orphanFindings.length).toBeGreaterThan(0);
    expect(qaResult.overallStatus).not.toBe('pass');

    const beforePir = makePir({
      performanceId: 'MOHO-QABEFORE0123456',
      shotManifestRef: 'shot_qa_retake_xlate',
      mohoShowBibleRef: characterBible.characterId,
      boneKeys: pir.boneKeys.map(k => ({ ...k, value: k.value }))
    });
    const afterPir = makePir({
      performanceId: 'MOHO-QAAFTER01234567',
      shotManifestRef: 'shot_qa_retake_xlate',
      mohoShowBibleRef: characterBible.characterId,
      boneKeys: pir.boneKeys.map(k => ({ ...k, value: Math.max(0, k.value - 3) }))
    });

    const translatorResult = new MohoRetakeTranslator().translate({
      shotId: 'shot_qa_retake_xlate',
      beforePerformanceId: beforePir.performanceId,
      afterPerformanceId: afterPir.performanceId,
      beforePir,
      afterPir,
      rigType: 'humanoid_2leg',
      recordedBy: 'integration-qa-xlate',
      notes: 'qa-retake-translation'
    });

    expect(translatorResult.retake.patches.length).toBeGreaterThan(0);
    const orphanBoneName = pir.boneKeys[0].boneName;
    const translatorPatchesForBone = translatorResult.retake.patches.filter(
      p => p.boneId === pir.boneKeys[0].boneId || p.boneName === orphanBoneName
    );
    expect(translatorPatchesForBone.length).toBeGreaterThan(0);
    expect(translatorResult.retake.severity).not.toBe('high');

    const autoDecision = MohoRetakeEngine.canAutoApply(
      {
        retakeId: translatorResult.retake.retakeId,
        patches: translatorResult.retake.patches,
        severity: translatorResult.retake.severity,
        autoApplicable: translatorResult.retake.autoApplicable,
        requiresHumanApproval: translatorResult.requiresHumanApproval,
        fingerprint: translatorResult.retake.provenance.recordedBy
      },
      thresholds
    );
    expect(typeof autoDecision.canAutoApply).toBe('boolean');
    expect(Array.isArray(autoDecision.reasons)).toBe(true);

    const retakeEngineOutput = new MohoRetakeEngine().generatePatches({
      pir,
      characterBible,
      qaResult,
      thresholds
    });
    expect(retakeEngineOutput).toBeDefined();
    expect(retakeEngineOutput.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('5. Roundtrip dataset: 10 entries added, saved, reloaded, all present with same fingerprint', () => {
    const storePath = path.join(tmpDir, 'retakes-10.json');
    const store = new MohoRetakeDatasetStore(storePath);

    const sessionId = 'sess_roundtrip_10';
    const totalEntries = 10;
    const entries: MohoDatasetEntry[] = [];

    let dataset = MohoRetakeDatasetStore.createEmpty('prod_roundtrip_10', 'humanoid_2leg', 'integration-curator');
    store.save(dataset);
    for (let i = 0; i < totalEntries; i += 1) {
      const entry = makeEntry({
        entryId: `entry_rt_${(i + 1).toString().padStart(2, '0')}`,
        sessionId,
        shotId: `shot_rt_${(i + 1).toString().padStart(2, '0')}`,
        rigType: 'humanoid_2leg',
        intent: i % 2 === 0 ? 'manual_fix' : 'composite',
        notes: `roundtrip entry #${i + 1}`,
        recordedAt: VALID_DATE,
        provenance: {
          beforePerformanceId: `perf_rt_${(i + 1).toString().padStart(2, '0')}_before`,
          afterPerformanceId: `perf_rt_${(i + 1).toString().padStart(2, '0')}_after`
        }
      });
      entries.push(entry);
      dataset = store.addEntry(entry);
    }

    expect(dataset.entries.length).toBe(totalEntries);
    const persistedFingerprint = dataset.fingerprint;

    const freshStore = new MohoRetakeDatasetStore(storePath);
    const reloaded = freshStore.load();
    expect(reloaded.entries.length).toBe(totalEntries);
    expect(reloaded.fingerprint).toBe(persistedFingerprint);

    const originalIds = entries.map(e => e.entryId).sort();
    const reloadedIds = reloaded.entries.map(e => e.entryId).sort();
    expect(reloadedIds).toEqual(originalIds);

    for (const originalEntry of entries) {
      const found = reloaded.entries.find(e => e.entryId === originalEntry.entryId);
      expect(found).toBeDefined();
      expect(found!.sessionId).toBe(originalEntry.sessionId);
      expect(found!.shotId).toBe(originalEntry.shotId);
      expect(found!.intent).toBe(originalEntry.intent);
      expect(found!.notes).toBe(originalEntry.notes);
      expect(found!.provenance.beforePerformanceId).toBe(originalEntry.provenance.beforePerformanceId);
      expect(found!.provenance.afterPerformanceId).toBe(originalEntry.provenance.afterPerformanceId);
    }

    expect(freshStore.count()).toBe(totalEntries);
    expect(fs.existsSync(storePath)).toBe(true);
  });

  it('6. Continuity ledger aggregation: query by character returns correct subsets + totals', () => {
    const storePath = path.join(tmpDir, 'retakes-continuity.json');
    const store = new MohoRetakeDatasetStore(storePath);

    let dataset = MohoRetakeDatasetStore.createEmpty('prod_continuity', 'humanoid_2leg', 'integration-curator');
    store.save(dataset);

    const sessionId = 'sess_continuity_ledger';
    for (let i = 0; i < 5; i += 1) {
      dataset = store.addEntry(makeEntry({
        entryId: `entry_h_${(i + 1).toString().padStart(2, '0')}`,
        sessionId,
        shotId: `shot_h_${(i + 1).toString().padStart(2, '0')}`,
        rigType: 'humanoid_2leg',
        intent: 'manual_fix',
        recordedAt: VALID_DATE,
        notes: `humanoid retake #${i + 1}`,
        provenance: {
          beforePerformanceId: `perf_h_${(i + 1).toString().padStart(2, '0')}_before`,
          afterPerformanceId: `perf_h_${(i + 1).toString().padStart(2, '0')}`
        }
      }));
    }

    for (let i = 0; i < 3; i += 1) {
      dataset = store.addEntry(makeEntry({
        entryId: `entry_q_${(i + 1).toString().padStart(2, '0')}`,
        sessionId,
        shotId: `shot_q_${(i + 1).toString().padStart(2, '0')}`,
        rigType: 'quadruped',
        intent: 'manual_fix',
        recordedAt: VALID_DATE,
        notes: `quadruped retake #${i + 1}`,
        provenance: {
          beforePerformanceId: `perf_q_${(i + 1).toString().padStart(2, '0')}_before`,
          afterPerformanceId: `perf_q_${(i + 1).toString().padStart(2, '0')}`
        }
      }));
    }

    expect(dataset.entries.length).toBe(8);

    const humanoidEntries = store.queryByRigType('humanoid_2leg');
    const quadrupedEntries = store.queryByRigType('quadruped');

    expect(humanoidEntries.length).toBe(5);
    expect(quadrupedEntries.length).toBe(3);

    expect(humanoidEntries.every(e => e.rigType === 'humanoid_2leg')).toBe(true);
    expect(quadrupedEntries.every(e => e.rigType === 'quadruped')).toBe(true);

    const humanoidShotIds = new Set(humanoidEntries.map(e => e.shotId));
    expect(humanoidShotIds.size).toBe(5);
    for (let i = 1; i <= 5; i += 1) {
      expect(humanoidShotIds.has(`shot_h_${i.toString().padStart(2, '0')}`)).toBe(true);
    }

    const quadrupedShotIds = new Set(quadrupedEntries.map(e => e.shotId));
    expect(quadrupedShotIds.size).toBe(3);
    for (let i = 1; i <= 3; i += 1) {
      expect(quadrupedShotIds.has(`shot_q_${i.toString().padStart(2, '0')}`)).toBe(true);
    }

    const totalCount = humanoidEntries.length + quadrupedEntries.length;
    expect(totalCount).toBe(8);
    expect(totalCount).toBe(store.count());
  });
});