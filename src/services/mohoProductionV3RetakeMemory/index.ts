import { MohoRetakeDatasetStore } from '../mohoRetakeDataset/index.js';
import type { MohoRigType } from '../seriesMemory/mohoExtension.js';
import type { MohoDatasetEntry } from '../../schemas/mohoRetakeDataset.js';

export interface RetakeMemoryQuery {
  datasetPath: string;
  characterId: string;
  rigType: MohoRigType;
  shotType: string;
  qaCategories: string[];
}

export interface RetakeMemoryExample {
  entryId: string;
  characterId: string;
  rigType: MohoRigType;
  shotType: string;
  qaCategories: string[];
  directorInstruction: string;
  artifactHashes: { before: string; after: string };
  recordedAt: string;
}

export function findRelevantRetakes(input: RetakeMemoryQuery): RetakeMemoryExample[] {
  const entries = new MohoRetakeDatasetStore(input.datasetPath).load().entries;
  return entries
    .filter(entry => entry.productionMemory?.approved === true)
    .filter(entry => entry.productionMemory?.characterId === input.characterId)
    .map(entry => {
      const memory = entry.productionMemory!;
      const categoryMatches = memory.qaCategories.filter(category => input.qaCategories.includes(category)).length;
      const score = (entry.rigType === input.rigType ? 4 : 0)
        + (memory.shotType === input.shotType ? 2 : 0)
        + categoryMatches;
      return {
        score,
        example: {
          entryId: entry.entryId,
          characterId: memory.characterId,
          rigType: entry.rigType,
          shotType: memory.shotType,
          qaCategories: memory.qaCategories,
          directorInstruction: memory.directorInstruction,
          artifactHashes: memory.artifactHashes,
          recordedAt: entry.recordedAt
        } satisfies RetakeMemoryExample
      };
    })
    .sort((left, right) => right.score - left.score
      || Date.parse(right.example.recordedAt) - Date.parse(left.example.recordedAt)
      || left.example.entryId.localeCompare(right.example.entryId))
    .slice(0, 5)
    .map(item => item.example);
}

export function retakeExamplesPrompt(examples: RetakeMemoryExample[]): string {
  if (examples.length === 0) return 'No approved retake examples apply to this shot.';
  return [
    'Approved retake examples are advisory only. Never copy controller IDs or override approved keys:',
    ...examples.map(example => JSON.stringify({
      characterId: example.characterId,
      rigType: example.rigType,
      shotType: example.shotType,
      qaCategories: example.qaCategories,
      directorInstruction: example.directorInstruction,
      artifactHashes: example.artifactHashes
    }))
  ].join('\n');
}

export function persistApprovedRetake(input: {
  datasetPath: string;
  entryId: string;
  sessionId: string;
  shotId: string;
  characterId: string;
  rigType: MohoRigType;
  shotType: string;
  qaCategories: string[];
  directorInstruction: string;
  beforePerformanceId: string;
  afterPerformanceId: string;
  beforeArtifactSha256: string;
  afterArtifactSha256: string;
  approvedBy: string;
  recordedAt?: string;
}): MohoDatasetEntry {
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const entry: MohoDatasetEntry = {
    entryId: input.entryId,
    sessionId: input.sessionId,
    shotId: input.shotId,
    rigType: input.rigType,
    intent: 'auto_retake',
    retakeManifest: {
      schemaVersion: '1.0',
      retakeId: `retake-${input.entryId}`,
      sourcePerformanceId: input.beforePerformanceId,
      sourceMohoCommandPlanId: input.afterPerformanceId,
      rigType: input.rigType,
      patches: [],
      severity: 'low',
      autoApplicable: true,
      provenance: {
        recordedBy: input.approvedBy,
        recordedAt,
        approvedBy: input.approvedBy,
        approvedAt: recordedAt
      }
    },
    notes: input.directorInstruction,
    recordedAt,
    recordedBy: input.approvedBy,
    provenance: {
      beforePerformanceId: input.beforePerformanceId,
      afterPerformanceId: input.afterPerformanceId
    },
    productionMemory: {
      characterId: input.characterId,
      shotType: input.shotType,
      qaCategories: input.qaCategories,
      directorInstruction: input.directorInstruction,
      approved: true,
      artifactHashes: {
        before: input.beforeArtifactSha256,
        after: input.afterArtifactSha256
      }
    }
  };
  new MohoRetakeDatasetStore(input.datasetPath).addEntry(entry);
  return entry;
}
