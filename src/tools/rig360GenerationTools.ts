import { z } from 'zod';
import { Rig360Synthesizer } from '../adapters/rig360Synthesizer/index.js';
import { RigSynthesizer } from '../adapters/rigSynthesizer/index.js';
import { Rig360Assembler } from '../adapters/rig360Assembler.js';
import { rig360SpecSchema } from '../schemas/rig360PIR.js';
import { characterSpecSchema } from '../schemas/characterSpec.js';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import { executeWithDryRun, HarmonyError, verifyPathAccess } from '../security.js';
import { defineTool } from './defineTool.js';

async function runRigBridge(command: string, args: any): Promise<any> {
  try {
    return await HarmonyPython.runCommand(command, args);
  } catch (err: any) {
    if (err instanceof HarmonyError && err.code === 'PYTHON_API_UNAVAILABLE') {
      return { status: 'unsupported', reason: 'Python API is not available.' };
    }
    throw err;
  }
}

/**
 * rig360GenerationTools — 360 rig synthesizer tools.
 */
export const rig360GenerationTools = [
  defineTool({
    name: 'harmony.rig360.generate_spec',
    description: 'Создать полный rig360_spec.json для персонажа.',
    inputSchema: z.object({
      characterSpec: characterSpecSchema.describe('Спецификация персонажа (characterSpec.ts). Обязательные поля получают значения по умолчанию.')
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      const spec = synth.generateSpec(args.characterSpec);
      return { status: 'success', rig360Spec: spec };
    }
  }),
  defineTool({
    name: 'harmony.rig360.build_head_turn_from_pir',
    description: 'Интегрирует несколько ракурсов головы (PIR) в один узел с Drawing Substitutions и Master Controller Grid.',
    inputSchema: z.object({
      rig360Spec: z.record(z.unknown()),
      projectPath: z.string().optional(),
      dryRun: z.boolean().optional().default(true)
    }),
    handler: async (args) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const spec = rig360SpecSchema.parse(args.rig360Spec);
      
      const assemblyPlan = Rig360Assembler.assemblePlan(spec);
      
      return executeWithDryRun('build_head_turn_from_pir', args, args.dryRun, async () => {
        const res = await runRigBridge('execute_rig360_plan', {
          projectPath: checkedPath,
          plan: assemblyPlan
        });
        if (res.status === 'unsupported') return res;
        
        return {
          status: 'success',
          assemblyPlan,
          bridgeResponse: res
        };
      });
    }
  }),

  defineTool({
    name: 'harmony.rig360.generate_turnaround_plan',
    description: 'Создать turnaround план для rig360.',
    inputSchema: z.object({
      characterSpec: characterSpecSchema.describe('Спецификация персонажа (characterSpec.ts). Обязательные поля получают значения по умолчанию.')
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      return { status: 'success', turnaroundPlan: synth.generateTurnaroundPlan(args.characterSpec) };
    }
  }),

  defineTool({
    name: 'harmony.rig360.generate_layered_asset_plan',
    description: 'Создать layered asset plan для rig360.',
    inputSchema: z.object({
      characterSpec: characterSpecSchema.describe('Спецификация персонажа (characterSpec.ts). Обязательные поля получают значения по умолчанию.')
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      return { status: 'success', layeredAssetPlan: synth.generateLayeredAssetPlan(args.characterSpec) };
    }
  }),

  defineTool({
    name: 'harmony.rig360.generate_master_controller_plan',
    description: 'Создать master controller plan.',
    inputSchema: z.object({
      characterSpec: characterSpecSchema.describe('Спецификация персонажа (characterSpec.ts). Обязательные поля получают значения по умолчанию.')
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      return { status: 'success', masterControllers: synth.generateMasterControllerPlan(args.characterSpec) };
    }
  }),

  defineTool({
    name: 'harmony.rig360.generate_deformer_plan',
    description: 'Создать deformer plan.',
    inputSchema: z.object({
      characterSpec: characterSpecSchema.describe('Спецификация персонажа (characterSpec.ts). Обязательные поля получают значения по умолчанию.')
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      return { status: 'success', deformers: synth.generateDeformerPlan(args.characterSpec) };
    }
  }),

  defineTool({
    name: 'harmony.rig360.generate_face_control_plan',
    description: 'Создать face control plan.',
    inputSchema: z.object({
      characterSpec: characterSpecSchema.describe('Спецификация персонажа (characterSpec.ts). Обязательные поля получают значения по умолчанию.')
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      return { status: 'success', faceControls: synth.generateFaceControlPlan(args.characterSpec) };
    }
  }),

  defineTool({
    name: 'harmony.rig360.generate_body_turn_plan',
    description: 'Создать body turn plan.',
    inputSchema: z.object({
      characterSpec: characterSpecSchema.describe('Спецификация персонажа (characterSpec.ts). Обязательные поля получают значения по умолчанию.')
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      return { status: 'success', bodyTurn: synth.generateBodyTurnPlan(args.characterSpec) };
    }
  }),

  defineTool({
    name: 'harmony.rig360.build_placeholder_rig',
    description: 'Создать placeholder rig structure без реальных ассетов.',
    inputSchema: z.object({
      characterSpec: characterSpecSchema.describe('Спецификация персонажа (characterSpec.ts). Обязательные поля получают значения по умолчанию.')
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      const placeholder = synth.buildPlaceholderRig(args.characterSpec);
      return { status: 'success', placeholder };
    }
  }),

  defineTool({
    name: 'harmony.rig360.validate_full_rig',
    description: 'Провалидировать full rig.',
    inputSchema: z.object({
      rig360Spec: z.any()
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      const validation = synth.validateFullRig(args.rig360Spec);
      return { status: validation.valid ? 'success' : 'partial_success', ...validation };
    }
  }),

  defineTool({
    name: 'harmony.rig360.generate_test_turn_animation',
    description: 'Сгенерировать тестовый 360-turn animation description.',
    inputSchema: z.object({
      rig360Spec: z.any()
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      const anim = synth.generateTestTurnAnimation(args.rig360Spec);
      return { status: 'success', testTurnAnimation: anim };
    }
  }),

  defineTool({
    name: 'harmony.rig360.build_from_assets',
    description: 'Попытаться собрать real 360 rig из предоставленных ассетов. Если ассетов не хватает — вернёт placeholder с честным отчётом.',
    inputSchema: z.object({
      characterSpec: characterSpecSchema.describe('Character spec из character designer.'),
      assetPaths: z.record(z.string()).default({}).describe(
        'Карта asset key → путь к файлу. Ключ имеет вид "<ракурс>_<слой>", например {"front_skull": "/path/head_front.png"}. '
        + 'Точный список нужных ключей возвращается в missingAssetKeys.'
      )
    }),
    handler: async (args) => {
      const synth = new Rig360Synthesizer();
      const spec = synth.buildFromAssets(args.characterSpec, args.assetPaths ?? {});
      return {
        status: spec.realRigCreated ? 'success' : 'partial_success',
        rig360Spec: spec,
        realRigCreated: spec.realRigCreated,
        placeholderRigCreated: spec.placeholderRigCreated,
        // Human-readable groups for reports…
        missingAssets: spec.missingAssets,
        // …and the exact keys assetPaths is looked up by, so the caller can
        // actually satisfy the list. Returning only the prose form made the
        // requirement unsatisfiable and realRigCreated permanently false.
        missingAssetKeys: spec.missingAssetKeys,
        providedAssets: spec.providedAssets,
        nextBestAction: spec.nextBestAction
      };
    }
  }),

  defineTool({
    name: 'harmony.rig.generate_spec',
    description: 'Создать lightweight non-360 rig spec для персонажа (front-only / symmetrical fallback).',
    inputSchema: z.object({
      characterSpec: characterSpecSchema.describe('Спецификация персонажа (characterSpec.ts). Обязательные поля получают значения по умолчанию.')
    }),
    handler: async (args) => {
      const synth = new RigSynthesizer();
      return { status: 'success', rigSpec: synth.generateSpec(args.characterSpec) };
    }
  }),

  defineTool({
    name: 'harmony.rig.build_from_assets',
    description: 'Попытаться собрать lightweight non-360 rig из предоставленных ассетов.',
    inputSchema: z.object({
      characterSpec: characterSpecSchema,
      assetPaths: z.record(z.string()).default({})
    }),
    handler: async (args) => {
      const synth = new RigSynthesizer();
      const spec = synth.buildFromAssets(args.characterSpec, args.assetPaths);
      return {
        status: spec.realRigCreated ? 'success' : 'partial_success',
        rigSpec: spec,
        realRigCreated: spec.realRigCreated,
        placeholderRigCreated: spec.placeholderRigCreated,
        missingAssets: spec.missingAssets,
        providedAssets: spec.providedAssets,
        nextBestAction: spec.nextBestAction
      };
    }
  })
];