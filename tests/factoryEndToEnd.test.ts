import fs from 'fs';
import path from 'path';
import { ShowBibleLoader } from '../src/services/showBibleLoader/index.js';
import { ShotManifestCompiler } from '../src/services/shotManifestCompiler/index.js';
import { RetargetingResolver } from '../src/services/retargetingResolver/index.js';
import { HarmonyCommandBuilder } from '../src/services/harmonyCommandBuilder/index.js';
import { performancePirSchema } from '../src/schemas/performancePir.js';
import { retargetingPlanSchema } from '../src/schemas/retargetingPlan.js';
import { harmonyCommandPlanV4Schema } from '../src/schemas/harmonyCommandPlanV4.js';
import type { RigBindingPlanV1 } from '../src/schemas/rigBinding.js';
import type { ShotManifest } from '../src/schemas/shotManifest.js';

const APPROVED_AT = '2026-07-27T12:00:00Z';
const APPROVER = 'td_lead';

function writeJson(p: string, obj: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj), 'utf8');
}

function buildShowBibleFamily(root: string): string {
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
    name: 'Polygon Show Palette',
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
      { controllerId: 'HEAD_ROT', nodePath: 'NODE_HEAD_PEG', purpose: 'head rotation' },
      { controllerId: 'MOUTH_OPEN', nodePath: 'NODE_MOUTH_D', purpose: 'mouth open' }
    ],
    mouthShapes: [],
    expressions: [],
    gestureLibrary: [],
    paletteRef: 'palette_main_v1',
    provenance: { approver: APPROVER, approvedAt: APPROVED_AT, rigAuthor: 'rigger_a', licensePath: 'legal/mira_license.json' }
  });

  writeJson(path.join(showDir, 'camera_rules.json'), {
    schemaVersion: '1.0',
    allowedShotSizes: ['close_up', 'medium_shot'],
    allowedCameraMoves: ['static'],
    defaultShotSize: 'medium_shot',
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

describe('Factory end-to-end: ShowBible → ShotManifest → PerformancePIR → RetargetingPlan → HarmonyCommandPlanV4', () => {
  let tmpDir: string;
  let showBiblePath: string;

  beforeAll(() => {
    tmpDir = path.resolve(process.cwd(), 'output', 'test-factory-e2e');
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    showBiblePath = buildShowBibleFamily(tmpDir);
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('runs the full deterministic pipeline', () => {
    const loader = new ShowBibleLoader();
    const loaded = loader.load(showBiblePath);
    const controllerMaps = loader.buildControllerMaps(loaded);

    const manifest: ShotManifest = {
      schemaVersion: '1.0',
      shotId: 'shot_e2e_001',
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
    };

    // 1. ShotManifest -> PerformancePIR
    const compiler = new ShotManifestCompiler();
    const { performance, violations } = compiler.compile(manifest, loaded.crossRefs, { controllerMaps });
    expect(violations).toEqual([]);
    expect(performancePirSchema.safeParse(performance).success).toBe(true);

    // 2. PerformancePIR -> RetargetingPlan (with a mock RigBindingPlanV1;
    //    real rig binding resolution is a separate service under development).
    const mockBindingPlan: RigBindingPlanV1 = {
      schema: 'toon-boom-mcp/rig-binding-plan-v1',
      character_id: 'char_main_v1',
      template: { template_id: 'biped_standard', version: '1.0.0', content_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' },
      source: { pir_id: performance.performanceId, pir_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' },
      bindings: [],
      unresolved: [],
      warnings: []
    };
    const resolver = new RetargetingResolver();
    const retargetingPlan = resolver.resolve(performance, mockBindingPlan);
    expect(retargetingPlanSchema.safeParse(retargetingPlan).success).toBe(true);

    // 3. RetargetingPlan -> HarmonyCommandPlanV4
    const builder = new HarmonyCommandBuilder();
    const animationPlan = builder.buildAnimationPlan(retargetingPlan);
    const planParse = harmonyCommandPlanV4Schema.safeParse(animationPlan);
    if (!planParse.success) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(planParse.error.errors, null, 2));
    }
    expect(planParse.success).toBe(true);

    // 4. Determinism: same manifest -> same performanceId -> same command plan.
    const again = compiler.compile(manifest, loaded.crossRefs, { controllerMaps });
    expect(again.performance.performanceId).toBe(performance.performanceId);
    const plan2 = builder.buildAnimationPlan(resolver.resolve(again.performance, mockBindingPlan));
    expect(plan2.sourceManifestSha256).toBe(animationPlan.sourceManifestSha256);
  });
});