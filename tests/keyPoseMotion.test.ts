import { KeyPoseGenerator } from '../src/adapters/keyPoseGenerator/index.js';
import { MotionSynthesizer } from '../src/adapters/motionSynthesizer/index.js';
import { SceneUnderstandingEngine } from '../src/adapters/sceneUnderstanding/index.js';
import { keyPoseSetSchema, motionSynthesisPlanSchema } from '../src/schemas/keyPoseMotion.js';
import { type SceneUnderstanding } from '../src/schemas/sceneIntelligence.js';
import { type PerformancePlan } from '../src/schemas/voicePerformance.js';
import { type DigitalActor } from '../src/schemas/digitalActor.js';
import { DEFAULT_360_VIEWS, DEFAULT_MOUTH_SHAPES } from '../src/schemas/characterSpec.js';

describe('KeyPoseGenerator & MotionSynthesizer', () => {
  let mockScene: SceneUnderstanding;

  beforeAll(() => {
    mockScene = new SceneUnderstandingEngine().analyze({
      script: 'Masha: Ты всё знал?',
      sceneId: 'sc_test',
      sceneName: 'Test Scene',
      fps: 24,
      durationSeconds: 6,
      characters: [
        { characterId: 'actor_masha', name: 'Masha', role: 'protagonist', stance: 'standing', visibleOnScreen: true }
      ],
      dialogue: [
        { speaker: 'Masha', text: 'Ты всё знал?', startSec: 1.0, endSec: 5.0 }
      ]
    });
  });

  const getMockPerformance = (): PerformancePlan => ({
    schemaVersion: '1.0',
    planId: 'perf_test',
    sceneId: 'sc_test',
    characterId: 'actor_masha',
    style: 'restrained',
    styleDescription: 'Restrained dialogue',
    events: [
      {
        eventId: 'evt_1',
        kind: 'gesture',
        startTime: 1.5,
        endTime: 3.5,
        intensity: 0.8,
        target: null,
        bodyPart: 'arm_R',
        description: 'pointing finger',
        confidence: 0.9,
        provenance: 'style_rule',
        relatedBeatId: null,
        alternatives: []
      },
      {
        eventId: 'evt_2',
        kind: 'blink',
        startTime: 0.5,
        endTime: 0.6,
        intensity: 0.5,
        target: null,
        bodyPart: 'eyes',
        description: 'blink',
        confidence: 0.9,
        provenance: 'text_rule',
        relatedBeatId: null,
        alternatives: []
      }
    ],
    eventCount: 2,
    confidence: 0.9,
    assumptions: [],
    provenance: { engine: 'rule_based PerformanceGenerator v1', createdAt: new Date().toISOString() }
  });

  const mockActor: DigitalActor = {
    schemaVersion: '3.0',
    actorId: 'actor_masha',
    identity: { name: 'Masha', description: 'Masha', tags: [] },
    modelSheets: [],
    palettes: [],
    masterDrawings: [
      { drawingId: 'head_front', name: 'head_front', path: 'head.png', inferred: false },
      { drawingId: 'torso_front', name: 'torso_front', path: 'torso.png', inferred: false }
    ],
    headViews: DEFAULT_360_VIEWS,
    bodyViews: DEFAULT_360_VIEWS,
    eyes: ['eyes'],
    brows: [],
    mouths: DEFAULT_MOUTH_SHAPES,
    hands: [],
    props: [],
    pivots: [
      { partId: 'head', x: 0, y: 120, inferred: false },
      { partId: 'torso', x: 0, y: 50, inferred: false }
    ],
    hierarchy: [
      { partId: 'head', parentId: 'torso' },
      { partId: 'torso', parentId: null }
    ],
    deformRules: [],
    substitutions: [
      { partId: 'head', drawingId: 'head_front', name: 'front' },
      { partId: 'torso', drawingId: 'torso_front', name: 'front' }
    ],
    poseFamilies: [],
    gestureLibrary: [],
    actingProfile: { defaultStyle: 'restrained', tempoBias: 1.0, gestureRate: 0.5 },
    provenance: { importedFrom: 'test', importedAt: new Date().toISOString(), inferredParts: [] },
    origin: 'planned'
  };

  test('KeyPoseGenerator schedules storytelling poses and transitions correctly', () => {
    const generator = new KeyPoseGenerator();
    const poseSet = generator.generate(mockScene, getMockPerformance(), mockActor);

    expect(keyPoseSetSchema.safeParse(poseSet).success).toBe(true);
    expect(poseSet.poses.length).toBeGreaterThan(2);

    // Initial pose should be HoldPose at frame 1
    expect(poseSet.poses[0].frame).toBe(1);
    expect(poseSet.poses[0].type).toBe('HoldPose');

    // Gesture start is 1.5s (frame 36). Anticipation should be scheduled before it.
    const hasAnticipation = poseSet.poses.some(p => p.type === 'AnticipationPose' && p.frame < 36);
    expect(hasAnticipation).toBe(true);

    // ExtremePose should be scheduled at midpoint of the gesture (approx frame 60)
    const hasExtreme = poseSet.poses.some(p => p.type === 'ExtremePose' && p.frame === 60);
    expect(hasExtreme).toBe(true);
  });

  test('MotionSynthesizer interpolates joints and reduces keyframes within error tolerance', () => {
    const generator = new KeyPoseGenerator();
    const poseSet = generator.generate(mockScene, getMockPerformance(), mockActor);

    const synthesizer = new MotionSynthesizer();
    // Tolerance of 0.01 for strict key reduction checks
    const motionPlan = synthesizer.synthesize(mockScene, poseSet, mockActor, 0.01);

    expect(motionSynthesisPlanSchema.safeParse(motionPlan).success).toBe(true);
    expect(motionPlan.tracks.length).toBeGreaterThan(0);

    // Verify key reduction has run and registered metrics
    for (const track of motionPlan.tracks) {
      expect(track.keyReductionMetrics).toBeDefined();
      const metrics = track.keyReductionMetrics!;
      expect(metrics.originalKeyCount).toBe(mockScene.endFrame || 72);
      expect(metrics.reducedKeyCount).toBeLessThanOrEqual(metrics.originalKeyCount);
      expect(metrics.maxError).toBeLessThanOrEqual(0.01);
    }

    // Verify drawing substitutions are mapped
    expect(motionPlan.drawingSubstitutions.length).toBeGreaterThan(0);
    expect(motionPlan.exposureBlocks.length).toBeGreaterThan(0);
  });
});
