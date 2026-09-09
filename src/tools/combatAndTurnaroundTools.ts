import { z } from 'zod';
import { combatActionSpecSchema } from '../schemas/combatActionPIR.js';
import { turnaround360ConfigSchema } from '../schemas/turnaround360Spec.js';
import { CombatActionSolver } from '../services/combatActionSolver/index.js';
import { Turnaround360Synthesizer } from '../services/turnaround360Synthesizer/index.js';

export const harmonyActionSolveCombatTool = {
  name: 'harmony.action.solve_combat',
  description: 'Solves dual-actor combat interaction: socket snapping, hit-stops, impulse vectors, camera shake, and constraint handoffs for Toon Boom Harmony.',
  inputSchema: combatActionSpecSchema,
  handler: async (args: any) => {
    const parsed = combatActionSpecSchema.parse(args);
    const result = CombatActionSolver.solveCombatInteraction(parsed);
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

export const harmonyRig360SynthesizeTurnaroundTool = {
  name: 'harmony.rig360.synthesize_turnaround',
  description: 'Synthesizes full 360-degree character turnaround rig: continuous Z-ordering intervals, boundary-preserving quad edge loops, and Harmony Master Controller 2D Point interpolator.',
  inputSchema: turnaround360ConfigSchema,
  handler: async (args: any) => {
    const parsed = turnaround360ConfigSchema.parse(args);
    const result = Turnaround360Synthesizer.synthesize360Turnaround(parsed);
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

export const mohoActionSolveCombatTool = {
  name: 'moho.action.solve_combat',
  description: 'Solves dual-actor combat interaction: socket snapping, hit-stops, impulse vectors, camera shake, and constraint handoffs for Moho Pro.',
  inputSchema: combatActionSpecSchema,
  handler: async (args: any) => {
    const parsed = combatActionSpecSchema.parse(args);
    const result = CombatActionSolver.solveCombatInteraction(parsed);
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

export const mohoRigSynthesizeTurnaroundTool = {
  name: 'moho.rig.synthesize_turnaround',
  description: 'Synthesizes full 360-degree character turnaround rig: continuous Z-ordering intervals, boundary-preserving quad edge loops, and Moho 2D Smart Bone dials.',
  inputSchema: turnaround360ConfigSchema,
  handler: async (args: any) => {
    const parsed = turnaround360ConfigSchema.parse(args);
    const result = Turnaround360Synthesizer.synthesize360Turnaround(parsed);
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
