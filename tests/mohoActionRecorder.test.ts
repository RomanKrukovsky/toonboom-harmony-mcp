import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { MohoActionRecorder } from '../src/services/mohoActionRecorder/index.js';
import { mohoRetakeManifestSchema } from '../src/schemas/mohoRetakeManifest.js';
import { mohoPerformancePirSchema, type MohoPerformancePir } from '../src/schemas/mohoPerformancePir.js';
import { VALID_DATE } from './fixtures/mohoShowBible.valid.js';

function makeEvidenceDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'moho-recorder-test-'));
}

function makeRec(overrides: { dryRun?: boolean; sessionId?: string } = {}): {
  rec: MohoActionRecorder;
  evidenceDir: string;
} {
  const evidenceDir = makeEvidenceDir();
  const rec = new MohoActionRecorder({
    evidenceDir,
    shotId: 'shot_test_recorder_001',
    rigType: 'humanoid_2leg',
    operatorId: 'test-operator',
    sessionId: overrides.sessionId,
    dryRun: overrides.dryRun ?? false
  });
  rec.start();
  return { rec, evidenceDir };
}

function makePir(performanceId: string, boneKeys: MohoPerformancePir['boneKeys']): MohoPerformancePir {
  return mohoPerformancePirSchema.parse({
    schemaVersion: '1.0',
    performanceId,
    rigType: 'humanoid_2leg',
    shotManifestRef: 'shot_test_recorder_001',
    mohoShowBibleRef: 'show_test_v1',
    boneKeys,
    switchKeys: [],
    smartBoneActions: [],
    cameraKeys: [],
    fxKeys: [],
    deterministicFingerprint: 'a'.repeat(64),
    provenance: { compiledAt: VALID_DATE, compilerVersion: 'moho-compiler-v1' }
  });
}

function makeRetakeManifest(retakeId: string, frame = 12) {
  return mohoRetakeManifestSchema.parse({
    schemaVersion: '1.0',
    retakeId,
    sourcePerformanceId: 'perf_before',
    sourceMohoCommandPlanId: 'shot_test_recorder_001',
    rigType: 'humanoid_2leg',
    patches: [
      {
        patchId: 'diffp_0001',
        targetRigType: 'humanoid_2leg',
        boneId: 5,
        boneName: 'Head',
        channel: 'rotation',
        frame,
        newValue: 7.2,
        interpolation: 'ease_in_out',
        note: 'tweak head angle for retake',
        recordedBy: 'test-operator',
        recordedAt: VALID_DATE
      }
    ],
    severity: 'low',
    autoApplicable: false,
    provenance: {
      recordedBy: 'test-operator',
      recordedAt: VALID_DATE
    }
  });
}

