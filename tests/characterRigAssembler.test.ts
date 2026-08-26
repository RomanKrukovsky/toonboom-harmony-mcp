import { describe, it, expect } from '@jest/globals';
import { CharacterRigAssembler } from '../src/adapters/characterRigAssembler.js';
import { characterDrawingPIRSchema } from '../src/schemas/vectorizationPIR.js';

describe('CharacterRigAssembler Tests', () => {
  const samplePIR = characterDrawingPIRSchema.parse({
    characterId: 'hero_v1',
    drawingName: 'character_head',
    frame: 1,
    coordinateTransform: {
      sourceWidth: 1024,
      sourceHeight: 1024,
      coordinateSystem: 'normalized',
      transformMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      scale: 1.0,
      axisOrientation: { x: 'right', y: 'up' }
    },
    layers: [
      {
        layerId: 'layer_head',
        name: 'Head',
        semanticGroup: 'head',
        artLayer: 'line',
        strokes: [],
        fillRegions: []
      },
      {
        layerId: 'layer_torso',
        name: 'Torso',
        semanticGroup: 'torso',
        artLayer: 'line',
        strokes: [],
        fillRegions: []
      },
      {
        layerId: 'layer_arm_l',
        name: 'Arm Left',
        semanticGroup: 'left_arm',
        artLayer: 'line',
        strokes: [],
        fillRegions: []
      },
      {
        layerId: 'layer_hand_l',
        name: 'Hand Left',
        semanticGroup: 'left_hand',
        artLayer: 'line',
        strokes: [],
        fillRegions: []
      }
    ],
    palette: [],
    qualityMetrics: {
      totalStrokes: 4,
      totalFills: 0,
      averageControlPointsPerStroke: 4,
      rmsGeometricError: 0.001,
      firstPassAcceptanceRate: 1.0,
      requiresHumanReviewCount: 0
    }
  });

  it('assembles valid CharacterRigAssemblyPlan from PIR', () => {
    const plan = CharacterRigAssembler.assemblePlan(samplePIR, 'Hero');

    expect(plan.characterName).toBe('Hero');
    expect(plan.masterPegName).toBe('Hero_Master_P');
    expect(plan.parts.length).toBeGreaterThan(0);
    expect(plan.planHash).toBeDefined();

    // Check Separate Position & Lock Drawing Mode
    const torsoPart = plan.parts.find((p) => p.partId === 'Torso');
    expect(torsoPart).toBeDefined();
    expect(torsoPart?.separatePosition).toBe(true);
    expect(torsoPart?.lockDrawingMode).toBe(true);

    // Check Micro Z-Offset
    const headPart = plan.parts.find((p) => p.partId === 'Head');
    expect(headPart?.zOffset).toBeGreaterThan(0);

    // Check Auto-patch Joints — two-segment hinge hierarchy:
    // Arm_L -> Forearm_L (elbow), Forearm_L -> Hand_L (wrist).
    expect(plan.autoPatchJoints.length).toBeGreaterThan(0);
    const elbowJoint = plan.autoPatchJoints.find((j) => j.partA === 'Arm_L' && j.partB === 'Forearm_L');
    expect(elbowJoint).toBeDefined();
    const wristJoint = plan.autoPatchJoints.find((j) => j.partA === 'Forearm_L' && j.partB === 'Hand_L');
    expect(wristJoint).toBeDefined();

    // Check Backdrops
    expect(plan.backdrops.length).toBe(4);
  });
});
