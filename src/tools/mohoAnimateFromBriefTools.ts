import path from 'path';
import { verifyPathAccess } from '../security.js';
import { MohoAnimatorService } from '../services/mohoAnimatorEngine/index.js';
import {
  MohoAnimateFromBriefInputSchema,
  type MohoAnimateFromBriefInput
} from '../schemas/mohoAnimator.js';

export const mohoAnimateFromBriefTools = [
  {
    name: 'moho.animate.from_brief',
    description:
      'Autonomous 2D Moho Animator (Stage 2): Converts a creative text brief/script and audio cues into a production-ready ' +
      'animated .moho scene with 6+1 shape lip-sync, zero-slip walk/run cycles, organic idle breathing, eye blinks, gestures, ' +
      'gaze shifts, secondary motion, and camera moves. Certifies output with fail-closed native Moho acceptance gates.',
    inputSchema: MohoAnimateFromBriefInputSchema,
    handler: async (args: MohoAnimateFromBriefInput) => {
      const rigAbs = verifyPathAccess(path.resolve(args.rigPath));
      const outAbs = verifyPathAccess(path.resolve(args.outputPath));

      const brief = (args.brief && args.brief.trim().length > 0)
        ? args.brief.trim()
        : args.briefText?.trim() ?? '';

      const canvasWidth = args.canvasWidth ?? args.resolution?.width ?? 1920;
      const canvasHeight = args.canvasHeight ?? args.resolution?.height ?? 1080;

      const result = await MohoAnimatorService.animateFromBrief({
        rigPath: rigAbs,
        brief,
        briefText: brief,
        durationSeconds: args.durationSeconds,
        durationFrames: args.durationFrames,
        fps: args.fps ?? 24,
        canvasWidth,
        canvasHeight,
        resolution: { width: canvasWidth, height: canvasHeight },
        motionStyle: args.motionStyle ?? 'default',
        emotion: args.emotion ?? 'neutral',
        dialogue: args.dialogue,
        lyrics: args.lyrics,
        dialogueLines: args.dialogueLines ?? [],
        language: args.language ?? 'en',
        outputPath: outAbs,
        cameraConstraints: args.cameraConstraints ?? 'static'
      });

      return result;
    }
  }
];
