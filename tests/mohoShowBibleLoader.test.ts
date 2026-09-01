import fs from 'fs';
import os from 'os';
import path from 'path';
import { MohoShowBibleLoader } from '../src/services/mohoShowBibleLoader/index.js';
import { HarmonyError } from '../src/security.js';
import { config } from '../src/config.js';

const APPROVER = 'td_lead';
const APPROVED_AT = '2026-07-27T12:00:00Z';

function writeJson(p: string, obj: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj), 'utf8');
}

interface BundleFiles {
  mohoShowBiblePath: string;
  characterBiblePath: string;
  licensePath: string;
  palettePath: string;
  cameraRulesPath: string;
  motionGrammarPath: string;
  qaThresholdsPath: string;
}

interface BundleOverrides {
  rigType?: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';
  allowedRigTypes?: Array<'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical'>;
  paletteRefOverride?: string;
  license?: Record<string, unknown>;
  lineColourId?: string;
  fillColourId?: string;
  shadowColourId?: string;
}

function buildMohoShowBibleFamily(root: string, overrides: BundleOverrides = {}): BundleFiles {
  const showDir = path.join(root, 'show');
  const mohoShowBiblePath = path.join(showDir, 'moho_show_bible.json');
  const palettePath = path.join(showDir, 'palette_manifest.json');
  const characterBiblePath = path.join(showDir, 'character_bible_gramps.json');
  const cameraRulesPath = path.join(showDir, 'camera_rules.json');
  const motionGrammarPath = path.join(showDir, 'motion_grammar.json');
  const qaThresholdsPath = path.join(showDir, 'qa_thresholds.json');
  const licensePath = path.join(showDir, 'legal', 'gramps_license.json');

  const allowedRigTypes = overrides.allowedRigTypes ?? ['humanoid_2leg', 'quadruped'];
  const rigType = overrides.rigType ?? 'humanoid_2leg';
  const lineColourId = overrides.lineColourId ?? 'line_main';
  const fillColourId = overrides.fillColourId ?? 'fill_skin';
  const shadowColourId = overrides.shadowColourId ?? 'shadow_soft';
  const paletteRef = overrides.paletteRefOverride ?? 'palette_main_v1';

  const license = overrides.license ?? {
    schemaVersion: '1.0',
    assetId: 'gramps_rig_v1',
    creator: 'rigger_a',
    source: 'commission',
    license: 'exclusive commercial assignment',
    commercialUse: true,
    modificationAllowed: true,
    datasetUseAllowed: true,
    redistributionAllowed: false,
    contractPath: 'legal/gramps.pdf',
    forbiddenTags: [],
    sha256: 'a'.repeat(64)
  };
  writeJson(licensePath, license);

  writeJson(palettePath, {
    schemaVersion: '1.0',
    paletteId: paletteRef,
    name: 'Polygon Show Moho Palette',
    colours: [
      { colourId: lineColourId, name: 'Outline', rgba: '#1A1A1AFF', usage: 'line', locked: true, mohoColourIndex: 0 },
      { colourId: fillColourId, name: 'Skin', rgba: '#FF8C6BFF', usage: 'skin', locked: true, mohoColourIndex: 1 },
      { colourId: shadowColourId, name: 'Soft Shadow', rgba: '#3A2A20FF', usage: 'shadow', locked: true, mohoColourIndex: 2 }
    ],
    paletteType: 'rgb',
    maxColours: 256,
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  writeJson(characterBiblePath, {
    schemaVersion: '1.0',
    characterId: 'char_gramps_v1',
    name: 'Gramps',
    role: 'supporting',
    rigType,
    rigPath: 'rigs/gramps/gramps.xstage',
    turnaroundViews: ['front', 'front_3q_left', 'side_left'],
    controllers: [{
      controllerId: 'HEAD_ROT',
      boneId: 1,
      boneName: 'Head',
      purpose: 'head rotation',
      range: { min: -45, max: 45, units: 'degrees' },
      channel: 'rotation'
    }],
    switchLayers: [],
    mouthShapes: [{ shapeId: 'Rest', drawingName: 'mouth_rest', phonemes: [] }],
    expressions: [{ expressionId: 'neutral', controllerOverrides: [] }],
    gestureLibrary: [],
    paletteRef,
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT, rigAuthor: 'rigger_a', licensePath: 'legal/gramps_license.json' }
  });

  writeJson(cameraRulesPath, {
    schemaVersion: '1.0',
    rulesId: 'polygon_show_moho_camera_rules_v1',
    allowedShotSizes: ['close_up', 'medium_shot'],
    allowedCameraMoves: ['static', 'pan_left'],
    defaultShotSize: 'medium_shot',
    safeMargins: { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
    forbiddenMoves: [],
    mohoCameraRigType: 'orthographic',
    maxFieldOfViewDeg: 45,
    allowCameraShake: false,
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  writeJson(motionGrammarPath, {
    schemaVersion: '1.0',
    grammarId: 'grammar_gramps_v1',
    rules: [{
      ruleId: 'rule_dialogue',
      description: 'Default dialogue beat',
      allowedGestures: ['point', 'nod'],
      forbiddenGestures: ['spin'],
      allowedEmotions: ['neutral', 'surprise'],
      poseLibraryRefs: ['pose/neutral_front'],
      timing: { minHoldFrames: 2, maxHoldFrames: 48, anticipationFrames: 4, followThroughFrames: 6 },
      boneConstraints: [],
      physicsChannels: []
    }],
    defaultTiming: { fps: 24, minBeatFrames: 2, maxBeatFrames: 96 },
    defaultEasing: 'ease_in_out',
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  writeJson(qaThresholdsPath, {
    schemaVersion: '1.0',
    thresholdsId: 'qa_gramps_v1',
    silhouetteQualityMin: 0.7,
    lipsyncDriftMaxMs: 80,
    continuityMaxDeltaFrames: 2,
    lineThicknessTolerancePt: 0.5,
    paletteDeltaMax: 0.02,
    poseLibraryMatchMin: 0.85,
    autoFixableSeverityMax: 'medium',
    requireHumanApprovalFor: ['key_pose', 'camera_move'],
    boneAngleToleranceDeg: 2,
    meshWarpMaxPointsMoved: 8,
    switchLayerMaxChangesPerSecond: 6,
    forbidOrphanBones: true,
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  writeJson(mohoShowBiblePath, {
    schemaVersion: '1.0',
    showId: 'polygon_show_moho_v1',
    title: 'Polygon Show (Moho)',
    logLine: 'One character, one Moho scene.',
    fps: 24,
    resolution: { width: 1920, height: 1080 },
    visualStyle: 'flat vector Moho',
    lineRules: { defaultThicknessPt: 2.0, lineColourId, fillColourId },
    lighting: { type: 'flat', shadowColourId },
    allowedDeformations: ['peg_transform', 'bone_deformer', 'smart_bone_dial'],
    allowedRigTypes,
    characterBibles: [{ characterId: 'char_gramps_v1', ref: 'character_bible_gramps.json' }],
    paletteManifestRef: 'palette_manifest.json',
    cameraRulesRef: 'camera_rules.json',
    motionGrammarRef: 'motion_grammar.json',
    qaThresholdsRef: 'qa_thresholds.json',
    forbiddenSources: ['NC'],
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  return {
    mohoShowBiblePath,
    characterBiblePath,
    licensePath,
    palettePath,
    cameraRulesPath,
    motionGrammarPath,
    qaThresholdsPath
  };
}

describe('MohoShowBibleLoader', () => {
  let tmpDir: string;
  let originalAllowedRoots: string[];
  let loader: MohoShowBibleLoader;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-showbible-test-'));
    originalAllowedRoots = [...config.allowedRoots];
    config.allowedRoots = [tmpDir];
    loader = new MohoShowBibleLoader();
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    config.allowedRoots = originalAllowedRoots;
  });

  it('loads the full Moho ShowBible family and produces a deterministic fingerprint', () => {
    const { mohoShowBiblePath } = buildMohoShowBibleFamily(tmpDir);
    const loaded = loader.load(mohoShowBiblePath);

    expect(loaded.mohoShowBible.showId).toBe('polygon_show_moho_v1');
    expect(loaded.characterBibles).toHaveLength(1);
    expect(loaded.characterBibles[0].characterId).toBe('char_gramps_v1');
    expect(loaded.crossRefs.characterIds).toEqual(['char_gramps_v1']);
    expect(loaded.crossRefs.allowedRigTypes).toEqual(expect.arrayContaining(['humanoid_2leg', 'quadruped']));
    expect(loaded.crossRefs.cameraRules.allowedShotSizes).toContain('close_up');
    expect(loaded.crossRefs.motionGrammar.allowedEmotions).toEqual(expect.arrayContaining(['neutral', 'surprise']));

    expect(loaded.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(loaded.fingerprint).toHaveLength(64);

    const loadedAgain = loader.load(mohoShowBiblePath);
    expect(loadedAgain.fingerprint).toBe(loaded.fingerprint);
  });

  it('throws SCENE_NOT_FOUND when the moho_show_bible.json path does not exist', () => {
    const missing = path.join(tmpDir, 'show', 'does_not_exist.json');
    try {
      loader.load(missing);
      throw new Error('expected loader.load to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HarmonyError);
      expect((err as HarmonyError).code).toBe('SCENE_NOT_FOUND');
    }
  });

  it('throws PATH_NOT_ALLOWED when the show bible path is outside allowedRoots', () => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-showbible-outside-'));
    try {
      const { mohoShowBiblePath } = buildMohoShowBibleFamily(outsideDir);
      try {
        loader.load(mohoShowBiblePath);
        throw new Error('expected loader.load to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HarmonyError);
        expect((err as HarmonyError).code).toBe('PATH_NOT_ALLOWED');
      }
    } finally {
      try { fs.rmSync(outsideDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it('throws INVALID_HARMONY_OBJECT when moho_show_bible.json is malformed', () => {
    const showDir = path.join(tmpDir, 'show');
    fs.mkdirSync(showDir, { recursive: true });
    fs.writeFileSync(path.join(showDir, 'moho_show_bible.json'), '{ this is :: not json', 'utf8');

    expect(() => loader.load(path.join(showDir, 'moho_show_bible.json'))).toThrow();
  });

  it('throws when a character_bible references a paletteRef that does not match the palette manifest', () => {
    const { characterBiblePath, mohoShowBiblePath } = buildMohoShowBibleFamily(tmpDir);

    const bad = JSON.parse(fs.readFileSync(characterBiblePath, 'utf8'));
    bad.paletteRef = 'palette_other_v1';
    fs.writeFileSync(characterBiblePath, JSON.stringify(bad), 'utf8');

    try {
      loader.load(mohoShowBiblePath);
      throw new Error('expected loader.load to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HarmonyError);
      expect((err as HarmonyError).code).toBe('INVALID_HARMONY_OBJECT');
      expect((err as HarmonyError).message).toMatch(/paletteRef/);
    }
  });

  it('throws when a character_bible asset_license is rejected by show_bible.forbiddenSources', () => {
    const ncLicense: Record<string, unknown> = {
      schemaVersion: '1.0',
      assetId: 'gramps_rig_v1',
      creator: 'rigger_a',
      source: 'commission',
      license: 'CC BY-NC 4.0',
      commercialUse: true,
      modificationAllowed: true,
      datasetUseAllowed: false,
      redistributionAllowed: false,
      contractPath: 'legal/gramps.pdf',
      forbiddenTags: []
    };
    const { mohoShowBiblePath } = buildMohoShowBibleFamily(tmpDir, { license: ncLicense });

    try {
      loader.load(mohoShowBiblePath);
      throw new Error('expected loader.load to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HarmonyError);
      expect((err as HarmonyError).code).toBe('INVALID_HARMONY_OBJECT');
      expect((err as HarmonyError).message).toMatch(/asset_license rejected|NonCommercial|NC/i);
    }
  });

  it('produces the same fingerprint when the same bundle is loaded twice', () => {
    const { mohoShowBiblePath } = buildMohoShowBibleFamily(tmpDir);
    const fp1 = loader.load(mohoShowBiblePath).fingerprint;
    const fp2 = loader.load(mohoShowBiblePath).fingerprint;
    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('throws when a character_bible rigType is not in moho_show_bible.allowedRigTypes', () => {
    const { mohoShowBiblePath } = buildMohoShowBibleFamily(tmpDir, {
      rigType: 'mechanical',
      allowedRigTypes: ['humanoid_2leg', 'quadruped']
    });

    try {
      loader.load(mohoShowBiblePath);
      throw new Error('expected loader.load to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HarmonyError);
      expect((err as HarmonyError).code).toBe('INVALID_HARMONY_OBJECT');
      expect((err as HarmonyError).message).toMatch(/rigType/);
    }
  });
});