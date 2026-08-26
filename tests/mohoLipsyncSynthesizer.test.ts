import { describe, it, expect } from '@jest/globals';
import { MohoLipsyncSynthesizer, PRESTON_BLAIR_MOUTH_SHAPES } from '../src/services/mohoLipsyncSynthesizer/index.js';

describe('MohoLipsyncSynthesizer', () => {
  it('normalizes arbitrary phonemes to Preston Blair standards', () => {
    expect(MohoLipsyncSynthesizer.normalizeShape('AI')).toBe('A');
    expect(MohoLipsyncSynthesizer.normalizeShape('MBP')).toBe('B');
    expect(MohoLipsyncSynthesizer.normalizeShape('EE')).toBe('E');
    expect(MohoLipsyncSynthesizer.normalizeShape('FV')).toBe('F');
    expect(MohoLipsyncSynthesizer.normalizeShape('WQ')).toBe('G');
    expect(MohoLipsyncSynthesizer.normalizeShape('OH')).toBe('O');
    expect(MohoLipsyncSynthesizer.normalizeShape('X')).toBe('Rest');
  });

  it('generates chronological switch keys with step interpolation', () => {
    const result = MohoLipsyncSynthesizer.synthesizeLipsync({
      cues: [
        { frame: 12, phoneme: 'O' },
        { frame: 1, phoneme: 'Rest' },
        { frame: 6, phoneme: 'A' },
        { frame: 20, phoneme: 'Smile' }
      ]
    });

    expect(result.switchKeys).toHaveLength(4);
    expect(result.switchKeys[0]).toEqual({ frame: 1, shape: 'Rest', interpolation: 'step' });
    expect(result.switchKeys[1]).toEqual({ frame: 6, shape: 'A', interpolation: 'step' });
    expect(result.switchKeys[2]).toEqual({ frame: 12, shape: 'O', interpolation: 'step' });
    expect(result.switchKeys[3]).toEqual({ frame: 20, shape: 'Smile', interpolation: 'step' });
  });

  it('builds Smart Bone Mouth Dial covering Preston Blair shapes', () => {
    const result = MohoLipsyncSynthesizer.synthesizeLipsync({
      cues: [{ frame: 1, phoneme: 'A' }]
    });

    expect(result.mouthDial.minAngleDeg).toBe(-90);
    expect(result.mouthDial.maxAngleDeg).toBe(90);
    expect(result.mouthDial.poses).toHaveLength(PRESTON_BLAIR_MOUTH_SHAPES.length);
    expect(result.mouthAction.keyframes).toHaveLength(PRESTON_BLAIR_MOUTH_SHAPES.length);
  });
});
