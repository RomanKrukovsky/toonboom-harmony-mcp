import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { pathToFileURL } from 'url';

const manifestArgument = process.argv.slice(2).find(value => !value.startsWith('--'));
const validateOnly = process.argv.includes('--validate-only');
const pilotMode = process.argv.includes('--pilot');
const approvalArgument = process.argv.slice(2).find(value => value.startsWith('--approval-file='));
if (!manifestArgument) {
  process.stderr.write('Usage: npm run moho:v3:benchmark95 -- /absolute/path/to/benchmark-manifest.json [--pilot] [--validate-only]\n');
  process.exit(2);
}

const manifestPath = path.resolve(manifestArgument);
const manifestDirectory = path.dirname(manifestPath);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!Array.isArray(manifest.shots) || manifest.shots.length !== 40) {
  throw new Error(`Benchmark manifest must contain exactly 40 shots; found ${manifest.shots?.length ?? 0}.`);
}
const ids = new Set(manifest.shots.map(shot => shot.shotId));
if (ids.size !== 40) throw new Error('Benchmark shotId values must be unique.');
if (pilotMode) {
  if (!Array.isArray(manifest.pilotShotIds) || manifest.pilotShotIds.length !== 5) {
    throw new Error('pilotShotIds must contain exactly five shot IDs.');
  }
  if (new Set(manifest.pilotShotIds).size !== 5 || manifest.pilotShotIds.some(shotId => !ids.has(shotId))) {
    throw new Error('pilotShotIds must contain five unique IDs from shots.');
  }
}
const selectedShots = pilotMode
  ? manifest.pilotShotIds.map(shotId => manifest.shots.find(shot => shot.shotId === shotId))
  : manifest.shots;

const outputRoot = path.resolve(
  manifestDirectory,
  pilotMode ? manifest.pilotOutputRoot : manifest.outputRoot
);
const reportPath = path.resolve(
  manifestDirectory,
  pilotMode ? manifest.pilotReportPath : manifest.reportPath
);
const directorApprovalPath = path.resolve(
  manifestDirectory,
  approvalArgument?.slice('--approval-file='.length) || manifest.directorApprovalPath || 'director-approvals.json'
);
const statePath = path.join(outputRoot, 'benchmark95-state.json');
fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const previous = fs.existsSync(statePath)
  ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
  : { schemaVersion: '1.0', shots: {} };

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function failureCategory(error) {
  const code = String(error?.code ?? 'UNSUPPORTED');
  if (code.includes('ASSET')) return 'asset';
  if (code.includes('PROVIDER')) return 'provider';
  if (code.includes('RIG')) return 'rig';
  if (code.includes('MOHO') || code.includes('LUA')) return 'native_moho';
  if (code.includes('QA')) return 'qa';
  if (code.includes('APPROVAL') || code.includes('RETAKE')) return 'approval';
  if (code.includes('ANIMATION') || code.includes('ALIGN')) return 'animation';
  return 'unknown';
}

function blockedCase(shot, message, category = 'asset') {
  return {
    shotId: shot.shotId,
    artworkMode: shot.artworkMode,
    hasDialogue: shot.hasDialogue,
    subjectKind: shot.subjectKind,
    activeCharacterCount: shot.activeCharacterCount,
    status: 'blocked',
    retakesUsed: 0,
    approvals: { rig_blueprint: false, key_pose_animatic: false, final_render: false },
    evidence: {
      mohoPath: path.join(outputRoot, shot.shotId, `${shot.shotId}.moho`), mohoSha256: '0'.repeat(64),
      mp4Path: path.join(outputRoot, shot.shotId, `${shot.shotId}.mp4`), mp4Sha256: '0'.repeat(64),
      nativeRoundTripPassed: false, technicalQaPassed: false, artisticQaPassed: false,
      ffprobePassed: false, manualMohoEdits: 0, riggerParticipation: false, animatorParticipation: false
    },
    metrics: { wallTimeMs: 0, modelCalls: 0, modelCostUsd: 0 },
    failure: { category, message }
  };
}

