import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import stringify from 'fast-json-stable-stringify';
import { MlError } from '../../errors/mlErrorRegistry.js';
import { getProjectRoot } from '../../config.js';
import {
  HARMONY_ACTION_DATASET_V2,
  harmonyActionDatasetEntryV2Schema,
  type HarmonyActionDatasetEntryV2
} from '../../schemas/harmonyActionDatasetV2.js';
import type { CaptureSource, CaptureMode, SessionStatus } from '../../schemas/harmonyActionDataset.js';

/**
 * Harmony Action Recorder V2.
 *
 * Records animator work as structured scene deltas, never as screen video. V2 adds the
 * categories that V1 explicitly did not capture: palettes, deformer chains, master controllers,
 * sound columns, camera state and write node state.
 *
 * Every entry stores:
 *   - `instruction` (or `retakeContext.reason`) as the *only* source of intent;
 *   - `sceneBeforeSha256` / `sceneAfterSha256` over a canonical JSON of the structural
 *     state read from Harmony through the python bridge;
 *   - `semanticDiff` with the additional V2 categories;
 *   - `forwardPatch` and `inversePatch` so a future model can replay and undo.
 *
 * Recordings are written to `<projectRoot>/.harmony-captures/` (override with
 * `HARMONY_CAPTURE_ROOT`). The recorder never writes outside this root.
 */

const ROOT_ENV = 'HARMONY_CAPTURE_ROOT';

function captureRoot(): string {
  return process.env[ROOT_ENV] ? path.resolve(process.env[ROOT_ENV]!) : path.resolve(getProjectRoot(), '.harmony-captures');
}

export interface RecordedSessionInput {
  entryId?: string;
  sessionId: string;
  projectId: string;
  instruction?: string;
  retakeContext?: HarmonyActionDatasetEntryV2['retakeContext'];
  sceneBefore: Record<string, unknown>;
  sceneAfter: Record<string, unknown>;
  semanticDiff: HarmonyActionDatasetEntryV2['semanticDiff'];
  forwardPatch: HarmonyActionDatasetEntryV2['forwardPatch'];
  inversePatch: HarmonyActionDatasetEntryV2['inversePatch'];
  approvalDecision?: HarmonyActionDatasetEntryV2['approvalDecision'];
  rejectionReason?: string | null;
  operatorType?: HarmonyActionDatasetEntryV2['operatorType'];
  episodeId?: string | null;
  sequenceId?: string | null;
  shotId?: string | null;
  assetId?: string | null;
  characterId?: string | null;
  rigVersion?: string | null;
  harmonyVersion: HarmonyActionDatasetEntryV2['harmonyVersion'];
  licenseRefs?: string[];
  consentRefs?: string[];
  synthetic?: boolean;
  captureSource?: CaptureSource;
  captureMode?: CaptureMode;
}

function canonicalHash(value: unknown): string {
  return crypto.createHash('sha256').update(stringify(value)).digest('hex');
}

export class HarmonyActionRecorderV2 {
  constructor(private readonly root: string = captureRoot()) {
    fs.mkdirSync(this.root, { recursive: true });
  }

  getRoot(): string {
    return this.root;
  }

  /** Build and persist a V2 dataset entry. The hash is computed over the finalised shape. */
  record(input: RecordedSessionInput): HarmonyActionDatasetEntryV2 {
    const beforeHash = canonicalHash(input.sceneBefore);
    const afterHash = canonicalHash(input.sceneAfter);
    const raw: HarmonyActionDatasetEntryV2 = harmonyActionDatasetEntryV2Schema.parse({
      schemaVersion: HARMONY_ACTION_DATASET_V2,
      entryId: input.entryId ?? `da_${crypto.randomUUID()}`,
      sessionId: input.sessionId,
      instruction: input.instruction ?? input.retakeContext?.reason ?? 'unspecified',
      retakeContext: input.retakeContext ?? null,
      sceneBeforeSha256: beforeHash,
      sceneAfterSha256: afterHash,
      semanticDiff: input.semanticDiff,
      forwardPatch: input.forwardPatch,
      inversePatch: input.inversePatch,
      approvalDecision: input.approvalDecision ?? 'pending',
      rejectionReason: input.rejectionReason ?? null,
      operatorType: input.operatorType ?? 'animator',
      projectId: input.projectId,
      episodeId: input.episodeId ?? null,
      sequenceId: input.sequenceId ?? null,
      shotId: input.shotId ?? null,
      assetId: input.assetId ?? null,
      characterId: input.characterId ?? null,
      rigVersion: input.rigVersion ?? null,
      harmonyVersion: input.harmonyVersion,
      licenseRefs: input.licenseRefs ?? [],
      consentRefs: input.consentRefs ?? [],
      synthetic: input.synthetic ?? false,
      recordedAt: new Date().toISOString(),
      hashSha256: 'placeholder'
    });
    // Hash the *parsed* entry minus `hashSha256` so the hash is deterministic.
    const hashed = { ...raw, hashSha256: canonicalHash({ ...raw, hashSha256: '' }) };
    const finalised = harmonyActionDatasetEntryV2Schema.parse(hashed);
    this.writeEntry(finalised);
    return finalised;
  }

  /** Loads a single entry from disk; throws when corrupt or absent. */
  load(entryId: string): HarmonyActionDatasetEntryV2 {
    const file = this.entryPath(entryId);
    if (!fs.existsSync(file)) {
      throw new MlError('ML_ARTIFACT_NOT_FOUND', `no capture entry at ${file}`, { detail: { entryId } });
    }
    try {
      return harmonyActionDatasetEntryV2Schema.parse(JSON.parse(fs.readFileSync(file, 'utf-8')));
    } catch (error) {
      throw new MlError('ML_ARTIFACT_NOT_FOUND', `capture entry at ${file} is corrupt: ${(error as Error).message}`, { detail: { entryId, cause: String(error) } });
    }
  }

  list(): HarmonyActionDatasetEntryV2[] {
    if (!fs.existsSync(this.root)) return [];
    const files = fs.readdirSync(this.root).filter(f => f.endsWith('.json'));
    return files.map(f => {
      try {
        return harmonyActionDatasetEntryV2Schema.parse(JSON.parse(fs.readFileSync(path.join(this.root, f), 'utf-8')));
      } catch {
        return null;
      }
    }).filter((e): e is HarmonyActionDatasetEntryV2 => e !== null);
  }

  private writeEntry(entry: HarmonyActionDatasetEntryV2): void {
    const file = this.entryPath(entry.entryId);
    if (!file.startsWith(this.root)) {
      throw new MlError('ML_ARTIFACT_PATH_REJECTED', `entry path ${file} escapes the capture root`);
    }
    fs.writeFileSync(file, JSON.stringify(entry, null, 2));
  }

  private entryPath(entryId: string): string {
    if (entryId.includes('/') || entryId.includes('..')) {
      throw new MlError('ML_ARTIFACT_PATH_REJECTED', `entry id ${entryId} contains path characters`);
    }
    return path.join(this.root, `${entryId}.json`);
  }

  /** Returns a JSONL stream of approved entries, ready to feed a future training pipeline. */
  exportApprovedDatasetJsonl(): string {
    return this.list()
      .filter(e => e.approvalDecision === 'approved' && !e.synthetic)
      .map(e => JSON.stringify(e))
      .join('\n');
  }
}

export function sessionStatusFromString(value: string): SessionStatus {
  if (['recording', 'stopped', 'interrupted', 'approved', 'rejected'].includes(value)) {
    return value as SessionStatus;
  }
  return 'stopped';
}
