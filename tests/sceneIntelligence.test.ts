import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  sceneUnderstandingSchema,
  directorPlanSchema,
  directorVariantSetSchema,
  SCENE_INTELLIGENCE_SCHEMA_VERSION
} from '../src/schemas/sceneIntelligence.js';

import { SceneUnderstandingEngine } from '../src/adapters/sceneUnderstanding/index.js';
import { ScriptDirector, ALL_STRATEGIES } from '../src/adapters/scriptDirector/index.js';
import { SceneIntelligenceReportBuilder } from '../src/adapters/sceneIntelligenceReport/index.js';

// The mandatory end-to-end demo scenario from Master Prompt §28.
const DEMO_SCRIPT = `Masha: Ты действительно думал, что я ничего не узнаю?
Ivan: Я… нет, я ничего не скрывал.
Masha: Молчи. Я видела тебя у двери.`;

const DEMO_SCENE_NAME = 'Interrogation';

function demoScene() {
  const engine = new SceneUnderstandingEngine();
  return engine.analyze({
    script: DEMO_SCRIPT,
    sceneName: DEMO_SCENE_NAME,
    sceneId: 'interro_demo',
    fps: 24,
    durationSeconds: 9,
    characters: [
      { name: 'Masha', role: 'protagonist', stance: 'standing', visibleOnScreen: true },
      { name: 'Ivan', role: 'antagonist', stance: 'standing', visibleOnScreen: true }
    ],
    dialogue: [
      { speaker: 'Masha', text: 'Ты действительно думал, что я ничего не узнаю?', startSec: 0.3, endSec: 3.6 },
      { speaker: 'Ivan', text: 'Я… нет, я ничего не скрывал.', startSec: 3.9, endSec: 5.7 },
      { speaker: 'Masha', text: 'Молчи. Я видела тебя у двери.', startSec: 6.4, endSec: 8.8 }
    ],
    location: 'Комната с дверью слева',
    directorConstraints: ['Не урезать паузу перед репликой Masha в третьем бите']
  });
}

describe('sceneIntelligence schemas', () => {
  test('schema version is 1.0', () => {
    expect(SCENE_INTELLIGENCE_SCHEMA_VERSION).toBe('1.0');
  });

  test('scene understanding rejects unknown primaryCharacter', () => {
    const bad: any = {
      schemaVersion: '1.0', sceneId: 's', sceneName: 'n', sourceScript: 'x',
      totalDurationSeconds: 1, fps: 24, startFrame: 1, endFrame: 24,
      sceneIntent: 'test', sceneIntentConfidence: 0.5,
      characters: [{ characterId: 'a', name: 'A', role: 'unknown', goalInScene: 'x', emotionalArc: 'x', stance: 'standing', hasDialogue: false, speaksFirst: false, receivesReaction: false, visibleOnScreen: true }],
      beats: [{
        beatId: 'beat_01', startTime: 0, endTime: 1, primaryCharacter: 'B', intent: 'assert',
        emotion: 'neutral', action: 'speaks', reactionTarget: null, importance: 0.5,
        suggestedPauseBefore: 0, beatKind: 'setup', supportsStoryArc: true, confidence: 0.5,
        assumptionIds: []
      }],
      actionBeats: [], reactionBeats: [], emotionCurve: [], attentionTargets: [],
      continuity: [], assumptions: [], uncertainties: [],
      provenance: { engine: 'rule_based SceneUnderstandingEngine v1', createdAt: new Date().toISOString(), notes: '' }
    };
    expect(sceneUnderstandingSchema.safeParse(bad).success).toBe(false);
  });

  test('director plan rejects shot referencing unblocked character', () => {
    const plan: any = {
      schemaVersion: '1.0', planId: 'p_plan01', sceneId: 's',
      strategy: 'restrained_dialogue', strategyDescription: 'x',
      shots: [{
        shotId: 'shot_00', shotIndex: 0, beatId: null,
        framing: 'medium', cameraMove: 'static',
        durationFrames: 12, startFrame: 0, endFrame: 11,
        charactersInFrame: ['unknown_char'],
        primaryFocusCharacterId: 'unknown_char',
        staging: 'center', dialogue: false, eyeline: null,
        description: 'x', rationale: 'y', confidence: 0.5
      }],
      camera: {
        shotCount: 1, dominantFraming: 'medium', dominantCameraMove: 'static',
        hasCameraMotion: false, pushInBeatIds: [], reactionShotIds: []
      },
      blocking: [{ characterId: 'other_char', startPosition: 'left', endPosition: 'left', movement: 'none', notes: '' }],
      attention: [], editDecisions: [], pauses: [], dramaticEmphasisBeatIds: [],
      reactionShotCount: 0, shotCount: 1, totalDurationFrames: 12,
      confidence: 0.5, rationale: 'x',
      provenance: { engine: 'rule_based ScriptDirector v1', createdAt: new Date().toISOString() }
    };
    expect(directorPlanSchema.safeParse(plan).success).toBe(false);
  });

  test('director strategy set is exhaustive (>=8 strategies)', () => {
    expect(ALL_STRATEGIES.length).toBeGreaterThanOrEqual(8);
    expect(ALL_STRATEGIES).toContain('restrained_dialogue');
    expect(ALL_STRATEGIES).toContain('commercial_dynamic');
    expect(ALL_STRATEGIES).toContain('dramatic_closeup');
    expect(ALL_STRATEGIES).toContain('comedic_timing');
    expect(ALL_STRATEGIES).toContain('anime_limited');
    expect(ALL_STRATEGIES).toContain('theatrical_staging');
    expect(ALL_STRATEGIES).toContain('single_take');
    expect(ALL_STRATEGIES).toContain('custom');
  });
});

