import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface MohoApprovalRequest {
  approvalId: string;
  runId: string;
  stage: 'pir_compiled' | 'rendered' | 'qa_evaluated';
  shotId: string;
  summary: string;
  artifacts: string[];
  qaStatus?: 'pass' | 'warn' | 'fail';
  retakePatchCount?: number;
  requiresApproval: boolean;
  issuedAt: string;
  fingerprint: string;
}

export interface MohoApprovalRecord {
  approvalId: string;
  runId: string;
  stage: string;
  shotId: string;
  decision: 'approved' | 'rejected' | 'pending';
  approver?: string;
  approvedAt?: string;
  notes?: string;
  fingerprint: string;
}

export interface MohoApprovalRequestOptions {
  runId: string;
  stage: 'pir_compiled' | 'rendered' | 'qa_evaluated';
  shotId: string;
  summary: string;
  artifacts: string[];
  qaStatus?: 'pass' | 'warn' | 'fail';
  retakePatchCount?: number;
  issuedAt?: string;
}

const PENDING_FILE = 'pending.jsonl';
const APPROVED_FILE = 'approved.jsonl';
const REJECTED_FILE = 'rejected.jsonl';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function computeFingerprint(payload: Record<string, unknown>): string {
  const json = stableStringify(payload);
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash + json.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function readJsonl<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const lines = raw.split('\n').filter((line) => line.length > 0);
    const records: T[] = [];
    for (const line of lines) {
      records.push(JSON.parse(line) as T);
    }
    return records;
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function writeJsonl<T>(file: string, records: T[]): Promise<void> {
  const dir = path.dirname(file);
  await ensureDir(dir);
  const content = records.map((record) => JSON.stringify(record)).join('\n');
  await fs.writeFile(file, content.length > 0 ? content + '\n' : '', 'utf-8');
}

async function appendJsonl<T>(file: string, record: T): Promise<void> {
  const dir = path.dirname(file);
  await ensureDir(dir);
  await fs.appendFile(file, JSON.stringify(record) + '\n', 'utf-8');
}

function nowIso(override?: string): string {
  if (override !== undefined) {
    return override;
  }
  return new Date(0).toISOString();
}

export class MohoApprovalCheckpoints {
  private readonly evidenceDir: string;

  constructor(evidenceDir: string) {
    this.evidenceDir = evidenceDir;
  }

  async request(opts: MohoApprovalRequestOptions): Promise<MohoApprovalRequest> {
    const approvalId = MohoApprovalCheckpoints.generateApprovalId();
    const issuedAt = nowIso(opts.issuedAt);

    const requiresApproval = opts.qaStatus === 'fail'
      || opts.qaStatus === 'warn'
      || (opts.retakePatchCount !== undefined && opts.retakePatchCount > 0);

    const fingerprintPayload = {
      runId: opts.runId,
      stage: opts.stage,
      shotId: opts.shotId,
      summary: opts.summary,
      artifacts: opts.artifacts,
      qaStatus: opts.qaStatus,
      retakePatchCount: opts.retakePatchCount,
      issuedAt
    };
    const fingerprint = computeFingerprint(fingerprintPayload);

    const record: MohoApprovalRequest = {
      approvalId,
      runId: opts.runId,
      stage: opts.stage,
      shotId: opts.shotId,
      summary: opts.summary,
      artifacts: opts.artifacts,
      qaStatus: opts.qaStatus,
      retakePatchCount: opts.retakePatchCount,
      requiresApproval,
      issuedAt,
      fingerprint
    };

    const pendingRecord: MohoApprovalRecord = {
      approvalId: record.approvalId,
      runId: record.runId,
      stage: record.stage,
      shotId: record.shotId,
      decision: 'pending',
      fingerprint: record.fingerprint
    };

    await appendJsonl(path.join(this.evidenceDir, PENDING_FILE), pendingRecord);
    return record;
  }

  async approve(approvalId: string, approver: string, notes?: string): Promise<MohoApprovalRecord> {
    return this.decide(approvalId, approver, notes, 'approved', APPROVED_FILE);
  }

  async reject(approvalId: string, approver: string, notes?: string): Promise<MohoApprovalRecord> {
    return this.decide(approvalId, approver, notes, 'rejected', REJECTED_FILE);
  }

  private async decide(
    approvalId: string,
    approver: string,
    notes: string | undefined,
    decision: 'approved' | 'rejected',
    targetFile: string
  ): Promise<MohoApprovalRecord> {
    const pendingFile = path.join(this.evidenceDir, PENDING_FILE);
    const pending = await readJsonl<MohoApprovalRecord>(pendingFile);

    const idx = pending.findIndex((record) => record.approvalId === approvalId);
    if (idx === -1) {
      throw new Error(`Approval not found in pending queue: ${approvalId}`);
    }

    const existing = pending[idx];
    const approvedAt = nowIso();
    const updated: MohoApprovalRecord = {
      ...existing,
      decision,
      approver,
      approvedAt,
      notes
    };

    pending.splice(idx, 1);
    await writeJsonl(pendingFile, pending);
    await appendJsonl(path.join(this.evidenceDir, targetFile), updated);
    return updated;
  }

  async listPending(): Promise<MohoApprovalRecord[]> {
    return readJsonl<MohoApprovalRecord>(path.join(this.evidenceDir, PENDING_FILE));
  }

  async listApproved(): Promise<MohoApprovalRecord[]> {
    return readJsonl<MohoApprovalRecord>(path.join(this.evidenceDir, APPROVED_FILE));
  }

  async listRejected(): Promise<MohoApprovalRecord[]> {
    return readJsonl<MohoApprovalRecord>(path.join(this.evidenceDir, REJECTED_FILE));
  }

  async queryByRun(runId: string): Promise<MohoApprovalRecord[]> {
    const all = await this.collectAll();
    return all.filter((record) => record.runId === runId);
  }

  async queryByShot(shotId: string): Promise<MohoApprovalRecord[]> {
    const all = await this.collectAll();
    return all.filter((record) => record.shotId === shotId);
  }

  async getById(approvalId: string): Promise<MohoApprovalRecord | null> {
    const all = await this.collectAll();
    return all.find((record) => record.approvalId === approvalId) ?? null;
  }

  private async collectAll(): Promise<MohoApprovalRecord[]> {
    const [pending, approved, rejected] = await Promise.all([
      this.listPending(),
      this.listApproved(),
      this.listRejected()
    ]);
    return [...pending, ...approved, ...rejected];
  }

  static generateApprovalId(): string {
    return randomUUID();
  }

  static defaultEvidenceDir(productionRoot: string): string {
    return path.join(productionRoot, 'evidence', 'approvals');
  }
}

export default MohoApprovalCheckpoints;