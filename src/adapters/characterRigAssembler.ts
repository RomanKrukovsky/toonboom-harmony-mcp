import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { CharacterDrawingPIR } from '../schemas/vectorizationPIR.js';
import {
  CharacterRigAssemblyPlan,
  PartRigSpec,
  AutoPatchJointSpec,
  KinematicAccessorySpec,
  BackdropSpec,
  computeRigPlanHash
} from '../schemas/characterRigPIR.js';

export class CharacterRigAssembler {
  static assemblePlan(
    pir: CharacterDrawingPIR,
    characterName: string = 'Character_Cutout'
  ): CharacterRigAssemblyPlan {
    const planId = `rig_plan_${pir.characterId || characterName}_${Date.now()}`;
    const parts: PartRigSpec[] = [];
    const autoPatchJoints: AutoPatchJointSpec[] = [];
    const kinematicAccessories: KinematicAccessorySpec[] = [];

    // Backdrop node collectors
    const backdropMap: Record<string, string[]> = {
      master: [`Top/${characterName}/Master_P`],
      head: [],
      torso: [],
      arms: [],
      legs: [],
      accessories: []
    };

    // Standard Cutout Body Parts Hierarchy Template
    // Limbs follow the two-segment hinge technique (Tatyana's method):
    //   arm = Arm + Forearm (elbow hinge), leg = Leg + Shin (knee hinge),
    //   with Hand/Foot as the end effectors. Each hinge gets a circular
    //   overlap guide from JointGuideSolver and its pivot snaps to the
    //   circle center.
    const defaultPartSpecs: Array<{
      partId: string;
      parentPartId: string | null;
      semanticGroup: string;
      backdropGroup: 'head' | 'torso' | 'arms' | 'legs' | 'master' | 'accessories';
      depth: number;
      followParent?: boolean;
    }> = [
      { partId: 'Torso', parentPartId: null, semanticGroup: 'torso', backdropGroup: 'torso', depth: 1 },
      { partId: 'Head', parentPartId: 'Torso', semanticGroup: 'head', backdropGroup: 'head', depth: 2 },
      { partId: 'Hair', parentPartId: 'Head', semanticGroup: 'hair', backdropGroup: 'head', depth: 3 },
      { partId: 'Face', parentPartId: 'Head', semanticGroup: 'face', backdropGroup: 'head', depth: 3 },
      { partId: 'Eyes', parentPartId: 'Face', semanticGroup: 'eyes', backdropGroup: 'head', depth: 4 },
      { partId: 'Brows', parentPartId: 'Face', semanticGroup: 'brows', backdropGroup: 'head', depth: 4 },
      { partId: 'Mouth', parentPartId: 'Face', semanticGroup: 'mouth', backdropGroup: 'head', depth: 4 },
      { partId: 'Arm_L', parentPartId: 'Torso', semanticGroup: 'left_arm', backdropGroup: 'arms', depth: 2 },
      { partId: 'Forearm_L', parentPartId: 'Arm_L', semanticGroup: 'left_forearm', backdropGroup: 'arms', depth: 3, followParent: true },
      { partId: 'Hand_L', parentPartId: 'Forearm_L', semanticGroup: 'left_hand', backdropGroup: 'arms', depth: 4, followParent: true },
      { partId: 'Arm_R', parentPartId: 'Torso', semanticGroup: 'right_arm', backdropGroup: 'arms', depth: 2 },
      { partId: 'Forearm_R', parentPartId: 'Arm_R', semanticGroup: 'right_forearm', backdropGroup: 'arms', depth: 3, followParent: true },
      { partId: 'Hand_R', parentPartId: 'Forearm_R', semanticGroup: 'right_hand', backdropGroup: 'arms', depth: 4, followParent: true },
      { partId: 'Leg_L', parentPartId: 'Torso', semanticGroup: 'left_leg', backdropGroup: 'legs', depth: 2 },
      { partId: 'Shin_L', parentPartId: 'Leg_L', semanticGroup: 'left_shin', backdropGroup: 'legs', depth: 3, followParent: true },
      { partId: 'Foot_L', parentPartId: 'Shin_L', semanticGroup: 'left_foot', backdropGroup: 'legs', depth: 4, followParent: true },
      { partId: 'Leg_R', parentPartId: 'Torso', semanticGroup: 'right_leg', backdropGroup: 'legs', depth: 2 },
      { partId: 'Shin_R', parentPartId: 'Leg_R', semanticGroup: 'right_shin', backdropGroup: 'legs', depth: 3, followParent: true },
      { partId: 'Foot_R', parentPartId: 'Shin_R', semanticGroup: 'right_foot', backdropGroup: 'legs', depth: 4, followParent: true },
      { partId: 'Clothing', parentPartId: 'Torso', semanticGroup: 'clothing', backdropGroup: 'torso', depth: 2 },
      { partId: 'Accessory', parentPartId: 'Arm_L', semanticGroup: 'accessory', backdropGroup: 'accessories', depth: 3 }
    ];

    // Filter parts present in PIR or fallback to full template
    const presentSemantics = new Set([
      ...pir.layers.map((l) => l.semanticGroup),
      ...pir.unassignedStrokes.map((s) => s.semanticGroup)
    ]);

    // Presence rule: semantic present, depth<=2 core part, or a limb-chain
    // child (followParent) whose parent is included — a rigger never leaves a
    // limb half-sliced: Arm implies Forearm implies Hand; Leg implies Shin
    // implies Foot. Non-limb parts (Hair/Face/Accessory) keep strict semantics.
    const included = new Set<string>();
    for (const spec of defaultPartSpecs) {
      if (presentSemantics.has(spec.semanticGroup) || spec.depth <= 2) included.add(spec.partId);
    }
    let grew = true;
    while (grew) {
      grew = false;
      for (const spec of defaultPartSpecs) {
        if (included.has(spec.partId) || !spec.followParent) continue;
        if (spec.parentPartId && included.has(spec.parentPartId)) {
          included.add(spec.partId);
          grew = true;
        }
      }
    }

    for (const spec of defaultPartSpecs) {
      if (!included.has(spec.partId)) continue;

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

    // Auto-patch Joint pairs — every hinge of the two-segment technique:
    // elbows (Arm<->Forearm), wrists (Forearm<->Hand), knees (Leg<->Shin),
    // ankles (Shin<->Foot), hips (Torso<->Leg), neck (Torso<->Head).
    const jointPairs = [
      { name: 'Joint_Elbow_L', partA: 'Arm_L', partB: 'Forearm_L' },
      { name: 'Joint_Elbow_R', partA: 'Arm_R', partB: 'Forearm_R' },
      { name: 'Joint_Wrist_L', partA: 'Forearm_L', partB: 'Hand_L' },
      { name: 'Joint_Wrist_R', partA: 'Forearm_R', partB: 'Hand_R' },
      { name: 'Joint_Hip_L', partA: 'Torso', partB: 'Leg_L' },
      { name: 'Joint_Hip_R', partA: 'Torso', partB: 'Leg_R' },
      { name: 'Joint_Knee_L', partA: 'Leg_L', partB: 'Shin_L' },
      { name: 'Joint_Knee_R', partA: 'Leg_R', partB: 'Shin_R' },
      { name: 'Joint_Ankle_L', partA: 'Shin_L', partB: 'Foot_L' },
      { name: 'Joint_Ankle_R', partA: 'Shin_R', partB: 'Foot_R' },
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
    const backdrops: BackdropSpec[] = [
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
