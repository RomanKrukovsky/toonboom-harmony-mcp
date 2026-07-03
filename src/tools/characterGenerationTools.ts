import { z } from 'zod';
import { CharacterDesigner } from '../adapters/characterDesigner/index.js';

/**
 * characterGenerationTools — character design layer tools.
 */
export const characterGenerationTools = [
  {
    name: 'harmony.character.generate_spec',
    description: 'Сгенерировать character_spec.json из описания персонажа.',
    inputSchema: z.object({
      name: z.string(),
      role: z.string(),
      personality: z.string(),
      visualStyle: z.string().optional(),
      bodyType: z.string().optional(),
      includeDesignPrompts: z.boolean().optional().default(true)
    }),
    handler: async (args: any) => {
      const designer = new CharacterDesigner();
      const spec = designer.buildSpecFromArgs(args);
      return {
        status: 'success',
        characterSpec: spec,
        assetBackendStatus: 'CHARACTER_ASSET_GENERATION_BACKEND_MISSING',
        note: 'Character spec is a production-ready asset brief. Real drawings require an image generation backend or human artist.'
      };
    }
  },

  {
    name: 'harmony.character.generate_turnaround_requirements',
    description: 'Сгенерировать требования к turnaround для персонажа.',
    inputSchema: z.object({
      characterSpec: z.any()
    }),
    handler: async (args: any) => {
      const designer = new CharacterDesigner();
      const plan = designer.generateTurnaroundPlan(args.characterSpec);
      return { status: 'success', turnaroundPlan: plan };
    }
  },

  {
    name: 'harmony.character.generate_expression_sheet_requirements',
    description: 'Сгенерировать требования к expression sheet.',
    inputSchema: z.object({
      characterSpec: z.any()
    }),
    handler: async (args: any) => {
      const spec = args.characterSpec;
      return {
        status: 'success',
        expressionSheetPlan: {
          character: spec.name,
          expressions: spec.requiredExpressions,
          notes: 'Each expression must keep same head proportions and landmarks.',
          assetBackendStatus: 'CHARACTER_ASSET_GENERATION_BACKEND_MISSING'
        }
      };
    }
  },

  {
    name: 'harmony.character.generate_mouth_chart_requirements',
    description: 'Сгенерировать требования к mouth chart для lipsync.',
    inputSchema: z.object({
      characterSpec: z.any()
    }),
    handler: async (args: any) => {
      const spec = args.characterSpec;
      return {
        status: 'success',
        mouthChartPlan: {
          character: spec.name,
          mouthShapes: spec.requiredMouthShapes,
          mapping: 'standard Preston Blair / A-E-I-O-U-M-F-L-S-rest',
          assetBackendStatus: 'CHARACTER_ASSET_GENERATION_BACKEND_MISSING'
        }
      };
    }
  },

  {
    name: 'harmony.character.generate_hand_pose_requirements',
    description: 'Сгенерировать требования к hand poses.',
    inputSchema: z.object({
      characterSpec: z.any()
    }),
    handler: async (args: any) => {
      const spec = args.characterSpec;
      return {
        status: 'success',
        handPosePlan: {
          character: spec.name,
          handPoses: spec.requiredHandPoses,
          notes: 'Layered hands, separated from arms, pivot at wrist.',
          assetBackendStatus: 'CHARACTER_ASSET_GENERATION_BACKEND_MISSING'
        }
      };
    }
  },

  {
    name: 'harmony.character.generate_layered_asset_plan',
    description: 'Сгенерировать полный layered asset plan.',
    inputSchema: z.object({
      characterSpec: z.any()
    }),
    handler: async (args: any) => {
      const designer = new CharacterDesigner();
      const layered = designer.generateLayeredAssetPlan(args.characterSpec);
      return { status: 'success', layeredAssetPlan: layered };
    }
  }
];