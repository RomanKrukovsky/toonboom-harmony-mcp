import { computeRigPlanHash } from '../schemas/characterRigPIR.js';
export class CharacterRigAssembler {
    static assemblePlan(pir, characterName = 'Character_Cutout') {
        const planId = `rig_plan_${pir.characterId || characterName}_${Date.now()}`;
        const parts = [];
        const autoPatchJoints = [];
        const kinematicAccessories = [];
        // Backdrop node collectors
        const backdropMap = {
            master: [`Top/${characterName}/Master_P`],
            head: [],
            torso: [],
            arms: [],
            legs: [],
            accessories: []
        };
        // Standard Cutout Body Parts Hierarchy Template
        const defaultPartSpecs = [
            { partId: 'Torso', parentPartId: null, semanticGroup: 'torso', backdropGroup: 'torso', depth: 1 },
            { partId: 'Head', parentPartId: 'Torso', semanticGroup: 'head', backdropGroup: 'head', depth: 2 },
            { partId: 'Hair', parentPartId: 'Head', semanticGroup: 'hair', backdropGroup: 'head', depth: 3 },
            { partId: 'Face', parentPartId: 'Head', semanticGroup: 'face', backdropGroup: 'head', depth: 3 },
            { partId: 'Eyes', parentPartId: 'Face', semanticGroup: 'eyes', backdropGroup: 'head', depth: 4 },
            { partId: 'Brows', parentPartId: 'Face', semanticGroup: 'brows', backdropGroup: 'head', depth: 4 },
            { partId: 'Mouth', parentPartId: 'Face', semanticGroup: 'mouth', backdropGroup: 'head', depth: 4 },
            { partId: 'Arm_L', parentPartId: 'Torso', semanticGroup: 'left_arm', backdropGroup: 'arms', depth: 2 },
            { partId: 'Hand_L', parentPartId: 'Arm_L', semanticGroup: 'left_hand', backdropGroup: 'arms', depth: 3 },
            { partId: 'Arm_R', parentPartId: 'Torso', semanticGroup: 'right_arm', backdropGroup: 'arms', depth: 2 },
            { partId: 'Hand_R', parentPartId: 'Arm_R', semanticGroup: 'right_hand', backdropGroup: 'arms', depth: 3 },
            { partId: 'Clothing', parentPartId: 'Torso', semanticGroup: 'clothing', backdropGroup: 'torso', depth: 2 },
            { partId: 'Accessory', parentPartId: 'Arm_L', semanticGroup: 'accessory', backdropGroup: 'accessories', depth: 3 }
        ];
        // Filter parts present in PIR or fallback to full template
        const presentSemantics = new Set([
            ...pir.layers.map((l) => l.semanticGroup),
            ...pir.unassignedStrokes.map((s) => s.semanticGroup)
        ]);
        for (const spec of defaultPartSpecs) {
            const isPresent = presentSemantics.has(spec.semanticGroup) || spec.depth <= 2;
            if (!isPresent && spec.depth > 2)
                continue;
            const zOffset = parseFloat((spec.depth * 0.0001).toFixed(4));
            const drawingNode = `${characterName}_${spec.partId}_Drawing`;
            const pegNode = `${characterName}_${spec.partId}_P`;
            const isAccessory = spec.semanticGroup === 'accessory';
            parts.push({
                partId: spec.partId,
                drawingNodeName: drawingNode,
                pegNodeName: pegNode,
                parentPartId: spec.parentPartId,
                semanticGroup: spec.semanticGroup,
                artLayer: 'line',
                pivot: { x: 0, y: 0 },
                zOffset,
                separatePosition: true,
                lockDrawingMode: true,
                hasDeformer: false,
                isKinematicAccessory: isAccessory,
                backdropGroup: spec.backdropGroup === 'accessories' ? 'master' : spec.backdropGroup
            });
            const fullNodePath = `Top/${characterName}/${drawingNode}`;
            const fullPegPath = `Top/${characterName}/${pegNode}`;
            const groupKey = spec.backdropGroup === 'accessories' ? 'master' : spec.backdropGroup;
            if (backdropMap[groupKey]) {
                backdropMap[groupKey].push(fullNodePath, fullPegPath);
            }
            if (isAccessory && spec.parentPartId) {
                kinematicAccessories.push({
                    accessoryId: `kin_${spec.partId}`,
                    parentPart: spec.parentPartId,
                    accessoryPart: spec.partId
                });
            }
        }
        // Auto-patch Joint pairs (Arm_L <-> Hand_L, Arm_R <-> Hand_R, Head <-> Torso)
        const jointPairs = [
            { name: 'Joint_Arm_Hand_L', partA: 'Arm_L', partB: 'Hand_L' },
            { name: 'Joint_Arm_Hand_R', partA: 'Arm_R', partB: 'Hand_R' },
            { name: 'Joint_Head_Torso', partA: 'Torso', partB: 'Head' }
        ];
        for (const j of jointPairs) {
            const hasA = parts.some((p) => p.partId === j.partA);
            const hasB = parts.some((p) => p.partId === j.partB);
            if (hasA && hasB) {
                autoPatchJoints.push({
                    jointId: `patch_${j.name}`,
                    jointName: j.name,
                    partA: j.partA,
                    partB: j.partB,
                    patchRadius: 15.0
                });
            }
        }
        // Backdrops
        const backdrops = [
            { title: `${characterName} Master`, color: 'red', nodes: backdropMap.master },
            { title: `${characterName} Head`, color: 'green', nodes: backdropMap.head },
            { title: `${characterName} Torso`, color: 'blue', nodes: backdropMap.torso },
            { title: `${characterName} Arms`, color: 'yellow', nodes: backdropMap.arms }
        ];
        const planCore = {
            planId,
            characterName,
            masterPegName: `${characterName}_Master_P`,
            parts,
            autoPatchJoints,
            kinematicAccessories,
            backdrops,
            createdAt: new Date().toISOString()
        };
        const planHash = computeRigPlanHash(planCore);
        return {
            ...planCore,
            planHash
        };
    }
}
