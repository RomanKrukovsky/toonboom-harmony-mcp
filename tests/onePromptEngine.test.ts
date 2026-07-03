import { OnePromptEngine } from '../src/adapters/onePromptEngine/index.js';
import { SeriesPlanner } from '../src/adapters/seriesPlanner/index.js';
import { EpisodePlanner } from '../src/adapters/episodePlanner/index.js';
import { ShotPlanner } from '../src/adapters/shotPlanner/index.js';
import { CharacterDesigner } from '../src/adapters/characterDesigner/index.js';
import { Rig360Synthesizer } from '../src/adapters/rig360Synthesizer/index.js';
import { ActingPlanner } from '../src/adapters/actingPlanner/index.js';
import { QualityDirector } from '../src/adapters/qualityDirector/index.js';
import { EpisodeAssembler } from '../src/adapters/episodeAssembler/index.js';

describe('One-Prompt Engine adapters', () => {
  const prompt = 'Сделай 2-минутную пилотную серию про нервного студента и безумного профессора в научной лаборатории.';
  const input: any = { prompt, targetDurationMinutes: 2 };

  test('analyzePrompt returns structured analysis', () => {
    const engine = new OnePromptEngine();
    const a = engine.analyzePrompt(input);
    expect(a.candidateCharacters.length).toBeGreaterThanOrEqual(2);
    expect(a.estimatedSceneCount).toBeGreaterThanOrEqual(3);
    expect(a.origin).toBe('planned');
  });

  test('series planner creates bible', () => {
    const engine = new OnePromptEngine();
    const a = engine.analyzePrompt(input);
    const bible = new SeriesPlanner().createBible(a, input);
    expect(bible.recurringCharacters.length).toBeGreaterThanOrEqual(2);
    expect(bible.episodeTitles.length).toBeGreaterThanOrEqual(3);
    expect(bible.origin).toBe('planned');
  });

  test('episode planner creates scenes', () => {
    const engine = new OnePromptEngine();
    const a = engine.analyzePrompt(input);
    const ep = new EpisodePlanner().createEpisodePlan(a, input);
    expect(ep.scenes.length).toBe(a.estimatedSceneCount);
    expect(ep.durationMinutes).toBe(2);
  });

  test('shot planner generates shots', () => {
    const engine = new OnePromptEngine();
    const a = engine.analyzePrompt(input);
    const ep = new EpisodePlanner().createEpisodePlan(a, input);
    const shots = new ShotPlanner().generateShots(ep);
    expect(shots.length).toBeGreaterThanOrEqual(ep.scenes.length * 2);
  });

  test('character designer specs are honest about asset backend', () => {
    const engine = new OnePromptEngine();
    const a = engine.analyzePrompt(input);
    const bible = new SeriesPlanner().createBible(a, input);
    const specs = new CharacterDesigner().generateSpecs(a.candidateCharacters, bible);
    expect(specs.length).toBeGreaterThanOrEqual(2);
    for (const s of specs) {
      expect(s.assetBackend).toBe('missing');
      expect(s.designPrompts).toBeDefined();
    }
  });

  test('rig360 synthesizer returns placeholder rig with missing assets', () => {
    const designer = new CharacterDesigner();
    const spec = designer.buildSpecFromArgs({
      name: 'Test Hero',
      role: 'protagonist',
      personality: 'brave'
    });
    const rig = new Rig360Synthesizer().generateSpec(spec);
    expect(rig.placeholderRigCreated).toBe(true);
    expect(rig.realRigCreated).toBe(false);
    expect(rig.missingAssets.length).toBeGreaterThan(0);
  });

  test('acting planner produces emotional arc', () => {
    const scene = { sceneId: 'SC_001', durationFrames: 120, mood: 'rising', characters: ['Hero'] };
    const planner = new ActingPlanner();
    const plan = planner.buildActingPlan('Hero', scene, {});
    expect(plan.emotionalArc.length).toBeGreaterThanOrEqual(4);
    expect(plan.readabilityScore).toBeGreaterThanOrEqual(70);
  });

  test('quality director scores episode', () => {
    const qd = new QualityDirector();
    const reports = qd.reviewEpisode({
      episodePlan: { scenes: [{ sceneId: 'SC_001', durationFrames: 120, characters: ['Hero'], location: 'lab' }] } as any,
      shotList: [],
      characterSpecs: [],
      rig360Specs: [],
      actingPlans: [],
      cameraPlans: [],
      fxPlans: []
    });
    expect(reports.length).toBeGreaterThan(0);
    expect(qd.scoreEpisode(reports)).toBeGreaterThanOrEqual(0);
  });

  test('episode assembler creates valid scene plans', () => {
    const engine = new OnePromptEngine();
    const a = engine.analyzePrompt(input);
    const ep = new EpisodePlanner().createEpisodePlan(a, input);
    const assembler = new EpisodeAssembler();
    const plans = assembler.assembleScenePlans(ep, [], [], []);
    expect(plans.length).toBe(ep.scenes.length);
    for (const p of plans) {
      expect(p.schemaVersion).toBe('1.0');
      expect(p.production).toBe(ep.episodeTitle);
    }
  });
});
