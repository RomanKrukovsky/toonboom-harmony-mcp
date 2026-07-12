import { CharacterPartDecomposer, type DecompositionInput } from '../src/adapters/characterPartDecomposer/index.js';
import { RepresentationRouterV3, type RoutingInput } from '../src/adapters/representationRouterV3/index.js';
import { partDecompositionSchema } from '../src/schemas/partDecomposition.js';
import { routingPlanSchema } from '../src/schemas/representationRouter.js';

describe('CharacterPartDecomposer', () => {
  const decomposer = new CharacterPartDecomposer();

  const baseInput: DecompositionInput = {
    characterId: 'masha',
    frameCount: 24,
    fps: 24,
    bodyType: 'humanoid'
  };

  test('decomposes humanoid character into standard parts', () => {
    const result = decomposer.decompose(baseInput);
    expect(result.parts.length).toBeGreaterThanOrEqual(20);
    const partIds = result.parts.map(p => p.partId);
    expect(partIds).toContain('head');
    expect(partIds).toContain('torso');
    expect(partIds).toContain('hand_left');
    expect(partIds).toContain('hand_right');
    expect(partIds).toContain('foot_left');
  });

  test('produces Zod-valid PartDecomposition', () => {
    const result = decomposer.decompose(baseInput);
    const parsed = partDecompositionSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  test('each part has frame states for all frames', () => {
    const result = decomposer.decompose(baseInput);
    for (const part of result.parts) {
      expect(part.frameStates.length).toBe(24);
      expect(part.frameStates[0].frame).toBe(1);
      expect(part.frameStates[23].frame).toBe(24);
    }
  });

  test('humanoid parts have correct hierarchy', () => {
    const result = decomposer.decompose(baseInput);
    const torso = result.parts.find(p => p.partId === 'torso');
    expect(torso?.identity.parentPartId).toBeNull();

    const head = result.parts.find(p => p.partId === 'head');
    expect(head?.identity.parentPartId).toBe('torso');

    const forearm = result.parts.find(p => p.partId === 'forearm_left');
    expect(forearm?.identity.parentPartId).toBe('upper_arm_left');
  });

  test('infers motion cluster from part type', () => {
    const result = decomposer.decompose(baseInput);
    const torso = result.parts.find(p => p.partId === 'torso');
    expect(torso?.motionCluster).toBe('rigid');

    const forearm = result.parts.find(p => p.partId === 'forearm_left');
    expect(forearm?.motionCluster).toBe('articulated');

    const hair = result.parts.find(p => p.partId === 'hair');
    expect(hair?.motionCluster).toBe('deformable');
  });

  test('detects occlusion problem ranges', () => {
    const inputWithOcclusion: DecompositionInput = {
      ...baseInput,
      frameRegions: Array.from({ length: 24 }, (_, i) => ({
        frame: i + 1,
        regions: i >= 5 && i <= 15
          ? []
          : [{ label: 'head', x: 0, y: -200, width: 60, height: 60, confidence: 0.8 }]
      }))
    };

    const result = decomposer.decompose(inputWithOcclusion);
    const head = result.parts.find(p => p.partId === 'head');
    expect(head?.problemRanges.length).toBeGreaterThan(0);
    expect(['medium', 'high']).toContain(head?.problemRanges[0].severity);
  });

  test('builds occlusion graph from depth ordering', () => {
    const inputWithRegions: DecompositionInput = {
      ...baseInput,
      frameRegions: Array.from({ length: 24 }, (_, i) => ({
        frame: i + 1,
        regions: [
          { label: 'torso', x: -50, y: -100, width: 100, height: 150, confidence: 0.7 },
          { label: 'head', x: -30, y: -200, width: 60, height: 60, confidence: 0.8 },
          { label: 'clothing', x: -45, y: -90, width: 90, height: 130, confidence: 0.6 }
        ]
      }))
    };

    const result = decomposer.decompose(inputWithRegions);
    expect(result.occlusionGraph).toBeDefined();
  });

  test('handles non-humanoid body type', () => {
    const input: DecompositionInput = {
      characterId: 'cat',
      frameCount: 12,
      bodyType: 'quadruped'
    };

    const result = decomposer.decompose(input);
    expect(result.bodyType).toBe('quadruped');
    expect(result.parts.length).toBeGreaterThan(0);
    expect(result.parts.every(p => !p.identity.isHumanoidPart)).toBe(true);
  });

  test('computes identity continuity score', () => {
    const result = decomposer.decompose(baseInput);
    expect(result.identityContinuityScore).toBeGreaterThan(0);
    expect(result.identityContinuityScore).toBeLessThanOrEqual(1);
  });

  test('marks inferred parts when no frame regions provided', () => {
    const result = decomposer.decompose(baseInput);
    const head = result.parts.find(p => p.partId === 'head');
    expect(head?.identity.inferred).toBe(true);
  });

  test('detects articulation hints from motion', () => {
    const inputWithMotion: DecompositionInput = {
      ...baseInput,
      frameRegions: Array.from({ length: 24 }, (_, i) => ({
        frame: i + 1,
        regions: [
          { label: 'hand_left', x: -150 + i * 25, y: 10, width: 30, height: 30, confidence: 0.7 }
        ]
      }))
    };

    const result = decomposer.decompose(inputWithMotion);
    const hand = result.parts.find(p => p.partId === 'hand_left');
    expect(hand?.articulationHints.length).toBeGreaterThan(0);
  });
});

describe('RepresentationRouterV3', () => {
  const decomposer = new CharacterPartDecomposer();
  const router = new RepresentationRouterV3();

  const baseInput: DecompositionInput = {
    characterId: 'masha',
    frameCount: 24,
    fps: 24,
    bodyType: 'humanoid'
  };

  test('routes all parts to a representation', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition
    });

    expect(plan.decisions.length).toBe(decomposition.parts.length);
    for (const decision of plan.decisions) {
      expect(decision.representation).toBeDefined();
      expect(decision.explanation.length).toBeGreaterThan(0);
      expect(decision.confidence).toBeGreaterThan(0);
    }
  });

  test('produces Zod-valid RoutingPlan', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition
    });

    const parsed = routingPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);
  });

  test('rigid parts get peg_transform', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition
    });

    const torsoDecision = plan.decisions.find(d => d.partId === 'torso');
    expect(torsoDecision?.representation).toBe('peg_transform');
  });

  test('deformable parts get frame_by_frame or curve_deformer', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition
    });

    const hairDecision = plan.decisions.find(d => d.partId === 'hair');
    expect(['frame_by_frame_vector', 'curve_deformer', 'envelope_deformer']).toContain(hairDecision?.representation);
  });

  test('respects artist locks', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition,
      artistLocks: { torso: 'bone_deformer' }
    });

    const torsoDecision = plan.decisions.find(d => d.partId === 'torso');
    expect(torsoDecision?.representation).toBe('bone_deformer');
    expect(torsoDecision?.factors.artistLocked).toBe(true);
    expect(torsoDecision?.confidence).toBe(1.0);
  });

  test('respects studio profile preferred representation', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition,
      studioProfile: {
        preferredRepresentation: 'envelope_deformer',
        editabilityPriority: 0.3
      }
    });

    expect(plan.summary.totalDecisions).toBe(decomposition.parts.length);
    expect(plan.studioProfile.preferredRepresentation).toBe('envelope_deformer');
    const representations = new Set(plan.decisions.map(d => d.representation));
    expect(representations.size).toBeGreaterThan(1);
  });

  test('provides alternatives for each decision', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition
    });

    for (const decision of plan.decisions) {
      expect(decision.alternatives.length).toBeGreaterThan(0);
      expect(decision.alternatives.every(a => a.representation !== decision.representation)).toBe(true);
    }
  });

  test('summary counts representations correctly', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition
    });

    const manualCounts: Record<string, number> = {};
    for (const d of plan.decisions) {
      manualCounts[d.representation] = (manualCounts[d.representation] ?? 0) + 1;
    }

    expect(plan.summary.totalDecisions).toBe(plan.decisions.length);
    expect(plan.summary.averageConfidence).toBeGreaterThan(0);
  });

  test('segments match decisions', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition
    });

    expect(plan.segments.length).toBeGreaterThan(0);
    for (const segment of plan.segments) {
      expect(segment.segments.length).toBeGreaterThan(0);
      const decision = plan.decisions.find(d => d.partId === segment.partId);
      expect(decision).toBeDefined();
    }
  });

  test('high editability priority favors peg_transform', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition,
      studioProfile: { editabilityPriority: 0.9 }
    });

    const pegCount = plan.decisions.filter(d => d.representation === 'peg_transform').length;
    expect(pegCount).toBeGreaterThan(5);
  });

  test('disabling frame-by-frame avoids frame_by_frame_vector', () => {
    const decomposition = decomposer.decompose(baseInput);
    const plan = router.route({
      characterId: 'masha',
      sceneId: 'scene_01',
      decomposition,
      studioProfile: { frameByFrameAllowed: false }
    });

    const fbfDecisions = plan.decisions.filter(d => d.representation === 'frame_by_frame_vector');
    expect(fbfDecisions.length).toBe(0);
  });
});
