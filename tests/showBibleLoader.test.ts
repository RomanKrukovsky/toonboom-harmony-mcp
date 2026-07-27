import fs from 'fs';
import path from 'path';
import { ShowBibleLoader } from '../src/services/showBibleLoader/index.js';
import { ShotManifestCompiler } from '../src/services/shotManifestCompiler/index.js';
import { performancePirSchema } from '../src/schemas/performancePir.js';
import type { ShotManifest } from '../src/schemas/shotManifest.js';
import { HarmonyError } from '../src/security.js';

const APPROVER = 'td_lead';
const APPROVED_AT = '2026-07-27T12:00:00Z';

function writeJson(p: string, obj: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj), 'utf8');
}

function buildShowBibleFamily(root: string): { showBiblePath: string } {
  const showDir = path.join(root, 'show');
  const showBiblePath = path.join(showDir, 'show_bible.json');

  // asset_license.json for the commissioned rig (clean commercial licence).
  writeJson(path.join(showDir, 'legal', 'mira_license.json'), {
    schemaVersion: '1.0',
    assetId: 'character_main_rig_v1',
    creator: 'rigger_a',
    source: 'commission',
    license: 'exclusive commercial assignment',
    commercialUse: true,
    modificationAllowed: true,
    datasetUseAllowed: true,
    redistributionAllowed: false,
    contractPath: 'legal/mira.pdf',
    forbiddenTags: [],
    sha256: 'a'.repeat(64)
  });

  writeJson(path.join(showDir, 'palette_manifest.json'), {
    schemaVersion: '1.0',
    paletteId: 'palette_main_v1',
    name: 'Polygon Show Palette',
    colours: [
      { colourId: 'line_main', name: 'Outline', rgba: '#1A1A1AFF', usage: 'line', locked: true },
      { colourId: 'fill_skin', name: 'Skin', rgba: '#FF8C6BFF', usage: 'skin', locked: true },
      { colourId: 'shadow_soft', name: 'Soft Shadow', rgba: '#3A2A20FF', usage: 'shadow', locked: true }
    ],
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  writeJson(path.join(showDir, 'character_bible_mira.json'), {
    schemaVersion: '1.0',
    characterId: 'char_main_v1',
    name: 'Mira',
    role: 'protagonist',
    rigPath: 'rigs/mira/mira.xstage',
    templatePath: 'rigs/mira/mira.tpl',
    turnaroundViews: ['front', 'front_3q_left', 'side_left'],
    controllers: [
      { controllerId: 'HEAD_ROT', nodePath: 'Top/Mira/Head_Peg', purpose: 'head rotation', range: { min: -45, max: 45, units: 'degrees' } },
      { controllerId: 'MOUTH_OPEN', nodePath: 'Top/Mira/Head/Mouth_D', purpose: 'mouth open', range: { min: 0, max: 1, units: 'normalized' } }
    ],
    mouthShapes: [{ shapeId: 'A', drawingName: 'mouth_A', phonemes: ['a'] }],
    expressions: [{ expressionId: 'neutral', controllerOverrides: [] }],
    gestureLibrary: [],
    paletteRef: 'palette_main_v1',
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT, rigAuthor: 'rigger_a', licensePath: 'legal/mira_license.json' }
  });

  writeJson(path.join(showDir, 'camera_rules.json'), {
    schemaVersion: '1.0',
    allowedShotSizes: ['close_up', 'medium_shot'],
    allowedCameraMoves: ['static', 'pan_left'],
    defaultShotSize: 'medium_shot',
    safeMargins: { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
    forbiddenMoves: ['crane_up'],
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  writeJson(path.join(showDir, 'motion_grammar.json'), {
    schemaVersion: '1.0',
    grammarId: 'grammar_main_v1',
    rules: [{
      ruleId: 'rule_dialogue',
      description: 'Default dialogue beat',
      allowedGestures: ['point', 'nod'],
      forbiddenGestures: ['spin'],
      allowedEmotions: ['neutral', 'surprise'],
      poseLibraryRefs: ['pose/neutral_front'],
      timing: { minHoldFrames: 2, maxHoldFrames: 48, anticipationFrames: 4, followThroughFrames: 6 }
    }],
    defaultTiming: { fps: 24, minBeatFrames: 2, maxBeatFrames: 96 },
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  writeJson(path.join(showDir, 'qa_thresholds.json'), {
    schemaVersion: '1.0',
    thresholdsId: 'qa_main_v1',
    silhouetteQualityMin: 0.7,
    lipsyncDriftMaxMs: 80,
    continuityMaxDeltaFrames: 2,
    lineThicknessTolerancePt: 0.5,
    paletteDeltaMax: 0.02,
    poseLibraryMatchMin: 0.85,
    autoFixableSeverityMax: 'medium',
    requireHumanApprovalFor: ['key_pose', 'camera_move'],
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  writeJson(showBiblePath, {
    schemaVersion: '1.0',
    showId: 'polygon_show_v1',
    title: 'Polygon Show',
    logLine: 'One character, one room.',
    fps: 24,
    resolution: { width: 1920, height: 1080 },
    visualStyle: 'flat editorial',
    lineRules: { defaultThicknessPt: 2.0, lineColourId: 'line_main', fillColourId: 'fill_skin' },
    lighting: { type: 'soft_top_left', shadowColourId: 'shadow_soft' },
    allowedDeformations: ['peg_transform', 'drawing_substitution'],
    characterBibles: [{ characterId: 'char_main_v1', ref: 'character_bible_mira.json' }],
    paletteManifestRef: 'palette_manifest.json',
    cameraRulesRef: 'camera_rules.json',
    motionGrammarRef: 'motion_grammar.json',
    qaThresholdsRef: 'qa_thresholds.json',
    forbiddenSources: ['NC'],
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  return { showBiblePath };
}

describe('ShowBibleLoader + ShotManifestCompiler end-to-end', () => {
  let tmpDir: string;
  let showBiblePath: string;
  let loader: ShowBibleLoader;
  let compiler: ShotManifestCompiler;

  beforeAll(() => {
    tmpDir = path.resolve(process.cwd(), 'output', 'test-showbible');
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    const built = buildShowBibleFamily(tmpDir);
    showBiblePath = built.showBiblePath;
    loader = new ShowBibleLoader();
    compiler = new ShotManifestCompiler();
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('loads the full ShowBible family and produces crossRefs', () => {
    const loaded = loader.load(showBiblePath);
    expect(loaded.showBible.showId).toBe('polygon_show_v1');
    expect(loaded.characterBibles).toHaveLength(1);
    expect(loaded.characterBibles[0].characterId).toBe('char_main_v1');
    expect(loaded.crossRefs.characterIds).toEqual(['char_main_v1']);
    expect(loaded.crossRefs.cameraRules?.allowedShotSizes).toContain('close_up');
    expect(loaded.crossRefs.motionGrammar?.allowedEmotions).toEqual(expect.arrayContaining(['neutral', 'surprise']));
  });

  it('rejects a ShowBible that references an unknown palette colour', () => {
    const bad = JSON.parse(fs.readFileSync(showBiblePath, 'utf8'));
    bad.lighting.shadowColourId = 'nonexistent';
    const badPath = path.join(path.dirname(showBiblePath), 'show_bible_bad.json');
    writeJson(badPath, bad);
    expect(() => loader.load(badPath)).toThrow(HarmonyError);
  });

  it('rejects a character bible whose asset licence is NonCommercial', () => {
    const ncLicensePath = path.join(path.dirname(showBiblePath), 'legal', 'mira_nc_license.json');
    writeJson(ncLicensePath, {
      schemaVersion: '1.0',
      assetId: 'character_main_rig_v1',
      creator: 'rigger_a',
      source: 'commission',
      license: 'CC BY-NC 4.0',
      commercialUse: false,
      modificationAllowed: true,
      datasetUseAllowed: false,
      redistributionAllowed: false,
      contractPath: 'legal/mira.pdf',
      forbiddenTags: ['NC']
    });
    const bad = JSON.parse(fs.readFileSync(showBiblePath, 'utf8'));
    bad.characterBibles[0].ref = 'character_bible_mira_nc.json';
    const badCbPath = path.join(path.dirname(showBiblePath), 'character_bible_mira_nc.json');
    writeJson(badCbPath, {
      schemaVersion: '1.0',
      characterId: 'char_main_v1',
      name: 'Mira',
      role: 'protagonist',
      rigPath: 'rigs/mira/mira.xstage',
      templatePath: 'rigs/mira/mira.tpl',
      turnaroundViews: ['front'],
      controllers: [{ controllerId: 'HEAD_ROT', nodePath: 'Top/Mira/Head_Peg', purpose: 'head rotation' }],
      mouthShapes: [],
      expressions: [],
      gestureLibrary: [],
      paletteRef: 'palette_main_v1',
      provenance: { approver: APPROVER, approvedAt: APPROVED_AT, rigAuthor: 'rigger_a', licensePath: 'legal/mira_nc_license.json' }
    });
    const badPath = path.join(path.dirname(showBiblePath), 'show_bible_nc.json');
    writeJson(badPath, bad);
    expect(() => loader.load(badPath)).toThrow(/NonCommercial|NC|commercialUse/);
  });

  it('compiles a ShotManifest against the loaded ShowBible into a valid PerformancePIR', () => {
    const loaded = loader.load(showBiblePath);
    const controllerMaps = loader.buildControllerMaps(loaded);

    const manifest: ShotManifest = {
      schemaVersion: '1.0',
      shotId: 'shot_001',
      showBibleRef: showBiblePath,
      production: 'polygon_show',
      episode: 'E01',
      sceneName: 'S01',
      description: 'Mira looks up, surprised.',
      staging: {
        positions: [{ characterId: 'char_main_v1', preset: 'center' }],
        shotSize: 'close_up',
        cameraMove: 'static',
        backgroundRef: 'bg/room_v1.png'
      },
      timing: {
        totalFrames: 48,
        fps: 24,
        minBeatFrames: 2,
        maxBeatFrames: 96,
        anticipationFrames: 4,
        followThroughFrames: 6,
        pauseBeforeBeats: {}
      },
      beats: [
        { beatId: 'b1', startFrame: 1, endFrame: 24, characterId: 'char_main_v1', intent: 'look_up', emotion: 'neutral' },
        { beatId: 'b2', startFrame: 25, endFrame: 48, characterId: 'char_main_v1', intent: 'react', emotion: 'surprise', gestureId: 'point' }
      ],
      fx: [],
      render: { preview: true, format: 'mp4', quality: 'standard' },
      provenance: { director: 'llm_director_v1', createdAt: APPROVED_AT, sourceScriptRef: 'scripts/E01/S01.txt' }
    };

    const { performance, violations, warnings } = compiler.compile(manifest, loaded.crossRefs, { controllerMaps });
    expect(violations).toEqual([]);
    expect(performancePirSchema.safeParse(performance).success).toBe(true);
    expect(performance.staging?.shotSize).toBe('close_up');
    expect(performance.beatFrameMap).toHaveLength(2);
    // Controller map has 2 controllers; each gets keys at beat boundaries 1,24,25,48.
    expect(performance.tracks).toHaveLength(2);
    const head = performance.tracks.find(t => t.nodeId === 'Top/Mira/Head_Peg');
    expect(head?.keys.map(k => k.frame).sort((a, b) => a - b)).toEqual([1, 24, 25, 48]);
    // Gesture binding is deferred to RetargetingResolver, so a warning is emitted.
    expect(warnings.some(w => w.includes('gestureId "point"'))).toBe(true);
  });

  it('rejects a ShotManifest that uses an emotion not in motion_grammar', () => {
    const loaded = loader.load(showBiblePath);
    const controllerMaps = loader.buildControllerMaps(loaded);

    const manifest: ShotManifest = {
      schemaVersion: '1.0',
      shotId: 'shot_002',
      showBibleRef: showBiblePath,
      production: 'polygon_show',
      episode: 'E01',
      sceneName: 'S01',
      description: 'Mira is furious (forbidden emotion).',
      staging: {
        positions: [{ characterId: 'char_main_v1', preset: 'center' }],
        shotSize: 'close_up',
        cameraMove: 'static',
        backgroundRef: 'bg/room_v1.png'
      },
      timing: { totalFrames: 24, fps: 24, minBeatFrames: 2, maxBeatFrames: 96, anticipationFrames: 4, followThroughFrames: 6, pauseBeforeBeats: {} },
      beats: [
        { beatId: 'b1', startFrame: 1, endFrame: 24, characterId: 'char_main_v1', intent: 'rage', emotion: 'fury' }
      ],
      fx: [],
      render: { preview: true, format: 'mp4', quality: 'standard' },
      provenance: { director: 'llm_director_v1', createdAt: APPROVED_AT, sourceScriptRef: 'scripts/E01/S01.txt' }
    };

    const { violations, performance } = compiler.compile(manifest, loaded.crossRefs, { controllerMaps });
    expect(violations.some(v => v.kind === 'unknown_emotion' && v.ref === 'fury')).toBe(true);
    expect(performance.tracks).toEqual([]);
  });
});