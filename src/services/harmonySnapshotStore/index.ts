import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { getProjectRoot } from '../../config.js';
import { MlError } from '../../errors/mlErrorRegistry.js';
import {
  simulatedSceneStateV1Schema,
  computeSceneContentHash,
  sealSceneState,
  type SimulatedSceneStateV1
} from '../../schemas/simulatedSceneStateV1.js';
import { sha256Schema, isoInstantSchema } from '../../schemas/ml.js';

/**
 * Snapshot store for simulated scenes.
 *
 * A snapshot is written atomically (temp file + rename) and carries its own checksum. On load
 * the payload is re-hashed and compared: a truncated write, a hand-edited file or a swapped
 * checksum all fail loudly rather than loading as a valid scene.
 *
 * This is what makes the round-trip meaningful. Passing the same in-memory object back would
 * prove nothing; the demo drops the object, reads the bytes back off disk and re-validates.
 */

export const SNAPSHOT_SCHEMA_VERSION = '1.0' as const;

export const snapshotManifestSchema = z.object({
  schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  kind: z.literal('SimulatedSceneSnapshotV1'),
  sceneId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  rigId: z.string().min(1),
  rigVersion: z.string().min(1),
  /** SHA-256 over the canonical JSON of the state payload. */
  payloadChecksum: sha256Schema,
  /** The state's own content hash, so a mismatch tells you *which* invariant broke. */
  contentHash: sha256Schema,
  createdAt: isoInstantSchema,
  producer: z.string().min(1)
}).strict();
export type SnapshotManifest = z.infer<typeof snapshotManifestSchema>;

const snapshotFileSchema = z.object({
  manifest: snapshotManifestSchema,
  state: simulatedSceneStateV1Schema
}).strict();

export interface RevisionSummary {
  revision: number;
  contentHash: string;
  createdAt: string;
  relativePath: string;
}

export interface RevisionComparison {
  sceneId: string;
  from: number;
  to: number;
  identical: boolean;
  fromHash: string;
  toHash: string;
  /** Populated by the structural differ; see `diffScenes`. */
  summary: { addedNodes: number; removedNodes: number; changedKeyframes: number; changedColumns: number };
}

/**
 * Migration hooks. A stored snapshot whose schema version is older than the current one is
 * routed through the chain; a version with no path is refused rather than force-loaded.
 */
export type SnapshotMigration = (raw: unknown) => unknown;
const MIGRATIONS: Readonly<Record<string, SnapshotMigration>> = Object.freeze({
  // No older versions exist yet. The map is real, not decorative: adding '0.9' here is the
  // supported way to keep an older store readable, and `loadSnapshot` consults it.
});

export function snapshotRoot(): string {
  const raw = process.env.HARMONY_SNAPSHOT_ROOT;
  return raw ? path.resolve(raw) : path.join(getProjectRoot(), 'artifacts', 'harmony-simulator', 'snapshots');
}

export class HarmonySnapshotStore {
  constructor(private readonly root: string = snapshotRoot()) {}

  getRoot(): string {
    return this.root;
  }

