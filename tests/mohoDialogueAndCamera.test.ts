import { describe, it, expect } from '@jest/globals';
import { MohoDialogueActingSynthesizer } from '../src/services/mohoDialogueActingSynthesizer/index.js';
import { MohoCameraChoreographer } from '../src/services/mohoCameraChoreographer/index.js';

describe('MohoDialogueActingSynthesizer & MohoCameraChoreographer', () => {
  it('synthesizes multi-track dialogue acting performance from speech text', () => {
    const performance = MohoDialogueActingSynthesizer.synthesizeActing({
      speaker: 'Rick Sanchez',
      text: 'Listen to me Morty, we need to jump into the portal right now!',
      startFrame: 1,
      endFrame: 96,
      emotion: 'angry'
    });

    expect(performance.characterName).toBe('Rick Sanchez');
    expect(performance.totalDurationFrames).toBe(96);
    expect(performance.phonemeKeyframes.length).toBeGreaterThanOrEqual(10);
    expect(performance.actingTracks.length).toBeGreaterThanOrEqual(4);

    // Verify phonemes
    const phonemes = performance.phonemeKeyframes.map(p => p.phoneme);
    expect(phonemes).toContain('Rest');
    expect(phonemes).toContain('A_I');
    expect(phonemes).toContain('O');

    // Verify eye emotion tracks
    const eyesTrack = performance.actingTracks.find(t => t.boneOrLayerName === 'Eyes Switch');
    expect(eyesTrack).toBeDefined();
    expect(eyesTrack?.keyframes.some(k => k.value === 'Angry')).toBe(true);

    // Verify rhythmic head nods
    const headTrack = performance.actingTracks.find(t => t.boneOrLayerName === 'Head');
    expect(headTrack).toBeDefined();
    expect(headTrack?.keyframes.length).toBeGreaterThan(0);

    // Verify gestural emphasis
    const handTrack = performance.actingTracks.find(t => t.boneOrLayerName === 'Hand_L Switch');
    expect(handTrack).toBeDefined();
    expect(handTrack?.keyframes.some(k => k.value === 'Fist')).toBe(true);
  });

  it('choreographs dramatic push-in and multiplane parallax camera motions', () => {
    const camResult = MohoCameraChoreographer.choreographCamera({
      shotType: 'medium_shot',
      moveStyle: 'dramatic_push_in',
      startFrame: 1,
      endFrame: 72,
      targetCharacterPos: [0, 100],
      zoomFactor: 1.6
    });

    expect(camResult.moveStyle).toBe('dramatic_push_in');
    expect(camResult.cameraTrack.length).toBeGreaterThanOrEqual(10);
    expect(camResult.parallaxLayers.length).toBe(5);

    // Verify zoom increases smoothly
    const startZoom = camResult.cameraTrack[0].zoom;
    const endZoom = camResult.cameraTrack[camResult.cameraTrack.length - 1].zoom;
    expect(endZoom).toBeGreaterThan(startZoom);

    // Verify parallax multipliers
    const fg = camResult.parallaxLayers.find(p => p.layerName.startsWith('FG_'));
    const bg = camResult.parallaxLayers.find(p => p.layerName === 'BG_Sky');
    expect(fg?.parallaxMultiplier).toBeGreaterThan(1.0);
    expect(bg?.parallaxMultiplier).toBeLessThan(0.1);
  });
});
