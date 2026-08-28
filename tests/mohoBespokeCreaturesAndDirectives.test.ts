import { describe, it, expect } from '@jest/globals';
import { MohoBespokeCreatureBuilder } from '../src/services/mohoBespokeCreatureBuilder/index.js';
import { MohoDirectorDirectivesParser } from '../src/services/mohoDirectorDirectivesParser/index.js';

describe('MohoBespokeCreatureBuilder & MohoDirectorDirectivesParser', () => {
  it('builds a multi-limbed hydra creature with bespoke tentacles and multi-eyes', () => {
    const creature = MohoBespokeCreatureBuilder.buildCreature({
      creatureName: 'ThreeHeadedHydra',
      bodyType: 'multi_limb_hydra',
      limbs: [
        {
          name: 'Tentacle_L',
          type: 'tentacle',
          segmentsCount: 5,
          rootX: -40,
          rootY: 60,
          lengthPerSegment: 20,
          angleDeg: 160,
          ikTarget: true
        },
        {
          name: 'Tentacle_R',
          type: 'tentacle',
          segmentsCount: 5,
          rootX: 40,
          rootY: 60,
          lengthPerSegment: 20,
          angleDeg: 20,
          ikTarget: true
        }
      ],
      heads: [
        { name: 'Head_Center', rootBone: 'Body_Center', offsetX: 0, offsetY: 160, radius: 28, eyesCount: 3, hasMouth: true },
        { name: 'Head_Left', rootBone: 'Body_Center', offsetX: -60, offsetY: 130, radius: 22, eyesCount: 2, hasMouth: true },
        { name: 'Head_Right', rootBone: 'Body_Center', offsetX: 60, offsetY: 130, radius: 22, eyesCount: 2, hasMouth: true }
      ]
    });

    expect(creature.creatureName).toBe('ThreeHeadedHydra');
    expect(creature.limbsCount).toBe(2);
    expect(creature.headsCount).toBe(3);
    expect(creature.totalBonesCount).toBeGreaterThan(20);
    expect(creature.fileSizeBytes).toBeGreaterThan(0);

    const rootLayer = (creature.docJson.layers as any[])[0];
    const bones = rootLayer.skeleton.bones as any[];

    // Verify IK targets on tentacles
    const ikTargetL = bones.find(b => b.name === 'Tentacle_L_IK_Target');
    const ikTargetR = bones.find(b => b.name === 'Tentacle_R_IK_Target');
    expect(ikTargetL).toBeDefined();
    expect(ikTargetR).toBeDefined();

    // Verify individual eye dials per head
    const headCenterEye3 = bones.find(b => b.name === 'Head_Center_Eye_3_Dial');
    expect(headCenterEye3).toBeDefined();
  });

  it('builds an amorphous soft-body slime with radial pin lattice', () => {
    const slime = MohoBespokeCreatureBuilder.buildCreature({
      creatureName: 'GreenSlime',
      bodyType: 'soft_body_slime',
      limbs: [],
      heads: [
        { name: 'SlimeFace', rootBone: 'Body_Center', offsetX: 0, offsetY: 80, radius: 30, eyesCount: 2, hasMouth: true }
      ],
      softBodyPinsCount: 8
    });

    expect(slime.creatureName).toBe('GreenSlime');
    const rootLayer = (slime.docJson.layers as any[])[0];
    const bones = rootLayer.skeleton.bones as any[];

    const pinBones = bones.filter(b => b.name.startsWith('SoftPin_'));
    expect(pinBones).toHaveLength(8);
    expect(pinBones[0].is_pin_bone).toBe(true);
    expect(pinBones[0].has_physics).toBe(true);
  });

  it('parses director stage notes and generates comedic acting keyframes', () => {
    const result = MohoDirectorDirectivesParser.parseScriptLine(
      'МОРТИ: (пауза 3 сек, нервно дергает глазом) Ты уверен в этом, Рик? (испуганный подскок)',
      'Morty',
      1
    );

    expect(result.speaker).toBe('Morty');
    expect(result.spokenText).toBe('МОРТИ: Ты уверен в этом, Рик?');
    expect(result.directives).toHaveLength(3); // pause, twitch, take
    expect(result.totalExtraFrames).toBeGreaterThan(70);
    expect(result.generatedKeyframes.length).toBeGreaterThan(10);

    // Verify presence of pause, eye twitch, and cartoon take keyframes
    const wideEyes = result.generatedKeyframes.filter(k => k.value === 'Wide');
    expect(wideEyes.length).toBeGreaterThan(0);

    const squints = result.generatedKeyframes.filter(k => k.value === 'Squint');
    expect(squints.length).toBeGreaterThan(0);
  });
});
