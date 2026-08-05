import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getProjectRoot } from '../../config.js';
import { MlError } from '../../errors/mlErrorRegistry.js';
import { artifactReferenceSchema, type ArtifactReference } from '../../schemas/ml.js';

/**
 * Content-addressed artifact store.
 *
 * Images, video and audio move through the system as *references*, never as base64 inside JSON.
 * Every read re-verifies the digest before the bytes are handed to anything, so a swapped file
 * is a hard error rather than a silently different result.
 *
 * The path guard rejects, in this order: absolute paths, traversal segments, and — after
 * resolution — anything whose real path (symlinks followed) escapes the store root. Checking
 * only the textual path would miss a symlink planted inside the store.
 */

const MAX_ARTIFACT_BYTES = Number(process.env.HARMONY_MAX_ARTIFACT_BYTES ?? 2 * 1024 * 1024 * 1024);

export type ArtifactNamespace = 'ml-jobs' | 'harmony-captures' | 'production-runs' | 'evidence';

export function artifactStoreRoot(): string {
  const raw = process.env.HARMONY_ARTIFACT_ROOT;
  return raw ? path.resolve(raw) : path.join(getProjectRoot(), 'artifacts');
}

export interface ArtifactManifestEntry extends ArtifactReference {
  producer: string;
  createdAt: string;
  licenseDecisionId: string | null;
  consentId: string | null;
  parentArtifactIds: string[];
  retention: 'ephemeral' | 'project' | 'archive';
}

export class MlArtifactStore {
  constructor(private readonly root: string = artifactStoreRoot()) {}

  getRoot(): string {
    return this.root;
  }

  private namespaceDir(namespace: ArtifactNamespace): string {
    return path.join(this.root, namespace);
  }

  /**
   * Resolves a store-relative path to an absolute one, refusing anything that escapes.
   * Exported behaviour is deliberately strict: callers never get to pass an absolute path.
   */
  resolveInStore(namespace: ArtifactNamespace, relativePath: string): string {
    if (path.isAbsolute(relativePath) || /^[A-Za-z]:[\\/]/.test(relativePath)) {
      throw new MlError('ML_ARTIFACT_PATH_REJECTED', `absolute paths are not accepted: ${relativePath}`);
    }
    const segments = relativePath.split(/[\\/]/);
    if (segments.some(s => s === '..' || s === '')) {
      throw new MlError('ML_ARTIFACT_PATH_REJECTED', `path traversal rejected: ${relativePath}`);
    }
    const base = this.namespaceDir(namespace);
    const target = path.resolve(base, relativePath);

    // Both sides must be resolved the same way. Realpathing only the target while leaving the
    // base symbolic makes every path look like an escape on platforms where the temp or home
    // directory is itself a symlink (macOS /var -> /private/var).
    const realBase = realResolve(base);
    // Follow symlinks as far as the path exists, then confirm containment. A symlink inside the
    // store that points outside it is caught here, where a purely textual check would pass.
    const resolved = realResolve(target);
    const relative = path.relative(realBase, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new MlError('ML_ARTIFACT_PATH_REJECTED', `resolved path escapes the artifact store: ${relativePath}`);
    }
    return resolved;
  }

  /** Writes bytes and returns a reference whose digest is computed from what was written. */
  put(namespace: ArtifactNamespace, relativePath: string, data: Buffer, meta: { mimeType: string; role: string }): ArtifactReference {
    if (data.byteLength > MAX_ARTIFACT_BYTES) {
      throw new MlError('ML_ARTIFACT_PATH_REJECTED', `artifact of ${data.byteLength} bytes exceeds the ${MAX_ARTIFACT_BYTES} byte limit`);
    }
    const absolute = this.resolveInStore(namespace, relativePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, data);
    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    return artifactReferenceSchema.parse({
      artifactId: `art_${sha256.slice(0, 24)}`,
      sha256,
      sizeBytes: data.byteLength,
      mimeType: meta.mimeType,
      relativePath: toPosix(relativePath),
      role: meta.role
    });
  }

  putJson(namespace: ArtifactNamespace, relativePath: string, value: unknown, role: string): ArtifactReference {
    return this.put(namespace, relativePath, Buffer.from(JSON.stringify(value, null, 2), 'utf-8'), { mimeType: 'application/json', role });
  }

  /**
   * Registers a file that already exists (for instance one a Python worker wrote) by measuring
   * it rather than trusting a reported digest.
   */
  register(namespace: ArtifactNamespace, relativePath: string, meta: { mimeType: string; role: string }): ArtifactReference {
    const absolute = this.resolveInStore(namespace, relativePath);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      throw new MlError('ML_ARTIFACT_NOT_FOUND', `no artifact at ${relativePath}`);
    }
    const stat = fs.statSync(absolute);
    if (stat.size > MAX_ARTIFACT_BYTES) {
      throw new MlError('ML_ARTIFACT_PATH_REJECTED', `artifact of ${stat.size} bytes exceeds the size limit`);
    }
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
    return artifactReferenceSchema.parse({
      artifactId: `art_${sha256.slice(0, 24)}`,
      sha256,
      sizeBytes: stat.size,
      mimeType: meta.mimeType,
      relativePath: toPosix(relativePath),
      role: meta.role
    });
  }

  /** Reads and re-verifies. A digest mismatch throws instead of returning stale or swapped bytes. */
  read(namespace: ArtifactNamespace, reference: ArtifactReference): Buffer {
    const absolute = this.resolveInStore(namespace, reference.relativePath);
    if (!fs.existsSync(absolute)) {
      throw new MlError('ML_ARTIFACT_NOT_FOUND', `artifact ${reference.artifactId} is missing from the store`);
    }
    const data = fs.readFileSync(absolute);
    const actual = crypto.createHash('sha256').update(data).digest('hex');
    if (actual !== reference.sha256) {
      throw new MlError('ML_ARTIFACT_HASH_MISMATCH', `artifact ${reference.artifactId}: expected ${reference.sha256}, found ${actual}`);
    }
    return data;
  }

  verify(namespace: ArtifactNamespace, reference: ArtifactReference): boolean {
    try {
      this.read(namespace, reference);
      return true;
    } catch (error) {
      if (error instanceof MlError && (error.code === 'ML_ARTIFACT_HASH_MISMATCH' || error.code === 'ML_ARTIFACT_NOT_FOUND')) return false;
      throw error;
    }
  }

  writeManifest(namespace: ArtifactNamespace, relativePath: string, entries: ArtifactManifestEntry[]): ArtifactReference {
    return this.putJson(namespace, relativePath, { schemaVersion: '1.0', generatedAt: new Date().toISOString(), artifacts: entries }, 'artifact_manifest');
  }
}

/**
 * Resolves a path with symlinks followed as far as the path exists, then re-appends the
 * not-yet-created tail. Applying this to both the store root and the candidate is what makes
 * the containment comparison meaningful.
 */
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

function toPosix(p: string): string {
  return p.split(path.sep).join('/').replace(/\\/g, '/');
}

let shared: MlArtifactStore | null = null;
export function getArtifactStore(): MlArtifactStore {
  if (!shared) shared = new MlArtifactStore();
  return shared;
}
