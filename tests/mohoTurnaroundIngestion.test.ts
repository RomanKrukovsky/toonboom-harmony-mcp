import { describe, it, expect } from '@jest/globals';
import { MohoTurnaroundIngestion } from '../src/services/mohoTurnaroundIngestion/index.js';

describe('MohoTurnaroundIngestion', () => {
  it('builds complete turnaround layer hierarchy with all 8 camera angles', () => {
    const result = MohoTurnaroundIngestion.buildHierarchy({
      characterName: 'HeroTurnaround',
      includeEyelids: true
    });

    expect(result.characterName).toBe('HeroTurnaround');
    expect(result.switchLayers.length).toBeGreaterThanOrEqual(7);

    const headSwitch = result.switchLayers.find(s => s.name === 'Head switch');
    const bodySwitch = result.switchLayers.find(s => s.name === 'Body switch');
    const mouthSwitch = result.switchLayers.find(s => s.name === 'Mouth switch');
    const eyesLSwitch = result.switchLayers.find(s => s.name === 'Eyes_L switch');

    expect(headSwitch?.sublayers).toHaveLength(8);
    expect(bodySwitch?.sublayers).toHaveLength(8);
    expect(mouthSwitch?.sublayers).toHaveLength(12);
    expect(eyesLSwitch?.sublayers).toHaveLength(6); // 4 base + 2 lids
  });
});
