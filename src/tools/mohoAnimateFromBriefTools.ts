import { z } from 'zod';
import path from 'path';
import { verifyPathAccess } from '../security.js';
import { MohoAnimatorService } from '../services/mohoAnimatorEngine/index.js';

export const mohoAnimateFromBriefTools = [
  {
    name: 'moho.animate.from_brief',
    description:
      'Autonomous 2D Moho Animator (Stage 2): Converts a text brief/script into a production-ready animated .moho scene ' +
      'with lip-sync, walk cycles, eye blinks, gestures, and camera moves. Also tests certification/render check.',
    inputSchema: z.object({
      rigPath: z.string().describe('Path to the base .moho rig file.'),
      briefText: z.string().describe('The text brief or script (e.g. "Character walks in, stops, blinks, says Hello, and camera pushes in").'),
      durationFrames: z.number().default(120).describe('Total duration of the scene in frames.'),
      fps: z.number().default(24),
      resolution: z.object({
        width: z.number().default(1920),
        height: z.number().default(1080)
      }).optional(),
      emotion: z.enum(['neutral', 'happy', 'sad', 'angry', 'surprised']).default('neutral'),
      dialogueLines: z.array(z.object({
        text: z.string(),
        startFrame: z.number(),
        endFrame: z.number()
      })).optional(),
      outputPath: z.string().describe('Path to save the output .moho file.'),
      cameraConstraints: z.enum(['static', 'push-in', 'whip-pan', 'tracking']).default('static')
    }),
    handler: async (args: {
      rigPath: string;
      briefText: string;
      durationFrames?: number;
      fps?: number;
      resolution?: { width: number; height: number };
      emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';
      dialogueLines?: Array<{ text: string; startFrame: number; endFrame: number }>;
      outputPath: string;
      cameraConstraints?: 'static' | 'push-in' | 'whip-pan' | 'tracking';
    }) => {
      const rigAbs = verifyPathAccess(path.resolve(args.rigPath));
      const outAbs = verifyPathAccess(path.resolve(args.outputPath));

      const result = await MohoAnimatorService.animateFromBrief({
        rigPath: rigAbs,
        briefText: args.briefText,
        durationFrames: args.durationFrames ?? 120,
        fps: args.fps ?? 24,
        resolution: args.resolution ?? { width: 1920, height: 1080 },
        emotion: args.emotion ?? 'neutral',
        dialogueLines: args.dialogueLines ?? [],
        outputPath: outAbs,
        cameraConstraints: args.cameraConstraints ?? 'static'
      });

      return result;
    }
  }
];
