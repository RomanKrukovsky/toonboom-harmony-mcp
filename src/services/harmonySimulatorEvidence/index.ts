import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getProjectRoot } from '../../config.js';
import { MlError } from '../../errors/mlErrorRegistry.js';

/**
 * Evidence bundle for a simulator round-trip.
 *
 * Every artifact is hashed on write, and `acceptance-status.json` states in machine-readable
 * terms what the run did and did not prove. The four honesty fields are literals in the schema
 * below, so a bundle claiming real Harmony execution cannot be produced by this writer.
 */

export const EVIDENCE_ROOT_NAME = 'harmony-simulator-roundtrip';

export interface EvidenceArtifact {
  fileName: string;
  sha256: string;
  sizeBytes: number;
}

export interface AcceptanceStatus {
  runId: string;
  generatedAt: string;
  observedExecutionMode: 'simulation';
  isRealHarmonyExecution: false;
  realHarmonyAvailable: false;
  verificationLevel: 'simulator_verified';
  requiresRealHarmony: true;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  passed: boolean;
  notProven: string[];
}

export function evidenceRoot(): string {
  const raw = process.env.HARMONY_SIMULATOR_EVIDENCE_ROOT;
  if (raw) return path.resolve(raw);
  let dir = getProjectRoot();
  for (let depth = 0; depth < 10; depth += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(dir, 'output', 'evidence', EVIDENCE_ROOT_NAME);
}

export class EvidenceWriter {
  private readonly artifacts: EvidenceArtifact[] = [];
  readonly directory: string;

  constructor(runId: string, root: string = evidenceRoot()) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)) {
      throw new MlError('SNAPSHOT_PATH_REJECTED', `runId ${runId} is not a legal directory name`);
    }
    // Bundles are grouped by run so one run can never overwrite another's evidence.
    this.directory = path.join(root, runId);
    fs.mkdirSync(this.directory, { recursive: true });
  }

  write(fileName: string, value: unknown): EvidenceArtifact {
    if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
      throw new MlError('SNAPSHOT_PATH_REJECTED', `evidence file name ${fileName} must be a plain name`);
    }
    const payload = Buffer.from(JSON.stringify(value, null, 2), 'utf-8');
    fs.writeFileSync(path.join(this.directory, fileName), payload);
    const artifact: EvidenceArtifact = {
      fileName,
      sha256: crypto.createHash('sha256').update(payload).digest('hex'),
      sizeBytes: payload.byteLength
    };
    this.artifacts.push(artifact);
    return artifact;
  }

  /** Writes `hashes.json` last, covering every artifact written before it. */
  writeHashes(): EvidenceArtifact {
    return this.write('hashes.json', {
      schemaVersion: '1.0',
      kind: 'HarmonySimulatorEvidenceHashesV1',
      generatedAt: new Date().toISOString(),
      artifacts: [...this.artifacts].sort((a, b) => a.fileName.localeCompare(b.fileName))
    });
  }

  listArtifacts(): EvidenceArtifact[] {
    return [...this.artifacts];
  }
}

/** The set every complete round-trip bundle must contain. Missing files fail acceptance. */
export const REQUIRED_EVIDENCE_FILES = [
  'input-rig-manifest.json',
  'initial-scene-state.json',
  'command-plan.json',
  'compatibility-report.json',
  'dry-run-diff.json',
  'execution-result.json',
  'scene-after-execution.json',
  'snapshot-manifest.json',
  'reloaded-scene-state.json',
  'readback.json',
  'readback-diff.json',
  'structural-qa-report.json',
  'idempotency-report.json',
  'rollback-report.json',
  'hashes.json',
  'acceptance-status.json'
] as const;

export interface EvidenceIndexEntry {
  runId: string;
  directory: string;
  present: string[];
  missing: string[];
  complete: boolean;
  acceptance: AcceptanceStatus | null;
}

/** Reads what is on disk. Reports missing files rather than assuming a bundle is complete. */
export function readEvidenceIndex(runId?: string): { root: string; runs: EvidenceIndexEntry[] } {
  const root = evidenceRoot();
  if (!fs.existsSync(root)) return { root, runs: [] };

  const runIds = runId ? [runId] : fs.readdirSync(root).filter(entry => fs.statSync(path.join(root, entry)).isDirectory());
  const runs: EvidenceIndexEntry[] = [];

  for (const id of runIds.sort()) {
    const directory = path.join(root, id);
    if (!fs.existsSync(directory)) continue;
    const present = fs.readdirSync(directory).filter(f => f.endsWith('.json')).sort();
    const missing = REQUIRED_EVIDENCE_FILES.filter(f => !present.includes(f));

    let acceptance: AcceptanceStatus | null = null;
    const acceptanceFile = path.join(directory, 'acceptance-status.json');
    if (fs.existsSync(acceptanceFile)) {
      try {
        acceptance = JSON.parse(fs.readFileSync(acceptanceFile, 'utf-8')) as AcceptanceStatus;
      } catch {
        acceptance = null;
      }
    }
    runs.push({ runId: id, directory: path.relative(getProjectRoot(), directory), present, missing, complete: missing.length === 0, acceptance });
  }
  return { root: path.relative(getProjectRoot(), root), runs };
}

/**
 * Re-hashes every artifact and compares against `hashes.json`. This is what makes the bundle
 * checkable by someone who did not run it.
 */
export function verifyEvidenceHashes(runId: string): { verified: boolean; mismatches: string[]; missing: string[]; checked: number } {
  const directory = path.join(evidenceRoot(), runId);
  const hashesFile = path.join(directory, 'hashes.json');
  if (!fs.existsSync(hashesFile)) {
    return { verified: false, mismatches: [], missing: ['hashes.json'], checked: 0 };
  }
  const record = JSON.parse(fs.readFileSync(hashesFile, 'utf-8')) as { artifacts: EvidenceArtifact[] };
  const mismatches: string[] = [];
  const missing: string[] = [];
  let checked = 0;

  for (const artifact of record.artifacts) {
    if (artifact.fileName === 'hashes.json') continue;
    const file = path.join(directory, artifact.fileName);
    if (!fs.existsSync(file)) { missing.push(artifact.fileName); continue; }
    const measured = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    checked += 1;
    if (measured !== artifact.sha256) mismatches.push(`${artifact.fileName}: expected ${artifact.sha256}, measured ${measured}`);
  }
  return { verified: mismatches.length === 0 && missing.length === 0, mismatches, missing, checked };
}
