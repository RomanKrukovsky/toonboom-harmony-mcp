import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import {
  mohoRetakeDatasetSchema,
  MOHO_RETAKE_DATASET_SCHEMA_VERSION,
  type MohoDatasetEntry,
  type MohoRetakeDataset
} from '../../schemas/mohoRetakeDataset.js';

export class MohoRetakeDatasetStore {
  constructor(private readonly datasetPath: string) {}

  static createEmpty(production: string, rigType: string | undefined, curator: string): MohoRetakeDataset {
    const now = new Date(0).toISOString();
    const dataset: MohoRetakeDataset = {
      schemaVersion: MOHO_RETAKE_DATASET_SCHEMA_VERSION,
      datasetId: `moho-retake-dataset-${production}-${now}`,
      production,
      ...(rigType !== undefined ? { rigType: rigType as 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical' } : {}),
      entries: [],
      fingerprint: 'sha256:',
      createdAt: now,
      updatedAt: now,
      provenance: {
        curator,
        approvedAt: now
      }
    };
    dataset.fingerprint = new MohoRetakeDatasetStore('').computeFingerprint(dataset);
    return dataset;
  }

  static defaultPath(evidenceRoot: string, production: string): string {
    return path.join(evidenceRoot, production, 'retakes.json');
  }

  computeFingerprint(dataset: MohoRetakeDataset): string {
    const sorted = [...dataset.entries].sort((a, b) =>
      a.entryId < b.entryId ? -1 : a.entryId > b.entryId ? 1 : 0
    );
    const canonical = stringify(sorted) ?? '';
    return `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
  }

  load(): MohoRetakeDataset {
    if (!fs.existsSync(this.datasetPath)) {
      return MohoRetakeDatasetStore.createEmpty('unknown-production', undefined, 'unknown-curator');
    }
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(this.datasetPath, 'utf8'));
    } catch (err) {
      throw new Error(
        `moho retake dataset corrupted at "${this.datasetPath}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
    const parsed = mohoRetakeDatasetSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `moho retake dataset corrupted at "${this.datasetPath}": ${parsed.error.message}`
      );
    }
    const dataset = parsed.data;
    const recomputed = this.computeFingerprint(dataset);
    if (dataset.fingerprint !== recomputed) {
      throw new Error(
        `moho retake dataset fingerprint mismatch at "${this.datasetPath}": stored=${dataset.fingerprint} computed=${recomputed}`
      );
    }
    return dataset;
  }

  save(dataset: MohoRetakeDataset): void {
    const dir = path.dirname(this.datasetPath);
    fs.mkdirSync(dir, { recursive: true });
    const stamped: MohoRetakeDataset = { ...dataset, updatedAt: new Date().toISOString() };
    stamped.fingerprint = this.computeFingerprint(stamped);
    fs.writeFileSync(this.datasetPath, JSON.stringify(stamped, null, 2) + '\n');
  }

  addEntry(entry: MohoDatasetEntry): MohoRetakeDataset {
    const dataset = this.load();
    const idx = dataset.entries.findIndex(e => e.entryId === entry.entryId);
    if (idx >= 0) dataset.entries[idx] = entry;
    else dataset.entries.push(entry);
    this.save(dataset);
    return { ...dataset, fingerprint: this.computeFingerprint(dataset) };
  }

  queryByRigType(rigType: string): MohoDatasetEntry[] {
    return this.load().entries.filter(e => e.rigType === rigType);
  }

  queryByShot(shotId: string): MohoDatasetEntry[] {
    return this.load().entries.filter(e => e.shotId === shotId);
  }

  queryByIntent(intent: 'manual_fix' | 'auto_retake' | 'composite'): MohoDatasetEntry[] {
    return this.load().entries.filter(e => e.intent === intent);
  }

  count(): number {
    return this.load().entries.length;
  }
}