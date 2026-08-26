import { describe, it, expect } from '@jest/globals';
import { MohoProductionQualityAuditor } from '../src/services/mohoProductionQualityAuditor/index.js';
import { MohoRenderManager } from '../src/services/mohoRenderManager/index.js';
import { MohoAssetRegistry } from '../src/services/mohoAssetRegistry/index.js';

describe('MohoProductionQualityAuditor & Production Systems', () => {
  it('detects strength pollution and shy bone hygiene violations in Moho documents', () => {
    const dirtyDoc = {
      layers: [
        {
          name: 'Skeleton',
          type: 'GroupLayer',
          skeleton: {
            bones: [
              { name: 'Head_Turn_Dial', strength: 0.25, is_pin_bone: false, shy: false, tag_color: 0 },
              { name: 'Elbow_Helper_UP', strength: 0, is_pin_bone: false, shy: false, tag_color: 0 },
              { name: 'Arm_L', strength: 0.15, is_pin_bone: false, shy: false, tag_color: 0 }
            ]
          }
        },
        {
          name: 'Mouth_Switch',
          type: 'SwitchLayer',
          layer_list: []
        }
      ]
    };

    const report = MohoProductionQualityAuditor.auditDocumentJson(dirtyDoc);
    expect(report.isProductionReady).toBe(false);
    expect(report.issuesCount).toBeGreaterThanOrEqual(3);
    expect(report.issues.some(i => i.ruleId === 'STRENGTH_POLLUTION')).toBe(true);
    expect(report.issues.some(i => i.ruleId === 'SHY_BONE_HYGIENE')).toBe(true);
    expect(report.issues.some(i => i.ruleId === 'SWITCH_INCONSISTENCY')).toBe(true);
  });

  it('automatically repairs strength pollution, shy bones, and color tagging', () => {
    const dirtyDoc = {
      layers: [
        {
          name: 'Skeleton',
          type: 'GroupLayer',
          skeleton: {
            bones: [
              { name: 'Head_Turn_Dial', strength: 0.25, is_pin_bone: false, shy: false, tag_color: 0 },
              { name: 'Elbow_Helper_UP', strength: 0, is_pin_bone: false, shy: false, tag_color: 0 },
              { name: 'Arm_L', strength: 0.15, is_pin_bone: false, shy: false, tag_color: 0 },
              { name: 'Arm_R', strength: 0.15, is_pin_bone: false, shy: false, tag_color: 0 }
            ]
          }
        }
      ]
    };

    const { fixedDocJson, fixesAppliedCount } = MohoProductionQualityAuditor.autoFixDocumentJson(dirtyDoc);
    expect(fixesAppliedCount).toBeGreaterThanOrEqual(4);

    const bones = ((fixedDocJson.layers as any)[0].skeleton.bones) as any[];
    const dial = bones.find(b => b.name === 'Head_Turn_Dial');
    const helper = bones.find(b => b.name === 'Elbow_Helper_UP');
    const armL = bones.find(b => b.name === 'Arm_L');
    const armR = bones.find(b => b.name === 'Arm_R');

    expect(dial.strength).toBe(0);
    expect(helper.shy).toBe(true);
    expect(armL.tag_color).toBe(3); // Blue
    expect(armR.tag_color).toBe(5); // Orange
  });

  it('synthesizes headless CLI render commands via MohoRenderManager', () => {
    const cmd = MohoRenderManager.buildRenderCommandLine({
      mohoProjectPath: '/path/to/scene.moho',
      outputDirectory: '/path/to/renders',
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 48
    });

    expect(cmd.commandLine).toContain('-r "/path/to/scene.moho"');
    expect(cmd.commandLine).toContain('-start 1 -end 48');
    expect(cmd.commandLine).toContain('-f PNG');
  });

  it('lists and instantiates production templates via MohoAssetRegistry', () => {
    const templates = MohoAssetRegistry.listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(5);

    const rick = MohoAssetRegistry.instantiateTemplate('char_rick_sanchez');
    expect(rick.templateId).toBe('char_rick_sanchez');
    expect(rick.compiledData.rigSpec).toBeDefined();

    const dog = MohoAssetRegistry.instantiateTemplate('quad_pioneer_dog');
    expect(dog.templateId).toBe('quad_pioneer_dog');
    expect(dog.compiledData.quadruped).toBeDefined();
  });
});
