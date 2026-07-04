import { z } from 'zod';
import { HarmonyError } from '../security.js';

export const promptToSceneTools = [
  {
    name: 'harmony.prompt.to_scene',
    description: 'Convert a prompt directly to a Harmony scene plan',
    inputSchema: z.object({
      prompt: z.string().describe('The prompt describing the scene')
    }),
    handler: async (args: any) => {
      return {
        status: 'success',
        scenePlan: {
          sceneName: 'GeneratedScene',
          durationFrames: 24,
          fps: 24
        }
      };
    }
  }
];
