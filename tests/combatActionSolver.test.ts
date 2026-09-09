import { describe, expect, it } from '@jest/globals';
import { CombatActionSolver } from '../src/services/combatActionSolver/index.js';
import type { CombatActionSpec } from '../src/schemas/combatActionPIR.js';

describe('CombatActionSolver', () => {
  const sampleCombatSpec: CombatActionSpec = {
    specId: 'combat_beat_01',
    sceneId: 'sc_01',
    attacker: {
      characterId: 'hero',
      role: 'attacker',
      socket: 'hand_r',
      actionType: 'punch_straight',
      trajectory: [
        { frame: 1, position: { x: -100, y: 0 }, socketOffset: { x: 40, y: 50 } },
        { frame: 10, position: { x: 0, y: 0 }, socketOffset: { x: 80, y: 50 } }, // Contact at Frame 10
        { frame: 20, position: { x: 10, y: 0 }, socketOffset: { x: 75, y: 48 } }
      ]
    },
    defender: {
      characterId: 'villain',
      role: 'defender',
      socket: 'jaw_l',
      actionType: 'recoil_heavy',
      trajectory: [
        { frame: 1, position: { x: 120, y: 0 }, socketOffset: { x: -30, y: 50 } },
        { frame: 10, position: { x: 100, y: 0 }, socketOffset: { x: -25, y: 50 } }, // Contact at Frame 10
        { frame: 20, position: { x: 160, y: 0 }, socketOffset: { x: -20, y: 45 } }
      ]
    },
    impact: {
      contactFrame: 10,
      hitStopFrames: 3,
      impulseVector: { x: 45, y: 15 },
      cameraShake: {
        intensity: 12,
        decayFrames: 8
      },
      vfxPreset: 'impact_star'
    },
    constraintHandOff: {
      enabled: true,
      handOffFrame: 10,
      sourceSocket: 'hand_r',
      targetSocket: 'jaw_l',
      blendDurationFrames: 4
    }
  };

  it('snaps contact sockets at contact frame with near-zero distance', () => {
    const result = CombatActionSolver.solveCombatInteraction(sampleCombatSpec);

    expect(result.contactSocketDistanceAtImpact).toBeLessThan(0.01);
    expect(result.impactWorldPosition).toEqual({ x: 80, y: 50 });
  });

  it('dilates timeline with hit-stop hold frames', () => {
    const result = CombatActionSolver.solveCombatInteraction(sampleCombatSpec);

    expect(result.hitStopFrames).toBe(3);

    // Frame 10 is contact, 11, 12, 13 must be hit-stop holds
    const attackerFrames = result.attackerTimeline.frames;
    const f10 = attackerFrames.find(f => f.frame === 10)!;
    const f11 = attackerFrames.find(f => f.frame === 11)!;
    const f12 = attackerFrames.find(f => f.frame === 12)!;
    const f13 = attackerFrames.find(f => f.frame === 13)!;

    expect(f10.isHitStopHold).toBe(false);
    expect(f11.isHitStopHold).toBe(true);
    expect(f12.isHitStopHold).toBe(true);
    expect(f13.isHitStopHold).toBe(true);

    expect(f11.position).toEqual(f10.position);
    expect(f12.position).toEqual(f10.position);
    expect(f13.position).toEqual(f10.position);
  });

  it('applies impulse vector recoil to defender post-impact', () => {
    const result = CombatActionSolver.solveCombatInteraction(sampleCombatSpec);
    const defenderFrames = result.defenderTimeline.frames;

    // Contact occurs at frame 10 (with hit-stop 11..13), frame 14+ is recoil
    const fContact = defenderFrames.find(f => f.frame === 10)!;
    const fEnd = defenderFrames[defenderFrames.length - 1];

    // Defender must be displaced further in X due to impulseVector.x = 45
    expect(fEnd.position.x).toBeGreaterThan(fContact.position.x);
  });

  it('generates decaying camera shake with peak at impact and smooth decay', () => {
    const result = CombatActionSolver.solveCombatInteraction(sampleCombatSpec);
    const shake = result.cameraShake;

    expect(shake.length).toBeGreaterThan(8);

    const firstShake = shake[0];
    const lastShake = shake[shake.length - 1];

    expect(firstShake.frame).toBe(10);
    // Last shake offset magnitude must have decayed to near zero
    const lastMagnitude = Math.hypot(lastShake.offset.x, lastShake.offset.y);
    expect(lastMagnitude).toBeLessThan(1.5);
  });

  it('blends dynamic constraint weights from 0.0 to 1.0 over blend duration', () => {
    const result = CombatActionSolver.solveCombatInteraction(sampleCombatSpec);
    const weights = result.constraintWeights;

    expect(weights.length).toBeGreaterThan(2);

    const startWeight = weights[0].weight;
    const endWeight = weights[weights.length - 1].weight;

    expect(startWeight).toBe(0.0);
    expect(endWeight).toBe(1.0);

    // Weights must be monotonically non-decreasing
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i].weight).toBeGreaterThanOrEqual(weights[i - 1].weight);
    }
  });

  it('provides precise VFX anchor coordinates at impact socket', () => {
    const result = CombatActionSolver.solveCombatInteraction(sampleCombatSpec);

    expect(result.vfxSpawn.preset).toBe('impact_star');
    expect(result.vfxSpawn.frame).toBe(10);
    expect(result.vfxSpawn.position).toEqual({ x: 80, y: 50 });
  });
});
