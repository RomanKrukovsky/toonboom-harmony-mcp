import fs from 'fs';
import path from 'path';
import { factoryCompilerTools } from '../src/tools/factoryCompilerTools.js';

const APPROVED_AT = '2026-07-27T12:00:00Z';
const APPROVER = 'td_lead';

function writeJson(p: string, obj: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj), 'utf8');
}

function buildFamily(root: string): string {
  const showDir = path.join(root, 'show');
  const showBiblePath = path.join(showDir, 'show_bible.json');

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
    name: 'Polygon Palette',
    colours: [
      { colourId: 'line_main', name: 'Outline', rgba: '#1A1A1AFF', usage: 'line', locked: true },
      { colourId: 'fill_skin', name: 'Skin', rgba: '#FF8C6BFF', usage: 'skin', locked: true },
      { colourId: 'shadow_soft', name: 'Shadow', rgba: '#3A2A20FF', usage: 'shadow', locked: true }
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
    turnaroundViews: ['front'],
    controllers: [
      { controllerId: 'HEAD_ROT', nodePath: 'NODE_HEAD_PEG', purpose: 'head rotation' }
    ],
    mouthShapes: [],
    expressions: [],
    gestureLibrary: [],
    paletteRef: 'palette_main_v1',
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT, rigAuthor: 'rigger_a', licensePath: 'legal/mira_license.json' }
  });

  writeJson(path.join(showDir, 'camera_rules.json'), {
    schemaVersion: '1.0',
    allowedShotSizes: ['close_up'],
    allowedCameraMoves: ['static'],
    defaultShotSize: 'close_up',
    safeMargins: { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
    forbiddenMoves: [],
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  writeJson(path.join(showDir, 'motion_grammar.json'), {
    schemaVersion: '1.0',
    grammarId: 'grammar_main_v1',
    rules: [{
      ruleId: 'rule_default',
      description: 'default',
      allowedGestures: ['point'],
      forbiddenGestures: [],
      allowedEmotions: ['neutral', 'surprise'],
      poseLibraryRefs: [],
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
    requireHumanApprovalFor: ['key_pose'],
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
    allowedDeformations: ['peg_transform'],
    characterBibles: [{ characterId: 'char_main_v1', ref: 'character_bible_mira.json' }],
    paletteManifestRef: 'palette_manifest.json',
    cameraRulesRef: 'camera_rules.json',
    motionGrammarRef: 'motion_grammar.json',
    qaThresholdsRef: 'qa_thresholds.json',
    forbiddenSources: [],
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT }
  });

  return showBiblePath;
}

describe('harmony.factory.compile_shot MCP tool', () => {
  let tmpDir: string;
  let showBiblePath: string;
  const tool = factoryCompilerTools[0];

  beforeAll(() => {
    tmpDir = path.resolve(process.cwd(), 'output', 'test-factory-tool');
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    showBiblePath = buildFamily(tmpDir);
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('is registered with the correct name', () => {
    expect(tool.name).toBe('harmony.factory.compile_shot');
  });

  it('returns status=success and a PerformancePIR for a valid manifest', async () => {
    const res = await tool.handler({
      showBiblePath,
      shotManifest: {
        schemaVersion: '1.0',
        shotId: 'shot_tool_001',
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
        timing: { totalFrames: 48, fps: 24, minBeatFrames: 2, maxBeatFrames: 96, anticipationFrames: 4, followThroughFrames: 6, pauseBeforeBeats: {} },
        beats: [
          { beatId: 'b1', startFrame: 1, endFrame: 24, characterId: 'char_main_v1', intent: 'look_up', emotion: 'neutral' },
          { beatId: 'b2', startFrame: 25, endFrame: 48, characterId: 'char_main_v1', intent: 'react', emotion: 'surprise', gestureId: 'point' }
        ],
        fx: [],
        render: { preview: true, format: 'mp4', quality: 'standard' },
        provenance: { director: 'llm_director_v1', createdAt: APPROVED_AT, sourceScriptRef: 'scripts/E01/S01.txt' }
      }
    });
    expect(res.status).toBe('success');
    expect(res.verified).toBe(true);
    expect(res.violations).toEqual([]);
    expect(res.performancePIR!.performanceId).toMatch(/^PERF-/);
  });

  it('returns status=rejected with violations when the manifest uses an unknown emotion', async () => {
    const res = await tool.handler({
      showBiblePath,
      shotManifest: {
        schemaVersion: '1.0',
        shotId: 'shot_tool_002',
        showBibleRef: showBiblePath,
        production: 'polygon_show',
        episode: 'E01',
        sceneName: 'S01',
        description: 'Forbidden emotion.',
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
      }
    });
    expect(res.status).toBe('rejected');
    expect(res.verified).toBe(true);
    expect(res.violations.some((v: { kind: string; ref: string }) => v.kind === 'unknown_emotion' && v.ref === 'fury')).toBe(true);
    expect(res.showBible!.allowedEmotions).toEqual(expect.arrayContaining(['neutral', 'surprise']));
  });
});