describe('SceneUnderstandingEngine', () => {
  test('produces a Zod-valid SceneUnderstanding for the mandatory demo script', () => {
    const result = demoScene();
    const parsed = sceneUnderstandingSchema.parse(result);
    expect(parsed.sceneId).toBe('interro_demo');
    expect(parsed.characters.length).toBe(2);
    expect(parsed.characters.map((c) => c.name).sort()).toEqual(['Ivan', 'Masha']);
    expect(parsed.beats.length).toBeGreaterThanOrEqual(3);
    expect(parsed.provenance.engine).toBe('rule_based SceneUnderstandingEngine v1');
  });

  test('every beat references a known primaryCharacter and a valid reactionTarget', () => {
    const result = demoScene();
    const ids = new Set(result.characters.map((c) => c.characterId));
    for (const b of result.beats) {
      expect(ids.has(b.primaryCharacter)).toBe(true);
      if (b.reactionTarget) expect(ids.has(b.reactionTarget)).toBe(true);
    }
  });

  test('action beats and reaction beats align with dialogue attribution', () => {
    const result = demoScene();
    expect(result.actionBeats.length).toBeGreaterThanOrEqual(3);
    expect(result.reactionBeats.length).toBeGreaterThanOrEqual(2);
    for (const ab of result.actionBeats) {
      expect(typeof ab.energy).toBe('string');
    }
  });

  test('emotion curve has at least one sample per dialogue line', () => {
    const result = demoScene();
    expect(result.emotionCurve.length).toBeGreaterThanOrEqual(result.beats.length);
  });

  test('uncertainties and assumptions are emitted', () => {
    const result = demoScene();
    expect(result.assumptions.length).toBeGreaterThanOrEqual(1);
    expect(result.uncertainties.length).toBeGreaterThanOrEqual(0);
    for (const a of result.assumptions) {
      expect(a.confidence).toBeLessThanOrEqual(1);
      expect(a.confidence).toBeGreaterThanOrEqual(0);
    }
  });

  test('scene intent for "Ты действительно думал, что я ничего не узнаю?" is "challenge", "accuse", "reveal" or "probe"', () => {
    const result = demoScene();
    expect(['challenge', 'accuse', 'reveal', 'probe']).toContain(result.sceneIntent);
  });

  test('engine falls back to ambient beat when no dialogue is provided', () => {
    const engine = new SceneUnderstandingEngine();
    const result = engine.analyze({
      script: 'Тишина. Пустая комната. Свет медленно гаснет.',
      sceneName: 'Ambient',
      fps: 24,
      durationSeconds: 4,
      characters: [{ name: 'Narrator', role: 'background', visibleOnScreen: false }]
    });
    expect(result.beats.length).toBeGreaterThanOrEqual(1);
    expect(result.beats[0].action).toBe('silent_hold');
  });

  test('engine handles dialogue attribution parsed from bare script', () => {
    const engine = new SceneUnderstandingEngine();
    const result = engine.analyze({
      script: 'Masha: Привет.\nIvan: Здравствуйте.',
      sceneName: 'Greeting',
      fps: 24,
      durationSeconds: 4,
      characters: [
        { name: 'Masha', role: 'protagonist' },
        { name: 'Ivan', role: 'supporting' }
      ]
    });
    expect(result.beats.length).toBe(2);
    expect(result.beats[0].primaryCharacter).toBe('masha');
    expect(result.beats[1].primaryCharacter).toBe('ivan');
  });
});

