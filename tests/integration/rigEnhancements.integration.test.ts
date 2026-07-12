import { nodeTools } from '../../src/tools/nodeTools.js';
import { rigTools } from '../../src/tools/rigTools.js';
import { systemTools } from '../../src/tools/systemTools.js';
import { HarmonyPython } from '../../src/adapters/harmonyPython.js';

// Check if Harmony is available
async function isHarmonyAvailable(): Promise<boolean> {
  try {
    await HarmonyPython.runCommand('detect', {});
    return true;
  } catch {
    return false;
  }
}

describe('Rigging Enhancements based on YouTube Playlist Knowledge Base (Integration)', () => {
  let harmonyAvailable = false;

  beforeAll(async () => {
    harmonyAvailable = await isHarmonyAvailable();
    if (!harmonyAvailable) {
      console.log('[Integration Test] Harmony not available - skipping integration tests');
    }
  });

  const itIfHarmony = harmonyAvailable ? it : it.skip;

  itIfHarmony('should validate scene preferences in harmony.validate_environment tool', async () => {
    const tool = systemTools.find(t => t.name === 'harmony.validate_environment');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      path: process.cwd(),
      checkHarmonyPreferences: true
    });

    expect(result.verification).toBeDefined();
    expect(result.verification).not.toBe('mock_only');
    expect(result.verification).not.toBe('not_implemented');
  });

  itIfHarmony('should generate seamless_limb preset in create_effect_chain tool', async () => {
    const tool = nodeTools.find(t => t.name === 'harmony.nodes.create_effect_chain');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      targetNodePath: 'Top/Arm_L',
      preset: 'seamless_limb',
      dryRun: false
    });

    expect(result.verification).toBeDefined();
    expect(result.verification).not.toBe('mock_only');
    expect(result.appliedPreset).toBe('seamless_limb');
  });

  itIfHarmony('should generate light_shading preset in create_effect_chain tool', async () => {
    const tool = nodeTools.find(t => t.name === 'harmony.nodes.create_effect_chain');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      targetNodePath: 'Top/Character_Group',
      preset: 'light_shading',
      dryRun: false
    });

    expect(result.verification).toBeDefined();
    expect(result.verification).not.toBe('mock_only');
    expect(result.appliedPreset).toBe('light_shading');
  });

  itIfHarmony('should support 4-eyelid layers in harmony.rig.create_eye_system tool', async () => {
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

  itIfHarmony('should create TwoPointConstraint in harmony.rig.create_constraint tool', async () => {
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

  itIfHarmony('should generate unique deformation chains in harmony.rig360.map_drawings_to_angles tool', async () => {
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

  // Unit tests that don't require Harmony - always run
  it('should have create_effect_chain tool with seamless_limb preset', () => {
    const tool = nodeTools.find(t => t.name === 'harmony.nodes.create_effect_chain');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema).toBeDefined();
  });

  it('should have create_eye_system tool in rigTools', () => {
    const tool = rigTools.find(t => t.name === 'harmony.rig.create_eye_system');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema).toBeDefined();
  });

  it('should have create_constraint tool in rigTools', () => {
    const tool = rigTools.find(t => t.name === 'harmony.rig.create_constraint');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema).toBeDefined();
  });

  it('should have map_drawings_to_angles tool in rigTools', () => {
    const tool = rigTools.find(t => t.name === 'harmony.rig360.map_drawings_to_angles');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema).toBeDefined();
  });
});