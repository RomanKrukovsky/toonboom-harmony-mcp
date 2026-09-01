import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { type MohoRetakeManifest, type MohoRetakePatch } from '../../schemas/mohoRetakeManifest.js';
import { type MohoPerformancePir } from '../../schemas/mohoPerformancePir.js';

export const MOHO_ACTION_RECORDER_VERSION = 'moho-action-recorder-v1';

const DETERMINISTIC_TIMESTAMP = new Date(0).toISOString();

export type MohoRigType = 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';

export type MohoInstructionType =
  | 'capture_frame'
  | 'capture_perframe'
  | 'pause'
  | 'resume'
  | 'snapshot_before'
  | 'snapshot_after'
  | 'apply_retake'
  | 'abort';

export type MohoSessionStatus = 'recording' | 'stopped' | 'aborted' | 'committed' | 'dry_run';

export type MohoRawEventKind = 'bone_set' | 'switch_set' | 'action_set' | 'frame_state';

export interface MohoActionRecorderConfig {
  evidenceDir: string;
  sessionId?: string;
  shotId: string;
  rigType: MohoRigType;
  beforeSnapshotId?: string;
  operatorId?: string;
  dryRun?: boolean;
}

export interface MohoCaptureSession {
  sessionId: string;
  shotId: string;
  rigType: MohoRigType;
  startedAt: string;
  finishedAt?: string;
  status: MohoSessionStatus;
  instructionCount: number;
  patchCount: number;
  evidenceDir: string;
  beforeSnapshotId?: string;
  afterSnapshotId?: string;
  beforePerformanceId?: string;
  afterPerformanceId?: string;
  operatorId: string;
  fingerprint: string;
}

export interface MohoRecorderInstruction {
  instructionId: string;
  type: MohoInstructionType;
  frame: number;
  note: string;
  issuedAt: string;
}

export interface MohoRawEvent {
  eventId: string;
  sessionId: string;
  instructionId: string;
  kind: MohoRawEventKind;
  payload: Record<string, unknown>;
  capturedAt: string;
  fingerprint: string;
}

export interface MohoRecorderPatchEntry {
  patchId: string;
  sessionId: string;
  retakeManifest: MohoRetakeManifest;
  notes: string;
  recordedAt: string;
}

interface MohoBoneKeyLite {
  boneId: number;
  boneName: string;
  channel: 'rotation' | 'translation' | 'scale' | 'opacity';
  frame: number;
  value: number;
  interpolation: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'step';
}

interface MohoSwitchKeyLite {
  switchLayerName: string;
  frame: number;
  choice: string;
  interpolation: 'step';
}

interface MohoSmartBoneActionKeyLite {
  actionName: string;
  targetBone: string;
  frame: number;
  angleDeg: number;
  scaleX: number;
  scaleY: number;
}

interface MohoIpcBridge {
  captureBoneState(frame: number): MohoBoneKeyLite[];
  captureSwitchState(frame: number): MohoSwitchKeyLite[];
  captureActionState(frame: number): MohoSmartBoneActionKeyLite[];
}

function defaultIpcBridge(): MohoIpcBridge {
  return {
    captureBoneState: (_frame: number) => [],
    captureSwitchState: (_frame: number) => [],
    captureActionState: (_frame: number) => []
  };
}

function sha256Of(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function deterministicJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const stringify = (input: unknown): string => {
    if (input === null || typeof input !== 'object') {
      return JSON.stringify(input);
    }
    const obj = input as object;
    if (seen.has(obj)) return JSON.stringify(null);
    seen.add(obj);
    if (Array.isArray(input)) {
      return '[' + input.map(stringify).join(',') + ']';
    }
    const keys = Object.keys(input as Record<string, unknown>).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stringify((input as Record<string, unknown>)[k])).join(',') + '}';
  };
  return stringify(value);
}

function isoNow(): string {
  return DETERMINISTIC_TIMESTAMP;
}

export class MohoActionRecorder {
  private readonly cfg: MohoActionRecorderConfig;
  private readonly sessionId: string;
  private readonly operatorId: string;
  private readonly dryRun: boolean;
  private readonly ipc: MohoIpcBridge;
  private session: MohoCaptureSession;
  private readonly instructions: MohoRecorderInstruction[] = [];
  private readonly events: MohoRawEvent[] = [];
  private readonly patches: MohoRecorderPatchEntry[] = [];
  private instructionCounter = 0;
  private eventCounter = 0;
  private patchCounter = 0;

  constructor(config: MohoActionRecorderConfig, ipc: MohoIpcBridge = defaultIpcBridge()) {
    this.cfg = config;
    this.sessionId = config.sessionId ?? MohoActionRecorder.generateSessionId();
    this.operatorId = config.operatorId ?? 'unknown';
    this.dryRun = Boolean(config.dryRun);
    this.ipc = ipc;
    this.session = {
      sessionId: this.sessionId,
      shotId: config.shotId,
      rigType: config.rigType,
      startedAt: isoNow(),
      status: 'recording',
      instructionCount: 0,
      patchCount: 0,
      evidenceDir: path.join(config.evidenceDir, this.sessionId),
      beforeSnapshotId: config.beforeSnapshotId,
      operatorId: this.operatorId,
      fingerprint: ''
    };
  }

