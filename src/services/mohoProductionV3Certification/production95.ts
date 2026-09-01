import { createHash } from 'crypto';
import fs from 'fs';
import {
  mohoProductionV3BenchmarkCaseSchema,
  type MohoProductionV3BenchmarkCase
} from './index.js';

export interface MohoProductionV3Certification95Report {
  schemaVersion: '3.0';
  profile: 'production95';
  certified: boolean;
  totalShots: number;
  autonomousPasses: number;
  autonomousRate: number;
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

function addMinimumFailure(actual: number, minimum: number, label: string, failures: string[]): void {
  if (actual < minimum) failures.push(`Benchmark requires at least ${minimum} ${label}; found ${actual}.`);
}

export function certifyMohoProductionV3At95Percent(
  cases: MohoProductionV3BenchmarkCase[]
): MohoProductionV3Certification95Report {
  const shotFailures: string[] = [];
  const suiteFailures: string[] = [];
  const failedShotIds: string[] = [];
  const artworkModes = { layered_manifest: 0, flat_characters: 0, flat_scene: 0 };
  const subjectKinds = { human: 0, animal: 0, creature: 0, mechanical: 0 };
  const characterCounts: Record<string, number> = {};
  const shotIds = new Set<string>();
  let dialogue = 0;

  if (cases.length !== 40) suiteFailures.push(`Benchmark requires exactly 40 shots; found ${cases.length}.`);

  for (const benchmarkCase of cases) {
    artworkModes[benchmarkCase.artworkMode] += 1;
    subjectKinds[benchmarkCase.subjectKind] += 1;
    characterCounts[String(benchmarkCase.activeCharacterCount)] =
      (characterCounts[String(benchmarkCase.activeCharacterCount)] ?? 0) + 1;
    if (benchmarkCase.hasDialogue) dialogue += 1;

    const failures: string[] = [];
    if (shotIds.has(benchmarkCase.shotId)) failures.push('duplicate shotId');
    shotIds.add(benchmarkCase.shotId);

    const parsed = mohoProductionV3BenchmarkCaseSchema.safeParse(benchmarkCase);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        failures.push(`${issue.path.join('.') || 'case'}: ${issue.message}`);
      }
    }

    if (benchmarkCase.status !== 'completed') failures.push(`status is ${benchmarkCase.status}`);
    if (benchmarkCase.retakesUsed > 2) failures.push('retake budget exceeds two');
    if (!benchmarkCase.approvals.rig_blueprint) failures.push('rig blueprint approval is missing');
    if (!benchmarkCase.approvals.key_pose_animatic) failures.push('key pose animatic approval is missing');
    if (!benchmarkCase.approvals.final_render) failures.push('final render approval is missing');
    if (!benchmarkCase.evidence.nativeRoundTripPassed) failures.push('native round-trip evidence is missing');
    if (!benchmarkCase.evidence.technicalQaPassed) failures.push('technical QA did not pass');
    if (!benchmarkCase.evidence.artisticQaPassed) failures.push('artistic QA did not pass');
    if (!benchmarkCase.evidence.ffprobePassed) failures.push('ffprobe did not pass');
    if (benchmarkCase.evidence.manualMohoEdits !== 0) failures.push('manual Moho edits are forbidden');
    if (benchmarkCase.evidence.riggerParticipation) failures.push('rigger participation is forbidden');
    if (benchmarkCase.evidence.animatorParticipation) failures.push('animator participation is forbidden');
    if (fileSha256(benchmarkCase.evidence.mohoPath) !== benchmarkCase.evidence.mohoSha256) {
      failures.push('MOHO SHA-256 does not match a non-empty file');
    }
    if (fileSha256(benchmarkCase.evidence.mp4Path) !== benchmarkCase.evidence.mp4Sha256) {
      failures.push('MP4 SHA-256 does not match a non-empty file');
    }

    if (failures.length > 0) {
      failedShotIds.push(benchmarkCase.shotId);
      shotFailures.push(...new Set(failures.map(message => `${benchmarkCase.shotId}: ${message}.`)));
    }
  }

  addMinimumFailure(artworkModes.layered_manifest, 10, 'layered_manifest shots', suiteFailures);
  addMinimumFailure(artworkModes.flat_characters, 10, 'flat_characters shots', suiteFailures);
  addMinimumFailure(artworkModes.flat_scene, 10, 'flat_scene shots', suiteFailures);
  if (dialogue !== 20) suiteFailures.push(`Benchmark requires exactly 20 dialogue shots; found ${dialogue}.`);
  if (cases.length - dialogue !== 20) {
    suiteFailures.push(`Benchmark requires exactly 20 silent shots; found ${cases.length - dialogue}.`);
  }

  for (let count = 1; count <= 10; count += 1) {
    if ((characterCounts[String(count)] ?? 0) === 0) {
      suiteFailures.push(`Benchmark must include a shot with ${count} active character${count === 1 ? '' : 's'}.`);
    }
  }
  for (const subjectKind of ['human', 'animal', 'creature', 'mechanical'] as const) {
    if (subjectKinds[subjectKind] === 0) suiteFailures.push(`Benchmark must include subject kind ${subjectKind}.`);
  }

  const autonomousPasses = cases.length - failedShotIds.length;
  if (autonomousPasses < 38) {
    suiteFailures.push(`Benchmark requires at least 38 autonomous passes; found ${autonomousPasses}.`);
  }

  return {
    schemaVersion: '3.0',
    profile: 'production95',
    certified: cases.length === 40 && autonomousPasses >= 38 && suiteFailures.length === 0,
    totalShots: cases.length,
    autonomousPasses,
    autonomousRate: cases.length === 0 ? 0 : autonomousPasses / cases.length,
    failedShotIds,
    failures: [...shotFailures, ...suiteFailures],
    distribution: {
      artworkModes,
      dialogue,
      silent: cases.length - dialogue,
      characterCounts,
      subjectKinds
    }
  };
}
