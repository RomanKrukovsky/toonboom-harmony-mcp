import { describe, it, expect } from '@jest/globals';
import { MohoSmartActionSynthesizer } from '../src/services/mohoSmartActionSynthesizer/index.js';

describe('MohoSmartActionSynthesizer', () => {
  it('synthesizes joint flexion corrections with 90 and 135 deg keys and bicep bulge', () => {
    const actions = MohoSmartActionSynthesizer.synthesizeJointCorrections([
      {
        jointName: 'Elbow_L',
        boneName: 'Forearm_L',
        flexionAnglesDeg: [90, 135],
        bulgeBicepScale: 1.2,
        cuffDeformers: [
          { name: 'Forearm_L_UP', angleOffsetDeg: 15, lengthPx: 20 },
          { name: 'Forearm_L_DOWN', angleOffsetDeg: -15, lengthPx: 20 }
        ]
      }
    ]);

    expect(actions.length).toBeGreaterThanOrEqual(3);
    const mainAction = actions.find(a => a.targetBone === 'Forearm_L');
    expect(mainAction).toBeDefined();
    expect(mainAction?.keyframes).toHaveLength(3);
    expect(mainAction?.keyframes[1].scale?.y).toBe(1.2);

    const cuffAction = actions.find(a => a.targetBone === 'Forearm_L_UP');
    expect(cuffAction).toBeDefined();
    expect(cuffAction?.keyframes[2].angleDeg).toBe(15);
  });

  it('synthesizes squash & stretch actions with volume preservation and eyelid compensation', () => {
    const result = MohoSmartActionSynthesizer.synthesizeSquashStretch([
      {
        targetPart: 'Head',
        controlBoneName: 'Head',
        horizontalSpreaderBones: ['Ear_L', 'Ear_R'],
        scaleRatioYtoX: -0.95,
        eyelidCompensationEnabled: true
      }
    ]);

    expect(result.smartDials).toHaveLength(1);
    const dial = result.smartDials[0];
    expect(dial.dialName).toBe('Head s/s');
    expect(dial.minAngleDeg).toBe(-90);
    expect(dial.maxAngleDeg).toBe(90);

    // Verify eyelid compensation actions are generated
    const eyelidUp = result.actions.find(a => a.targetBone === 'eye_lid_up');
    const eyelidDown = result.actions.find(a => a.targetBone === 'eye_lid_down');
    expect(eyelidUp).toBeDefined();
    expect(eyelidDown).toBeDefined();
    expect(eyelidUp?.keyframes).toHaveLength(3);
  });
});
