import { describe, it, expect } from '@jest/globals';
import { MohoLimbMirrorService } from '../src/services/mohoLimbMirrorService/index.js';

describe('MohoLimbMirrorService', () => {
  it('mirrors left arm chain to right arm with inverted X, mirrored angles and renamed bones', () => {
    const leftArmBones = [
      { name: 'UpperArm_L', parent: 'Torso', x: -40, y: 170, length: 45, angle: 180, angleLimitMin: -45, angleLimitMax: 90 },
      { name: 'Forearm_L', parent: 'UpperArm_L', x: -85, y: 170, length: 45, angle: 180, angleLimitMin: 0, angleLimitMax: 135 },
      { name: 'Hand_L', parent: 'Forearm_L', x: -130, y: 170, length: 20, angle: 180 }
    ];

    const result = MohoLimbMirrorService.mirrorLimbChain({
      sourceBones: leftArmBones,
      sourceJointCorrections: [
        {
          jointName: 'Elbow_L',
          boneName: 'Forearm_L',
          flexionAnglesDeg: [90, 135],
          bulgeBicepScale: 1.18,
          cuffDeformers: [{ name: 'Forearm_L_UP', angleOffsetDeg: 15, lengthPx: 20 }]
        }
      ]
    });

    expect(result.mirroredBones).toHaveLength(3);
    const upperR = result.mirroredBones.find(b => b.name === 'UpperArm_R');
    const forearmR = result.mirroredBones.find(b => b.name === 'Forearm_R');
    const handR = result.mirroredBones.find(b => b.name === 'Hand_R');

    expect(upperR).toBeDefined();
    expect(upperR?.x).toBe(40);
    expect(upperR?.angle).toBe(0);
    expect(upperR?.angleLimitMin).toBe(-90);
    expect(upperR?.angleLimitMax).toBe(45);

    expect(forearmR).toBeDefined();
    expect(forearmR?.parent).toBe('UpperArm_R');
    expect(forearmR?.x).toBe(85);

    expect(handR).toBeDefined();
    expect(handR?.parent).toBe('Forearm_R');
    expect(handR?.x).toBe(130);

    // Verify joint corrections are mirrored
    expect(result.mirroredJointCorrections).toHaveLength(1);
    const jcR = result.mirroredJointCorrections[0];
    expect(jcR.jointName).toBe('Elbow_R');
    expect(jcR.boneName).toBe('Forearm_R');
    expect(jcR.cuffDeformers[0].name).toBe('Forearm_R_UP');
    expect(jcR.cuffDeformers[0].angleOffsetDeg).toBe(-15);
  });
});
