import { createHash } from 'crypto';
import fs from 'fs';
import { z } from 'zod';

export {
  certifyMohoProductionV3At95Percent,
  type MohoProductionV3Certification95Report
} from './production95.js';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const mohoProductionV3BenchmarkCaseSchema = z.object({
  shotId: z.string().min(1),
  artworkMode: z.enum(['layered_manifest', 'flat_characters', 'flat_scene']),
  hasDialogue: z.boolean(),
  subjectKind: z.enum(['human', 'animal', 'creature', 'mechanical']),
  activeCharacterCount: z.number().int().min(1).max(10),
  status: z.literal('completed'),
  retakesUsed: z.number().int().min(0).max(2),
  approvals: z.object({
    rig_blueprint: z.literal(true),
    key_pose_animatic: z.literal(true),
    final_render: z.literal(true)
  }).strict(),
  evidence: z.object({
    mohoPath: z.string().min(1),
    mohoSha256: sha256Schema,
    mp4Path: z.string().min(1),
    mp4Sha256: sha256Schema,
    nativeRoundTripPassed: z.literal(true),
    technicalQaPassed: z.literal(true),
    artisticQaPassed: z.literal(true),
    ffprobePassed: z.literal(true),
    manualMohoEdits: z.literal(0),
    riggerParticipation: z.literal(false),
    animatorParticipation: z.literal(false)
  }).strict()
}).strict();

export interface MohoProductionV3BenchmarkCase {
  shotId: string;
  artworkMode: 'layered_manifest' | 'flat_characters' | 'flat_scene';
  hasDialogue: boolean;
  subjectKind: 'human' | 'animal' | 'creature' | 'mechanical';
  activeCharacterCount: number;
  status: 'completed' | 'failed' | 'blocked' | 'cancelled' | 'running' | 'queued' | 'awaiting_approval';
  retakesUsed: number;
  approvals: {
    rig_blueprint: boolean;
    key_pose_animatic: boolean;
    final_render: boolean;
  };
  evidence: {
    mohoPath: string;
    mohoSha256: string;
    mp4Path: string;
    mp4Sha256: string;
    nativeRoundTripPassed: boolean;
    technicalQaPassed: boolean;
    artisticQaPassed: boolean;
    ffprobePassed: boolean;
    manualMohoEdits: number;
    riggerParticipation: boolean;
    animatorParticipation: boolean;
  };
}

export interface MohoProductionV3CertificationReport {
  schemaVersion: '3.0';
  certified: boolean;
  totalShots: number;
  passedShots: number;
  failedShotIds: string[];
  failures: string[];
  distribution: {
    artworkModes: Record<'layered_manifest' | 'flat_characters' | 'flat_scene', number>;
    dialogue: number;
    silent: number;
    characterCounts: Record<string, number>;
    subjectKinds: Record<'human' | 'animal' | 'creature' | 'mechanical', number>;
  };
}

function fileSha256(filePath: string): string | null {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size === 0) return null;
    return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch {
    return null;
  }
}

function addDistributionFailure(actual: number, expected: number, label: string, failures: string[]): void {
  if (actual !== expected) failures.push(`Benchmark requires exactly ${expected} ${label}; found ${actual}.`);
}

export function certifyMohoProductionV3Benchmark(
  cases: MohoProductionV3BenchmarkCase[]
): MohoProductionV3CertificationReport {
  const failures: string[] = [];
  const failedShotIds: string[] = [];
  const artworkModes = { layered_manifest: 0, flat_characters: 0, flat_scene: 0 };
  const subjectKinds = { human: 0, animal: 0, creature: 0, mechanical: 0 };
  const characterCounts: Record<string, number> = {};
  let dialogue = 0;

  if (cases.length !== 30) failures.push(`Benchmark requires exactly 30 shots; found ${cases.length}.`);

  const shotIds = new Set<string>();
  for (const benchmarkCase of cases) {
    artworkModes[benchmarkCase.artworkMode] += 1;
    subjectKinds[benchmarkCase.subjectKind] += 1;
    characterCounts[String(benchmarkCase.activeCharacterCount)] =
      (characterCounts[String(benchmarkCase.activeCharacterCount)] ?? 0) + 1;
    if (benchmarkCase.hasDialogue) dialogue += 1;

    const shotFailures: string[] = [];
    if (shotIds.has(benchmarkCase.shotId)) shotFailures.push('duplicate shotId');
    shotIds.add(benchmarkCase.shotId);

    const parsed = mohoProductionV3BenchmarkCaseSchema.safeParse(benchmarkCase);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const issuePath = issue.path.join('.');
        shotFailures.push(`${issuePath || 'case'}: ${issue.message}`);
      }
    }

    if (benchmarkCase.evidence.manualMohoEdits !== 0) shotFailures.push('manual Moho edits are forbidden');
    if (benchmarkCase.evidence.riggerParticipation) shotFailures.push('rigger participation is forbidden');
    if (benchmarkCase.evidence.animatorParticipation) shotFailures.push('animator participation is forbidden');

    const actualMohoSha = fileSha256(benchmarkCase.evidence.mohoPath);
    if (actualMohoSha !== benchmarkCase.evidence.mohoSha256) shotFailures.push('MOHO SHA-256 does not match a non-empty file');
    const actualMp4Sha = fileSha256(benchmarkCase.evidence.mp4Path);
    if (actualMp4Sha !== benchmarkCase.evidence.mp4Sha256) shotFailures.push('MP4 SHA-256 does not match a non-empty file');

    if (shotFailures.length > 0) {
      failedShotIds.push(benchmarkCase.shotId);
      failures.push(...shotFailures.map(message => `${benchmarkCase.shotId}: ${message}.`));
    }
  }

  addDistributionFailure(artworkModes.layered_manifest, 10, 'layered_manifest shots', failures);
  addDistributionFailure(artworkModes.flat_characters, 10, 'flat_characters shots', failures);
  addDistributionFailure(artworkModes.flat_scene, 10, 'flat_scene shots', failures);
  addDistributionFailure(dialogue, 15, 'dialogue shots', failures);
  addDistributionFailure(cases.length - dialogue, 15, 'silent shots', failures);

  for (let count = 1; count <= 10; count += 1) {
    if ((characterCounts[String(count)] ?? 0) === 0) {
      failures.push(`Benchmark must include a shot with ${count} active character${count === 1 ? '' : 's'}.`);
    }
  }
  for (const subjectKind of ['human', 'animal', 'creature', 'mechanical'] as const) {
    if (subjectKinds[subjectKind] === 0) failures.push(`Benchmark must include subject kind ${subjectKind}.`);
  }

  const passedShots = cases.length - failedShotIds.length;
  return {
    schemaVersion: '3.0',
    certified: failures.length === 0 && passedShots === 30,
    totalShots: cases.length,
    passedShots,
    failedShotIds,
    failures,
    distribution: {
      artworkModes,
      dialogue,
      silent: cases.length - dialogue,
      characterCounts,
      subjectKinds
    }
  };
}
