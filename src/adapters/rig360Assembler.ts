import { Rig360Spec, Rig360AssemblyPlan } from '../schemas/rig360PIR.js';

export class Rig360Assembler {
  /**
   * Combines multiple CharacterDrawingPIR angles into a single Head Turn Plan with Substitutions.
   */
  static assemblePlan(spec: Rig360Spec): Rig360AssemblyPlan {
    const targetNodes = new Set<string>();
    const substitutions: Record<string, Array<{ angle: "0" | "45" | "90" | "135" | "180", drawingId: string }>> = {};

    for (const [angleStr, pir] of Object.entries(spec.angles)) {
      const angle = angleStr as "0" | "45" | "90" | "135" | "180";
      
      for (const layer of pir.layers) {
        const nodeName = `${spec.characterName}_${layer.name}_Drawing`;
        targetNodes.add(nodeName);

        if (!substitutions[nodeName]) {
          substitutions[nodeName] = [];
        }

        substitutions[nodeName].push({
          angle,
          drawingId: `${layer.name}_${angle}`
        });
      }
    }

    return {
      planId: `rig360_plan_${Date.now()}`,
      characterName: spec.characterName,
      targetNodes: Array.from(targetNodes),
      substitutions,
      masterControllerPlan: spec.masterController
    };
  }
}
