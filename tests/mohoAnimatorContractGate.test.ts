import { describe, it, expect } from '@jest/globals';
import { MohoAnimatorContractGate } from '../src/services/mohoAnimatorContractGate/index.js';
import { BONE_COLOR_PALETTE } from '../src/schemas/mohoProductionRig.js';

describe('MohoAnimatorContractGate', () => {
  it('hides helper and deformer bones with shy=true while keeping controllers visible', () => {
    const rawBones = [
      { name: 'Master', parent: null },
      { name: 'Torso', parent: 'Master' },
      { name: 'Forearm_L', parent: 'Torso' },
      { name: 'B12', parent: 'Forearm_L', isHelperOrDeformer: true },
      { name: 'Shin_L_UP', parent: 'Shin_L', isHelperOrDeformer: true },
      { name: 'Head switch', parent: 'Master', isSmartDial: true }
    ];

    const audit = MohoAnimatorContractGate.auditAndApplyContract(rawBones);

    expect(audit.passed).toBe(true);
    expect(audit.totalBones).toBe(6);
    expect(audit.shyBonesCount).toBe(2);

    const helper = audit.auditedBones.find(b => b.boneName === 'B12');
    expect(helper?.isShy).toBe(true);

    const dial = audit.auditedBones.find(b => b.boneName === 'Head switch');
    expect(dial?.isShy).toBe(false);
    expect(dial?.color).toBe(BONE_COLOR_PALETTE.PURPLE_DIALS);
  });

  it('assigns standard Left/Right/Root colors', () => {
    const rawBones = [
      { name: 'Master', parent: null },
      { name: 'Arm_L', parent: 'Torso' },
      { name: 'Arm_R', parent: 'Torso' }
    ];

    const audit = MohoAnimatorContractGate.auditAndApplyContract(rawBones);

    const master = audit.auditedBones.find(b => b.boneName === 'Master');
    const left = audit.auditedBones.find(b => b.boneName === 'Arm_L');
    const right = audit.auditedBones.find(b => b.boneName === 'Arm_R');

    expect(master?.color).toBe(BONE_COLOR_PALETTE.YELLOW_ROOT);
    expect(left?.color).toBe(BONE_COLOR_PALETTE.BLUE_LEFT);
    expect(right?.color).toBe(BONE_COLOR_PALETTE.ORANGE_RIGHT);
  });

  it('detects Frame 0 stray keyframe violations', () => {
    const rawBones = [
      { name: 'Master', parent: null, keyframesCountFrameZero: 3 }
    ];

    const audit = MohoAnimatorContractGate.auditAndApplyContract(rawBones);
    expect(audit.passed).toBe(false);
    expect(audit.violations.length).toBeGreaterThan(0);
  });
});
