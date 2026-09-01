import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { mohoActionRecorderTools } from '../src/tools/mohoActionRecorderTools.js';
import { mohoRetakeDatasetTools } from '../src/tools/mohoRetakeDatasetTools.js';
import { MohoRetakeDatasetStore } from '../src/services/mohoRetakeDataset/index.js';
import {
  mohoPerformancePirSchema,
  type MohoPerformancePir
} from '../src/schemas/mohoPerformancePir.js';
import { mohoDatasetEntrySchema } from '../src/schemas/mohoRetakeDataset.js';
import { mohoRetakeManifestSchema } from '../src/schemas/mohoRetakeManifest.js';
import { MOHO_RETAKE_DATASET_SCHEMA_VERSION } from '../src/schemas/mohoRetakeDataset.js';

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

function makeManifest() {
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
    }
  });
}

function makeEntry(overrides: Record<string, unknown> = {}) {
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

function seedValidEmptyDataset(datasetPath: string, production: string): void {
  const seed = MohoRetakeDatasetStore.createEmpty(production, 'humanoid_2leg', 'test-curator');
  seed.provenance = {
    curator: 'test-curator',
    approvedAt: VALID_DATE
  };
  const valid = {
    schemaVersion: MOHO_RETAKE_DATASET_SCHEMA_VERSION,
    datasetId: seed.datasetId,
    production,
    rigType: 'humanoid_2leg',
    entries: [],
    fingerprint: seed.fingerprint,
    createdAt: VALID_DATE,
    updatedAt: VALID_DATE,
    provenance: {
      curator: 'test-curator',
      approvedAt: VALID_DATE
    }
  };
  fs.mkdirSync(path.dirname(datasetPath), { recursive: true });
  fs.writeFileSync(datasetPath, JSON.stringify(valid, null, 2) + '\n');
}

function tool(list: readonly { name: string; inputSchema: any; handler: (...args: any[]) => any }[], toolName: string) {
  const found = list.find(t => t.name === toolName);
  if (!found) throw new Error(`tool not registered: ${toolName}`);
  return found;
}

async function callTool(
  list: readonly { name: string; inputSchema: any; handler: (...args: any[]) => any }[],
  name: string,
  args: unknown
) {
  const target = tool(list, name);
  const parsed = target.inputSchema.safeParse(args);
  if (!parsed.success) throw new Error(`invalid args for ${name}: ${parsed.error.message}`);
  return target.handler(parsed.data);
}

describe('mohoActionRecorderTools — end-to-end through the tool surface', () => {
  let evidenceDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-recorder-tools-'));
    process.chdir(evidenceDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  });

  it('1. moho.recorder.start_session returns a success envelope with a session', async () => {
    const result = await callTool(mohoActionRecorderTools, 'moho.recorder.start_session', {
      shotId: 'shot_001',
      rigType: 'humanoid_2leg',
      evidenceDir
    });
    expect(result.status).toBe('success');
    expect(result.session).toBeDefined();
    expect(result.session.shotId).toBe('shot_001');
    expect(result.session.rigType).toBe('humanoid_2leg');
    expect(result.session.status).toBe('recording');
    expect(typeof result.session.sessionId).toBe('string');
  });

  it('2. moho.recorder.record_instruction returns a success envelope with an instruction', async () => {
    const started: any = await callTool(mohoActionRecorderTools, 'moho.recorder.start_session', {
      shotId: 'shot_001',
      rigType: 'humanoid_2leg',
      evidenceDir,
      sessionId: 'sess_record_instr'
    });
    const result = await callTool(mohoActionRecorderTools, 'moho.recorder.record_instruction', {
      sessionId: started.session.sessionId,
      evidenceDir,
      type: 'capture_frame',
      frame: 12,
      note: 'Soften the right-arm anticipation.'
    });
    expect(result.status).toBe('success');
    expect(result.instruction).toBeDefined();
    expect(result.instruction.type).toBe('capture_frame');
    expect(result.instruction.frame).toBe(12);
    expect(result.instruction.note).toBe('Soften the right-arm anticipation.');
    expect(typeof result.instruction.instructionId).toBe('string');
  });

  it('3. moho.recorder.capture_frame_state returns a success envelope with an event', async () => {
    const started: any = await callTool(mohoActionRecorderTools, 'moho.recorder.start_session', {
      shotId: 'shot_001',
      rigType: 'humanoid_2leg',
      evidenceDir,
      sessionId: 'sess_capture_frame'
    });
    const result = await callTool(mohoActionRecorderTools, 'moho.recorder.capture_frame_state', {
      sessionId: started.session.sessionId,
      evidenceDir,
      frame: 24
    });
    expect(result.status).toBe('success');
    expect(result.event).toBeDefined();
    expect(result.event.kind).toBe('frame_state');
    expect(result.event.payload.frame).toBe(24);
    expect(typeof result.event.eventId).toBe('string');
  });

  it('4. moho.recorder.add_retake_patch returns a success envelope with an entry', async () => {
    const started: any = await callTool(mohoActionRecorderTools, 'moho.recorder.start_session', {
      shotId: 'shot_001',
      rigType: 'humanoid_2leg',
      evidenceDir,
      sessionId: 'sess_retake_patch'
    });
    const result = await callTool(mohoActionRecorderTools, 'moho.recorder.add_retake_patch', {
      sessionId: started.session.sessionId,
      evidenceDir,
      retakeManifest: makeManifest() as unknown as Record<string, unknown>,
      notes: 'fix the head pose at frame 12'
    });
    expect(result.status).toBe('success');
    expect(result.entry).toBeDefined();
    expect(result.entry.sessionId).toBe(started.session.sessionId);
    expect(result.entry.notes).toBe('fix the head pose at frame 12');
    expect(result.entry.retakeManifest.retakeId).toBe('rtk_perf_before_perf_after');
    expect(typeof result.entry.patchId).toBe('string');
  });

  it('5. moho.recorder.commit_session returns a success envelope with a committed session', async () => {
    const started: any = await callTool(mohoActionRecorderTools, 'moho.recorder.start_session', {
      shotId: 'shot_001',
      rigType: 'humanoid_2leg',
      evidenceDir,
      sessionId: 'sess_commit'
    });
    await callTool(mohoActionRecorderTools, 'moho.recorder.capture_frame_state', {
      sessionId: started.session.sessionId,
      evidenceDir,
      frame: 1
    });
    const sessionPath = path.join(evidenceDir, started.session.sessionId, 'session.json');
    const cfg = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    cfg.status = 'stopped';
    fs.writeFileSync(sessionPath, JSON.stringify(cfg, null, 2));

    const result: any = await callTool(mohoActionRecorderTools, 'moho.recorder.commit_session', {
      sessionId: started.session.sessionId,
      evidenceDir
    });
    expect(result.status).toBe('success');
    expect(result.session).toBeDefined();
    expect(result.session.status).toBe('committed');
    expect(result.session.sessionId).toBe(started.session.sessionId);
  });

  it('6. moho.recorder.abort_session returns a success envelope with an aborted session', async () => {
    const started: any = await callTool(mohoActionRecorderTools, 'moho.recorder.start_session', {
      shotId: 'shot_001',
      rigType: 'humanoid_2leg',
      evidenceDir,
      sessionId: 'sess_abort'
    });
    const result: any = await callTool(mohoActionRecorderTools, 'moho.recorder.abort_session', {
      sessionId: started.session.sessionId,
      evidenceDir
    });
    expect(result.status).toBe('success');
    expect(result.session).toBeDefined();
    expect(result.session.status).toBe('aborted');
    expect(result.session.sessionId).toBe(started.session.sessionId);
  });
});

