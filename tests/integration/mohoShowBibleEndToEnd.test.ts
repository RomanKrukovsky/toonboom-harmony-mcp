import fs from 'fs';
import os from 'os';
import path from 'path';
import { MohoShowBibleLoader } from '../../src/services/mohoShowBibleLoader/index.js';
import { mohoShowBibleTools } from '../../src/tools/mohoShowBibleTools.js';
import { config } from '../../src/config.js';
import { crossReferenceShotManifest } from '../../src/schemas/shotManifest.js';
import type { ShotManifest } from '../../src/schemas/shotManifest.js';
import { validMohoShowBible } from '../fixtures/mohoShowBible.valid.js';

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

interface LoadTool {
  name: 'moho.show_bible.load';
  handler: (args: { showBiblePath: string }) => Promise<
    | { status: 'success'; loaded: unknown }
    | { status: 'error'; code: string; message: string }
  >;
}

function loadTool(): LoadTool {
  const tool = mohoShowBibleTools.find(t => t.name === 'moho.show_bible.load') as LoadTool | undefined;
  if (!tool) throw new Error('moho.show_bible.load tool not registered');
  return tool;
}

function validManifest(rigType: 'humanoid_2leg' | 'mechanical'): ShotManifest {
  return {
    schemaVersion: '1.0',
    shotId: `shot_test_${rigType}`,
    showId: 'demo_humanoid_speaker_v1',
    title: `Test shot ${rigType}`,
    logLine: 'Integration test fixture shot.',
    fps: 24,
    durationFrames: 24,
    resolution: { width: 1920, height: 1080 },
    staging: {
      shotSize: 'medium_shot',
      cameraMove: 'static',
      cameraMoveParams: {},
      positions: [{ characterId: 'speaker', x: 0.5, y: 0.5, depth: 0, entrance: 'cut' }]
    },
    rigType,
    beats: [
      {
        beatId: 'beat_1',
        index: 0,
        startFrame: 0,
        endFrame: 24,
        characterId: 'speaker',
        emotion: 'neutral',
        gesture: 'breathe',
        dialogue: null,
        camera: { shotSize: 'medium_shot', cameraMove: 'static' },
        notes: ''
      }
    ],
    provenance: { approver: 'integration-test', approvedAt: '2026-01-01T00:00:00.000Z' }
  } as unknown as ShotManifest;
}

