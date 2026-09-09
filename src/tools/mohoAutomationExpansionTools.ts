import { z } from 'zod';
import { weightIsolationInputSchema } from '../schemas/mohoWeightIsolationSpec.js';
import { clothPhysicsInputSchema } from '../schemas/mohoClothPhysicsSpec.js';
import { comedicTimingInputSchema } from '../schemas/mohoComedicTimingSpec.js';
import { inpaintLimbRequestSchema } from '../schemas/mohoJointInpainterSpec.js';
import { MohoWeightIsolationEngine } from '../services/mohoWeightIsolationEngine/index.js';
import { MohoClothPhysicsEngine } from '../services/mohoClothPhysicsEngine/index.js';
import { MohoComedicTimingEngine } from '../services/mohoComedicTimingEngine/index.js';
import { MohoJointInpainter } from '../services/mohoJointInpainter/index.js';

export const mohoRigIsolatePointWeightsTool = {
  name: 'moho.rig.isolate_point_weights',
  description: 'Calculates normalized bone weights with strict isolation masks to completely eliminate bone bleed (e.g. arm bones pulling torso collar).',
  inputSchema: weightIsolationInputSchema,
  handler: async (args: any) => {
    const parsed = weightIsolationInputSchema.parse(args);
    const result = MohoWeightIsolationEngine.computeIsolatedWeights(parsed);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
};

export const mohoAnimationSimulateClothWaveTool = {
  name: 'moho.animation.simulate_cloth_wave',
  description: 'Simulates non-collapsing, damped harmonic wave dynamics for cloth bone chains (capes, skirts, long hair) with wind and collision barrier constraints.',
  inputSchema: clothPhysicsInputSchema,
  handler: async (args: any) => {
    const parsed = clothPhysicsInputSchema.parse(args);
    const result = MohoClothPhysicsEngine.simulateClothWaves(parsed);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
};

export const mohoActingApplyComedicTimingTool = {
  name: 'moho.acting.apply_comedic_timing',
  description: 'Modifies animation tracks with comedic and dramatic acting modifiers (deadpan holds, eye-dart anticipation, delayed blinks, anticipation squash).',
  inputSchema: comedicTimingInputSchema,
  handler: async (args: any) => {
    const parsed = comedicTimingInputSchema.parse(args);
    const result = MohoComedicTimingEngine.applyComedicTiming(parsed);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
};

export const mohoArtworkInpaintJointCapsTool = {
  name: 'moho.artwork.inpaint_joint_caps',
  description: 'Generates rounded joint caps with >= 16px padding on raw limb layers to eliminate joint cracks during rotation.',
  inputSchema: inpaintLimbRequestSchema,
  handler: async (args: any) => {
    const parsed = inpaintLimbRequestSchema.parse(args);
    const result = MohoJointInpainter.inpaintJointCaps(parsed);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
};

export const mohoAutomationExpansionTools = [
  mohoRigIsolatePointWeightsTool,
  mohoAnimationSimulateClothWaveTool,
  mohoActingApplyComedicTimingTool,
  mohoArtworkInpaintJointCapsTool
];
