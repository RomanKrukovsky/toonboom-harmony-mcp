import { describe, it, expect } from '@jest/globals';
import { MohoVitruvianEngine } from '../src/services/mohoVitruvianEngine/index.js';

describe('MohoVitruvianEngine', () => {
  it('creates standard Vitruvian limb groups for feet and hands', () => {
    const groups = MohoVitruvianEngine.createStandardVitruvianGroups();
    expect(groups).toHaveLength(4);

    const footL = groups.find(g => g.groupName === 'Foot_L_Vitruvian');
    expect(footL).toBeDefined();
    expect(footL?.branches).toHaveLength(3);
    expect(footL?.branches.map(b => b.branchName)).toEqual(['Front', 'ThreeQuarter', 'Side']);
  });

  it('compiles bone configurations with isVitruvian flag and parent mappings', () => {
    const groups = MohoVitruvianEngine.createStandardVitruvianGroups();
    const configs = MohoVitruvianEngine.compileBoneConfigs(groups, {
      Foot_L_Vitruvian: 'Shin_L',
      Foot_R_Vitruvian: 'Shin_R'
    });

    expect(configs.length).toBeGreaterThanOrEqual(10);
    const frontFoot = configs.find(c => c.boneName === 'Foot_L_Front');
    expect(frontFoot).toBeDefined();
    expect(frontFoot?.isVitruvian).toBe(true);
    expect(frontFoot?.vitruvianGroup).toBe('Foot_L_Vitruvian');
    expect(frontFoot?.parentBone).toBe('Shin_L');
  });
});
