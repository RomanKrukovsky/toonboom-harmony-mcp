import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { type ShotManifest } from '../../schemas/shotManifest.js';

export interface MohoEpisodeBatch {
  schemaVersion: '1.0';
  batchId: string;
  production: string;
  episode: string;
  shotManifests: ShotManifest[];
  showBiblePath: string;
  createdAt: string;
  fingerprint: string;
}

export interface MohoBatchCompileOptions {
  production: string;
  episode: string;
  shotManifests: ShotManifest[];
  showBiblePath: string;
}

const MAX_SHOT_COUNT = 100;

export class MohoEpisodeBatchCompiler {
  compile(opts: MohoBatchCompileOptions): MohoEpisodeBatch {
    const { production, episode, shotManifests, showBiblePath } = opts;

    if (shotManifests.length === 0) {
      throw new Error('MohoEpisodeBatchCompiler: shotManifests must contain at least one shot');
    }
    if (shotManifests.length > MAX_SHOT_COUNT) {
      throw new Error(
        `MohoEpisodeBatchCompiler: shotManifests count ${shotManifests.length} exceeds safety cap of ${MAX_SHOT_COUNT}`
      );
    }

    const shotIds = new Set<string>();
    for (const manifest of shotManifests) {
      if (shotIds.has(manifest.shotId)) {
        throw new Error(
          `MohoEpisodeBatchCompiler: duplicate shotId "${manifest.shotId}" in batch`
        );
      }
      shotIds.add(manifest.shotId);
    }

    const firstPath = shotManifests[0].showBibleRef;
    for (const manifest of shotManifests) {
      if (manifest.showBibleRef !== firstPath) {
        throw new Error(
          `MohoEpisodeBatchCompiler: showBibleRef mismatch between shots (` +
            `"${firstPath}" vs "${manifest.showBibleRef}")`
        );
      }
    }

    const batchId = MohoEpisodeBatchCompiler.defaultBatchId(production, episode);
    const createdAt = new Date('2025-01-01T00:00:00.000Z').toISOString();

    const batch: MohoEpisodeBatch = {
      schemaVersion: '1.0',
      batchId,
      production,
      episode,
      shotManifests,
      showBiblePath,
      createdAt,
      fingerprint: ''
    };
    batch.fingerprint = MohoEpisodeBatchCompiler.computeFingerprint(batch);
    return batch;
  }

  static defaultBatchId(production: string, episode: string): string {
    return `moho_batch_${production}_${episode}_0`;
  }

  static computeFingerprint(batch: MohoEpisodeBatch): string {
    const canonicalRefs = batch.shotManifests
      .map(m => m.shotId)
      .slice()
      .sort();
    return `sha256:${crypto
      .createHash('sha256')
      .update(stringify(canonicalRefs) ?? '')
      .digest('hex')}`;
  }
}