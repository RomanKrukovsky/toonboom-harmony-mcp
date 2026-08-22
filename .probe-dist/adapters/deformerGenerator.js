export class DeformerGenerator {
    /**
     * Generates a Deformer and Master Controller Plan based on the Rig Assembly Plan.
     * - Torso, Head, Face, Hair -> Envelope Deformer
     * - Arms, Legs -> Curve Deformer (3 points)
     */
    static generatePlan(rigPlan) {
        const deformers = [];
        for (const part of rigPlan.parts) {
            // Logic for selecting deformer type
            let type = 'Envelope';
            let closed = false;
            let numPoints = 4;
            if (part.backdropGroup === 'arms' || part.backdropGroup === 'legs') {
                type = 'Curve';
                closed = false;
                numPoints = 3; // Shoulders, Elbow/Knee, Wrist/Ankle
            }
            else if (part.backdropGroup === 'torso' || part.backdropGroup === 'head') {
                type = 'Envelope';
                closed = true;
                numPoints = 4;
            }
            // Do not create deformer for some small parts or accessories by default unless specified
            if (part.isKinematicAccessory) {
                continue;
            }
            deformers.push({
                deformerId: `def_${part.partId}`,
                type,
                targetNode: part.drawingNodeName,
                numPoints,
                closed
            });
        }
        // Default Face Master Controller
        const faceMC = {
            mcId: `mc_${rigPlan.characterName}_Face`,
            name: `${rigPlan.characterName}_Face_MC`,
            widgetType: 'Grid',
            controlledNodes: rigPlan.parts
                .filter(p => p.semanticGroup === 'eyes' || p.semanticGroup === 'mouth' || p.semanticGroup === 'brows')
                .map(p => p.pegNodeName),
            gridWidth: 3,
            gridHeight: 3
        };
        return {
            planId: `deformer_plan_${Date.now()}`,
            characterName: rigPlan.characterName,
            deformers,
            masterControllers: [faceMC]
        };
    }
}