  /**
   * Resolves a scene directory, refusing anything that escapes the store.
   * Both sides are realpath-resolved so a symlink planted inside the store cannot point out.
   */
  private sceneDir(sceneId: string): string {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(sceneId)) {
      throw new MlError('SNAPSHOT_PATH_REJECTED', `sceneId ${sceneId} is not a legal identifier`);
    }
    const target = path.resolve(this.root, sceneId);
    const realRoot = realResolve(this.root);
    const realTarget = realResolve(target);
    const relative = path.relative(realRoot, realTarget);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new MlError('SNAPSHOT_PATH_REJECTED', `resolved snapshot path escapes the store root: ${sceneId}`);
    }
    return realTarget;
  }

  private revisionFile(sceneId: string, revision: number): string {
    if (!Number.isInteger(revision) || revision < 0) {
      throw new MlError('SNAPSHOT_PATH_REJECTED', `revision ${revision} is not a non-negative integer`);
    }
    return path.join(this.sceneDir(sceneId), `r${String(revision).padStart(6, '0')}.json`);
  }

  /** Writes atomically: a reader never observes a half-written snapshot. */
  saveSnapshot(state: SimulatedSceneStateV1, options: { producer?: string } = {}): SnapshotManifest {
    const sealed = sealSceneState(state);
    const parsed = simulatedSceneStateV1Schema.safeParse(sealed);
    if (!parsed.success) {
      throw new MlError('SIMULATOR_STATE_INVALID', `refusing to snapshot an invalid state: ${parsed.error.message}`);
    }

    const payload = canonicalJson(parsed.data);
    const manifest: SnapshotManifest = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      kind: 'SimulatedSceneSnapshotV1',
      sceneId: parsed.data.sceneId,
      revision: parsed.data.revision,
      rigId: parsed.data.rigId,
      rigVersion: parsed.data.rigVersion,
      payloadChecksum: crypto.createHash('sha256').update(payload).digest('hex'),
      contentHash: parsed.data.contentHash,
      createdAt: new Date().toISOString(),
      producer: options.producer ?? 'HarmonyContractSimulator'
    };

    const directory = this.sceneDir(parsed.data.sceneId);
    fs.mkdirSync(directory, { recursive: true });
    const target = this.revisionFile(parsed.data.sceneId, parsed.data.revision);
    const temporary = `${target}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;

    try {
      fs.writeFileSync(temporary, JSON.stringify({ manifest, state: parsed.data }, null, 2));
      // rename is atomic within a filesystem, so the target is either the old file or the new
      // one — never a partial write.
      fs.renameSync(temporary, target);
    } catch (error) {
      fs.rmSync(temporary, { force: true });
      throw new MlError('SNAPSHOT_WRITE_FAILED', `could not write snapshot: ${(error as Error).message}`, {}, { cause: error });
    }
    return manifest;
  }

  loadSnapshot(sceneId: string, revision: number): { manifest: SnapshotManifest; state: SimulatedSceneStateV1 } {
    const file = this.revisionFile(sceneId, revision);
    if (!fs.existsSync(file)) {
      throw new MlError('SNAPSHOT_NOT_FOUND', `no snapshot for ${sceneId} at revision ${revision}`, {
        detail: { candidates: this.listRevisions(sceneId).map(r => String(r.revision)) }
      });
    }

    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (error) {
      throw new MlError('SNAPSHOT_CORRUPT', `snapshot ${sceneId}@${revision} is not readable JSON`, {}, { cause: error });
    }

    const declaredVersion = (raw as { manifest?: { schemaVersion?: string } }).manifest?.schemaVersion;
    if (declaredVersion !== undefined && declaredVersion !== SNAPSHOT_SCHEMA_VERSION) {
      const migration = MIGRATIONS[declaredVersion];
      if (!migration) {
        throw new MlError('SNAPSHOT_SCHEMA_UNSUPPORTED', `snapshot schema ${declaredVersion} has no migration path to ${SNAPSHOT_SCHEMA_VERSION}`);
      }
      raw = migration(raw);
    }

    const parsed = snapshotFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new MlError('SNAPSHOT_CORRUPT', `snapshot ${sceneId}@${revision} failed its schema: ${parsed.error.message}`);
    }

    // Checksum first: it catches a tampered payload even when the payload still validates.
    const measured = crypto.createHash('sha256').update(canonicalJson(parsed.data.state)).digest('hex');
    if (measured !== parsed.data.manifest.payloadChecksum) {
      throw new MlError('SNAPSHOT_CHECKSUM_MISMATCH', `snapshot ${sceneId}@${revision}: expected ${parsed.data.manifest.payloadChecksum}, measured ${measured}`);
    }
    // Then the state's own content hash: catches a payload edited together with its checksum.
    const contentHash = computeSceneContentHash(parsed.data.state);
    if (contentHash !== parsed.data.state.contentHash) {
      throw new MlError('SNAPSHOT_CORRUPT', `snapshot ${sceneId}@${revision}: stored contentHash does not describe the stored scene`);
    }
    if (parsed.data.manifest.contentHash !== contentHash) {
      throw new MlError('SNAPSHOT_CHECKSUM_MISMATCH', `snapshot ${sceneId}@${revision}: manifest contentHash disagrees with the payload`);
    }

    return parsed.data;
  }

  listRevisions(sceneId: string): RevisionSummary[] {
    const directory = this.sceneDir(sceneId);
    if (!fs.existsSync(directory)) return [];
    const summaries: RevisionSummary[] = [];
    for (const entry of fs.readdirSync(directory)) {
      const match = /^r(\d{6})\.json$/.exec(entry);
      if (!match) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(directory, entry), 'utf-8')) as { manifest?: SnapshotManifest };
        if (!raw.manifest) continue;
        summaries.push({
          revision: raw.manifest.revision,
          contentHash: raw.manifest.contentHash,
          createdAt: raw.manifest.createdAt,
          relativePath: path.join(sceneId, entry)
        });
      } catch {
        // A corrupt file is not listed as an available revision; loadSnapshot reports why.
      }
    }
    return summaries.sort((a, b) => a.revision - b.revision);
  }

  compareRevisions(sceneId: string, from: number, to: number): RevisionComparison {
    const a = this.loadSnapshot(sceneId, from);
    const b = this.loadSnapshot(sceneId, to);
    const addedNodes = b.state.nodes.filter(n => !a.state.nodes.some(m => m.path === n.path)).length;
    const removedNodes = a.state.nodes.filter(n => !b.state.nodes.some(m => m.path === n.path)).length;
    const keyOf = (k: { columnName: string; frame: number }) => `${k.columnName}@${k.frame}`;
    const aKeys = new Map(a.state.keyframes.map(k => [keyOf(k), k.value]));
    const bKeys = new Map(b.state.keyframes.map(k => [keyOf(k), k.value]));
    let changedKeyframes = 0;
    for (const [key, value] of bKeys) if (!aKeys.has(key) || aKeys.get(key) !== value) changedKeyframes += 1;
    for (const key of aKeys.keys()) if (!bKeys.has(key)) changedKeyframes += 1;
    const changedColumns = new Set([
      ...b.state.columns.filter(c => !a.state.columns.some(d => d.name === c.name)).map(c => c.name),
      ...a.state.columns.filter(c => !b.state.columns.some(d => d.name === c.name)).map(c => c.name)
    ]).size;

    return {
      sceneId,
      from,
      to,
      identical: a.state.contentHash === b.state.contentHash,
      fromHash: a.state.contentHash,
      toHash: b.state.contentHash,
      summary: { addedNodes, removedNodes, changedKeyframes, changedColumns }
    };
  }

  /**
   * Returns the state stored at `revision`, re-read from disk. It does not delete newer
   * revisions: history stays intact so a rollback is itself reversible.
   */
  rollbackToRevision(sceneId: string, revision: number): SimulatedSceneStateV1 {
    const { state } = this.loadSnapshot(sceneId, revision);
    return state;
  }
}

/** Key-sorted JSON. Property order in the file cannot influence the checksum. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortKeys(v)])
    );
  }
  return value;
}

function realResolve(candidate: string): string {
  const absolute = path.resolve(candidate);
  let existing = absolute;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  const realExisting = fs.existsSync(existing) ? fs.realpathSync(existing) : existing;
  return path.resolve(realExisting, path.relative(existing, absolute));
}