describe('MohoActionRecorder', () => {
  let evidenceDir: string;
  let rec: MohoActionRecorder;

  beforeEach(() => {
    const ctx = makeRec();
    evidenceDir = ctx.evidenceDir;
    rec = ctx.rec;
  });

  afterEach(() => {
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  });

  it('1. start() creates evidenceDir + session.json', () => {
    const session = rec.getSession();
    const dir = session.evidenceDir;
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.existsSync(path.join(dir, 'session.json'))).toBe(true);
    const loaded = JSON.parse(fs.readFileSync(path.join(dir, 'session.json'), 'utf-8'));
    expect(loaded.sessionId).toBe(session.sessionId);
    expect(loaded.status).toBe('recording');
  });

  it('2. sessionId is a valid UUID', () => {
    const sessionId = rec.getSession().sessionId;
    expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(MohoActionRecorder.generateSessionId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('3. recordInstruction appends to events.jsonl (via captureFrameState which records + emits)', () => {
    const instr = rec.recordInstruction({ type: 'capture_frame', frame: 1, note: 'test' });
    expect(instr.instructionId).toBe('inst_000001');
    expect(instr.type).toBe('capture_frame');
    expect(instr.frame).toBe(1);
    expect(instr.note).toBe('test');
    const session = rec.getSession();
    expect(session.instructionCount).toBe(1);
    const eventsPath = path.join(evidenceDir, session.sessionId, 'events.jsonl');
    expect(fs.existsSync(eventsPath)).toBe(true);
    rec.captureFrameState(1);
    const lines = fs.readFileSync(eventsPath, 'utf-8').split('\n').filter(l => l.trim().length > 0);
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.kind).toBe('frame_state');
    expect(parsed.payload.frame).toBe(1);
    expect(session.instructionCount).toBeGreaterThanOrEqual(1);
  });

  it('4. captureFrameState produces event with kind="frame_state"', () => {
    const evt = rec.captureFrameState(1);
    expect(evt.kind).toBe('frame_state');
    expect(evt.sessionId).toBe(rec.getSession().sessionId);
    expect((evt.payload as { frame: number }).frame).toBe(1);
    const eventsPath = path.join(evidenceDir, rec.getSession().sessionId, 'events.jsonl');
    const lines = fs.readFileSync(eventsPath, 'utf-8').split('\n').filter(l => l.trim().length > 0);
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.kind).toBe('frame_state');
  });

  it('5. addRetakePatch appends to patches.json', () => {
    const manifest = makeRetakeManifest('rtk_test_001');
    const entry = rec.addRetakePatch(manifest, 'manual retake notes');
    expect(entry.patchId).toBe('patch_000001');
    const patchesPath = path.join(evidenceDir, rec.getSession().sessionId, 'patches.json');
    expect(fs.existsSync(patchesPath)).toBe(true);
    const loaded = JSON.parse(fs.readFileSync(patchesPath, 'utf-8'));
    expect(Array.isArray(loaded)).toBe(true);
    expect(loaded.length).toBe(1);
    expect(loaded[0].retakeManifest.retakeId).toBe('rtk_test_001');
    expect(loaded[0].notes).toBe('manual retake notes');
  });

  it('6. stop / commit / abort transitions set status appropriately', () => {
    const stopped = rec.stop();
    expect(stopped.status).toBe('stopped');

    const committed = rec.commit();
    expect(committed.status).toBe('committed');

    const aborted = new MohoActionRecorder({
      evidenceDir: makeEvidenceDir(),
      shotId: 'shot_test_abort',
      rigType: 'humanoid_2leg',
      operatorId: 'test-operator'
    });
    aborted.start();
    const abortResult = aborted.abort();
    expect(abortResult.status).toBe('aborted');
    expect(() => aborted.stop()).toThrow();
    fs.rmSync(abortResult.evidenceDir, { recursive: true, force: true });
  });

  it('7. determinism — same inputs produce same fingerprint', () => {
    const SHARED_ID = 'fixed-sess-determinism';
    const a = makeRec({ sessionId: SHARED_ID });
    const b = makeRec({ sessionId: SHARED_ID });
    a.rec.captureFrameState(10);
    a.rec.recordInstruction({ type: 'pause', frame: 5, note: 'pause' });
    b.rec.captureFrameState(10);
    b.rec.recordInstruction({ type: 'pause', frame: 5, note: 'pause' });
    a.rec.stop();
    b.rec.stop();
    expect(a.rec.getSession().fingerprint).toBe(b.rec.getSession().fingerprint);
    fs.rmSync(a.evidenceDir, { recursive: true, force: true });
    fs.rmSync(b.evidenceDir, { recursive: true, force: true });
  });

  it('8. listEvents returns an array', () => {
    rec.captureFrameState(1);
    rec.captureFrameState(2);
    const events = rec.listEvents();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(2);
    expect(events[0]!.kind).toBe('frame_state');
    expect(events[1]!.kind).toBe('frame_state');
  });

  it('9. listPatches returns an array', () => {
    rec.addRetakePatch(makeRetakeManifest('rtk_list_001', 4), 'n1');
    rec.addRetakePatch(makeRetakeManifest('rtk_list_002', 8), 'n2');
    const patches = rec.listPatches();
    expect(Array.isArray(patches)).toBe(true);
    expect(patches.length).toBe(2);
    expect(patches[0]!.retakeManifest.retakeId).toBe('rtk_list_001');
    expect(patches[1]!.retakeManifest.retakeId).toBe('rtk_list_002');
  });

  it('10. dryRun mode — session.status="dry_run" after stop', () => {
    const ctx = makeRec({ dryRun: true });
    try {
      ctx.rec.captureFrameState(3);
      const stopped = ctx.rec.stop();
      expect(stopped.status).toBe('dry_run');
      const committed = ctx.rec.commit();
      expect(committed.status).toBe('committed');
    } finally {
      fs.rmSync(ctx.evidenceDir, { recursive: true, force: true });
    }
  });

  it('11. derivePatchFromBeforeAfter diffs two PIRs correctly', () => {
    const before = makePir('perf_before', [
      { boneId: 5, boneName: 'Head', channel: 'rotation', frame: 12, value: 0, interpolation: 'ease_in_out' },
      { boneId: 6, boneName: 'Arm', channel: 'rotation', frame: 24, value: 10, interpolation: 'linear' }
    ]);
    const after = makePir('perf_after', [
      { boneId: 5, boneName: 'Head', channel: 'rotation', frame: 12, value: 7.2, interpolation: 'ease_in_out' },
      { boneId: 6, boneName: 'Arm', channel: 'rotation', frame: 24, value: 10, interpolation: 'linear' },
      { boneId: 7, boneName: 'Leg', channel: 'rotation', frame: 36, value: 5, interpolation: 'ease_out' }
    ]);
    const manifest = MohoActionRecorder.derivePatchFromBeforeAfter(before, after, 'sess_xyz', 'test-operator');
    expect(mohoRetakeManifestSchema.safeParse(manifest).success).toBe(true);
    expect(manifest.rigType).toBe('humanoid_2leg');
    expect(manifest.patches.length).toBe(2);
    const headPatch = manifest.patches.find(p => p.boneName === 'Head');
    expect(headPatch).toBeDefined();
    expect(headPatch!.newValue).toBe(7.2);
    expect(headPatch!.frame).toBe(12);
    const legPatch = manifest.patches.find(p => p.boneName === 'Leg');
    expect(legPatch).toBeDefined();
    expect(legPatch!.newValue).toBe(5);
  });

  it('12. reconstruction — after stop, reading session.json back yields same data', () => {
    rec.captureFrameState(1);
    rec.recordInstruction({ type: 'pause', frame: 5, note: 'checkpoint' });
    rec.addRetakePatch(makeRetakeManifest('rtk_recon', 6), 'reconstruction note');
    rec.stop();
    const sessionPath = path.join(evidenceDir, rec.getSession().sessionId, 'session.json');
    const roundTrip = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    const live = rec.getSession();
    expect(roundTrip.sessionId).toBe(live.sessionId);
    expect(roundTrip.status).toBe('stopped');
    expect(roundTrip.instructionCount).toBe(live.instructionCount);
    expect(roundTrip.patchCount).toBe(live.patchCount);
    expect(roundTrip.fingerprint).toBe(live.fingerprint);
  });
});