describe('ScriptDirector', () => {
  test('default strategies are exactly 3 readable ones per Master Prompt §2', () => {
    expect(ScriptDirector.defaultStrategies()).toEqual([
      'restrained_dialogue', 'commercial_dynamic', 'dramatic_closeup'
    ]);
  });

  test('generateVariants returns >=3 distinct strategies for the demo scene', () => {
    const scene = demoScene();
    const variants = new ScriptDirector().generateVariants(scene, 3);
    expect(directorVariantSetSchema.safeParse(variants).success).toBe(true);
    expect(variants.variants.length).toBe(3);
    const strategies = variants.variants.map((p) => p.strategy);
    expect(new Set(strategies).size).toBe(3);
    expect(strategies).toContain('restrained_dialogue');
    expect(strategies).toContain('commercial_dynamic');
    expect(strategies).toContain('dramatic_closeup');
  });

  test('every variant has >=1 shot and total duration >= scene duration in frames', () => {
    const scene = demoScene();
    const variants = new ScriptDirector().generateVariants(scene, 3);
    for (const p of variants.variants) {
      expect(p.shots.length).toBeGreaterThanOrEqual(1);
      expect(p.totalDurationFrames).toBeGreaterThanOrEqual(Math.round(scene.totalDurationSeconds * scene.fps * 0.5));
    }
  });

  test('single_take strategy produces exactly one shot', () => {
    const scene = demoScene();
    const director = new ScriptDirector();
    const variants = director.generateVariants(scene, 1, ['single_take']);
    expect(variants.variants[0].strategy).toBe('single_take');
    expect(variants.variants[0].shots.length).toBe(1);
    expect(variants.variants[0].shots[0].cameraMove).not.toBe('static');
  });

  test('each variant is independently Zod-valid', () => {
    const scene = demoScene();
    const variants = new ScriptDirector().generateVariants(scene, 8, ALL_STRATEGIES);
    expect(variants.variants.length).toBe(8);
    for (const p of variants.variants) {
      expect(directorPlanSchema.safeParse(p).success).toBe(true);
    }
  });

  test('dramatic_closeup strategy has push-in on the climax beat', () => {
    const scene = demoScene();
    const director = new ScriptDirector();
    const plan = director.generate(scene, 'dramatic_closeup');
    expect(plan.camera.pushInBeatIds.length).toBeGreaterThanOrEqual(1);
    const climaxShot = plan.shots.find((s) => s.cameraMove === 'dolly_in');
    expect(climaxShot).toBeDefined();
  });

  test('reactionShotRatio doubles between restrained_dialogue and commercial_dynamic', () => {
    const scene = demoScene();
    const director = new ScriptDirector();
    const restrained = director.generate(scene, 'restrained_dialogue');
    const commercial = director.generate(scene, 'commercial_dynamic');
    expect(commercial.reactionShotCount).toBeGreaterThanOrEqual(restrained.reactionShotCount);
  });
});

