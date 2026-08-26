import { MohoAutoCharacterSynthesizer } from '../mohoAutoCharacterSynthesizer/index.js';
import { MohoQuadrupedRigEngine } from '../mohoQuadrupedRigEngine/index.js';
import { MohoMechanicalPistonBuilder } from '../mohoMechanicalPistonBuilder/index.js';
import { MohoSplineTentacleEngine } from '../mohoSplineTentacleEngine/index.js';
import { MohoPropAnchorSystem } from '../mohoPropAnchorSystem/index.js';
import { MohoAnimationLibrary } from '../mohoAnimationLibrary/index.js';
import { MohoProjectCompiler, type CompiledMohoProjectResult } from '../mohoProjectCompiler/index.js';

export type TemplateCategory = 'character' | 'quadruped' | 'robotics' | 'prop' | 'motion' | 'environment';

export interface ProductionAssetTemplate {
  templateId: string;
  name: string;
  category: TemplateCategory;
  description: string;
  tags: string[];
  features: string[];
}

export interface InstantiatedTemplateResult {
  templateId: string;
  name: string;
  category: TemplateCategory;
  compiledData: Record<string, unknown>;
  compiledMohoResult?: CompiledMohoProjectResult;
}

/**
 * MohoAssetRegistry — Production Asset Store and reusable template registry.
 * Provides pre-built rigs, props, environments, and motion presets.
 */
export class MohoAssetRegistry {
  private static readonly TEMPLATES: ProductionAssetTemplate[] = [
    {
      templateId: 'char_rick_sanchez',
      name: 'Rick Sanchez Production Rig',
      category: 'character',
      description: 'Full 360° turnaround rig with lab coat dynamics, 2D face joystick, and unibrow controls.',
      tags: ['cartoon', 'humanoid', 'sci-fi', '360'],
      features: ['8-Angle Turnaround', 'Lab Coat Bone Physics', '2D Face Joystick', 'Preston Blair Lipsync']
    },
    {
      templateId: 'char_cartoon_girl',
      name: 'Cartoon Girl (Borsch Standard)',
      category: 'character',
      description: 'Studio benchmark rig with pigtails secondary physics, soft waist bend, and squash & stretch.',
      tags: ['cartoon', 'girl', 'pigtails', 'soft-bend'],
      features: ['Waist Pin Helper', 'Bicep Bulge', 'Cuff Fan Deformers', 'Projected Floor Shadow']
    },
    {
      templateId: 'quad_pioneer_dog',
      name: 'Pioneer Quadruped Dog Rig',
      category: 'quadruped',
      description: '199-bone quadruped rig with scapula, hock joints, IK foot targets, and tail oscillation physics.',
      tags: ['animal', 'dog', 'quadruped', 'tail-wag'],
      features: ['Scapula/Hock Kinematics', 'Wave Tail Physics', 'Snout Dial', '4-Foot Ground Pins']
    },
    {
      templateId: 'mech_hydraulic_robot',
      name: 'Hydraulic Robotic Actuator Rig',
      category: 'robotics',
      description: 'Hard-surface mechanical piston rig with mutual Look-At targeting without stretching.',
      tags: ['robot', 'mechanical', 'piston', 'hard-surface'],
      features: ['Dual Look-At Targets', 'Linear Stroke Limits', 'Zero Scale Distortion']
    },
    {
      templateId: 'alien_tentacle_chain',
      name: 'Flexible Spline Tentacle Rig',
      category: 'character',
      description: '10-segment curvilinear spline chain with S-curve and C-curve smart action wave profiles.',
      tags: ['alien', 'tentacle', 'spline-ik', 'physics'],
      features: ['10 Micro-Bones', 'Curvature Propagation', 'Dynamic Inertia Damping']
    },
    {
      templateId: 'prop_portal_gun',
      name: 'Portal Gun Dynamic Prop',
      category: 'prop',
      description: 'Interactive weapon prop with dynamic parent switching between Hand_R, Hand_L, and World.',
      tags: ['weapon', 'prop', 'sci-fi', 'hand-swap'],
      features: ['Dual Hand Attachment', 'World Space Drop', 'Parent Switch Dial']
    }
  ];

  public static listTemplates(filterCategory?: TemplateCategory): ProductionAssetTemplate[] {
    if (filterCategory) {
      return this.TEMPLATES.filter(t => t.category === filterCategory);
    }
    return this.TEMPLATES;
  }

  public static instantiateTemplate(
    templateId: string,
    outputPath?: string
  ): InstantiatedTemplateResult {
    const tpl = this.TEMPLATES.find(t => t.templateId === templateId);
    if (!tpl) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let compiledData: Record<string, unknown> = {};
    let compiledMoho: CompiledMohoProjectResult | undefined;

    switch (templateId) {
      case 'char_rick_sanchez': {
        const res = MohoAutoCharacterSynthesizer.synthesizeFromPrompt({
          prompt: 'Rick Sanchez from Rick and Morty in lab coat',
          outputPath
        });
        compiledData = { rigSpec: res.rigSpec, colorPalette: res.colorPalette };
        compiledMoho = res.compiledMoho;
        break;
      }
      case 'char_cartoon_girl': {
        const res = MohoAutoCharacterSynthesizer.synthesizeFromPrompt({
          prompt: 'Cartoon Girl with pigtails and skirt',
          outputPath
        });
        compiledData = { rigSpec: res.rigSpec };
        compiledMoho = res.compiledMoho;
        break;
      }
      case 'quad_pioneer_dog': {
        const res = MohoQuadrupedRigEngine.buildQuadrupedRig({ animalName: 'PioneerDog' });
        compiledData = { quadruped: res };
        break;
      }
      case 'mech_hydraulic_robot': {
        const res = MohoMechanicalPistonBuilder.buildPistonPair({
          pistonName: 'Robo_Arm_Piston',
          baseJointPos: [0, 100],
          rodJointPos: [50, 40],
          cylinderLengthPx: 40,
          rodLengthPx: 40
        });
        compiledData = { piston: res };
        break;
      }
      case 'alien_tentacle_chain': {
        const res = MohoSplineTentacleEngine.buildTentacleChain({
          tentacleName: 'Alien_Tentacle',
          startPos: [0, 0],
          segmentCount: 10
        });
        compiledData = { tentacle: res };
        break;
      }
      case 'prop_portal_gun': {
        const res = MohoPropAnchorSystem.createPropAnchor({ propName: 'Portal_Gun' });
        compiledData = { propAnchor: res };
        break;
      }
      default:
        compiledData = { template: tpl };
    }

    return {
      templateId,
      name: tpl.name,
      category: tpl.category,
      compiledData,
      compiledMohoResult: compiledMoho
    };
  }
}
