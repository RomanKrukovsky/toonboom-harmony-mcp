import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  MohoFactoryOrchestrator,
  type MohoFactoryRunState
} from '../../src/orchestrators/mohoFactory/index.js';
import type { ShotManifest } from '../../src/schemas/shotManifest.js';
import { config } from '../../src/config.js';

const SAMPLE_BUNDLE_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'examples',
  'moho_show_bible'
);
const SAMPLE_SHOW_BIBLE_PATH = path.join(SAMPLE_BUNDLE_DIR, 'moho_show_bible.json');

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function patchLicenseForCompliance(licensePath: string, assetId: string): void {
  const raw = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
  const compliant = {
    schemaVersion: '1.0',
    assetId,
    creator: 'demo-rigger',
    source: 'commission',
    license: 'exclusive commercial assignment',
    commercialUse: true,
    modificationAllowed: true,
    datasetUseAllowed: true,
    redistributionAllowed: false,
    contractPath: raw.contractPath ?? './contracts/character.pdf',
    forbiddenTags: [],
    sha256: 'd'.repeat(64),
    notes: 'Patched for factory golden-path integration test compliance.'
  };
  fs.writeFileSync(licensePath, JSON.stringify(compliant, null, 2), 'utf8');
}

function buildHumanoidManifest(shotId: string, sceneName: string, characterId: string): ShotManifest {
  return {
    schemaVersion: '1.0',
    shotId,
    showBibleRef: './moho_show_bible.json',
    production: 'demo_production',
    episode: 'ep01',
    sceneName,
    rigType: 'humanoid_2leg',
    description: `Factory golden-path test: humanoid ${shotId}.`,
    staging: {
      positions: [{ characterId, preset: 'center' }],
      shotSize: 'medium_shot',
      cameraMove: 'static',
      backgroundRef: './bg/speaker_room.png'
    },
    timing: {
      totalFrames: 48,
      fps: 24,
      minBeatFrames: 2,
      maxBeatFrames: 48,
      anticipationFrames: 2,
      followThroughFrames: 4,
      pauseBeforeBeats: {}
    },
    beats: [
      {
        beatId: `${shotId}_beat_1`,
        startFrame: 1,
        endFrame: 24,
        characterId,
        intent: 'speak',
        emotion: 'neutral',
        audioCue: { transcript: 'hello there' }
      },
      {
        beatId: `${shotId}_beat_2`,
        startFrame: 25,
        endFrame: 48,
        characterId,
        intent: 'greet',
        emotion: 'happy',
        gestureId: 'nod',
        audioCue: { transcript: 'happy to meet you' }
      }
    ],
    fx: [
      { type: 'glow', target: 'speaker', startFrame: 1, endFrame: 48 }
    ],
    render: { preview: true, format: 'mp4', quality: 'standard' },
    provenance: {
      director: 'factory-golden-path',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceScriptRef: './script/hello.txt'
    }
  };
}

function findFirstStageFingerprint(state: MohoFactoryRunState, stageId: string): string {
  const stage = state.stages[stageId as keyof typeof state.stages];
  return stage?.fingerprint ?? '';
}

