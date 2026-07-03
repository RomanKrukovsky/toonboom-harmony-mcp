import { z } from 'zod';
import { ActingPlanner } from '../adapters/actingPlanner/index.js';

/**
 * actingTools — acting planning layer.
 */
export const actingTools = [
  {
    name: 'harmony.acting.analyze_dialogue',
    description: 'Проанализировать темп/громкость/эмоцию диалога.',
    inputSchema: z.object({
      dialogue: z.string()
    }),
    handler: async (args: any) => {
      const planner = new ActingPlanner();
      return { status: 'success', analysis: planner.analyzeDialogue(args.dialogue) };
    }
  },

  {
    name: 'harmony.acting.generate_emotional_beats',
    description: 'Сгенерировать emotional beats для сцены.',
    inputSchema: z.object({
      scene: z.any(),
      character: z.string().optional()
    }),
    handler: async (args: any) => {
      const planner = new ActingPlanner();
      const beats = planner.generateEmotionalBeats(args.scene, args.character || 'Hero');
      return { status: 'success', emotionalBeats: beats };
    }
  },

  {
    name: 'harmony.acting.generate_pose_beats',
    description: 'Сгенерировать pose beats.',
    inputSchema: z.object({
      scene: z.any()
    }),
    handler: async (args: any) => {
      const planner = new ActingPlanner();
      return { status: 'success', poseBeats: planner.generatePoseBeats(args.scene) };
    }
  },

  {
    name: 'harmony.acting.generate_micro_actions',
    description: 'Сгенерировать список micro actions.',
    inputSchema: z.object({
      scene: z.any()
    }),
    handler: async (args: any) => {
      const planner = new ActingPlanner();
      return { status: 'success', microActions: planner.generateMicroActions(args.scene) };
    }
  },

  {
    name: 'harmony.acting.generate_gesture_plan',
    description: 'Сгенерировать gesture plan.',
    inputSchema: z.object({
      scene: z.any()
    }),
    handler: async (args: any) => {
      const planner = new ActingPlanner();
      return { status: 'success', gesturePlan: planner.generateGesturePlan(args.scene) };
    }
  },

  {
    name: 'harmony.acting.generate_eye_blink_plan',
    description: 'Сгенерировать blink plan.',
    inputSchema: z.object({
      scene: z.any()
    }),
    handler: async (args: any) => {
      const planner = new ActingPlanner();
      return { status: 'success', blinkPlan: planner.generateBlinkPlan(args.scene) };
    }
  },

  {
    name: 'harmony.acting.generate_head_motion_plan',
    description: 'Сгенерировать head motion plan.',
    inputSchema: z.object({
      scene: z.any()
    }),
    handler: async (args: any) => {
      const planner = new ActingPlanner();
      return { status: 'success', headMotionPlan: planner.generateHeadMotionPlan(args.scene) };
    }
  },

  {
    name: 'harmony.acting.generate_body_language_plan',
    description: 'Сгенерировать body language plan.',
    inputSchema: z.object({
      scene: z.any()
    }),
    handler: async (args: any) => {
      const planner = new ActingPlanner();
      return { status: 'success', bodyLanguagePlan: planner.generateBodyLanguagePlan(args.scene) };
    }
  },

  {
    name: 'harmony.acting.apply_rough_acting',
    description: 'Собрать rough acting plan из всех подпланов.',
    inputSchema: z.object({
      scene: z.any(),
      character: z.string()
    }),
    handler: async (args: any) => {
      const planner = new ActingPlanner();
      const plan = planner.buildActingPlan(args.character, args.scene, {});
      return { status: 'success', actingPlan: plan };
    }
  },

  {
    name: 'harmony.acting.validate_acting_readability',
    description: 'Оценить readability acting plan.',
    inputSchema: z.object({
      actingPlan: z.any()
    }),
    handler: async (args: any) => {
      const planner = new ActingPlanner();
      const score = planner.estimateReadability(args.actingPlan.emotionalArc || []);
      return { status: score >= 70 ? 'success' : 'partial_success', readabilityScore: score };
    }
  }
];