  start(): MohoCaptureSession {
    fs.mkdirSync(this.session.evidenceDir, { recursive: true });
    this.persistSession();
    this.writeArtifact('events.jsonl', '');
    this.writeArtifact('patches.json', JSON.stringify([], null, 2));
    this.refreshFingerprint();
    return this.session;
  }

  recordInstruction(instr: Omit<MohoRecorderInstruction, 'instructionId' | 'issuedAt'>): MohoRecorderInstruction {
    if (this.session.status !== 'recording') {
      throw new Error(`Cannot record instruction: session "${this.sessionId}" status is "${this.session.status}"`);
    }
    this.instructionCounter += 1;
    const instruction: MohoRecorderInstruction = {
      instructionId: `inst_${this.instructionCounter.toString().padStart(6, '0')}`,
      type: instr.type,
      frame: instr.frame,
      note: instr.note,
      issuedAt: isoNow()
    };
    this.instructions.push(instruction);
    this.session.instructionCount = this.instructions.length;
    if (instruction.type === 'snapshot_before' && this.session.beforeSnapshotId === undefined) {
      this.session.beforeSnapshotId = instruction.instructionId;
    }
    if (instruction.type === 'snapshot_after' && this.session.afterSnapshotId === undefined) {
      this.session.afterSnapshotId = instruction.instructionId;
    }
    this.persistSession();
    return instruction;
  }

  captureFrameState(frame: number): MohoRawEvent {
    if (this.session.status !== 'recording') {
      throw new Error(`Cannot capture frame state: session "${this.sessionId}" status is "${this.session.status}"`);
    }
    const instruction = this.recordInstruction({
      type: 'capture_frame',
      frame,
      note: `capture frame ${frame} state via IPC`
    });

    const bones = this.ipc.captureBoneState(frame);
    const switches = this.ipc.captureSwitchState(frame);
    const actions = this.ipc.captureActionState(frame);

    const payload: Record<string, unknown> = {
      frame,
      bones,
      switches,
      actions,
      capturedVia: 'moho-native-ipc-mock'
    };

    this.eventCounter += 1;
    const event: MohoRawEvent = {
      eventId: `evt_${this.eventCounter.toString().padStart(6, '0')}`,
      sessionId: this.sessionId,
      instructionId: instruction.instructionId,
      kind: 'frame_state',
      payload,
      capturedAt: isoNow(),
      fingerprint: sha256Of(deterministicJson(payload))
    };
    this.events.push(event);
    this.appendEventLine(event);
    return event;
  }

  addRetakePatch(retake: MohoRetakeManifest, notes: string): MohoRecorderPatchEntry {
    if (this.session.status !== 'recording' && this.session.status !== 'stopped') {
      throw new Error(`Cannot add retake patch: session "${this.sessionId}" status is "${this.session.status}"`);
    }
    this.patchCounter += 1;
    const entry: MohoRecorderPatchEntry = {
      patchId: `patch_${this.patchCounter.toString().padStart(6, '0')}`,
      sessionId: this.sessionId,
      retakeManifest: retake,
      notes,
      recordedAt: isoNow()
    };
    this.patches.push(entry);
    this.session.patchCount = this.patches.length;
    fs.writeFileSync(
      path.join(this.session.evidenceDir, 'patches.json'),
      JSON.stringify(this.patches, null, 2),
      'utf-8'
    );
    this.recordInstruction({
      type: 'apply_retake',
      frame: retake.patches[0]?.frame ?? 1,
      note: `retake ${retake.retakeId} applied (${retake.patches.length} patches)`
    });
    this.refreshFingerprint();
    return entry;
  }

  stop(): MohoCaptureSession {
    if (this.session.status === 'aborted' || this.session.status === 'committed' || this.session.status === 'dry_run') {
      throw new Error(`Cannot stop session "${this.sessionId}": already finalized as "${this.session.status}"`);
    }
    this.session.status = this.dryRun ? 'dry_run' : 'stopped';
    this.session.finishedAt = isoNow();
    this.refreshFingerprint();
    this.persistSession();
    return this.session;
  }

  commit(): MohoCaptureSession {
    if (this.session.status !== 'stopped' && this.session.status !== 'dry_run') {
      throw new Error(`Cannot commit session "${this.sessionId}": status is "${this.session.status}"`);
    }
    this.session.status = 'committed';
    this.session.finishedAt = isoNow();
    this.refreshFingerprint();
    this.persistSession();
    return this.session;
  }

  abort(): MohoCaptureSession {
    this.session.status = 'aborted';
    this.session.finishedAt = isoNow();
    this.refreshFingerprint();
    this.persistSession();
    return this.session;
  }

