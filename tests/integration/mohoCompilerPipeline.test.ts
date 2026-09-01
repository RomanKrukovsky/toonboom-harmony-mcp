import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { MohoShowBibleLoader } from '../../src/services/mohoShowBibleLoader/index.js';
import { MohoPerformancePirCompiler } from '../../src/services/mohoPerformancePirCompiler/index.js';
import { MohoCommandBuilder } from '../../src/services/mohoCommandBuilder/index.js';
import { emitMohoLua } from '../../src/services/mohoLuaEmitter/index.js';
import { mohoCommandPlanSchema } from '../../src/schemas/mohoCommandPlan.js';
import type { ShotManifest, ShowBibleCrossRefs } from '../../src/schemas/shotManifest.js';
import type { MohoCharacterBible } from '../../src/schemas/mohoCharacterBible.js';
import type { MohoMotionGrammar } from '../../src/schemas/mohoMotionGrammar.js';
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
    notes: 'Patched for compiler-pipeline integration test compliance.'
  };
  fs.writeFileSync(licensePath, JSON.stringify(compliant, null, 2), 'utf8');
}

function buildHumanoidManifest(characterId: string): ShotManifest {
  return {
    schemaVersion: '1.0',
    shotId: 'shot_compiler_pipeline_humanoid',
    showBibleRef: './moho_show_bible.json',
    production: 'demo_production',
    episode: 'ep01',
    sceneName: 'pipeline_humanoid',
    rigType: 'humanoid_2leg',
    description: 'End-to-end pipeline test: humanoid speaker delivers neutral line.',
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
        beatId: 'beat_h1',
        startFrame: 1,
        endFrame: 24,
        characterId,
        intent: 'speak',
        emotion: 'neutral',
        audioCue: { transcript: 'hello there' }
      },
      {
        beatId: 'beat_h2',
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
      director: 'integration-test',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceScriptRef: './script/hello.txt'
    }
  };
}

function buildQuadManifest(characterId: string): ShotManifest {
  return {
    schemaVersion: '1.0',
    shotId: 'shot_compiler_pipeline_quad',
    showBibleRef: './moho_show_bible.json',
    production: 'demo_production',
    episode: 'ep01',
    sceneName: 'pipeline_quad',
    rigType: 'quadruped',
    description: 'End-to-end pipeline test: quadruped walks across the frame.',
    staging: {
      positions: [{ characterId, preset: 'center' }],
      shotSize: 'full_shot',
      cameraMove: 'truck_right',
      backgroundRef: './bg/forest.png'
    },
    timing: {
      totalFrames: 60,
      fps: 24,
      minBeatFrames: 2,
      maxBeatFrames: 60,
      anticipationFrames: 3,
      followThroughFrames: 5,
      pauseBeforeBeats: {}
    },
    beats: [
      {
        beatId: 'beat_q1',
        startFrame: 1,
        endFrame: 30,
        characterId,
        intent: 'walk',
        emotion: 'neutral'
      },
      {
        beatId: 'beat_q2',
        startFrame: 31,
        endFrame: 60,
        characterId,
        intent: 'trot',
        emotion: 'happy'
      }
    ],
    fx: [],
    render: { preview: true, format: 'mp4', quality: 'standard' },
    provenance: {
      director: 'integration-test',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceScriptRef: './script/walk.txt'
    }
  };
}

