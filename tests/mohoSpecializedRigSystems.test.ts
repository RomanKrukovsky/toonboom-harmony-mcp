import { describe, it, expect } from '@jest/globals';
import { MohoQuadrupedRigEngine } from '../src/services/mohoQuadrupedRigEngine/index.js';
import { MohoMechanicalPistonBuilder } from '../src/services/mohoMechanicalPistonBuilder/index.js';
import { MohoSplineTentacleEngine } from '../src/services/mohoSplineTentacleEngine/index.js';
import { MohoPsdImageLayerIngest } from '../src/services/mohoPsdImageLayerIngest/index.js';
import { MohoTrajectorySquashEngine } from '../src/services/mohoTrajectorySquashEngine/index.js';

describe('MohoSpecializedRigSystems', () => {
  it('builds full quadruped rig with scapula, hock joints, IK targets, and tail chain', () => {
    const quadruped = MohoQuadrupedRigEngine.buildQuadrupedRig({
      animalName: 'PioneerDog',
      bodyLengthPx: 180,
      tailSegments: 5
    });

    expect(quadruped.animalName).toBe('PioneerDog');
    expect(quadruped.totalBones).toBeGreaterThanOrEqual(25);
    expect(quadruped.tailChain).toHaveLength(5);
    expect(quadruped.smartDials).toContain('Tail_Wag_Cycle');

    const hockL = quadruped.bones.find(b => b.name === 'Hock_L');
    expect(hockL).toBeDefined();
    expect(hockL?.parentName).toBe('Tibia_L');

    const targetHindL = quadruped.bones.find(b => b.name === 'Target_Hind_L');
    expect(targetHindL?.isIkTarget).toBe(true);
  });

  it('builds mechanical hydraulic piston pair with mutual look-at targets', () => {
    const piston = MohoMechanicalPistonBuilder.buildPistonPair({
      pistonName: 'Hydraulic_Arm',
      baseJointPos: [0, 100],
      rodJointPos: [50, 40],
      cylinderLengthPx: 40,
      rodLengthPx: 40
    });

    expect(piston.pistonName).toBe('Hydraulic_Arm');
    expect(piston.bones).toHaveLength(4);
    expect(piston.constraints).toHaveLength(2);
    expect(piston.constraints[0].type).toBe('look_at');
  });

  it('builds flexible multi-joint spline tentacle chain with wave actions', () => {
    const tentacle = MohoSplineTentacleEngine.buildTentacleChain({
      tentacleName: 'Alien_Tentacle',
      startPos: [0, 0],
      segmentCount: 8,
      segmentLengthPx: 25
    });

    expect(tentacle.segmentCount).toBe(8);
    expect(tentacle.bones).toHaveLength(8);
    expect(tentacle.smartActions).toHaveLength(3);
    expect(tentacle.smartActions[0].actionName).toBe('Alien_Tentacle_C_CURVE_LEFT');
  });

  it('ingests raster cutout puppet with automated Smart Mesh generation', () => {
    const puppet = MohoPsdImageLayerIngest.ingestPuppet('RefereePuppet', [
      {
        name: 'Head_Texture',
        imageFilePath: '/assets/head.png',
        originX: 0,
        originY: 200,
        widthPx: 150,
        heightPx: 180,
        generateSmartMesh: true
      },
      {
        name: 'Torso_Texture',
        imageFilePath: '/assets/torso.png',
        originX: 0,
        originY: 100,
        widthPx: 200,
        heightPx: 250,
        generateSmartMesh: true
      }
    ]);

    expect(puppet.puppetName).toBe('RefereePuppet');
    expect(puppet.imageLayersCount).toBe(2);
    expect(puppet.meshWarpLayersCount).toBe(2);
    expect(puppet.layerList).toHaveLength(4); // 2 ImageLayers + 2 MeshLayers
  });

  it('calculates trajectory-aligned squash and stretch with volume conservation', () => {
    const trajectory = [
      { frame: 1, posX: 0, posY: 300 },
      { frame: 12, posX: 100, posY: 50 },  // High speed downward fall
      { frame: 13, posX: 100, posY: 0 },   // Impact
      { frame: 24, posX: 200, posY: 200 }  // Rebound launch
    ];

    const squash = MohoTrajectorySquashEngine.calculateTrajectorySquash('BouncingBall', trajectory);

    expect(squash.totalKeyframes).toBe(4);
    expect(squash.keyframes[1].scaleX).toBeGreaterThan(1.0); // Stretch along fall
    expect(squash.keyframes[1].scaleY).toBeLessThan(1.0);    // Thin cross-section
    expect(+(squash.keyframes[1].scaleX * squash.keyframes[1].scaleY).toFixed(1)).toBe(1.0); // Volume conservation
  });
});