describe('mohoRetakeDatasetTools — end-to-end through the tool surface', () => {
  let tmpDir: string;
  let datasetPath: string;
  let ledgerPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-retake-tools-'));
    datasetPath = path.join(tmpDir, 'retakes.json');
    ledgerPath = path.join(tmpDir, 'moho_continuity.json');
    fs.mkdirSync(path.join(tmpDir, 'production_alpha'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('7. moho.retake_dataset.load on a nonexistent file returns a success envelope with an empty dataset', async () => {
    const missingPath = path.join(tmpDir, 'does-not-exist.json');
    const result: any = await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.load', {
      datasetPath: missingPath
    });
    expect(result.status).toBe('success');
    expect(result.dataset).toBeDefined();
    expect(result.dataset.entries).toEqual([]);
    expect(result.dataset.fingerprint).toMatch(/^sha256:/);
  });

  it('8. moho.retake_dataset.add_entry grows the dataset', async () => {
    seedValidEmptyDataset(datasetPath, 'production_alpha');
    const initial: any = await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.load', {
      datasetPath
    });
    expect(initial.status).toBe('success');
    expect(initial.dataset.entries.length).toBe(0);

    const first: any = await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.add_entry', {
      datasetPath,
      entry: makeEntry({ entryId: 'entry_alpha' }) as unknown as Record<string, unknown>
    });
    expect(first.status).toBe('success');
    expect(first.dataset.entries.length).toBe(1);

    const second: any = await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.add_entry', {
      datasetPath,
      entry: makeEntry({ entryId: 'entry_beta', shotId: 'shot_002' }) as unknown as Record<string, unknown>
    });
    expect(second.status).toBe('success');
    expect(second.dataset.entries.length).toBe(2);
    expect(second.dataset.entries.map((e: any) => e.entryId).sort()).toEqual(['entry_alpha', 'entry_beta']);
  });

  it('9. moho.retake_dataset.query_by_rig_type returns matching entries', async () => {
    seedValidEmptyDataset(datasetPath, 'production_alpha');
    await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.add_entry', {
      datasetPath,
      entry: makeEntry({ entryId: 'e1', rigType: 'humanoid_2leg' }) as unknown as Record<string, unknown>
    });
    await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.add_entry', {
      datasetPath,
      entry: makeEntry({ entryId: 'e2', rigType: 'quadruped' }) as unknown as Record<string, unknown>
    });
    await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.add_entry', {
      datasetPath,
      entry: makeEntry({ entryId: 'e3', rigType: 'humanoid_2leg' }) as unknown as Record<string, unknown>
    });

    const result: any = await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.query_by_rig_type', {
      datasetPath,
      rigType: 'humanoid_2leg'
    });
    expect(result.status).toBe('success');
    expect(result.entries.map((e: any) => e.entryId).sort()).toEqual(['e1', 'e3']);
  });

  it('10. moho.retake_dataset.query_by_shot returns matching entries', async () => {
    seedValidEmptyDataset(datasetPath, 'production_alpha');
    await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.add_entry', {
      datasetPath,
      entry: makeEntry({ entryId: 'e1', shotId: 'shot_001' }) as unknown as Record<string, unknown>
    });
    await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.add_entry', {
      datasetPath,
      entry: makeEntry({ entryId: 'e2', shotId: 'shot_002' }) as unknown as Record<string, unknown>
    });
    await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.add_entry', {
      datasetPath,
      entry: makeEntry({ entryId: 'e3', shotId: 'shot_001' }) as unknown as Record<string, unknown>
    });

    const result: any = await callTool(mohoRetakeDatasetTools, 'moho.retake_dataset.query_by_shot', {
      datasetPath,
      shotId: 'shot_001'
    });
    expect(result.status).toBe('success');
    expect(result.entries.map((e: any) => e.entryId).sort()).toEqual(['e1', 'e3']);
  });

  it('11. moho.retake.translate with identical PIRs produces 0 patches', async () => {
    const pir = makePir({
      performanceId: 'perf_shared',
      boneKeys: [
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 5, value: 1.0, interpolation: 'ease_in_out' }
      ]
    });
    const result: any = await callTool(mohoRetakeDatasetTools, 'moho.retake.translate', {
      shotId: 'shot_test_001',
      beforePerformanceId: 'perf_shared',
      afterPerformanceId: 'perf_shared',
      beforePir: pir as unknown as Record<string, unknown>,
      afterPir: pir as unknown as Record<string, unknown>,
      rigType: 'humanoid_2leg',
      recordedBy: 'test-translator/1.0'
    });
    expect(result.status).toBe('success');
    expect(result.retake.patches.length).toBe(0);
  });

  it('12. moho.retake.translate with a delta produces at least 1 patch', async () => {
    const before = makePir({ performanceId: 'perf_before' });
    const after = makePir({
      performanceId: 'perf_after',
      boneKeys: [
        { boneId: 0, boneName: 'head_root', channel: 'rotation', frame: 10, value: 7.5, interpolation: 'ease_in_out' }
      ]
    });
    const result: any = await callTool(mohoRetakeDatasetTools, 'moho.retake.translate', {
      shotId: 'shot_test_001',
      beforePerformanceId: 'perf_before',
      afterPerformanceId: 'perf_after',
      beforePir: before as unknown as Record<string, unknown>,
      afterPir: after as unknown as Record<string, unknown>,
      rigType: 'humanoid_2leg',
      recordedBy: 'test-translator/1.0'
    });
    expect(result.status).toBe('success');
    expect(result.retake.patches.length).toBeGreaterThanOrEqual(1);
  });

  it('13. moho.continuity.append_entry grows the ledger', async () => {
    fs.writeFileSync(
      ledgerPath,
      JSON.stringify({
        schemaVersion: '1.0',
        production: 'production_alpha',
        entries: [],
        fingerprint: 'sha256:0000000000000000000000000000000000000000000000000000000000000000'
      }) + '\n'
    );

    const first: any = await callTool(mohoRetakeDatasetTools, 'moho.continuity.append_entry', {
      ledgerPath,
      entry: {
        shotId: 'shot_001',
        rigType: 'humanoid_2leg',
        characterId: 'char_alpha',
        beforeFingerprint: 'a'.repeat(64),
        afterFingerprint: 'b'.repeat(64),
        retakeCount: 1,
        autoApplicableCount: 1,
        manualFixCount: 0,
        recordedAt: VALID_DATE
      } as unknown as Record<string, unknown>
    });
    expect(first.status).toBe('success');
    expect(first.ledger.entries.length).toBe(1);

    const second: any = await callTool(mohoRetakeDatasetTools, 'moho.continuity.append_entry', {
      ledgerPath,
      entry: {
        shotId: 'shot_002',
        rigType: 'quadruped',
        characterId: 'char_beta',
        beforeFingerprint: 'c'.repeat(64),
        afterFingerprint: 'd'.repeat(64),
        retakeCount: 2,
        autoApplicableCount: 1,
        manualFixCount: 1,
        recordedAt: VALID_DATE
      } as unknown as Record<string, unknown>
    });
    expect(second.status).toBe('success');
    expect(second.ledger.entries.length).toBe(2);
    expect(second.ledger.entries.map((e: any) => e.shotId).sort()).toEqual(['shot_001', 'shot_002']);
  });

  it('14. moho.continuity.query_by_character returns matching entries', async () => {
    fs.writeFileSync(
      ledgerPath,
      JSON.stringify({
        schemaVersion: '1.0',
        production: 'production_alpha',
        entries: [],
        fingerprint: 'sha256:0000000000000000000000000000000000000000000000000000000000000000'
      }) + '\n'
    );
    await callTool(mohoRetakeDatasetTools, 'moho.continuity.append_entry', {
      ledgerPath,
      entry: {
        shotId: 'shot_001',
        rigType: 'humanoid_2leg',
        characterId: 'char_alpha',
        beforeFingerprint: 'a'.repeat(64),
        afterFingerprint: 'b'.repeat(64),
        retakeCount: 1,
        autoApplicableCount: 1,
        manualFixCount: 0,
        recordedAt: VALID_DATE
      } as unknown as Record<string, unknown>
    });
    await callTool(mohoRetakeDatasetTools, 'moho.continuity.append_entry', {
      ledgerPath,
      entry: {
        shotId: 'shot_002',
        rigType: 'quadruped',
        characterId: 'char_beta',
        beforeFingerprint: 'c'.repeat(64),
        afterFingerprint: 'd'.repeat(64),
        retakeCount: 2,
        autoApplicableCount: 1,
        manualFixCount: 1,
        recordedAt: VALID_DATE
      } as unknown as Record<string, unknown>
    });
    await callTool(mohoRetakeDatasetTools, 'moho.continuity.append_entry', {
      ledgerPath,
      entry: {
        shotId: 'shot_003',
        rigType: 'humanoid_2leg',
        characterId: 'char_alpha',
        beforeFingerprint: 'e'.repeat(64),
        afterFingerprint: 'f'.repeat(64),
        retakeCount: 0,
        autoApplicableCount: 0,
        manualFixCount: 1,
        recordedAt: VALID_DATE
      } as unknown as Record<string, unknown>
    });

    const result: any = await callTool(mohoRetakeDatasetTools, 'moho.continuity.query_by_character', {
      ledgerPath,
      characterId: 'char_alpha'
    });
    expect(result.status).toBe('success');
    expect(result.entries.length).toBe(2);
    expect(result.entries.map((e: any) => e.shotId).sort()).toEqual(['shot_001', 'shot_003']);
  });
});