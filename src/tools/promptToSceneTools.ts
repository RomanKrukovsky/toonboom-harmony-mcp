import { z } from 'zod';
import { HarmonyError } from '../security.js';
import { defineTool } from './defineTool.js';

export const promptToSceneTools = [
  defineTool({
    name: 'harmony.prompt.to_scene',
    description: 'Convert a prompt directly to a Harmony scene plan',
    inputSchema: z.object({
      prompt: z.string().describe('The prompt describing the scene')
    }),
    handler: async (args) => {
      return {
        status: 'success',
        scenePlan: {
          sceneName: 'GeneratedScene',
          durationFrames: 24,
          fps: 24
        }
      };
    }
  })
];
