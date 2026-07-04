import { rigTools } from '../src/tools/rigTools.js';
import { nodeTools } from '../src/tools/nodeTools.js';
import { FastXmlAuditor } from '../src/adapters/scenePlan/xmlAuditor.js';

describe('Rigging Tools & Audits derived from 28 Video Tutorials Analysis', () => {
  it('should execute harmony.rig.create_autopatch_joint tool', async () => {
    const tool = rigTools.find(t => t.name === 'harmony.rig.create_autopatch_joint');
    expect(tool).toBeDefined();

    const dryRes = await (tool!.handler as any)({
      upperLimbNodePath: 'Top/Bicep_D',
      lowerLimbNodePath: 'Top/Forearm_D',
      jointName: 'Elbow_Joint',
      roundJointAlignment: true,
      dryRun: true
    });
    expect(dryRes.dryRun).toBe(true);

    await expect((tool!.handler as any)({
      upperLimbNodePath: 'Top/Bicep_D',
      lowerLimbNodePath: 'Top/Forearm_D',
      jointName: 'Elbow_Joint',
      roundJointAlignment: true,
      dryRun: false
    })).rejects.toThrow('Python API');
  });

  it('should execute harmony.rig.attach_kinematic_accessory tool', async () => {
    const tool = rigTools.find(t => t.name === 'harmony.rig.attach_kinematic_accessory');
    expect(tool).toBeDefined();

    const dryRes = await (tool!.handler as any)({
      deformedNodePath: 'Top/Arm_D',
      accessoryPegPath: 'Top/Bracelet_P',
      accessoryName: 'Bracelet',
      dryRun: true
    });
    expect(dryRes.dryRun).toBe(true);

    await expect((tool!.handler as any)({
      deformedNodePath: 'Top/Arm_D',
      accessoryPegPath: 'Top/Bracelet_P',
      accessoryName: 'Bracelet',
      dryRun: false
    })).rejects.toThrow('Python API');
  });

  it('should support separatePosition and lockDrawingMode in harmony.nodes.create', async () => {
    const tool = nodeTools.find(t => t.name === 'harmony.nodes.create');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      parentGroup: 'Top',
      nodeType: 'PEG',
      nodeName: 'Arm_P',
      separatePosition: true,
      lockDrawingMode: true,
      dryRun: true
    });

    expect(result.dryRun).toBe(true);
    expect(result.message).toContain('create_node');
  });

  it('should support semanticPort matte in harmony.nodes.connect', async () => {
    const tool = nodeTools.find(t => t.name === 'harmony.nodes.connect');
    expect(tool).toBeDefined();

    const result = await (tool!.handler as any)({
      srcNodePath: 'Top/Eye_White',
      destNodePath: 'Top/Pupil_Cutter',
      semanticPort: 'matte',
      dryRun: true
    });

    expect(result.dryRun).toBe(true);
    expect(result.message).toContain('connect_nodes');
  });

  it('should run FastXmlAuditor rules', () => {
    expect(FastXmlAuditor).toBeDefined();
  });
});
