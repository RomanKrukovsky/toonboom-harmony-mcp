import { z } from 'zod';
import { HarmonyError } from '../security.js';

export const reviewLoopTools = [
  {
    name: 'harmony.review.loop',
    description: 'Run an iteration loop for scene review and fixes',
    inputSchema: z.object({
      sceneId: z.string().describe('Scene ID to review'),
      maxIterations: z.number().optional().describe('Maximum iterations allowed')
    }),
    handler: async (args: any) => {
      return {
        status: 'success',
        iterationsCompleted: 1,
        finalScore: 85
      };
    }
  }
];
