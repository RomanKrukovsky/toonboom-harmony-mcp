import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
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

export interface MohoProductionV3ArtifactValidation {
  validateMp4: (filePath: string) => string[];
  validateNativeMoho: (benchmarkCase: MohoProductionV3BenchmarkCase) => string[];
}

export interface MohoProductionV3Certification95Options {
  /** Test-only callers may inject deterministic validators. Production callers must omit this. */
  artifactValidation?: MohoProductionV3ArtifactValidation;
}

interface NativeAcceptanceOutput {
  opened: boolean;
  saved: boolean;
  reopened: boolean;
  render_status: string;
  errors: string[];
  roundtrip_path: string;
  fatal_error?: string;
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

function validateMp4WithFfmpeg(filePath: string): string[] {
  const probe = spawnSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_type,duration', '-of', 'json', filePath
  ], { encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  if (probe.error || probe.status !== 0) return ['MP4 failed real ffprobe validation'];
  try {
    const parsed = JSON.parse(probe.stdout) as { streams?: Array<{ codec_type?: string }> };
    if (!parsed.streams?.some(stream => stream.codec_type === 'video')) return ['MP4 contains no video stream'];
  } catch {
    return ['ffprobe returned invalid output'];
  }
  const decode = spawnSync('ffmpeg', [
    '-v', 'error', '-xerror', '-i', filePath, '-map', '0:v:0', '-f', 'null', '-'
  ], { encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  return decode.error || decode.status !== 0 ? ['MP4 failed full ffmpeg decode'] : [];
}

function validateNativeMohoArtifact(benchmarkCase: MohoProductionV3BenchmarkCase): string[] {
  const archiveTest = spawnSync('unzip', ['-tqq', benchmarkCase.evidence.mohoPath], {
    encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024
  });
  const projectEntry = spawnSync('unzip', ['-p', benchmarkCase.evidence.mohoPath, 'Project.mohoproj'], {
    encoding: 'utf8', timeout: 30_000, maxBuffer: 32 * 1024 * 1024
  });
  if (archiveTest.error || archiveTest.status !== 0 || projectEntry.error || projectEntry.status !== 0) {
    return ['MOHO artifact is not a valid native project archive'];
  }
  try {
    const project = JSON.parse(projectEntry.stdout) as unknown;
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      return ['MOHO Project.mohoproj is not a valid project object'];
    }
  } catch {
    return ['MOHO Project.mohoproj is not valid JSON'];
  }

  const evidenceDirectory = fs.mkdtempSync(path.join(path.dirname(benchmarkCase.evidence.mohoPath), '.production95-native-'));
  try {
    const nativeRun = spawnSync(process.env.MOHO_PYTHON_BIN ?? process.env.PYTHON_BIN ?? 'python3', [
      path.resolve(process.cwd(), 'pipeline/tools/moho_native_acceptance.py'),
      '--project', benchmarkCase.evidence.mohoPath,
      '--evidence-dir', evidenceDirectory,
      '--frames', '0'
    ], { encoding: 'utf8', timeout: 180_000, maxBuffer: 32 * 1024 * 1024 });
    if (nativeRun.error || nativeRun.status !== 0) return ['independent native Moho acceptance could not run'];
    const acceptance = JSON.parse(nativeRun.stdout) as NativeAcceptanceOutput;
    if (acceptance.fatal_error || !acceptance.opened || !acceptance.saved || !acceptance.reopened
      || acceptance.errors?.length !== 0 || acceptance.render_status !== 'rendered') {
      return ['independent native Moho open/save/reopen/render acceptance did not pass'];
    }
    if (!acceptance.roundtrip_path || !fileSha256(acceptance.roundtrip_path)) {
      return ['independent native Moho acceptance produced no valid round-trip output'];
    }
  } catch {
    return ['independent native Moho acceptance returned invalid evidence'];
  } finally {
    fs.rmSync(evidenceDirectory, { recursive: true, force: true });
  }
  return [];
}

const productionArtifactValidation: MohoProductionV3ArtifactValidation = {
  validateMp4: validateMp4WithFfmpeg,
  validateNativeMoho: validateNativeMohoArtifact
};

function addMinimumFailure(actual: number, minimum: number, label: string, failures: string[]): void {
  if (actual < minimum) failures.push(`Benchmark requires at least ${minimum} ${label}; found ${actual}.`);
}

export function validateMohoProductionV3CaseAt95Percent(
  benchmarkCase: MohoProductionV3BenchmarkCase,
  artifactValidation: MohoProductionV3ArtifactValidation = productionArtifactValidation
): string[] {
  const failures: string[] = [];
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
  const directorDecisions = Array.isArray(benchmarkCase.directorDecisions)
    ? benchmarkCase.directorDecisions
    : [];
  for (const gate of ['rig_blueprint', 'key_pose_animatic', 'final_render'] as const) {
    const matchingDecisions = directorDecisions.filter(decision =>
      decision.shotId === benchmarkCase.shotId
      && decision.gate === gate
      && decision.source === 'director_file'
    );
    if (matchingDecisions.length === 0) {
      failures.push(`external director decision for ${gate} is missing`);
    } else if ([...matchingDecisions].sort((left, right) =>
      Date.parse(left.decidedAt) - Date.parse(right.decidedAt)
    ).at(-1)?.decision !== 'approve') {
      failures.push(`latest external director decision for ${gate} is not approve`);
    }
  }
  if (!benchmarkCase.metrics) failures.push('benchmark metrics are missing');
  if (!benchmarkCase.modelCallEvidence) {
    failures.push('model call evidence is missing');
  } else if (benchmarkCase.metrics && benchmarkCase.modelCallEvidence.length !== benchmarkCase.metrics.modelCalls) {
    failures.push('model call evidence count does not match benchmark metrics');
  }
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
  failures.push(...artifactValidation.validateMp4(benchmarkCase.evidence.mp4Path));
  failures.push(...artifactValidation.validateNativeMoho(benchmarkCase));
  return [...new Set(failures)];
}

export function certifyMohoProductionV3At95Percent(
  cases: MohoProductionV3BenchmarkCase[],
  options: MohoProductionV3Certification95Options = {}
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

    failures.push(...validateMohoProductionV3CaseAt95Percent(
      benchmarkCase,
      options.artifactValidation ?? productionArtifactValidation
    ));

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