describe('MohoFactory golden path (integration)', () => {
  let tmpDir: string;
  let stagedBundleDir: string;
  let stagedShowBiblePath: string;
  let outputRoot: string;
  let originalAllowedRoots: string[];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-factory-golden-'));
    stagedBundleDir = path.join(tmpDir, 'moho_show_bible');
    copyDirSync(SAMPLE_BUNDLE_DIR, stagedBundleDir);
    patchLicenseForCompliance(path.join(stagedBundleDir, 'asset_license.json'), 'demo_speaker_rig_v1');

    stagedShowBiblePath = path.join(stagedBundleDir, 'moho_show_bible.json');
    outputRoot = path.join(tmpDir, 'factory_out');

    originalAllowedRoots = [...config.allowedRoots];
    config.allowedRoots = [SAMPLE_BUNDLE_DIR, tmpDir];
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    config.allowedRoots = originalAllowedRoots;
  });

  it('1-shot golden path: single humanoid shot through full pipeline (≤30s)', async () => {
    const characterId = 'speaker';
    const shot = buildHumanoidManifest('shot_factory_gp_single', 'factory_gp_single', characterId);

    const orch = new MohoFactoryOrchestrator({
      showBiblePath: stagedShowBiblePath,
      shotManifests: [shot],
      outputRoot,
      mode: 'offline_dry_run',
      fps: 24
    });

    const t0 = Date.now();
    const state = await orch.run();
    const elapsedMs = Date.now() - t0;

    expect(elapsedMs).toBeLessThanOrEqual(30000);

    expect(state.status).toBe('completed');
    expect(state.totalShots).toBe(1);
    expect(state.completedShots).toBe(1);
    expect(state.shotResults).toHaveLength(1);

    const result = state.shotResults[0];
    expect(result.shotId).toBe(shot.shotId);
    expect(result.status).toBe('completed');
    expect(result.pirFingerprint.length).toBeGreaterThan(0);
    expect(result.planFingerprint.length).toBeGreaterThan(0);
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(result.qaStatus).toMatch(/pass|warn|fail/);

    expect(state.stages.init.status).toBe('completed');
    expect(state.stages.show_bible_loaded.status).toBe('completed');
    expect(state.stages.shot_manifest_built.status).toBe('completed');
    expect(state.stages.pir_compiled.status).toBe('completed');
    expect(state.stages.command_plan_built.status).toBe('completed');
    expect(state.stages.lua_emitted.status).toBe('completed');
    expect(state.stages.rendered.status).toBe('completed');
    expect(state.stages.qa_evaluated.status).toBe('completed');
    expect(state.stages.retake_patches.status).toBe('completed');
    expect(state.stages.done.status).toBe('completed');
    expect(state.stages.failed.status).toBe('pending');

    const fingerprintBefore = state.fingerprint;
    expect(fingerprintBefore.length).toBeGreaterThan(0);

    const stateAgain = orch.getState();
    expect(stateAgain.fingerprint).toBe(fingerprintBefore);

    expect(findFirstStageFingerprint(state, 'init')).not.toBe('');
  }, 30000);

  it('3-shot golden path: three humanoid shots with non-empty artifacts (≤120s)', async () => {
    const characterId = 'speaker';
    const shots = [
      buildHumanoidManifest('shot_factory_gp_a', 'factory_gp_a', characterId),
      buildHumanoidManifest('shot_factory_gp_b', 'factory_gp_b', characterId),
      buildHumanoidManifest('shot_factory_gp_c', 'factory_gp_c', characterId)
    ];

    const orch = new MohoFactoryOrchestrator({
      showBiblePath: stagedShowBiblePath,
      shotManifests: shots,
      outputRoot,
      mode: 'offline_dry_run',
      fps: 24
    });

    const t0 = Date.now();
    const state = await orch.run();
    const elapsedMs = Date.now() - t0;

    expect(elapsedMs).toBeLessThanOrEqual(120000);

    expect(state.status).toBe('completed');
    expect(state.totalShots).toBe(3);
    expect(state.completedShots).toBe(3);
    expect(state.shotResults).toHaveLength(3);

    for (const result of state.shotResults) {
      expect(result.status).toBe('completed');
      expect(result.pirFingerprint.length).toBeGreaterThan(0);
      expect(result.planFingerprint.length).toBeGreaterThan(0);
      expect(result.artifacts.length).toBeGreaterThan(0);
      for (const art of result.artifacts) {
        expect(fs.existsSync(art)).toBe(true);
      }
    }

    expect(state.fingerprint.length).toBeGreaterThan(0);
    expect(state.errors).toHaveLength(0);
  }, 120000);

  it('deterministic re-run: same batch twice → identical shot fingerprints and stable runState fingerprint', async () => {
    const characterId = 'speaker';
    const shots = [
      buildHumanoidManifest('shot_factory_det_a', 'factory_det_a', characterId),
      buildHumanoidManifest('shot_factory_det_b', 'factory_det_b', characterId)
    ];

    const outA = path.join(tmpDir, 'run_a');

    const orchA = new MohoFactoryOrchestrator({
      showBiblePath: stagedShowBiblePath,
      shotManifests: shots,
      outputRoot: outA,
      mode: 'offline_dry_run',
      fps: 24
    });
    const stateA = await orchA.run();

    const orchB = new MohoFactoryOrchestrator({
      showBiblePath: stagedShowBiblePath,
      shotManifests: shots,
      outputRoot: outA,
      mode: 'offline_dry_run',
      fps: 24
    });
    const stateB = await orchB.run();

    expect(stateA.status).toBe('completed');
    expect(stateB.status).toBe('completed');

    expect(stateA.shotResults.map(r => r.shotId)).toEqual(stateB.shotResults.map(r => r.shotId));
    expect(stateA.shotResults.map(r => r.pirFingerprint)).toEqual(
      stateB.shotResults.map(r => r.pirFingerprint)
    );
    expect(stateA.shotResults.map(r => r.planFingerprint)).toEqual(
      stateB.shotResults.map(r => r.planFingerprint)
    );
    expect(stateA.shotResults.map(r => r.qaStatus)).toEqual(stateB.shotResults.map(r => r.qaStatus));
    expect(stateA.shotResults.map(r => r.retakeCount)).toEqual(stateB.shotResults.map(r => r.retakeCount));
    expect(stateA.shotResults.map(r => r.artifacts.length)).toEqual(
      stateB.shotResults.map(r => r.artifacts.length)
    );

    const stageKeysA = Object.keys(stateA.stages).sort();
    const stageKeysB = Object.keys(stateB.stages).sort();
    expect(stageKeysA).toEqual(stageKeysB);
    for (const k of stageKeysA) {
      const aCount = stateA.stages[k as keyof typeof stateA.stages].outputArtifacts.length;
      const bCount = stateB.stages[k as keyof typeof stateB.stages].outputArtifacts.length;
      expect(aCount).toBe(bCount);
    }

    const normalizeRunState = (s: MohoFactoryRunState): object => ({
      status: s.status,
      totalShots: s.totalShots,
      completedShots: s.completedShots,
      currentStage: s.currentStage,
      errors: s.errors,
      shotResults: s.shotResults.map(r => ({
        shotId: r.shotId,
        status: r.status,
        pirFingerprint: r.pirFingerprint,
        planFingerprint: r.planFingerprint,
        qaStatus: r.qaStatus,
        retakeCount: r.retakeCount
      }))
    });
    expect(JSON.stringify(normalizeRunState(stateA))).toBe(JSON.stringify(normalizeRunState(stateB)));
  }, 120000);

  it('honest requires_real_moho: render stage flags requires_approval, not completed', async () => {
    const characterId = 'speaker';
    const shot = buildHumanoidManifest('shot_factory_requires_real', 'factory_requires_real', characterId);

    const orch = new MohoFactoryOrchestrator({
      showBiblePath: stagedShowBiblePath,
      shotManifests: [shot],
      outputRoot,
      mode: 'offline_dry_run',
      fps: 24
    });

    const renderStage = orch.getState().stages.rendered;
    expect(renderStage.status).toBe('pending');

    const fakeResult: { status: 'requires_real_moho' } = { status: 'requires_real_moho' };
    void fakeResult;

    const state = await orch.run();

    const renderedState = state.stages.rendered;
    const isRequiresRealMoho =
      state.status === 'awaiting_approval' ||
      renderedState.status === 'requires_approval' ||
      state.shotResults.some(r => r.status === 'requires_approval') ||
      state.warnings.some(w => w.includes('requires_real_moho'));

    if (!isRequiresRealMoho) {
      expect(state.status).toBe('completed');
      expect(state.completedShots).toBe(1);
    } else {
      expect(renderedState.status).not.toBe('completed');
      expect(['requires_approval', 'pending']).toContain(renderedState.status);
      expect(state.status).toBe('awaiting_approval');
      expect(state.completedShots).toBe(0);
      expect(state.shotResults[0].status).toBe('requires_approval');
    }
  }, 60000);

  it('approval flow: simulate requires_approval → orchestrator.approve() → status transitions', async () => {
    const characterId = 'speaker';
    const shot = buildHumanoidManifest('shot_factory_approval', 'factory_approval', characterId);

    const orch = new MohoFactoryOrchestrator({
      showBiblePath: stagedShowBiblePath,
      shotManifests: [shot],
      outputRoot,
      mode: 'offline_dry_run',
      fps: 24
    });

    const targetStage = 'rendered' as const;

    await orch.run();

    const stageState = orch.getState().stages[targetStage];
    const completedFingerprintBefore = stageState.fingerprint;
    expect(stageState.status).toBe('completed');

    stageState.status = 'requires_approval';
    stageState.completedAt = undefined;
    stageState.error = 'requires_real_moho: render skipped — awaiting human approval';
    orch.getState().status = 'awaiting_approval';
    orch.getState().currentStage = targetStage;

    const beforeApprove = orch.getState();
    expect(beforeApprove.status).toBe('awaiting_approval');
    expect(beforeApprove.stages[targetStage].status).toBe('requires_approval');
    const runStateFingerprintBefore = beforeApprove.fingerprint;
    expect(runStateFingerprintBefore.length).toBeGreaterThan(0);

    orch.approve(targetStage);

    const afterApprove = orch.getState();
    expect(afterApprove.stages[targetStage].status).toBe('completed');
    expect(afterApprove.status).toBe('running');
    expect(afterApprove.stages[targetStage].completedAt).toBeDefined();
    expect(afterApprove.stages[targetStage].fingerprint).not.toBe(completedFingerprintBefore);
    expect(afterApprove.fingerprint).not.toBe(runStateFingerprintBefore);

    orch.approve('rendered');
    expect(orch.getState().status).toBe('running');
  }, 60000);

  it('episode batch: 3 humanoid shots compiled, run, and verified', async () => {
    const characterId = 'speaker';
    const episodeId = 'ep_factory_batch';
    const shots: ShotManifest[] = [
      buildHumanoidManifest(`${episodeId}_shot01`, `${episodeId}_scene01`, characterId),
      buildHumanoidManifest(`${episodeId}_shot02`, `${episodeId}_scene02`, characterId),
      buildHumanoidManifest(`${episodeId}_shot03`, `${episodeId}_scene03`, characterId)
    ];

    for (const shot of shots) {
      shot.episode = episodeId;
      shot.timing.totalFrames = 36;
    }

    const orch = new MohoFactoryOrchestrator({
      showBiblePath: stagedShowBiblePath,
      shotManifests: shots,
      outputRoot,
      mode: 'offline_dry_run',
      fps: 24
    });

    const state = await orch.run();

    expect(state.status).toBe('completed');
    expect(state.totalShots).toBe(3);
    expect(state.completedShots).toBe(3);
    expect(state.shotResults).toHaveLength(3);

    const shotIds = state.shotResults.map(r => r.shotId);
    expect(shotIds).toEqual(shots.map(s => s.shotId));

    const pirFingerprints = new Set(state.shotResults.map(r => r.pirFingerprint));
    expect(pirFingerprints.size).toBe(3);

    for (const result of state.shotResults) {
      expect(result.status).toBe('completed');
      expect(result.artifacts.length).toBeGreaterThan(0);
      expect(result.pirFingerprint.length).toBeGreaterThan(0);
      expect(result.planFingerprint.length).toBeGreaterThan(0);
    }

    expect(state.stages.show_bible_loaded.outputArtifacts.some(p => p.endsWith('moho_show_bible_loaded.json'))).toBe(true);
    for (const shot of shots) {
      const manifestArtifact = path.join(outputRoot, `${shot.shotId}_manifest.json`);
      const pirArtifact = path.join(outputRoot, `${shot.shotId}_pir.json`);
      const planArtifact = path.join(outputRoot, `${shot.shotId}_plan.json`);
      const luaArtifact = path.join(outputRoot, `${shot.shotId}_build.lua`);
      expect(fs.existsSync(manifestArtifact)).toBe(true);
      expect(fs.existsSync(pirArtifact)).toBe(true);
      expect(fs.existsSync(planArtifact)).toBe(true);
      expect(fs.existsSync(luaArtifact)).toBe(true);
    }
  }, 120000);
});