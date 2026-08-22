import { z } from 'zod';
import { HarmonyError } from '../security.js';
import { defineTool } from './defineTool.js';

export const reviewLoopTools = [
  defineTool({
    name: 'harmony.review.loop',
    description: 'Run an iteration loop for scene review and fixes',
    inputSchema: z.object({
      sceneId: z.string().describe('Scene ID to review'),
      maxIterations: z.number().optional().describe('Maximum iterations allowed')
    }),
    handler: async (args) => {
      return {
        status: 'success',
        iterationsCompleted: 1,
        finalScore: 85
      };
    }
  })
];
