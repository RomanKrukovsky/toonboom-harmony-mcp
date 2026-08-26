import { describe, it, expect } from '@jest/globals';
import { MohoAutoCharacterSynthesizer } from '../src/services/mohoAutoCharacterSynthesizer/index.js';

describe('MohoAutoCharacterSynthesizer', () => {
  it('synthesizes Rick Sanchez full production turnaround rig from text prompt', () => {
    const result = MohoAutoCharacterSynthesizer.synthesizeFromPrompt({
      prompt: 'Rick Sanchez from Rick and Morty, mad scientist in white lab coat with blue spiky hair'
    });

    expect(result.characterName).toBe('Rick Sanchez');
    expect(result.characterId).toBe('char_rick_sanchez_v1');
    expect(result.anglesCount).toBe(8);
    expect(result.decomposedPartsCount).toBeGreaterThanOrEqual(50); // Parts across 8 angles

    // Check Rick-specific color palette detection
    expect(result.colorPalette.skin).toEqual([238, 218, 196, 255]);
    expect(result.colorPalette.hair).toEqual([176, 218, 237, 255]);
    expect(result.colorPalette.coat).toEqual([248, 248, 248, 255]);

    // Check rig specification
    expect(result.rigSpec.jointCorrections.length).toBeGreaterThanOrEqual(4);
    expect(result.rigSpec.squashStretch.length).toBe(2);
    expect(result.rigSpec.shadow.enabled).toBe(true);
    expect(result.rigSpec.animatorContract.hideHelperBonesShy).toBe(true);
  });

  it('generates decomposed anatomical parts with seamless joint inpainting caps', () => {
    const parts = MohoAutoCharacterSynthesizer.generateDecomposedParts('Rick Sanchez', {
      skin: [238, 218, 196, 255],
      hair: [176, 218, 237, 255],
      shirt: [153, 222, 222, 255],
      coat: [248, 248, 248, 255],
      pants: [142, 98, 56, 255],
      shoes: [45, 45, 45, 255]
    });

    expect(parts.length).toBeGreaterThanOrEqual(80); // 10+ parts per angle * 8 angles
    const inpaintedParts = parts.filter(p => p.jointInpainted);
    expect(inpaintedParts.length).toBeGreaterThanOrEqual(40);

    const forearmL = parts.find(p => p.partId === 'Forearm_L_Front');
    expect(forearmL).toBeDefined();
    expect(forearmL?.jointInpainted).toBe(true);
    expect(forearmL?.parentJoint).toBe('UpperArm_L');
  });
});