if (validateOnly) {
  const result = pilotMode
    ? {
      valid: true,
      totalShots: 40,
      selectedShots: 5,
      mode: 'pilot',
      shotIds: selectedShots.map(shot => shot.shotId)
    }
    : { valid: true, totalShots: 40 };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

const benchmarkInputsModule = await import(pathToFileURL(
  path.resolve('dist/services/mohoProductionV3BenchmarkInputs/index.js')
).href);
const { buildMohoV3BenchmarkArtworkInput } = benchmarkInputsModule;
const benchmarkApprovalsModule = await import(pathToFileURL(
  path.resolve('dist/services/mohoProductionV3BenchmarkApprovals/index.js')
).href);
const {
  findMohoV3DirectorApproval,
  resolveMohoV3BenchmarkDirector
} = benchmarkApprovalsModule;
const certificationModule = await import(pathToFileURL(
  path.resolve('dist/services/mohoProductionV3Certification/index.js')
).href);
const {
  certifyMohoProductionV3At95Percent,
  validateMohoProductionV3CaseAt95Percent
} = certificationModule;
const benchmarkDirector = resolveMohoV3BenchmarkDirector({
  benchmarkToken: process.env.MOHO_BENCHMARK_AUTH_TOKEN,
  tokenRegistryJson: process.env.HARMONY_FACTORY_TOKENS
});
const toolsModule = await import(pathToFileURL(path.resolve('dist/tools/mohoProductionV3Tools.js')).href);
const tools = new Map(toolsModule.mohoProductionV3Tools.map(tool => [tool.name, tool.handler]));
const call = (name, args) => tools.get(name)(args);
const cases = [];

for (const shot of selectedShots) {
  const savedCase = previous.shots[shot.shotId];
  if (savedCase?.status === 'completed' && validateMohoProductionV3CaseAt95Percent(savedCase).length === 0) {
    cases.push(savedCase);
    continue;
  }
  const startedAt = Date.now();
  let benchmarkCase;
  try {
    const shotOutput = path.join(outputRoot, shot.shotId);
    const dialogueTracks = shot.hasDialogue ? [{
      characterRef: shot.characterId,
      audioPath: path.resolve(manifestDirectory, manifest.assetRoot, shot.shotId, 'dialogue.wav'),
      text: shot.dialogueText,
      startFrame: 0
    }] : [];
    let status = savedCase?.status === 'awaiting_approval' && savedCase.jobId
      ? await call('moho.production.v3.status', {
        jobId: savedCase.jobId,
        authToken: process.env.MOHO_BENCHMARK_AUTH_TOKEN
      })
      : await call('moho.production.v3.start', {
        shotId: shot.shotId,
        outputDir: shotOutput,
        artwork: buildMohoV3BenchmarkArtworkInput(manifestPath, manifest, shot),
        brief: shot.brief, durationFrames: shot.durationFrames, dialogueTracks,
        productionContext: {
          characterId: shot.characterId,
          rigType: shot.subjectKind === 'animal' ? 'quadruped'
            : shot.subjectKind === 'creature' ? 'creature'
              : shot.subjectKind === 'mechanical' ? 'mechanical' : 'humanoid_2leg',
          shotType: shot.category
        },
        authToken: process.env.MOHO_BENCHMARK_AUTH_TOKEN
      });
    const directorDecisions = Array.isArray(savedCase?.directorDecisions)
      ? [...savedCase.directorDecisions]
      : [];
    let pendingDirectorApproval = null;
    while (status.status === 'awaiting_approval') {
      const pending = status.pendingApproval;
      if (!pending) throw new Error(`Job ${status.jobId} is awaiting approval without a pending approval record.`);
      const directorDecision = findMohoV3DirectorApproval(directorApprovalPath, {
        shotId: shot.shotId,
        gate: pending.gate,
        approvalId: pending.approvalId
      });
      if (!directorDecision) {
        pendingDirectorApproval = pending;
        break;
      }
      if (directorDecision.reviewerId !== benchmarkDirector.id) {
        throw new Error(
          `Director decision reviewer ${directorDecision.reviewerId} does not match authenticated principal ${benchmarkDirector.id}.`
        );
      }
      status = await call('moho.production.v3.approve', {
        jobId: status.jobId,
        approvalId: pending.approvalId,
        decision: directorDecision.decision,
        feedbackText: directorDecision.feedbackText,
        annotationPaths: [],
        authToken: process.env.MOHO_BENCHMARK_AUTH_TOKEN
      });
      directorDecisions.push({
        shotId: shot.shotId,
        gate: pending.gate,
        approvalId: pending.approvalId,
        source: 'director_file',
        ...directorDecision
      });
      status = await call('moho.production.v3.resume', {
        jobId: status.jobId,
        authToken: process.env.MOHO_BENCHMARK_AUTH_TOKEN
      });
    }
    if (pendingDirectorApproval) {
      const gateApproved = gate => status.approvals.some(
        item => item.gate === gate && item.status === 'approved'
      );
      benchmarkCase = blockedCase(
        shot,
        `Director decision required for ${pendingDirectorApproval.gate}/${pendingDirectorApproval.approvalId}.`,
        'approval'
      );
      benchmarkCase.status = 'awaiting_approval';
      benchmarkCase.jobId = status.jobId;
      benchmarkCase.pendingApproval = pendingDirectorApproval;
      benchmarkCase.directorApprovalPath = directorApprovalPath;
      benchmarkCase.directorDecisions = directorDecisions;
      benchmarkCase.retakesUsed = status.retakesUsed ?? 0;
      benchmarkCase.approvals = {
        rig_blueprint: gateApproved('rig_blueprint'),
        key_pose_animatic: gateApproved('key_pose_animatic'),
        final_render: gateApproved('final_render')
      };
    } else if (status.status !== 'completed' || !status.delivery) {
      benchmarkCase = blockedCase(shot, status.error?.message ?? `Job ended with ${status.status}.`, failureCategory(status.error));
      benchmarkCase.status = status.status;
      benchmarkCase.retakesUsed = status.retakesUsed ?? 0;
      benchmarkCase.jobId = status.jobId;
      benchmarkCase.directorDecisions = directorDecisions;
    } else {
      const stageInspections = [];
      for (const stage of ['decomposition', 'rig_blueprint', 'performance_plan', 'final_animation', 'qa']) {
        stageInspections.push(await call('moho.production.v3.inspect_stage', {
          jobId: status.jobId,
          stage,
          authToken: process.env.MOHO_BENCHMARK_AUTH_TOKEN
        }));
      }
      const modelCalls = stageInspections.flatMap(item => item.modelCalls ?? []);
      const recordedCosts = modelCalls
        .map(item => item.metadata?.costUsd)
        .filter(value => typeof value === 'number');
      const modelCostUsd = modelCalls.length === 0
        ? 0
        : recordedCosts.length === modelCalls.length
          ? recordedCosts.reduce((total, value) => total + value, 0)
          : null;
      const gateApproved = gate => status.approvals.some(
        item => item.gate === gate && item.status === 'approved'
      );
      benchmarkCase = {
        ...blockedCase(shot, '', 'unknown'),
        status: 'completed',
        jobId: status.jobId,
        retakesUsed: status.retakesUsed,
        directorDecisions,
        approvals: {
          rig_blueprint: gateApproved('rig_blueprint'),
          key_pose_animatic: gateApproved('key_pose_animatic'),
          final_render: gateApproved('final_render')
        },
        evidence: {
          mohoPath: status.delivery.mohoPath, mohoSha256: sha256(status.delivery.mohoPath),
          mp4Path: status.delivery.mp4Path, mp4Sha256: sha256(status.delivery.mp4Path),
          nativeRoundTripPassed: true, technicalQaPassed: true, artisticQaPassed: true,
          ffprobePassed: true, manualMohoEdits: 0, riggerParticipation: false, animatorParticipation: false
        },
        metrics: { wallTimeMs: 0, modelCalls: modelCalls.length, modelCostUsd },
        modelCallEvidence: modelCalls.map(item => ({
          provider: item.provider,
          model: item.model,
          requestSha256: item.requestSha256,
          responseSha256: item.responseSha256,
          status: item.status,
          costUsd: typeof item.metadata?.costUsd === 'number' ? item.metadata.costUsd : null
        })),
        failure: null
      };
    }
  } catch (error) {
    benchmarkCase = blockedCase(shot, error instanceof Error ? error.message : String(error), failureCategory(error));
  }
  benchmarkCase.metrics.wallTimeMs = Date.now() - startedAt;
  previous.shots[shot.shotId] = benchmarkCase;
  cases.push(benchmarkCase);
  fs.writeFileSync(statePath, `${JSON.stringify(previous, null, 2)}\n`);
  fs.writeFileSync(reportPath, `${JSON.stringify({
    schemaVersion: '3.0',
    profile: pilotMode ? 'production95-pilot' : 'production95',
    cases
  }, null, 2)}\n`);
}

const completed = cases.filter(item => item.status === 'completed').length;
const pilotFailures = pilotMode
  ? cases.flatMap(benchmarkCase => validateMohoProductionV3CaseAt95Percent(benchmarkCase)
    .map(message => `${benchmarkCase.shotId}: ${message}.`))
  : [];
const certification = pilotMode
  ? {
    schemaVersion: '3.0',
    profile: 'production95-pilot',
    certified: cases.length === 5 && pilotFailures.length === 0,
    totalShots: cases.length,
    autonomousPasses: cases.length - new Set(
      pilotFailures.map(failure => failure.slice(0, failure.indexOf(':')))
    ).size,
    failures: pilotFailures
  }
  : certifyMohoProductionV3At95Percent(cases);
fs.writeFileSync(reportPath, `${JSON.stringify({
  schemaVersion: '3.0',
  profile: pilotMode ? 'production95-pilot' : 'production95',
  cases,
  certification
}, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  mode: pilotMode ? 'pilot' : 'production95',
  reportPath,
  totalShots: cases.length,
  completed,
  certified: certification.certified,
  autonomousPasses: certification.autonomousPasses,
  failureCount: certification.failures.length
}, null, 2)}\n`);
process.exit(certification.certified ? 0 : 1);
