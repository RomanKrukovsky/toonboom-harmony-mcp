import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

// The mohoRetakeDataset service currently has pre-existing TS errors in its source
// (string-typed rigType not assignable to the enum; redundant prototype check).
// Those errors block the whole suite from compiling under ts-jest. Suppress them
// at the import boundary so we can exercise the runtime behaviour.
// @ts-ignore — pre-existing TS errors in source (see constraint: do not modify source).
import { MohoRetakeDatasetStore } from '../src/services/mohoRetakeDataset/index.js';
import { MohoRetakeTranslator } from '../src/services/mohoRetakeTranslator/index.js';
import {
  mohoRetakeDatasetSchema,
  mohoDatasetEntrySchema,
  MOHO_RETAKE_DATASET_SCHEMA_VERSION
} from '../src/schemas/mohoRetakeDataset.js';
import {
  mohoRetakeManifestSchema,
  type MohoRetakeManifest
} from '../src/schemas/mohoRetakeManifest.js';
import { mohoPerformancePirSchema, type MohoPerformancePir } from '../src/schemas/mohoPerformancePir.js';

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

function makeEntry(
  overrides: Partial<{
    entryId: string;
    sessionId: string;
    shotId: string;
    rigType: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';
    intent: 'manual_fix' | 'auto_retake' | 'composite';
    retakeManifest: MohoRetakeManifest;
    notes: string;
    recordedAt: string;
    recordedBy: string;
    beforePerformanceId: string;
    afterPerformanceId: string;
  }> = {}
) {
  const merged = {
    entryId: 'entry_001',
    sessionId: 'session_001',
    shotId: 'shot_001',
    rigType: 'humanoid_2leg' as const,
    intent: 'manual_fix' as const,
    retakeManifest: makeManifest(),
    notes: '',
    recordedAt: VALID_DATE,
    recordedBy: 'test-artist',
    beforePerformanceId: 'perf_before',
    afterPerformanceId: 'perf_after',
    ...overrides
  };

  return mohoDatasetEntrySchema.parse({
    entryId: merged.entryId,
    sessionId: merged.sessionId,
    shotId: merged.shotId,
    rigType: merged.rigType,
    intent: merged.intent,
    retakeManifest: merged.retakeManifest,
    notes: merged.notes,
    recordedAt: merged.recordedAt,
    recordedBy: merged.recordedBy,
    provenance: {
      beforePerformanceId: merged.beforePerformanceId,
      afterPerformanceId: merged.afterPerformanceId
    }
  });
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

describe('MohoRetakeDatasetStore', () => {
  const cleanupDirs: string[] = [];

  beforeEach(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    for (const dir of cleanupDirs.splice(0)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  });

  it('1. createEmpty returns an empty dataset shell for a given production', () => {
    const dataset = MohoRetakeDatasetStore.createEmpty('prod_test', 'humanoid_2leg', 'test-curator');
    expect(dataset.schemaVersion).toBe(MOHO_RETAKE_DATASET_SCHEMA_VERSION);
    expect(dataset.production).toBe('prod_test');
    expect(dataset.rigType).toBe('humanoid_2leg');
    expect(dataset.entries).toEqual([]);
    expect(dataset.provenance.curator).toBe('test-curator');
    expect(dataset.datasetId).toContain('prod_test');
    expect(typeof dataset.createdAt).toBe('string');
    expect(typeof dataset.updatedAt).toBe('string');
  });

  it('2. load on a nonexistent file returns an honest empty fallback', () => {
    const tmpDir = makeTempDir('moho-retake-ds-empty');
    cleanupDirs.push(tmpDir);
    const store = new MohoRetakeDatasetStore(path.join(tmpDir, 'does-not-exist.json'));
    const dataset = store.load();
    expect(dataset.entries).toEqual([]);
    expect(dataset.fingerprint).toMatch(/^sha256:/);
    expect(dataset.fingerprint.length).toBeGreaterThan('sha256:'.length);
  });

  it('3. addEntry appends and the returned dataset has a recomputed fingerprint', () => {
    const tmpDir = makeTempDir('moho-retake-ds-add');
    cleanupDirs.push(tmpDir);
    const filePath = path.join(tmpDir, 'retakes.json');
    const store = new MohoRetakeDatasetStore(filePath);

    const emptyDataset = store.load();
    const emptyFingerprint = emptyDataset.fingerprint;

    const updated = store.addEntry(makeEntry({ entryId: 'entry_alpha' }));
    expect(updated.entries.length).toBe(1);
    expect(updated.entries[0].entryId).toBe('entry_alpha');
    expect(updated.fingerprint).not.toBe(emptyFingerprint);
    expect(updated.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('4. queryByRigType returns only entries matching the requested rigType', () => {
    const tmpDir = makeTempDir('moho-retake-ds-rig');
    cleanupDirs.push(tmpDir);
    const store = new MohoRetakeDatasetStore(path.join(tmpDir, 'retakes.json'));

    store.addEntry(makeEntry({ entryId: 'e1', rigType: 'humanoid_2leg' }));
    store.addEntry(makeEntry({ entryId: 'e2', rigType: 'quadruped' }));
    store.addEntry(makeEntry({ entryId: 'e3', rigType: 'humanoid_2leg' }));

    const humanoid = store.queryByRigType('humanoid_2leg');
    expect(humanoid.map(e => e.entryId).sort()).toEqual(['e1', 'e3']);
    expect(store.queryByRigType('creature')).toEqual([]);
  });

  it('5. queryByShot returns only entries matching the requested shotId', () => {
    const tmpDir = makeTempDir('moho-retake-ds-shot');
    cleanupDirs.push(tmpDir);
    const store = new MohoRetakeDatasetStore(path.join(tmpDir, 'retakes.json'));

    store.addEntry(makeEntry({ entryId: 'e1', shotId: 'shot_001' }));
    store.addEntry(makeEntry({ entryId: 'e2', shotId: 'shot_002' }));
    store.addEntry(makeEntry({ entryId: 'e3', shotId: 'shot_001' }));

    const shot1 = store.queryByShot('shot_001');
    expect(shot1.map(e => e.entryId).sort()).toEqual(['e1', 'e3']);
    expect(store.queryByShot('shot_missing')).toEqual([]);
  });

  it('6. determinism: identical entries produce identical fingerprints', () => {
    const tmpDirA = makeTempDir('moho-retake-ds-det-a');
    const tmpDirB = makeTempDir('moho-retake-ds-det-b');
    cleanupDirs.push(tmpDirA, tmpDirB);

    const storeA = new MohoRetakeDatasetStore(path.join(tmpDirA, 'retakes.json'));
    const storeB = new MohoRetakeDatasetStore(path.join(tmpDirB, 'retakes.json'));

    storeA.addEntry(makeEntry({ entryId: 'e1' }));
    storeB.addEntry(makeEntry({ entryId: 'e1' }));

    expect(storeA.load().fingerprint).toBe(storeB.load().fingerprint);
  });

  it('7. save/load roundtrip preserves entries and fingerprint exactly', () => {
    const tmpDir = makeTempDir('moho-retake-ds-roundtrip');
    cleanupDirs.push(tmpDir);
    const filePath = path.join(tmpDir, 'retakes.json');
    const store = new MohoRetakeDatasetStore(filePath);

    store.addEntry(makeEntry({ entryId: 'e1' }));
    store.addEntry(makeEntry({ entryId: 'e2' }));
    store.addEntry(makeEntry({ entryId: 'e3' }));

    const written = store.load();
    const reread = new MohoRetakeDatasetStore(filePath).load();

    expect(reread.fingerprint).toBe(written.fingerprint);
    expect(reread.entries.length).toBe(written.entries.length);
    expect(reread.entries.map(e => e.entryId).sort()).toEqual(written.entries.map(e => e.entryId).sort());
    expect(reread.production).toBe(written.production);
  });
});

describe('MohoRetakeTranslator', () => {
  function translatorInput(overrides: Partial<{
    beforePerformanceId: string;
    afterPerformanceId: string;
    beforePir: MohoPerformancePir;
    afterPir: MohoPerformancePir;
  }> = {}) {
    return {
      shotId: 'shot_test_001',
      beforePerformanceId: 'perf_before',
      afterPerformanceId: 'perf_after',
      beforePir: makePir({ performanceId: 'perf_before' }),
      afterPir: makePir({ performanceId: 'perf_after' }),
      rigType: 'humanoid_2leg' as const,
      recordedBy: 'test-translator/1.0',
      ...overrides
    };
  }

  it('8. identical PIRs produce zero patches', () => {
    const pir = makePir({
      performanceId: 'perf_shared',
      boneKeys: [
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 5, value: 1.0, interpolation: 'ease_in_out' }
      ],
      switchKeys: [
        { switchLayerName: 'Mouth', frame: 5, choice: 'A', interpolation: 'step' as const }
      ]
    });
    const result = new MohoRetakeTranslator().translate(
      translatorInput({ beforePerformanceId: 'perf_shared', afterPerformanceId: 'perf_shared', beforePir: pir, afterPir: pir })
    );
    expect(result.retake.patches).toBeDefined();
    expect(result.retake.patches.length).toBe(0);
    expect(result.retake.severity).toBe('low');
  });

  it('9. a bone-key value delta produces exactly one patch with newValue=after', () => {
    const before = makePir({ performanceId: 'perf_before' });
    const after = makePir({
      performanceId: 'perf_after',
      boneKeys: [
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 10, value: 7.5, interpolation: 'ease_in_out' }
      ]
    });
    const result = new MohoRetakeTranslator().translate(
      translatorInput({ beforePir: before, afterPir: after })
    );
    expect(result.retake.patches.length).toBe(1);
    const patch = result.retake.patches[0]!;
    expect(patch.newValue).toBe(7.5);
    expect(patch.boneId).toBe(0);
    expect(patch.boneName).toBe('head_root');
    expect(patch.channel).toBe('rotation');
    expect(patch.frame).toBe(10);
  });

  it('10. a switch-key choice change produces exactly one patch', () => {
    const before = makePir({
      performanceId: 'perf_before',
      switchKeys: [
        { switchLayerName: 'Mouth', frame: 6, choice: 'A', interpolation: 'step' as const }
      ]
    });
    const after = makePir({
      performanceId: 'perf_after',
      switchKeys: [
        { switchLayerName: 'Mouth', frame: 6, choice: 'O', interpolation: 'step' as const }
      ]
    });
    const result = new MohoRetakeTranslator().translate(
      translatorInput({ beforePir: before, afterPir: after })
    );
    expect(result.retake.patches.length).toBe(1);
    const patch = result.retake.patches[0]!;
    expect(patch.frame).toBe(6);
    expect(patch.channel).toBe('opacity');
    expect(patch.interpolation).toBe('step');
  });

  it('11. a smart-bone action change produces exactly one patch', () => {
    const before = makePir({
      performanceId: 'perf_before',
      smartBoneActions: [
        { actionName: 'smile', targetBone: 'mouth_corner', frame: 12, angleDeg: 0, scaleX: 1, scaleY: 1 }
      ]
    });
    const after = makePir({
      performanceId: 'perf_after',
      smartBoneActions: [
        { actionName: 'smile', targetBone: 'mouth_corner', frame: 12, angleDeg: 15, scaleX: 1, scaleY: 1 }
      ]
    });
    const result = new MohoRetakeTranslator().translate(
      translatorInput({ beforePir: before, afterPir: after })
    );
    expect(result.retake.patches.length).toBe(1);
    const patch = result.retake.patches[0]!;
    expect(patch.newValue).toBe(15);
    expect(patch.boneName).toBe('mouth_corner');
    expect(patch.channel).toBe('rotation');
  });

  it('12. multiple deltas across categories yield patches sorted by frame', () => {
    const before = makePir({ performanceId: 'perf_before' });
    const after = makePir({
      performanceId: 'perf_after',
      boneKeys: [
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 20, value: 2.0, interpolation: 'ease_in_out' }
      ],
      switchKeys: [
        { switchLayerName: 'Mouth', frame: 5, choice: 'X', interpolation: 'step' as const }
      ],
      smartBoneActions: [
        { actionName: 'smile', targetBone: 'mouth_corner', frame: 10, angleDeg: 4, scaleX: 1, scaleY: 1 }
      ]
    });
    const result = new MohoRetakeTranslator().translate(
      translatorInput({ beforePir: before, afterPir: after })
    );
    expect(result.retake.patches.length).toBe(3);
    const frames = result.retake.patches.map(p => p.frame);
    const sorted = [...frames].sort((a, b) => a - b);
    expect(frames).toEqual(sorted);
  });

  it('13. severity: 1=low, 6=medium (boundary), 21=high', () => {
    expect(MohoRetakeTranslator.classifySeverity([])).toBe('low');
    expect(MohoRetakeTranslator.classifySeverity(makePatches(1))).toBe('low');
    expect(MohoRetakeTranslator.classifySeverity(makePatches(5))).toBe('low');
    expect(MohoRetakeTranslator.classifySeverity(makePatches(6))).toBe('medium');
    expect(MohoRetakeTranslator.classifySeverity(makePatches(20))).toBe('medium');
    expect(MohoRetakeTranslator.classifySeverity(makePatches(21))).toBe('high');
  });

  it('14. retakeId uses the format rtk_{beforeId}_{afterId}', () => {
    const result = new MohoRetakeTranslator().translate(
      translatorInput({ beforePerformanceId: 'pir_alpha', afterPerformanceId: 'pir_beta' })
    );
    expect(result.retakeId).toBe('rtk_pir_alpha_pir_beta');
    expect(result.retake.retakeId).toBe('rtk_pir_alpha_pir_beta');
  });
});

function makePatches(count: number) {
  const patches = [];
  for (let i = 1; i <= count; i++) {
    patches.push({
      patchId: `rtp_${i.toString().padStart(4, '0')}`,
      targetRigType: 'humanoid_2leg' as const,
      boneId: 0,
      boneName: 'head_root',
      channel: 'rotation' as const,
      frame: i,
      newValue: 1,
      interpolation: 'ease_in_out' as const,
      note: 'test',
      recordedBy: 'test/1.0',
      recordedAt: VALID_DATE
    });
  }
  return patches;
}

describe('mohoRetakeDataset / mohoDatasetEntry schemas', () => {
  it('15. mohoRetakeDatasetSchema accepts a fully populated valid dataset', () => {
    const dataset = MohoRetakeDatasetStore.createEmpty('prod_schema_ok', 'humanoid_2leg', 'curator-ok');
    const parsed = mohoRetakeDatasetSchema.safeParse(dataset);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.production).toBe('prod_schema_ok');
      expect(parsed.data.entries).toEqual([]);
    }
  });

  it('16. mohoRetakeDatasetSchema rejects a payload missing provenance', () => {
    const bad = {
      schemaVersion: '1.0',
      datasetId: 'ds_no_provenance',
      production: 'prod_x',
      entries: [],
      fingerprint: 'sha256:' + '0'.repeat(64),
      createdAt: VALID_DATE,
      updatedAt: VALID_DATE
    };
    const parsed = mohoRetakeDatasetSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it('17. mohoDatasetEntrySchema accepts a fully populated valid entry', () => {
    const entry = makeEntry({ entryId: 'e_schema_ok' });
    const parsed = mohoDatasetEntrySchema.safeParse(entry);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.entryId).toBe('e_schema_ok');
      expect(parsed.data.provenance.beforePerformanceId).toBe('perf_before');
      expect(parsed.data.provenance.afterPerformanceId).toBe('perf_after');
    }
  });
});