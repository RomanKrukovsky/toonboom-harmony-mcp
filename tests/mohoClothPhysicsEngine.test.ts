import { describe, expect, it } from '@jest/globals';
import { MohoClothPhysicsEngine } from '../src/services/mohoClothPhysicsEngine/index.js';
import type { ClothPhysicsInput } from '../src/schemas/mohoClothPhysicsSpec.js';

describe('MohoClothPhysicsEngine', () => {
  const sampleInput: ClothPhysicsInput = {
    characterId: 'cape_hero',
    chains: [
      {
        chainId: 'cape_main',
        rootBone: 'torso',
        nodes: [
          { boneId: 'cape_01', lengthPx: 40, baseAngleDeg: -90 },
          { boneId: 'cape_02', lengthPx: 40, baseAngleDeg: -90 },
          { boneId: 'cape_03', lengthPx: 40, baseAngleDeg: -90 }
        ]
      }
    ],
    totalFrames: 24,
    waveFrequency: 0.25,
    waveAmplitudeDeg: 20,
    dampingFactor: 0.1,
    windVector: { x: 5, y: 0 },
    barrierPlane: {
      origin: { x: 0, y: 0 },
      normal: { x: 1, y: 0 } // Points to positive X
    }
  };

  it('generates cloth wave keyframe channels for all nodes in chain', () => {
    const result = MohoClothPhysicsEngine.simulateClothWaves(sampleInput);

    expect(result.channels).toHaveLength(3);
    for (const ch of result.channels) {
      expect(ch.keys).toHaveLength(24);
    }
    expect(result.maxDeflectionDeg).toBeGreaterThan(5);
  });

  it('demonstrates progressive phase delay down the serial bone chain', () => {
    const result = MohoClothPhysicsEngine.simulateClothWaves(sampleInput);
    const node1Keys = result.channels[0].keys;
    const node3Keys = result.channels[2].keys;

    // Find peak frame for node 1 vs node 3
    const peakFrameNode1 = node1Keys.reduce((max, k) => (k.angleDeg > max.angleDeg ? k : max), node1Keys[0]).frame;
    const peakFrameNode3 = node3Keys.reduce((max, k) => (k.angleDeg > max.angleDeg ? k : max), node3Keys[0]).frame;

    // The wave moves down the chain, so peak at node 3 must be delayed relative to node 1
    expect(peakFrameNode3).not.toEqual(peakFrameNode1);
  });

  it('enforces collision barrier preventing cloth from penetrating boundary', () => {
    const barrierInput: ClothPhysicsInput = {
      ...sampleInput,
      waveAmplitudeDeg: 80, // Large oscillation that would penetrate
      barrierPlane: {
        origin: { x: 0, y: 0 },
        normal: { x: 0, y: 1 } // Normal along Y
      }
    };

    const result = MohoClothPhysicsEngine.simulateClothWaves(barrierInput);

    expect(result.barrierCollisionsPrevented).toBeGreaterThan(0);
  });
});
