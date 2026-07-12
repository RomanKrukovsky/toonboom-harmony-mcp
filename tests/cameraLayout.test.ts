import { CameraLayoutDirector } from '../src/adapters/cameraLayoutDirector/index.js';
import { cameraLayoutPlanSchema } from '../src/schemas/cameraLayout.js';
import type { SceneUnderstanding } from '../src/schemas/sceneIntelligence.js';

describe('CameraLayoutDirector', () => {
  const director = new CameraLayoutDirector();

  const baseSceneUnderstanding: SceneUnderstanding = {
    schemaVersion: '1.0',
    sceneId: 'test_scene',
    sceneName: 'Test Scene',
    sourceScript: 'Test script',
    totalDurationSeconds: 10,
    endFrame: 240,
    sceneIntent: 'Test intent',
    characters: [
      {
        characterId: 'masha',
        name: 'Masha',
        goalInScene: 'Confront',
        emotionalArc: 'calm → angry',
        hasDialogue: true,
        role: 'protagonist',
        stance: 'standing',
        visibleOnScreen: true,
        speaksFirst: true,
        receivesReaction: false
      },
      {
        characterId: 'ivan',
        name: 'Ivan',
        goalInScene: 'Defend',
        emotionalArc: 'surprised → defensive',
        hasDialogue: true,
        role: 'antagonist',
        stance: 'standing',
        visibleOnScreen: true,
        speaksFirst: false,
        receivesReaction: true
      }
    ],
    beats: [
      {
        beatId: 'beat_1',
        startTime: 0,
        endTime: 3,
        primaryCharacter: 'masha',
        intent: 'accuse',
        emotion: 'anger',
        action: 'confront',
        importance: 0.9,
        beatKind: 'rising_action',
        confidence: 0.8
      },
      {
        beatId: 'beat_2',
        startTime: 3,
        endTime: 6,
        primaryCharacter: 'ivan',
        intent: 'defend',
        emotion: 'surprise',
        action: 'react',
        reactionTarget: 'masha',
        importance: 0.7,
        beatKind: 'reaction',
        confidence: 0.75
      },
      {
        beatId: 'beat_3',
        startTime: 6,
        endTime: 10,
        primaryCharacter: 'masha',
        intent: 'reveal',
        emotion: 'controlled_anger',
        action: 'explain',
        importance: 0.95,
        beatKind: 'revelation',
        confidence: 0.85
      }
    ],
    actionBeats: [],
    reactionBeats: [],
    emotionCurve: [],
    attentionTargets: [],
    continuity: [],
    assumptions: [],
    uncertainties: [],
    provenance: {
      engine: 'test',
      createdAt: new Date().toISOString()
    }
  } as any;

  test('generates Zod-valid CameraLayoutPlan', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    const parsed = cameraLayoutPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);
  });

  test('generates one shot per beat', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    expect(plan.shots.length).toBe(baseSceneUnderstanding.beats.length);
  });

  test('each shot references correct beat and characters', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    for (const shot of plan.shots) {
      expect(shot.beatIds.length).toBeGreaterThan(0);
      expect(shot.characterIds.length).toBeGreaterThan(0);
      expect(shot.sceneId).toBe(baseSceneUnderstanding.sceneId);
    }
  });

  test('high importance beats get close_up shot size', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    const highImportanceShot = plan.shots.find(s =>
      s.beatIds.includes('beat_3')
    );
    expect(['close_up', 'medium_close_up']).toContain(highImportanceShot?.shotSize);
  });

  test('camera track has keyframes for all shots', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    expect(plan.cameraTrack.keyframes.length).toBeGreaterThan(0);
    expect(plan.cameraTrack.totalDuration).toBeGreaterThan(0);
  });

  test('blocking plans generated for each shot', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    expect(plan.blockingPlans.length).toBe(plan.shots.length);

    for (const blocking of plan.blockingPlans) {
      expect(blocking.positions.length).toBeGreaterThan(0);
      expect(blocking.shotId).toBeDefined();
    }
  });

  test('summary statistics are correct', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    expect(plan.summary.totalShots).toBe(plan.shots.length);
    expect(plan.summary.averageShotDuration).toBeGreaterThan(0);
    expect(plan.summary.totalKeyframes).toBe(plan.cameraTrack.keyframes.length);
    expect(Object.keys(plan.summary.cameraMovements).length).toBeGreaterThan(0);
    expect(Object.keys(plan.summary.shotSizes).length).toBeGreaterThan(0);
  });

  test('dynamic style generates more camera movements', () => {
    const restrainedPlan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24,
      style: 'restrained'
    });

    const dynamicPlan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24,
      style: 'dynamic'
    });

    const restrainedMovements = Object.keys(restrainedPlan.summary.cameraMovements).length;
    const dynamicMovements = Object.keys(dynamicPlan.summary.cameraMovements).length;

    expect(dynamicMovements).toBeGreaterThanOrEqual(restrainedMovements);
  });

  test('shots have valid timing', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    for (const shot of plan.shots) {
      expect(shot.startTime).toBeGreaterThanOrEqual(0);
      expect(shot.endTime).toBeGreaterThan(shot.startTime);
      expect(shot.duration).toBeCloseTo(shot.endTime - shot.startTime, 5);
    }
  });

  test('camera positions are calculated from shot size', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    for (const shot of plan.shots) {
      expect(shot.cameraPosition).toBeDefined();
      expect(shot.cameraScale).toBeGreaterThan(0);
      expect(shot.cameraPosition.z).toBeGreaterThan(0);
    }
  });

  test('eyelines generated for reaction beats', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    const reactionShot = plan.shots.find(s => s.beatIds.includes('beat_2'));
    expect(reactionShot?.eyelines.length).toBeGreaterThan(0);
    expect(reactionShot?.eyelines[0].fromCharacterId).toBe('ivan');
    expect(reactionShot?.eyelines[0].toCharacterId).toBe('masha');
  });

  test('framing rules are context-aware', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    for (const shot of plan.shots) {
      expect(shot.framingRules.length).toBeGreaterThan(0);
      expect(shot.framingRules).toContain('rule_of_thirds');
    }
  });

  test('safe margins are within valid range', () => {
    const plan = director.generate({
      sceneUnderstanding: baseSceneUnderstanding,
      fps: 24
    });

    for (const shot of plan.shots) {
      expect(shot.safeMargins.top).toBeGreaterThanOrEqual(0);
      expect(shot.safeMargins.top).toBeLessThanOrEqual(0.5);
      expect(shot.safeMargins.bottom).toBeGreaterThanOrEqual(0);
      expect(shot.safeMargins.bottom).toBeLessThanOrEqual(0.5);
    }
  });
});
