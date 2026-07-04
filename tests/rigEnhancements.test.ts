import { nodeTools } from '../src/tools/nodeTools.js';
import { rigTools } from '../src/tools/rigTools.js';
import { systemTools } from '../src/tools/systemTools.js';

describe('Rigging Enhancements based on YouTube Playlist Knowledge Base', () => {
  it('should validate scene preferences in harmony.validate_environment tool', async () => {
    const tool = systemTools.find(t => t.name === 'harmony.validate_environment');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      path: '/Users/romanmolodyko/Documents/toon-boom-harmony-mcp',
      checkHarmonyPreferences: true
    });

    expect(result.valid).toBe(true);
    expect(result.harmonyPreferencesCheck).toHaveLength(3);
    expect(result.harmonyPreferencesCheck[0].rule).toBe('separate_position_axes');
    expect(result.harmonyPreferencesCheck[1].rule).toBe('element_node_creation');
    expect(result.harmonyPreferencesCheck[2].rule).toBe('sublayer_support');
  });

  it('should generate seamless_limb preset in create_effect_chain tool', async () => {
    const tool = nodeTools.find(t => t.name === 'harmony.nodes.create_effect_chain');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      targetNodePath: 'Top/Arm_L',
      preset: 'seamless_limb',
      dryRun: false
    });

    expect(result.status).toBe('success');
    expect(result.appliedPreset).toBe('seamless_limb');
    expect(result.presetDetails.pattern).toContain('Seamless Joint / AutoPatch');
  });

  it('should generate light_shading preset in create_effect_chain tool', async () => {
    const tool = nodeTools.find(t => t.name === 'harmony.nodes.create_effect_chain');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      targetNodePath: 'Top/Character_Group',
      preset: 'light_shading',
      dryRun: false
    });

    expect(result.status).toBe('success');
    expect(result.appliedPreset).toBe('light_shading');
    expect(result.presetDetails.nodesCreated).toContain('LightShading_Node');
  });

  it('should support 4-eyelid layers in harmony.rig.create_eye_system tool', async () => {
    const tool = rigTools.find(t => t.name === 'harmony.rig.create_eye_system');
    expect(tool).toBeDefined();

    const dryRes = await (tool!.handler as any)({
      characterName: 'Sonnie',
      eyelidCount: 4,
      dryRun: true
    });
    expect(dryRes.dryRun).toBe(true);

    await expect((tool!.handler as any)({
      characterName: 'Sonnie',
      eyelidCount: 4,
      dryRun: false
    })).rejects.toThrow('Python API');
  });

  it('should create TwoPointConstraint in harmony.rig.create_constraint tool', async () => {
    const tool = rigTools.find(t => t.name === 'harmony.rig.create_constraint');
    expect(tool).toBeDefined();

    const dryRes = await (tool!.handler as any)({
      targetNodePath: 'Top/Arm_L_Peg',
      constraintType: 'TwoPointConstraint',
      dryRun: true
    });
    expect(dryRes.dryRun).toBe(true);

    await expect((tool!.handler as any)({
      targetNodePath: 'Top/Arm_L_Peg',
      constraintType: 'TwoPointConstraint',
      dryRun: false
    })).rejects.toThrow('Python API');
  });

  it('should generate unique deformation chains in harmony.rig360.map_drawings_to_angles tool', async () => {
    const tool = rigTools.find(t => t.name === 'harmony.rig360.map_drawings_to_angles');
    expect(tool).toBeDefined();

    const dryRes = await (tool!.handler as any)({
      nodePath: 'Top/Head',
      angleMappings: [
        { angle: 'front', drawingName: 'Head_Front' },
        { angle: 'front_3q_left', drawingName: 'Head_34' }
      ],
      createNewDeformationChains: true,
      dryRun: true
    });
    expect(dryRes.dryRun).toBe(true);

    await expect((tool!.handler as any)({
      nodePath: 'Top/Head',
      angleMappings: [
        { angle: 'front', drawingName: 'Head_Front' },
        { angle: 'front_3q_left', drawingName: 'Head_34' }
      ],
      createNewDeformationChains: true,
      dryRun: false
    })).rejects.toThrow('Python API');
  });
});
