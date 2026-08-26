import { describe, it, expect } from '@jest/globals';
import { MohoJoystickBuilder } from '../src/services/mohoJoystickBuilder/index.js';
import { MohoLayerOrderSynthesizer } from '../src/services/mohoLayerOrderSynthesizer/index.js';
import { MohoPhysicsEngine } from '../src/services/mohoPhysicsEngine/index.js';
import { MohoPropAnchorSystem } from '../src/services/mohoPropAnchorSystem/index.js';
import { MohoPointMorphEngine } from '../src/services/mohoPointMorphEngine/index.js';

describe('MohoAdvancedRigSystems', () => {
  it('builds 2D XY Smart Mesh HUD Face Joystick with 9 interpolated lattice poses', () => {
    const joystick = MohoJoystickBuilder.buildFaceJoystick({
      controllerName: 'Rick_Face_Joystick',
      hudPosition: [250, 300],
      boxSize: 80
    });

    expect(joystick.controllerBone.name).toBe('Rick_Face_Joystick_Knob');
    expect(joystick.controllerBone.is_pin_bone).toBe(true);
    expect(joystick.boxFrameBones).toHaveLength(2);
    expect(joystick.smartActions).toHaveLength(9);

    const lookUpRight = joystick.smartActions.find(a => a.name === 'Rick_Face_Joystick_Look_Up_Right');
    expect(lookUpRight).toBeDefined();
    expect(lookUpRight?.keys.headAngle).toBe(20);
  });

  it('synthesizes dynamic layer Z-ordering system for limb crossing and depth sorting', () => {
    const sorting = MohoLayerOrderSynthesizer.synthesizeSortingSystem();

    expect(sorting.sortingDials.length).toBeGreaterThanOrEqual(3);
    const armDial = sorting.sortingDials.find(d => d.dialBoneName === 'Arm_Order_L');
    expect(armDial?.frontZIndex).toBe(100);
    expect(armDial?.backZIndex).toBe(10);
    expect(sorting.layerOrderActions.length).toBeGreaterThanOrEqual(6);
  });

  it('configures native bone physics for cloth and hair secondary overlapping dynamics', () => {
    const physicsChains = MohoPhysicsEngine.configureCharacterPhysics({
      includeCoatPhysics: true,
      includeHairPhysics: true
    });

    expect(physicsChains).toHaveLength(2);
    const coatChain = physicsChains.find(c => c.chainName === 'Coat_Dynamics');
    expect(coatChain?.bones.length).toBe(4);
    expect(coatChain?.bones[0].enablePhysics).toBe(true);
    expect(coatChain?.bones[0].spring).toBe(0.65);
  });

  it('creates dynamic prop anchor with seamless hand and world space switching', () => {
    const propRig = MohoPropAnchorSystem.createPropAnchor({
      propName: 'Portal_Gun',
      defaultHand: 'Hand_R'
    });

    expect(propRig.anchorBones.length).toBe(2);
    expect(propRig.anchorBones[0].name).toBe('Portal_Gun_Anchor');
    expect(propRig.switchDialSpec.dialBoneName).toBe('Portal_Gun_Parent_Dial');
    expect(propRig.smartActions).toHaveLength(3);
  });

  it('generates topology-preserving vector point morph tracks for continuous head turns', () => {
    const morph = MohoPointMorphEngine.generateHeadMorph(12);

    expect(morph.basePointCount).toBe(12);
    expect(morph.isTopologyValid).toBe(true);
    expect(morph.morphTracks).toHaveLength(3); // Front, 3/4, Profile

    const profileTrack = morph.morphTracks.find(t => t.angleName === 'Profile_R');
    expect(profileTrack?.pointOffsets.length).toBeGreaterThan(0);
  });
});
