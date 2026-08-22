export class Rig360Assembler {
    /**
     * Combines multiple CharacterDrawingPIR angles into a single Head Turn Plan with Substitutions.
     */
    static assemblePlan(spec) {
        const targetNodes = new Set();
        const substitutions = {};
        for (const [angleStr, pir] of Object.entries(spec.angles)) {
            const angle = angleStr;
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