  getSession(): MohoCaptureSession {
    return this.session;
  }

  listEvents(): MohoRawEvent[] {
    return [...this.events];
  }

  listPatches(): MohoRecorderPatchEntry[] {
    return [...this.patches];
  }

  static derivePatchFromBeforeAfter(
    before: MohoPerformancePir,
    after: MohoPerformancePir,
    sessionId: string,
    operatorId: string
  ): MohoRetakeManifest {
    const beforeMap = new Map<string, MohoPerformancePir['boneKeys'][number]>();
    for (const k of before.boneKeys) {
      beforeMap.set(`${k.boneId}:${k.channel}:${k.frame}`, k);
    }

    const patches: MohoRetakePatch[] = [];
    let counter = 0;
    const nextPatchId = (): string => {
      counter += 1;
      return `diffp_${counter.toString().padStart(4, '0')}`;
    };

    for (const afterKey of after.boneKeys) {
      const lookup = `${afterKey.boneId}:${afterKey.channel}:${afterKey.frame}`;
      const prev = beforeMap.get(lookup);
      if (prev && prev.value !== afterKey.value) {
        patches.push({
          patchId: nextPatchId(),
          targetRigType: after.rigType,
          boneId: afterKey.boneId,
          boneName: afterKey.boneName,
          channel: afterKey.channel,
          frame: afterKey.frame,
          newValue: afterKey.value,
          interpolation: afterKey.interpolation,
          note: `diff before/after at frame ${afterKey.frame}: ${prev.value} -> ${afterKey.value}`,
          recordedBy: operatorId,
          recordedAt: isoNow()
        });
      } else if (!prev) {
        patches.push({
          patchId: nextPatchId(),
          targetRigType: after.rigType,
          boneId: afterKey.boneId,
          boneName: afterKey.boneName,
          channel: afterKey.channel,
          frame: afterKey.frame,
          newValue: afterKey.value,
          interpolation: afterKey.interpolation,
          note: `diff: new key at frame ${afterKey.frame} (not present in before)`,
          recordedBy: operatorId,
          recordedAt: isoNow()
        });
      }
    }

    if (patches.length === 0) {
      throw new Error(`Cannot derive retake manifest: before/after PIR "${before.performanceId}" / "${after.performanceId}" produced no diffs for session "${sessionId}"`);
    }

    return {
      schemaVersion: '1.0',
      retakeId: `rtk_diff_${sessionId}_${patches.length.toString().padStart(4, '0')}`,
      sourcePerformanceId: after.performanceId,
      sourceMohoCommandPlanId: after.shotManifestRef,
      rigType: after.rigType,
      patches,
      severity: 'low',
      autoApplicable: false,
      provenance: {
        recordedBy: operatorId,
        recordedAt: isoNow()
      }
    };
  }

  static generateSessionId(): string {
    return crypto.randomUUID();
  }

  static loadFromDisk(evidenceDir: string, sessionId: string): MohoActionRecorder {
    const sessionFile = path.join(evidenceDir, sessionId, 'session.json');
    if (!fs.existsSync(sessionFile)) {
      throw new Error(`No session at ${sessionFile}`);
    }
    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8')) as MohoCaptureSession;
    const cfg: MohoActionRecorderConfig = {
      evidenceDir,
      sessionId,
      shotId: session.shotId,
      rigType: session.rigType,
      operatorId: session.operatorId,
      dryRun: session.status === 'dry_run'
    };
    const recorder = new MohoActionRecorder(cfg);
    recorder.session = session;
    return recorder;
  }

  private persistSession(): void {
    fs.mkdirSync(this.session.evidenceDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.session.evidenceDir, 'session.json'),
      JSON.stringify(this.session, null, 2),
      'utf-8'
    );
  }

  private appendEventLine(event: MohoRawEvent): void {
    const file = path.join(this.session.evidenceDir, 'events.jsonl');
    fs.appendFileSync(file, JSON.stringify(event) + '\n', 'utf-8');
  }

  private writeArtifact(name: string, contents: string): void {
    fs.writeFileSync(path.join(this.session.evidenceDir, name), contents, 'utf-8');
  }

  private refreshFingerprint(): void {
    const payload = {
      sessionId: this.session.sessionId,
      shotId: this.session.shotId,
      rigType: this.session.rigType,
      status: this.session.status,
      instructionCount: this.session.instructionCount,
      patchCount: this.session.patchCount,
      beforeSnapshotId: this.session.beforeSnapshotId,
      afterSnapshotId: this.session.afterSnapshotId,
      operatorId: this.session.operatorId
    };
    const fp = sha256Of(deterministicJson(payload));
    this.session.fingerprint = fp;
    fs.writeFileSync(
      path.join(this.session.evidenceDir, 'fingerprint.txt'),
      fp,
      'utf-8'
    );
    this.persistSession();
  }
}