describe('SceneIntelligenceReportBuilder', () => {
  test('produces non-empty HTML that mentions scene name, intent and all variants', () => {
    const scene = demoScene();
    const variants = new ScriptDirector().generateVariants(scene, 3);
    const html = new SceneIntelligenceReportBuilder().build({ scene, variantSet: variants });
    const lower = html.toLowerCase();
    expect(html.length).toBeGreaterThan(1500);
    expect(html).toContain(DEMO_SCENE_NAME);
    expect(html).toContain(scene.sceneIntent);
    expect(lower).toContain('restrained_dialogue');
    expect(lower).toContain('commercial_dynamic');
    expect(lower).toContain('dramatic_closeup');
    expect(lower).toContain('assumptions');
    expect(lower).toContain('uncertainties');
  });

  test('writes HTML report to disk under allowed root', () => {
    const scene = demoScene();
    const variants = new ScriptDirector().generateVariants(scene, 3);
    const builder = new SceneIntelligenceReportBuilder();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-intelligence-'));
    try {
      const out = builder.buildToFile({ scene, variantSet: variants },
        path.join(dir, 'report.html'));
      expect(fs.existsSync(out)).toBe(true);
      const content = fs.readFileSync(out, 'utf-8');
      expect(content).toContain('<!doctype html>');
      expect(content).toContain(DEMO_SCENE_NAME);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('AI Studio tools — Iteration 1 registration', () => {
  test('Iteration 1 and 2 ai_studio tools are registered and Zod-valid', () => {
    const { aiStudioTools } = require('../src/tools/aiStudioTools.js');
    expect(aiStudioTools.length).toBe(11);
    const names = aiStudioTools.map((t: any) => t.name);
    expect(names).toContain('harmony.ai_studio.analyze_scene');
    expect(names).toContain('harmony.ai_studio.generate_director_variants');
    expect(names).toContain('harmony.ai_studio.analyze_voice');
    expect(names).toContain('harmony.ai_studio.generate_performances');
    expect(names).toContain('harmony.ai_studio.mix_performance');
    expect(names).toContain('harmony.ai_studio.build_digital_actor');
    expect(names).toContain('harmony.ai_studio.generate_key_poses');
    expect(names).toContain('harmony.ai_studio.synthesize_motion');
    for (const t of aiStudioTools) {
      expect(typeof t.name).toBe('string');
      expect(typeof t.description).toBe('string');
      expect(typeof t.handler).toBe('function');
    }
  });

  test('analyze_scene handler returns a valid SceneUnderstanding for the demo', async () => {
    const { aiStudioTools } = require('../src/tools/aiStudioTools.js');
    const t = aiStudioTools.find((x: any) => x.name === 'harmony.ai_studio.analyze_scene');
    const result = await t.handler({
      script: DEMO_SCRIPT,
      sceneName: 'Test',
      sceneId: 'test_id',
      fps: 24,
      durationSeconds: 9,
      characters: [
        { name: 'Masha' }, { name: 'Ivan' }
      ]
    });
    expect(result.status).toBe('success');
    expect(result.beatCount).toBeGreaterThanOrEqual(2);
    expect(result.sceneUnderstanding.characters.length).toBe(2);
    sceneUnderstandingSchema.parse(result.sceneUnderstanding);
  });

  test('generate_director_variants handler generates >=3 variants from scene alone', async () => {
    const { aiStudioTools } = require('../src/tools/aiStudioTools.js');
    const t = aiStudioTools.find((x: any) => x.name === 'harmony.ai_studio.generate_director_variants');
    const result = await t.handler({
      count: 3,
      script: DEMO_SCRIPT,
      sceneName: 'Test',
      sceneId: 'test_id',
      fps: 24,
      durationSeconds: 9,
      characters: [{ name: 'Masha' }, { name: 'Ivan' }]
    });
    expect(result.status).toBe('success');
    expect(result.strategyCount).toBe(3);
    directorVariantSetSchema.parse(result.variantSet);
  });
});