function buildQuadrupedBible(loaded: { characterBibles: MohoCharacterBible[]; motionGrammar: MohoMotionGrammar }): MohoCharacterBible {
  const speaker = loaded.characterBibles[0];
  return {
    schemaVersion: '1.0',
    characterId: 'walker',
    name: 'Walker',
    role: 'supporting',
    rigType: 'quadruped',
    rigPath: './rigs/walker.moho',
    turnaroundViews: ['front', 'side_left', 'side_right'],
    proportions: { headHeightRatio: 0.4, armSpanRatio: 0.6 },
    lineRules: { lineThicknessPt: 2.0, lineColourId: speaker.lineRules?.lineColourId ?? 'char_line' },
    controllers: [
      { controllerId: 'SPINE_ROT', boneId: 0, boneName: 'spine_root', purpose: 'Spine rotation', range: { min: -20, max: 20, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'FRONT_LEG_L', boneId: 1, boneName: 'front_left_leg', purpose: 'Front-left leg', range: { min: -45, max: 45, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'FRONT_LEG_R', boneId: 2, boneName: 'front_right_leg', purpose: 'Front-right leg', range: { min: -45, max: 45, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'BACK_LEG_L', boneId: 3, boneName: 'back_left_leg', purpose: 'Back-left leg', range: { min: -45, max: 45, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'BACK_LEG_R', boneId: 4, boneName: 'back_right_leg', purpose: 'Back-right leg', range: { min: -45, max: 45, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'TAIL_WAG', boneId: 5, boneName: 'tail_bone', purpose: 'Tail', range: { min: -30, max: 30, units: 'degrees' }, channel: 'rotation' }
    ],
    switchLayers: [
      {
        switchId: 'expression_walker',
        layerName: 'expression_walker_layer',
        choices: [
          { choiceId: 'neutral', drawingName: 'expr_neutral' },
          { choiceId: 'happy', drawingName: 'expr_happy' }
        ]
      }
    ],
    mouthShapes: [{ shapeId: 'Rest', drawingName: 'mouth_rest', phonemes: [] }],
    expressions: [
      { expressionId: 'neutral', drawingName: 'expr_neutral', controllerOverrides: [] },
      { expressionId: 'happy', drawingName: 'expr_happy', controllerOverrides: [] }
    ],
    gestureLibrary: [],
    paletteRef: speaker.paletteRef,
    provenance: {
      approver: 'demo-rigger',
      approvedAt: '2026-01-01T00:00:00.000Z',
      rigAuthor: 'demo',
      licensePath: './walker.license.json'
    }
  };
}

function buildCrossRefs(loaded: ReturnType<MohoShowBibleLoader['load']>): ShowBibleCrossRefs {
  return {
    characterIds: loaded.crossRefs.characterIds,
    allowedRigTypes: loaded.crossRefs.allowedRigTypes,
    cameraRules: loaded.crossRefs.cameraRules,
    motionGrammar: loaded.crossRefs.motionGrammar
  };
}

function patchShowBibleForQuad(stagedDir: string, quadBible: MohoCharacterBible, quadLicense: object): void {
  const showBiblePath = path.join(stagedDir, 'moho_show_bible.json');
  const show = JSON.parse(fs.readFileSync(showBiblePath, 'utf8'));
  show.allowedRigTypes = ['humanoid_2leg', 'quadruped'];
  show.characterBibles.push({ characterId: quadBible.characterId, ref: `./character_${quadBible.characterId}.json` });
  fs.writeFileSync(showBiblePath, JSON.stringify(show, null, 2), 'utf8');

  const quadBiblePath = path.join(stagedDir, `character_${quadBible.characterId}.json`);
  fs.writeFileSync(quadBiblePath, JSON.stringify(quadBible, null, 2), 'utf8');

  const quadLicensePath = path.join(stagedDir, 'walker.license.json');
  fs.writeFileSync(quadLicensePath, JSON.stringify(quadLicense, null, 2), 'utf8');
}

function runPipeline(opts: {
  loaded: ReturnType<MohoShowBibleLoader['load']>;
  manifest: ShotManifest;
  characterBible: MohoCharacterBible;
}): { planLua: string; planText: string; planHash: string; pirFingerprint: string } {
  const crossRefs = buildCrossRefs(opts.loaded);

  const pirResult = new MohoPerformancePirCompiler().compile({
    shotManifest: opts.manifest,
    characterBible: opts.characterBible,
    cameraRules: opts.loaded.cameraRules,
    motionGrammar: opts.loaded.motionGrammar,
    crossRefs
  });

  const { plan, fingerprint } = new MohoCommandBuilder().buildWithFingerprint({
    pir: pirResult.pir,
    characterBible: opts.characterBible
  });

  mohoCommandPlanSchema.parse(plan);

  const lua = emitMohoLua(plan, opts.characterBible.name);

  return {
    planLua: lua,
    planText: JSON.stringify(plan, null, 2),
    planHash: fingerprint,
    pirFingerprint: pirResult.pir.deterministicFingerprint
  };
}

describe('Moho compiler pipeline integration (SPRINT 2)', () => {
  let tmpDir: string;
  let stagedBundleDir: string;
  let originalAllowedRoots: string[];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-compiler-pipeline-'));
    stagedBundleDir = path.join(tmpDir, 'moho_show_bible');
    copyDirSync(SAMPLE_BUNDLE_DIR, stagedBundleDir);

    patchLicenseForCompliance(path.join(stagedBundleDir, 'asset_license.json'), 'demo_speaker_rig_v1');

    const loadedForQuad = new MohoShowBibleLoader().load(SAMPLE_SHOW_BIBLE_PATH);
    const quadBible = buildQuadrupedBible(loadedForQuad);
    const quadLicense = {
      schemaVersion: '1.0',
      assetId: 'demo_walker_rig_v1',
      creator: 'demo-rigger',
      source: 'commission',
      license: 'exclusive commercial assignment',
      commercialUse: true,
      modificationAllowed: true,
      datasetUseAllowed: true,
      redistributionAllowed: false,
      contractPath: './walker.pdf',
      forbiddenTags: [],
      sha256: 'e'.repeat(64),
      notes: 'Quadruped test fixture licence.'
    };
    patchShowBibleForQuad(stagedBundleDir, quadBible, quadLicense);

    originalAllowedRoots = [...config.allowedRoots];
    config.allowedRoots = [SAMPLE_BUNDLE_DIR, tmpDir];
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    config.allowedRoots = originalAllowedRoots;
  });

  it('humanoid: load -> compile -> build plan -> emit Lua with expected ops', () => {
    const loader = new MohoShowBibleLoader();
    const loaded = loader.load(path.join(stagedBundleDir, 'moho_show_bible.json'));
    const characterBible = loaded.characterBibles[0];
    const manifest = buildHumanoidManifest(characterBible.characterId);

    const { planLua } = runPipeline({ loaded, manifest, characterBible });

    expect(planLua).toContain('-- Generated by MohoRigPlanCompiler v1');
    expect(planLua).toMatch(/addBone\(\s*"root_bone"/);
    expect(planLua).toMatch(/addBone\(\s*"head_bone"/);
    expect(planLua).toMatch(/createSwitchLayer\(\s*"mouth_switch_layer"\s*\)/);
    expect(planLua).toMatch(/createSwitchLayer\(\s*"eye_switch_layer"\s*\)/);
    expect(planLua).toMatch(/addSwitchChoice\([^)]*,\s*"mouth_a"\s*\)/);
    expect(planLua).toMatch(/createSmartAction\(\s*"nod"/);
    expect(planLua).toMatch(/setBoneChannelKey\(\s*"head_bone",\s*"",\s*1,\s*"rotation"/);
    expect(planLua).toMatch(/setBoneChannelKey\(\s*"jaw_bone",\s*"",\s*1,\s*"rotation"/);
    expect(planLua).toMatch(/verifyRig\(\s*7,\s*2,\s*0,\s*0,\s*0\s*\)/);
    expect(planLua).toContain('saveDocument(nil)');

    const helperAddBoneRefs = 2;
    const addBoneCount = (planLua.match(/addBone\(/g) ?? []).length - helperAddBoneRefs;
    expect(addBoneCount).toBe(characterBible.controllers.length);

    const createSwitchLayerCount = (planLua.match(/createSwitchLayer\(/g) ?? []).length - 1;
    expect(createSwitchLayerCount).toBe(characterBible.switchLayers.length);

    const totalChoices = characterBible.switchLayers.reduce((acc, sw) => acc + sw.choices.length, 0);
    const addChoiceCount = (planLua.match(/addSwitchChoice\(/g) ?? []).length - 1;
    expect(addChoiceCount).toBe(totalChoices);

    const pirBoneKeys = 2 * characterBible.controllers.length * manifest.beats.length;
    const setBoneKeyCount = (planLua.match(/setBoneChannelKey\(/g) ?? []).length - 1;
    expect(setBoneKeyCount).toBeGreaterThanOrEqual(pirBoneKeys);
  });

  it('quadruped: load -> compile -> build plan -> emit Lua with quad rig ops', () => {
    const loader = new MohoShowBibleLoader();
    const loaded = loader.load(path.join(stagedBundleDir, 'moho_show_bible.json'));
    const quadBible = loaded.characterBibles.find(cb => cb.characterId === 'walker');
    expect(quadBible).toBeDefined();
    expect(quadBible!.rigType).toBe('quadruped');

    const manifest = buildQuadManifest('walker');
    const { planLua } = runPipeline({ loaded, manifest, characterBible: quadBible! });

    expect(planLua).toMatch(/addBone\(\s*"spine_root"/);
    expect(planLua).toMatch(/addBone\(\s*"front_left_leg"/);
    expect(planLua).toMatch(/addBone\(\s*"front_right_leg"/);
    expect(planLua).toMatch(/addBone\(\s*"back_left_leg"/);
    expect(planLua).toMatch(/addBone\(\s*"back_right_leg"/);
    expect(planLua).toMatch(/addBone\(\s*"tail_bone"/);
    expect(planLua).toMatch(/createSwitchLayer\(\s*"expression_walker_layer"\s*\)/);
    expect(planLua).toMatch(/verifyRig\(\s*6,\s*1,\s*0,\s*0,\s*0\s*\)/);

    const helperAddBoneRefs = 2;
    const addBoneCount = (planLua.match(/addBone\(/g) ?? []).length - helperAddBoneRefs;
    expect(addBoneCount).toBe(quadBible!.controllers.length);
  });

  it('plan reusability: compile once -> emit Lua twice -> identical output', () => {
    const loader = new MohoShowBibleLoader();
    const loaded = loader.load(path.join(stagedBundleDir, 'moho_show_bible.json'));
    const characterBible = loaded.characterBibles[0];
    const manifest = buildHumanoidManifest(characterBible.characterId);

    const crossRefs = buildCrossRefs(loaded);
    const pirResult = new MohoPerformancePirCompiler().compile({
      shotManifest: manifest,
      characterBible,
      cameraRules: loaded.cameraRules,
      motionGrammar: loaded.motionGrammar,
      crossRefs
    });
    const { plan } = new MohoCommandBuilder().buildWithFingerprint({
      pir: pirResult.pir,
      characterBible
    });

    const lua1 = emitMohoLua(plan, characterBible.name);
    const lua2 = emitMohoLua(plan, characterBible.name);

    expect(lua1).toBe(lua2);
    expect(lua1.length).toBeGreaterThan(0);

    const h1 = crypto.createHash('sha256').update(lua1).digest('hex');
    const h2 = crypto.createHash('sha256').update(lua2).digest('hex');
    expect(h1).toBe(h2);
  });

  it('PerformancePIR -> CommandBuilder plan -> Lua emitter round-trip (no schema mismatch)', () => {
    const loader = new MohoShowBibleLoader();
    const loaded = loader.load(path.join(stagedBundleDir, 'moho_show_bible.json'));
    const characterBible = loaded.characterBibles[0];
    const manifest = buildHumanoidManifest(characterBible.characterId);

    const crossRefs = buildCrossRefs(loaded);
    const pirResult = new MohoPerformancePirCompiler().compile({
      shotManifest: manifest,
      characterBible,
      cameraRules: loaded.cameraRules,
      motionGrammar: loaded.motionGrammar,
      crossRefs
    });

    expect(pirResult.violations.filter(v => v.kind === 'unknown_rig_type')).toHaveLength(0);

    const { plan } = new MohoCommandBuilder().buildWithFingerprint({
      pir: pirResult.pir,
      characterBible
    });

    const parsedPlan = mohoCommandPlanSchema.safeParse(plan);
    expect(parsedPlan.success).toBe(true);
    if (!parsedPlan.success) {
      throw new Error(`plan failed schema validation: ${JSON.stringify(parsedPlan.error.issues)}`);
    }

    expect(parsedPlan.data.operations.length).toBeGreaterThan(0);

    const expectedOpTypes = new Set(parsedPlan.data.operations.map(op => op.type));
    expect(expectedOpTypes.has('add_bone')).toBe(true);
    expect(expectedOpTypes.has('create_switch_layer')).toBe(true);
    expect(expectedOpTypes.has('add_switch_choice')).toBe(true);
    expect(expectedOpTypes.has('set_action_channel_key')).toBe(true);
    expect(expectedOpTypes.has('verify_rig')).toBe(true);
    expect(expectedOpTypes.has('save_document')).toBe(true);

    let lua: string;
    expect(() => {
      lua = emitMohoLua(parsedPlan.data, characterBible.name);
    }).not.toThrow();

    const luaText = lua!;
    expect(luaText).toContain('-- Generated by MohoRigPlanCompiler v1');
    expect(luaText).toContain(`Plan: ${parsedPlan.data.planId}`);

    for (const op of parsedPlan.data.operations) {
      const searchToken = op.params.name ?? op.params.layerName ?? op.params.boneName ?? op.params.actionName ?? op.params.boneId ?? null;
      if (typeof searchToken === 'string' && searchToken.length > 0) {
        expect(luaText).toContain(searchToken);
      }
    }
  });

  it('whole-pipeline determinism: two full runs -> identical Lua output', () => {
    const loader = new MohoShowBibleLoader();
    const loaded = loader.load(path.join(stagedBundleDir, 'moho_show_bible.json'));
    const characterBible = loaded.characterBibles[0];
    const manifest = buildHumanoidManifest(characterBible.characterId);

    const run1 = runPipeline({ loaded, manifest, characterBible });
    const run2 = runPipeline({ loaded, manifest, characterBible });

    expect(run1.pirFingerprint).toBe(run2.pirFingerprint);
    expect(run1.planHash).toBe(run2.planHash);

    const plan1 = JSON.parse(run1.planText) as { operations: unknown[]; planId: string; createdAt: string };
    const plan2 = JSON.parse(run2.planText) as { operations: unknown[]; planId: string; createdAt: string };
    expect(plan1.createdAt).toBe(plan2.createdAt);
    expect(JSON.stringify(plan1.operations)).toBe(JSON.stringify(plan2.operations));

    const normalize = (lua: string): string =>
      lua.replace(/Plan: MOHO-[A-F0-9]+/g, 'Plan: <PLAN_ID>').replace(/"MOHO-[A-F0-9]+"/g, '"<PLAN_ID>"');
    expect(normalize(run1.planLua)).toBe(normalize(run2.planLua));

    const hash1 = crypto.createHash('sha256').update(normalize(run1.planLua)).digest('hex');
    const hash2 = crypto.createHash('sha256').update(normalize(run2.planLua)).digest('hex');
    expect(hash1).toBe(hash2);
  });
});
