import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { CombatActionSolver } from '../../src/services/combatActionSolver/index.js';
import { Turnaround360Synthesizer } from '../../src/services/turnaround360Synthesizer/index.js';
import { HarmonyNativeRunner } from '../../src/adapters/harmonyNativeRunner.js';

const stageBin = HarmonyNativeRunner.detectStageExecutable();
const describeWithHarmony = stageBin && fs.existsSync(stageBin) ? describe : describe.skip;

describe('Combat & 360° Turnaround Integrated Pipeline', () => {
  const combatSpec = {
    specId: 'integration_combat_test',
    attacker: {
      characterId: 'char-01',
      role: 'attacker' as const,
      socket: 'hand_r' as const,
      actionType: 'punch_hook' as const,
      trajectory: [
        { frame: 1, position: { x: -300, y: 0 } },
        { frame: 14, position: { x: 20, y: 10 }, socketOffset: { x: 40, y: 0 } },
        { frame: 24, position: { x: 50, y: 5 } }
      ]
    },
    defender: {
      characterId: 'char-02',
      role: 'defender' as const,
      socket: 'jaw_l' as const,
      actionType: 'recoil_heavy' as const,
      trajectory: [
        { frame: 1, position: { x: 80, y: 0 } },
        { frame: 14, position: { x: 60, y: 0 }, socketOffset: { x: 0, y: 10 } },
        { frame: 24, position: { x: 280, y: -20 } }
      ]
    },
    impact: {
      contactFrame: 14,
      hitStopFrames: 3,
      impulseVector: { x: 50, y: -10 },
      cameraShake: { intensity: 12, decayFrames: 8 },
      vfxPreset: 'impact_star' as const
    },
    constraintHandOff: {
      enabled: true,
      handOffFrame: 14,
      sourceSocket: 'hand_r' as const,
      targetSocket: 'jaw_l' as const,
      blendDurationFrames: 2
    }
  };

  const turnaroundSpec = {
    characterId: 'char-01',
    angles: ['0', '45', '90', '135', '180'] as any,
    layerDepths: [
      { layerName: 'nose', baseZ: 0.2, amplitude: 0.3, phaseOffsetDeg: 0 },
      { layerName: 'head', baseZ: 0.1, amplitude: 0.05, phaseOffsetDeg: 0 },
      { layerName: 'ear_r', baseZ: 0.05, amplitude: 0.25, phaseOffsetDeg: -90 },
      { layerName: 'ear_l', baseZ: 0.05, amplitude: 0.25, phaseOffsetDeg: 90 },
      { layerName: 'torso', baseZ: 0.0, amplitude: 0.02, phaseOffsetDeg: 0 }
    ],
    masterController: {
      xRange: [0, 360] as [number, number],
      yRange: [-30, 30] as [number, number]
    }
  };

  it('solves combat and turnaround kinematics simultaneously with zero delta error', () => {
    const combatResult = CombatActionSolver.solveCombatInteraction(combatSpec);
    expect(combatResult.contactSocketDistanceAtImpact).toBeCloseTo(0.0, 3);
    expect(combatResult.hitStopFrames).toBe(3);
    expect(combatResult.cameraShake.length).toBeGreaterThan(0);
    expect(combatResult.vfxSpawn.preset).toBe('impact_star');

    const turnaroundResult = Turnaround360Synthesizer.synthesize360Turnaround(turnaroundSpec);
    expect(turnaroundResult.canonicalAngles).toHaveLength(5);
    expect(turnaroundResult.layerOrderingIntervals.length).toBeGreaterThan(0);
    expect(turnaroundResult.deformedMeshes.every(m => !m.hasInvertedTriangles)).toBe(true);
  });

  describeWithHarmony('Real Harmony 25 Showcase Rendering', () => {
    it('verifies combat showcase MP4 exists, is non-empty, and conforms to 1080p 24fps spec', () => {
      const showcaseReportPath = path.resolve('docs/evidence/harmony-production-v4/combat-turnaround-showcase-report.json');
      expect(fs.existsSync(showcaseReportPath)).toBe(true);

      const report = JSON.parse(fs.readFileSync(showcaseReportPath, 'utf8'));
      expect(report.status).toBe('passed');
      expect(report.showcase.codec).toBe('h264');
      expect(report.showcase.width).toBe(1920);
      expect(report.showcase.height).toBe(1080);
      expect(report.showcase.fps).toBe(24);
      expect(report.showcase.durationSec).toBe(2.0);
      expect(report.showcase.fileSizeBytes).toBeGreaterThan(1000);

      const mp4OnDisk = path.resolve(report.showcase.mp4Path);
      expect(fs.existsSync(mp4OnDisk)).toBe(true);
      expect(fs.statSync(mp4OnDisk).size).toBe(report.showcase.fileSizeBytes);
    });
  });
});