describe('Moho ShowBible end-to-end integration', () => {
  let tmpDir: string;
  let stagedBundleDir: string;
  let originalAllowedRoots: string[];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-showbible-e2e-'));
    stagedBundleDir = path.join(tmpDir, 'moho_show_bible');
    copyDirSync(SAMPLE_BUNDLE_DIR, stagedBundleDir);

    const sampleLicensePath = path.join(stagedBundleDir, 'asset_license.json');
    const rawSampleLicense = JSON.parse(fs.readFileSync(sampleLicensePath, 'utf8'));
    const compliantLicense = {
      schemaVersion: '1.0',
      assetId: 'demo_speaker_rig_v1',
      creator: 'demo-rigger',
      source: 'commission',
      license: 'exclusive commercial assignment',
      commercialUse: true,
      modificationAllowed: true,
      datasetUseAllowed: true,
      redistributionAllowed: false,
      contractPath: rawSampleLicense.contractPath ?? './contracts/speaker.pdf',
      forbiddenTags: [],
      sha256: 'b'.repeat(64),
      notes: 'Patched for integration test compliance.'
    };
    fs.writeFileSync(sampleLicensePath, JSON.stringify(compliantLicense, null, 2), 'utf8');

    originalAllowedRoots = [...config.allowedRoots];
    config.allowedRoots = [tmpDir];
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    config.allowedRoots = originalAllowedRoots;
  });

  it('loads the sample bundle end-to-end and exposes canonical cross-refs', () => {
    const loader = new MohoShowBibleLoader();
    const loaded = loader.load(path.join(stagedBundleDir, 'moho_show_bible.json'));

    expect(loaded).toBeDefined();
    expect(loaded.mohoShowBible.showId).toBe('demo_humanoid_speaker_v1');
    expect(loaded.characterBibles).toHaveLength(1);
    expect(loaded.characterBibles[0].rigType).toBe('humanoid_2leg');

    expect(loaded.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(loaded.fingerprint).toHaveLength(64);

    expect(loaded.crossRefs.allowedRigTypes).toEqual(expect.arrayContaining(['humanoid_2leg']));
    expect(loaded.crossRefs.characterIds).toEqual(expect.arrayContaining(['speaker']));

    expect(loaded.crossRefs.cameraRules.allowedShotSizes.length).toBeGreaterThan(0);
    expect(loaded.crossRefs.motionGrammar.allowedEmotions.length).toBeGreaterThan(0);
  });

  it('produces the same fingerprint when the same bundle is loaded twice', () => {
    const loader = new MohoShowBibleLoader();
    const showBiblePath = path.join(stagedBundleDir, 'moho_show_bible.json');

    const fp1 = loader.load(showBiblePath).fingerprint;
    const fp2 = loader.load(showBiblePath).fingerprint;

    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('crossRefs gate a fake shot manifest correctly (humanoid allowed, mechanical rejected)', () => {
    const loader = new MohoShowBibleLoader();
    const loaded = loader.load(path.join(stagedBundleDir, 'moho_show_bible.json'));

    const refs = {
      characterIds: loaded.crossRefs.characterIds,
      allowedRigTypes: loaded.crossRefs.allowedRigTypes,
      cameraRules: loaded.crossRefs.cameraRules,
      motionGrammar: loaded.crossRefs.motionGrammar
    };

    const humanoidManifest = validManifest('humanoid_2leg');
    const humanoidViolations = crossReferenceShotManifest(humanoidManifest, refs);
    const humanoidRigViolations = humanoidViolations.filter(v => v.kind === 'unknown_rig_type');
    expect(humanoidRigViolations).toHaveLength(0);

    const mechanicalManifest = validManifest('mechanical');
    const mechanicalViolations = crossReferenceShotManifest(mechanicalManifest, refs);
    const mechanicalRigViolations = mechanicalViolations.filter(v => v.kind === 'unknown_rig_type');
    expect(mechanicalRigViolations).toHaveLength(1);
    expect(mechanicalRigViolations[0].ref).toBe('mechanical');
  });

  it('round-trips through the moho.show_bible.load MCP tool', async () => {
    const showDir = path.join(tmpDir, 'fixture_show');
    fs.mkdirSync(showDir, { recursive: true });

    const showBible = validMohoShowBible({ characterId: 'speaker', rigType: 'humanoid_2leg' });
    const biblePath = path.join(showDir, 'moho_show_bible.json');
    fs.writeFileSync(biblePath, JSON.stringify(showBible, null, 2), 'utf8');

    fs.writeFileSync(
      path.join(showDir, 'palette_manifest.json'),
      JSON.stringify({
        schemaVersion: '1.0',
        paletteId: 'palette_test_v1',
        name: 'Test Palette',
        paletteType: 'rgb',
        maxColours: 256,
        colours: [
          { colourId: 'char_line', name: 'Line', rgba: '#111111FF', usage: 'line', locked: true, mohoColourIndex: 0 },
          { colourId: 'char_fill', name: 'Fill', rgba: '#E07A5FFF', usage: 'fill', locked: true, mohoColourIndex: 1 },
          { colourId: 'char_shadow', name: 'Shadow', rgba: '#7A4A2BFF', usage: 'shadow', locked: true, mohoColourIndex: 2 }
        ],
        provenance: { approver: 'test-artist', approvedAt: '2026-01-01T00:00:00.000Z' }
      }, null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(showDir, 'camera_rules.json'),
      JSON.stringify({
        schemaVersion: '1.0',
        rulesId: 'camera_test_v1',
        allowedShotSizes: ['medium_shot'],
        allowedCameraMoves: ['static'],
        defaultShotSize: 'medium_shot',
        safeMargins: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 },
        forbiddenMoves: [],
        mohoCameraRigType: 'perspective',
        maxFieldOfViewDeg: 45,
        allowCameraShake: false,
        provenance: { approver: 'test-artist', approvedAt: '2026-01-01T00:00:00.000Z' }
      }, null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(showDir, 'motion_grammar.json'),
      JSON.stringify({
        schemaVersion: '1.0',
        grammarId: 'motion_test_v1',
        rules: [
          {
            ruleId: 'idle_sway',
            description: 'Idle',
            allowedGestures: ['breathe'],
            forbiddenGestures: [],
            allowedEmotions: ['neutral'],
            poseLibraryRefs: [],
            timing: { minHoldFrames: 2, maxHoldFrames: 24, anticipationFrames: 0, followThroughFrames: 4 },
            boneConstraints: [],
            physicsChannels: []
          }
        ],
        defaultTiming: { fps: 24, minBeatFrames: 2, maxBeatFrames: 48 },
        defaultEasing: 'ease_in_out',
        provenance: { approver: 'test-artist', approvedAt: '2026-01-01T00:00:00.000Z' }
      }, null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(showDir, 'qa_thresholds.json'),
      JSON.stringify({
        schemaVersion: '1.0',
        thresholdsId: 'qa_test_v1',
        silhouetteQualityMin: 0.7,
        lipsyncDriftMaxMs: 80,
        continuityMaxDeltaFrames: 2,
        lineThicknessTolerancePt: 0.5,
        paletteDeltaMax: 0.02,
        poseLibraryMatchMin: 0.85,
        autoFixableSeverityMax: 'medium',
        requireHumanApprovalFor: ['key_pose'],
        boneAngleToleranceDeg: 2,
        meshWarpMaxPointsMoved: 8,
        switchLayerMaxChangesPerSecond: 6,
        forbidOrphanBones: true,
        provenance: { approver: 'test-artist', approvedAt: '2026-01-01T00:00:00.000Z' }
      }, null, 2),
      'utf8'
    );

    const fixtureRoot = path.join(showDir, 'bibles');
    fs.mkdirSync(fixtureRoot, { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, 'speaker.json'),
      JSON.stringify({
        schemaVersion: '1.0',
        characterId: 'speaker',
        name: 'Speaker',
        role: 'protagonist',
        rigType: 'humanoid_2leg',
        rigPath: 'rigs/speaker.moho',
        turnaroundViews: ['front', 'side_left', 'side_right'],
        proportions: { headHeightRatio: 0.25, armSpanRatio: 1.0 },
        lineRules: { lineThicknessPt: 2.0, lineColourId: 'char_line' },
        controllers: [
          { controllerId: 'HEAD_ROT', boneId: 0, boneName: 'head_root', purpose: 'Head rotation', range: { min: -45, max: 45, units: 'degrees' }, channel: 'rotation' },
          { controllerId: 'BODY_TRANSLATE', boneId: 1, boneName: 'body_root', purpose: 'Body translate', range: { min: -200, max: 200, units: 'pixels' }, channel: 'translation' },
          { controllerId: 'LEFT_ARM_ROT', boneId: 2, boneName: 'arm_left', purpose: 'Left arm', range: { min: -90, max: 180, units: 'degrees' }, channel: 'rotation' },
          { controllerId: 'RIGHT_ARM_ROT', boneId: 3, boneName: 'arm_right', purpose: 'Right arm', range: { min: -180, max: 90, units: 'degrees' }, channel: 'rotation' },
          { controllerId: 'MOUTH_DIAL', boneId: 4, boneName: 'mouth_dial', purpose: 'Mouth', range: { min: 0, max: 1, units: 'normalized' }, channel: 'scale' },
          { controllerId: 'EYE_BLINK', boneId: 5, boneName: 'eye_blink', purpose: 'Blink', range: { min: 0, max: 1, units: 'normalized' }, channel: 'opacity' }
        ],
        switchLayers: [],
        mouthShapes: [{ shapeId: 'Rest', drawingName: 'mouth_rest', phonemes: [] }],
        expressions: [{ expressionId: 'neutral', drawingName: 'expr_neutral', controllerOverrides: [] }],
        gestureLibrary: [],
        paletteRef: 'palette_test_v1',
        provenance: {
          approver: 'test-artist',
          approvedAt: '2026-01-01T00:00:00.000Z',
          rigAuthor: 'test-rigger',
          licensePath: 'speaker.license.json'
        }
      }, null, 2),
      'utf8'
    );

    const compliantLicense = {
      schemaVersion: '1.0',
      assetId: 'speaker_rig_v1',
      creator: 'test-rigger',
      source: 'commission',
      license: 'exclusive commercial assignment',
      commercialUse: true,
      modificationAllowed: true,
      datasetUseAllowed: true,
      redistributionAllowed: false,
      contractPath: './speaker.pdf',
      forbiddenTags: [],
      sha256: 'c'.repeat(64),
      notes: 'Integration test fixture licence.'
    };
    fs.writeFileSync(
      path.join(showDir, 'speaker.license.json'),
      JSON.stringify(compliantLicense, null, 2),
      'utf8'
    );

    const fixtureShowBible = JSON.parse(fs.readFileSync(biblePath, 'utf8'));
    fixtureShowBible.characterBibles = [{ characterId: 'speaker', ref: 'bibles/speaker.json' }];
    fixtureShowBible.paletteManifestRef = 'palette_manifest.json';
    fixtureShowBible.cameraRulesRef = 'camera_rules.json';
    fixtureShowBible.motionGrammarRef = 'motion_grammar.json';
    fixtureShowBible.qaThresholdsRef = 'qa_thresholds.json';
    fs.writeFileSync(biblePath, JSON.stringify(fixtureShowBible, null, 2), 'utf8');

    const tool = loadTool();
    const result = await tool.handler({ showBiblePath: biblePath });

    if (result.status !== 'success') {
      throw new Error(`tool round-trip failed: ${result.code} — ${result.message}`);
    }

    const loaded = result.loaded as {
      mohoShowBible: { showId: string };
      characterBibles: Array<{ characterId: string; rigType: string }>;
      crossRefs: { allowedRigTypes: string[]; characterIds: string[] };
      fingerprint: string;
    };

    expect(loaded).toBeDefined();
    expect(loaded.mohoShowBible.showId).toBe('show_test_v1');
    expect(loaded.characterBibles).toHaveLength(1);
    expect(loaded.characterBibles[0].characterId).toBe('speaker');
    expect(loaded.characterBibles[0].rigType).toBe('humanoid_2leg');
    expect(loaded.crossRefs.allowedRigTypes).toEqual(expect.arrayContaining(['humanoid_2leg']));
    expect(loaded.crossRefs.characterIds).toEqual(['speaker']);
    expect(loaded.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});