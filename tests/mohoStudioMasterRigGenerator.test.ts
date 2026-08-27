import { describe, it, expect } from '@jest/globals';
import { MohoStudioMasterRigGenerator } from '../src/services/mohoStudioMasterRigGenerator/index.js';

describe('MohoStudioMasterRigGenerator (Uncompromising Broadcast Rig)', () => {
  it('synthesizes a complete broadcast-ready character rig with full articulation', () => {
    const result = MohoStudioMasterRigGenerator.generateMasterRig({
      characterName: 'Rick Sanchez',
      gender: 'male',
      skinColorRgba: [235, 205, 185, 255],
      hairColorRgba: [170, 215, 240, 255],
      shirtColorRgba: [140, 215, 220, 255],
      pantsColorRgba: [95, 75, 60, 255],
      shoesColorRgba: [240, 240, 240, 255]
    });

    expect(result.characterName).toBe('Rick Sanchez');
    expect(result.totalBonesCount).toBeGreaterThanOrEqual(30);
    expect(result.totalLayersCount).toBeGreaterThanOrEqual(5);
    expect(result.smartDialsCount).toBeGreaterThanOrEqual(5);
    expect(result.actionsCount).toBeGreaterThanOrEqual(5);
    expect(result.fileSizeBytes).toBeGreaterThan(0);

    // Verify document skeleton structure
    const rootLayer = (result.docJson.layers as any[])[0];
    expect(rootLayer.type).toBe('BoneLayer');
    const bones = rootLayer.skeleton.bones as any[];

    // Verify IK targets
    const shinL = bones.find(b => b.name === 'Shin_L');
    const targetLegL = bones.find(b => b.name === 'Target_Leg_L');
    expect(shinL).toBeDefined();
    expect(targetLegL).toBeDefined();
    expect(targetLegL.is_pin_bone).toBe(true);
    expect(targetLegL.strength).toBe(0);

    // Verify 2D Face HUD Joystick and Dials
    const joystick = bones.find(b => b.name === 'Face_XY_Joystick');
    const turnDial = bones.find(b => b.name === '360_Turn_Dial');
    const mouthDial = bones.find(b => b.name === 'Mouth_Dial');
    expect(joystick).toBeDefined();
    expect(turnDial).toBeDefined();
    expect(mouthDial).toBeDefined();

    // Verify hair physics
    const hairTop = bones.find(b => b.name === 'Hair_Top');
    expect(hairTop.has_physics).toBe(true);
    expect(hairTop.physics_spring).toBeGreaterThan(0);

    // Verify 8-angle head switch layer
    const headSwitch = rootLayer.layer_list.find((l: any) => l.name === 'Head 360 Switch');
    expect(headSwitch).toBeDefined();
    expect(headSwitch.type).toBe('SwitchLayer');
    expect(headSwitch.layer_list).toHaveLength(8);
  });
});
