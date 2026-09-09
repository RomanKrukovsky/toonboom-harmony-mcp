import { describe, expect, it } from '@jest/globals';
import { MohoWeightIsolationEngine } from '../src/services/mohoWeightIsolationEngine/index.js';
import type { WeightIsolationInput } from '../src/schemas/mohoWeightIsolationSpec.js';

describe('MohoWeightIsolationEngine', () => {
  const sampleInput: WeightIsolationInput = {
    characterId: 'hero',
    bones: [
      {
        boneId: 'torso_bone',
        start: { x: 0, y: 0 },
        end: { x: 0, y: 100 },
        influenceRadius: 80
      },
      {
        boneId: 'arm_l_bone',
        start: { x: 30, y: 80 },
        end: { x: 100, y: 80 },
        influenceRadius: 60
      }
    ],
    points: [
      // Point 1: On Torso collar, very close to arm_l_bone start (x: 20, y: 80)
      {
        pointId: 1,
        position: { x: 20, y: 80 },
        layerGroup: 'torso_layer'
      },
      // Point 2: On Arm sleeve, close to arm_l_bone (x: 40, y: 80)
      {
        pointId: 2,
        position: { x: 40, y: 80 },
        layerGroup: 'arm_l_layer'
      },
      // Point 3: Way out in space
      {
        pointId: 3,
        position: { x: 0, y: 250 },
        layerGroup: 'torso_layer'
      }
    ],
    isolationRules: [
      {
        layerGroup: 'torso_layer',
        allowedBones: ['torso_bone'] // Disallow arm_l_bone completely!
      },
      {
        layerGroup: 'arm_l_layer',
        allowedBones: ['arm_l_bone']
      }
    ]
  };

  it('calculates point-to-segment distance accurately', () => {
    const dist = MohoWeightIsolationEngine.distanceToSegment(
      { x: 50, y: 20 },
      { x: 0, y: 0 },
      { x: 100, y: 0 }
    );
    expect(dist).toBeCloseTo(20, 2);
  });

  it('strictly isolates torso points from arm bone bleed even when arm bone is closer', () => {
    const results = MohoWeightIsolationEngine.computeIsolatedWeights(sampleInput);
    const pt1 = results.find(r => r.pointId === 1)!;

    // Point 1 is at (20, 80).
    // Distance to arm_l_bone start (30, 80) is 10px!
    // Distance to torso_bone line (0, 80) is 20px!
    // Despite arm_l_bone being closer, torso isolation rule MUST force arm_l_bone weight to be undefined/0!
    expect(pt1.weights['arm_l_bone']).toBeUndefined();
    expect(pt1.weights['torso_bone']).toBeCloseTo(1.0, 3);
  });

  it('normalizes vertex weight sum to 1.0 on all points', () => {
    const results = MohoWeightIsolationEngine.computeIsolatedWeights(sampleInput);

    for (const res of results) {
      const sum = Object.values(res.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 3);
    }
  });

  it('clamps to closest allowed bone when point is outside influence radius', () => {
    const results = MohoWeightIsolationEngine.computeIsolatedWeights(sampleInput);
    const pt3 = results.find(r => r.pointId === 3)!;

    expect(pt3.weights['torso_bone']).toBe(1.0);
  });
});
