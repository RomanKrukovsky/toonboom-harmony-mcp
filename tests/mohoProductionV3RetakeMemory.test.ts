import fs from 'fs';
import path from 'path';
import { MohoRetakeDatasetStore } from '../src/services/mohoRetakeDataset/index.js';
import {
  findRelevantRetakes,
  persistApprovedRetake
} from '../src/services/mohoProductionV3RetakeMemory/index.js';
import type { MohoDatasetEntry } from '../src/schemas/mohoRetakeDataset.js';

function entry(id: string, overrides: Partial<NonNullable<MohoDatasetEntry['productionMemory']>> = {}): MohoDatasetEntry {
  const recordedAt = `2026-08-${id.padStart(2, '0')}T10:00:00.000Z`;
  return {
    entryId: `entry-${id}`,
    sessionId: `session-${id}`,
    shotId: `shot-${id}`,
    rigType: 'humanoid_2leg',
    intent: 'auto_retake',
    retakeManifest: {
      schemaVersion: '1.0', retakeId: `retake-${id}`, sourcePerformanceId: 'before',
      sourceMohoCommandPlanId: 'plan', rigType: 'humanoid_2leg', patches: [], severity: 'low',
      autoApplicable: true,
      provenance: { recordedBy: 'director', recordedAt, approvedBy: 'director', approvedAt: recordedAt }
    },
    notes: 'approved correction', recordedAt, recordedBy: 'director',
    provenance: { beforePerformanceId: 'before', afterPerformanceId: 'after' },
    productionMemory: {
      characterId: 'hero', shotType: 'dialogue_closeup', qaCategories: ['foot_sliding'],
      directorInstruction: 'Lock the planted foot.', approved: true,
      artifactHashes: { before: 'a'.repeat(64), after: 'b'.repeat(64) },
      ...overrides
    }
  };
}

describe('Moho Production v3 retake memory', () => {
  it('returns only approved relevant examples, ranked and capped at five', () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'output', 'retake-memory-'));
    const datasetPath = path.join(root, 'retakes.json');
    const store = new MohoRetakeDatasetStore(datasetPath);
    const dataset = MohoRetakeDatasetStore.createEmpty('show', 'humanoid_2leg', 'director');
    store.save(dataset);
    for (let index = 1; index <= 7; index += 1) store.addEntry(entry(String(index)));
    store.addEntry(entry('8', { characterId: 'other' }));
    store.addEntry(entry('9', { approved: false }));

    const result = findRelevantRetakes({
      datasetPath, characterId: 'hero', rigType: 'humanoid_2leg',
      shotType: 'dialogue_closeup', qaCategories: ['foot_sliding']
    });

    expect(result).toHaveLength(5);
    expect(result[0]).toMatchObject({ characterId: 'hero', entryId: 'entry-7' });
    expect(result.every(item => item.artifactHashes.after === 'b'.repeat(64))).toBe(true);
    expect(findRelevantRetakes({
      datasetPath, characterId: 'unknown', rigType: 'humanoid_2leg',
      shotType: 'dialogue_closeup', qaCategories: []
    })).toEqual([]);
  });

  it('persists an approved correction through the existing dataset store', () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'output', 'retake-memory-write-'));
    const datasetPath = path.join(root, 'retakes.json');
    const store = new MohoRetakeDatasetStore(datasetPath);
    store.save(MohoRetakeDatasetStore.createEmpty('show', 'humanoid_2leg', 'director'));

    persistApprovedRetake({
      datasetPath, entryId: 'approved-1', sessionId: 'job-1', shotId: 'shot-1',
      characterId: 'hero', rigType: 'humanoid_2leg', shotType: 'dialogue',
      qaCategories: ['pose'], directorInstruction: 'Keep the silhouette open.',
      beforePerformanceId: 'before', afterPerformanceId: 'after',
      beforeArtifactSha256: 'a'.repeat(64), afterArtifactSha256: 'b'.repeat(64),
      approvedBy: 'director', recordedAt: '2026-08-31T10:00:00.000Z'
    });

    expect(store.load().entries[0].productionMemory).toMatchObject({
      approved: true,
      characterId: 'hero',
      directorInstruction: 'Keep the silhouette open.'
    });
  });
});
