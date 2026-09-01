import { z } from 'zod';
import {
  getReferenceRigTemplate,
  buildRigFromTemplate,
  REFERENCE_RIG_TEMPLATES,
  type RigTemplate
} from '../services/mohoReferenceRigTemplates/index.js';
import { type MohoCharacterBible } from '../schemas/mohoCharacterBible.js';

const RIG_TYPES = ['humanoid_2leg', 'quadruped', 'creature', 'mechanical'] as const;

const RIG_TYPE_VALUES = RIG_TYPES as unknown as [string, ...string[]];

export const mohoReferenceRigTemplateTools = [
  {
    name: 'moho.reference_rig.get',
    description:
      'Получить полный эталонный rig-template по типу рига. Возвращает шаблон с костями (bones), switch-слоями, ' +
      'smart bones, mouth-shapes, mesh-слоями, vitruvian-группами, projected-shadow и SHA-256 fingerprint. ' +
      'Поддерживаемые типы: humanoid_2leg, quadruped, creature, mechanical.',
    inputSchema: z.object({
      rigType: z.enum(RIG_TYPE_VALUES).describe('Тип эталонного рига: humanoid_2leg | quadruped | creature | mechanical.')
    }),
    handler: async (args: { rigType: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical' }): Promise<
      { status: 'success'; template: RigTemplate } | { status: 'error'; code: string; message: string }
    > => {
        try {
          const template = getReferenceRigTemplate(args.rigType);
          return { status: 'success', template };
        } catch (err: any) {
          return {
            status: 'error',
            code: err?.code ?? 'MOHO_REFERENCE_RIG_GET_FAILED',
            message: err?.message ?? String(err)
          };
        }
      }
  },
  {
    name: 'moho.reference_rig.list',
    description:
      'Вернуть метаданные всех 4 эталонных rig-шаблонов (humanoid_2leg, quadruped, creature, mechanical): ' +
      'rigType, templateId, число костей, switch-слоёв, smart bones и SHA-256 fingerprint каждого шаблона. ' +
      'Удобно для быстрого аудита реестра без подгрузки полных деревьев костей.',
    inputSchema: z.object({}),
    handler: async (_args: {}): Promise<
      | {
          status: 'success';
          templates: Array<{
            rigType: string;
            templateId: string;
            boneCount: number;
            switchLayerCount: number;
            smartBoneCount: number;
            fingerprint: string;
          }>;
        }
      | { status: 'error'; code: string; message: string }
    > => {
        try {
          const templates = Object.values(REFERENCE_RIG_TEMPLATES).map(t => ({
            rigType: t.rigType,
            templateId: t.templateId,
            boneCount: t.bones.length,
            switchLayerCount: t.switchLayers.length,
            smartBoneCount: t.smartBones.length,
            fingerprint: t.fingerprint
          }));
          return { status: 'success', templates };
        } catch (err: any) {
          return {
            status: 'error',
            code: err?.code ?? 'MOHO_REFERENCE_RIG_LIST_FAILED',
            message: err?.message ?? String(err)
          };
        }
      }
  },
  {
    name: 'moho.reference_rig.build_plan',
    description:
      'Скомпилировать MohoCommandPlan из эталонного rig-шаблона и character bible. Возвращает полный план ' +
      'операций (add_bone, set_bone_parent, set_bone_constraints, create_switch_layer, add_switch_choice, ' +
      'create_smart_bone, wire_smart_bone_channel, create_mesh_layer, bind_smart_warp_mesh, ' +
      'create_vitruvian_group, add_vitruvian_bone, create_projected_shadow, verify_rig, save_document) и ' +
      'SHA-256 fingerprint для детерминированного сравнения. rigType шаблона должен совпадать с rigType character bible.',
    inputSchema: z.object({
      rigType: z.enum(RIG_TYPE_VALUES).describe('Тип эталонного рига: humanoid_2leg | quadruped | creature | mechanical.'),
      characterBible: z
        .any()
        .describe('Character bible (MohoCharacterBible): содержит rigType, rigPath, characterId и другие обязательные поля.'),
      documentPath: z.string().optional().describe('Необязательный путь к .moho-документу, перекрывает characterBible.rigPath.')
    }),
    handler: async (args: {
      rigType: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';
      characterBible: MohoCharacterBible;
      documentPath?: string;
    }): Promise<
      | { status: 'success'; plan: ReturnType<typeof buildRigFromTemplate>; fingerprint: string }
      | { status: 'error'; code: string; message: string }
    > => {
        try {
          const template = getReferenceRigTemplate(args.rigType);
          const bible: MohoCharacterBible = args.documentPath
            ? ({ ...args.characterBible, rigPath: args.documentPath } as MohoCharacterBible)
            : args.characterBible;
          const plan = buildRigFromTemplate(template, bible);
          return { status: 'success', plan, fingerprint: template.fingerprint };
        } catch (err: any) {
          return {
            status: 'error',
            code: err?.code ?? 'MOHO_REFERENCE_RIG_BUILD_PLAN_FAILED',
            message: err?.message ?? String(err)
          };
        }
      }
  }
];